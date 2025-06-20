"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, Plus, Trash2 } from "lucide-react"
import { db } from "@/lib/firebase/firebaseConfig"
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore"
import { useAuth } from "./contexts/auth-context"
import { debounce } from "lodash"

interface JournalEntry {
  date: string
  morningWins: { id: string; text: string; completed: boolean }[]
  gratitude: string
  reflections: string
}

export function Journal() {
  const { user } = useAuth()
  const [entries, setEntries] = useState<Record<string, JournalEntry>>({})
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [newWin, setNewWin] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Load journal entries from Firestore
  useEffect(() => {
    if (!user) return
    
    const loadJournal = async () => {
      try {
        setLoading(true)
        const userDocRef = doc(db, "journals", user.uid)
        const docSnap = await getDoc(userDocRef)
        
        if (docSnap.exists()) {
          const data = docSnap.data()
          setEntries(data.entries || {})
        } else {
          await setDoc(userDocRef, { entries: {} })
          setEntries({})
        }
      } catch (error) {
        console.error("Error loading journal:", error)
      } finally {
        setLoading(false)
      }
    }

    loadJournal()
  }, [user])

  // Debounced save function
  const saveJournal = debounce(async () => {
    if (!user || saving) return
    
    try {
      setSaving(true)
      const userDocRef = doc(db, "journals", user.uid)
      await updateDoc(userDocRef, { entries })
      setLastSaved(new Date())
    } catch (error) {
      console.error("Error saving journal:", error)
    } finally {
      setSaving(false)
    }
  }, 1000) // 1 second debounce

  // Save whenever entries change
  useEffect(() => {
    if (Object.keys(entries).length > 0 && user) {
      saveJournal()
    }
  }, [entries])

  const getCurrentEntry = (): JournalEntry => {
    return (
      entries[selectedDate] || {
        date: selectedDate,
        morningWins: [],
        gratitude: "",
        reflections: "",
      }
    )
  }

  const updateEntry = (updates: Partial<JournalEntry>) => {
    const updatedEntries = {
      ...entries,
      [selectedDate]: {
        ...getCurrentEntry(),
        ...updates,
      },
    }
    
    setEntries(updatedEntries)
    return updatedEntries
  }

  const addMorningWin = () => {
    if (newWin.trim()) {
      updateEntry({
        morningWins: [
          ...getCurrentEntry().morningWins,
          { id: Date.now().toString(), text: newWin.trim(), completed: false },
        ],
      })
      setNewWin("")
    }
  }

  const toggleWin = (winId: string) => {
    const currentEntry = getCurrentEntry()
    updateEntry({
      morningWins: currentEntry.morningWins.map((win) =>
        win.id === winId ? { ...win, completed: !win.completed } : win
      ),
    })
  }

  const deleteWin = (winId: string) => {
    const currentEntry = getCurrentEntry()
    updateEntry({
      morningWins: currentEntry.morningWins.filter((win) => win.id !== winId),
    })
  }

  const handleGratitudeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateEntry({ gratitude: e.target.value })
  }

  const handleReflectionsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateEntry({ reflections: e.target.value })
  }

  const sortedDates = Object.keys(entries).sort().reverse()
  const currentEntry = getCurrentEntry()

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-slate-100 to-slate-200 border-2 border-slate-300">
        <CardHeader>
          <CardTitle className="text-slate-800">
            Today's Journal - {new Date(selectedDate).toLocaleDateString()}
            {saving && <span className="ml-2 text-sm text-slate-500">Saving...</span>}
            {lastSaved && !saving && (
              <span className="ml-2 text-sm text-green-600">
                Saved at {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </CardTitle>
          <Input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)} 
            className="w-fit" 
            disabled={loading}
          />
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Loading indicator */}
          {loading && (
            <div className="text-center py-8 text-slate-600">
              Loading your journal entries...
            </div>
          )}

          {/* Morning Section */}
          {!loading && (
            <div className="bg-slate-100 p-4 rounded-lg border border-slate-300">
              <h3 className="text-lg font-semibold mb-3 text-slate-800">Morning - Small Wins to Seek</h3>
              <div className="space-y-2">
                {currentEntry.morningWins.map((win) => (
                  <div key={win.id} className="flex items-center gap-2 bg-white p-2 rounded border border-slate-200">
                    <Checkbox 
                      checked={win.completed} 
                      onCheckedChange={() => toggleWin(win.id)} 
                      disabled={saving}
                    />
                    <span className={win.completed ? "line-through text-slate-400" : "text-slate-800"}>{win.text}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteWin(win.id)}
                      disabled={saving}
                      className="ml-auto text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a small win to seek today..."
                    value={newWin}
                    onChange={(e) => setNewWin(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && addMorningWin()}
                    className="bg-white border-slate-300"
                    disabled={saving}
                  />
                  <Button 
                    onClick={addMorningWin} 
                    className="bg-slate-700 hover:bg-slate-600 text-white"
                    disabled={saving || !newWin.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Evening Section */}
          {!loading && (
            <div className="space-y-4 bg-white p-4 rounded-lg border border-slate-300">
              <h3 className="text-lg font-semibold text-slate-800">Evening Reflection</h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Gratitude Notes</label>
                <Textarea
                  placeholder="What are you grateful for today?"
                  value={currentEntry.gratitude}
                  onChange={handleGratitudeChange}
                  rows={3}
                  className="bg-slate-50 text-slate-800 border-slate-300"
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Reflections</label>
                <Textarea
                  placeholder="How did today go? What did you learn?"
                  value={currentEntry.reflections}
                  onChange={handleReflectionsChange}
                  rows={4}
                  className="bg-slate-50 text-slate-800 border-slate-300"
                  disabled={saving}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Previous Entries */}
      {!loading && sortedDates.length > 0 && (
        <Card className="bg-white border-2 border-slate-300">
          <CardHeader>
            <CardTitle className="text-slate-800">Previous Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sortedDates.map((date) => {
                const entry = entries[date]
                return (
                  <Collapsible key={date}>
                    <CollapsibleTrigger 
                      className="flex items-center justify-between w-full p-3 text-left hover:bg-slate-100 rounded-lg border border-slate-200"
                      disabled={saving}
                    >
                      <span className="font-medium text-slate-800">
                        {new Date(date).toLocaleDateString("en-US", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                      <ChevronDown className="h-4 w-4" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-3 pb-3">
                      <div className="space-y-3 text-sm">
                        {entry.morningWins.length > 0 && (
                          <div>
                            <strong className="text-slate-700">Morning Wins:</strong>
                            <ul className="list-disc list-inside ml-2">
                              {entry.morningWins.map((win) => (
                                <li key={win.id} className={win.completed ? "line-through text-slate-400" : ""}>
                                  {win.text}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {entry.gratitude && (
                          <div>
                            <strong className="text-slate-700">Gratitude:</strong>
                            <p className="ml-2">{entry.gratitude}</p>
                          </div>
                        )}
                        {entry.reflections && (
                          <div>
                            <strong className="text-slate-700">Reflections:</strong>
                            <p className="ml-2">{entry.reflections}</p>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!loading && sortedDates.length === 0 && (
        <Card className="bg-white border-2 border-slate-300">
          <CardHeader>
            <CardTitle className="text-slate-800">Your Journal Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-slate-600">
              No journal entries yet. Start by adding your first entry above!
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}