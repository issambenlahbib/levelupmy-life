"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Edit, Trash2 } from "lucide-react"
import { db } from "@/lib/firebase/firebaseConfig"
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore"
import { useAuth } from "./contexts/auth-context"
import { debounce } from "lodash"

interface Affirmation {
  id: string
  text: string
  createdAt: string
}

interface Quote {
  id: string
  text: string
  createdAt: string
}

export function Identity() {
  const { user } = useAuth()
  const [affirmations, setAffirmations] = useState<Affirmation[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [newAffirmation, setNewAffirmation] = useState("")
  const [newQuote, setNewQuote] = useState("")
  const [editingAffirmation, setEditingAffirmation] = useState<Affirmation | null>(null)
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Load identity data from Firestore
  useEffect(() => {
    if (!user) return
    
    const loadIdentity = async () => {
      try {
        setLoading(true)
        const userDocRef = doc(db, "users", user.uid, "identity", "data")
        const docSnap = await getDoc(userDocRef)
        
        if (docSnap.exists()) {
          const data = docSnap.data()
          setAffirmations(data.affirmations || [])
          setQuotes(data.quotes || [])
        } else {
          // Create new document if it doesn't exist
          await setDoc(userDocRef, { affirmations: [], quotes: [] })
          setAffirmations([])
          setQuotes([])
        }
      } catch (error) {
        console.error("Error loading identity data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadIdentity()
  }, [user])

  // Debounced save function
  const saveIdentity = debounce(async () => {
    if (!user || saving) return
    
    try {
      setSaving(true)
      const userDocRef = doc(db, "users", user.uid, "identity", "data")
      await updateDoc(userDocRef, { affirmations, quotes })
      setLastSaved(new Date())
    } catch (error) {
      console.error("Error saving identity data:", error)
    } finally {
      setSaving(false)
    }
  }, 1000)

  // Save whenever affirmations or quotes change
  useEffect(() => {
    if ((affirmations.length > 0 || quotes.length > 0) && user) {
      saveIdentity()
    }
  }, [affirmations, quotes])

  const addAffirmation = () => {
    if (newAffirmation.trim()) {
      const affirmation: Affirmation = {
        id: Date.now().toString(),
        text: newAffirmation.trim(),
        createdAt: new Date().toISOString(),
      }
      setAffirmations([...affirmations, affirmation])
      setNewAffirmation("")
    }
  }

  const addQuote = () => {
    if (newQuote.trim()) {
      const quote: Quote = {
        id: Date.now().toString(),
        text: newQuote.trim(),
        createdAt: new Date().toISOString(),
      }
      setQuotes([...quotes, quote])
      setNewQuote("")
    }
  }

  const updateAffirmation = (id: string, text: string) => {
    setAffirmations(affirmations.map((a) => (a.id === id ? { ...a, text } : a)))
    setEditingAffirmation(null)
  }

  const updateQuote = (id: string, text: string) => {
    setQuotes(quotes.map((q) => (q.id === id ? { ...q, text } : q)))
    setEditingQuote(null)
  }

  const deleteAffirmation = (id: string) => {
    setAffirmations(affirmations.filter((a) => a.id !== id))
  }

  const deleteQuote = (id: string) => {
    setQuotes(quotes.filter((q) => q.id !== id))
  }

  const affirmationColors = [
    "from-slate-800 to-slate-700",
    "from-blue-800 to-blue-700",
    "from-emerald-800 to-emerald-700",
    "from-amber-800 to-amber-700",
    "from-red-800 to-red-700",
  ]

  const quoteColors = [
    "from-slate-700 to-slate-600",
    "from-blue-700 to-blue-600",
    "from-emerald-700 to-emerald-600",
    "from-amber-700 to-amber-600",
    "from-red-700 to-red-600",
  ]

  return (
    <div className="space-y-6">
      {/* Saving indicator */}
      {saving && (
        <div className="fixed top-4 right-4 bg-slate-800 text-white px-4 py-2 rounded-md shadow-lg">
          Saving changes...
        </div>
      )}
      
      {/* Affirmations Section */}
      <Card className="bg-gradient-to-r from-slate-100 to-slate-200 border-2 border-slate-300">
        <CardHeader>
          <CardTitle className="text-slate-800">Daily Affirmations</CardTitle>
          {lastSaved && !saving && (
            <p className="text-sm text-green-600">
              Saved at {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Textarea
              placeholder="Add a new affirmation..."
              value={newAffirmation}
              onChange={(e) => setNewAffirmation(e.target.value)}
              rows={2}
              className="bg-slate-50 border-slate-300"
              disabled={loading || saving}
            />
            <Button 
              onClick={addAffirmation} 
              className="bg-slate-800 hover:bg-slate-700 text-white"
              disabled={loading || saving || !newAffirmation.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-4 text-slate-600">
              Loading your affirmations...
            </div>
          ) : (
            <div className="space-y-3">
              {affirmations.map((affirmation, index) => (
                <Card
                  key={affirmation.id}
                  className={`p-4 bg-gradient-to-r ${affirmationColors[index % affirmationColors.length]} text-white`}
                >
                  {editingAffirmation?.id === affirmation.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editingAffirmation.text}
                        onChange={(e) => setEditingAffirmation({ ...editingAffirmation, text: e.target.value })}
                        rows={2}
                        className="bg-slate-700 text-white border-slate-600"
                        disabled={saving}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => updateAffirmation(affirmation.id, editingAffirmation.text)}
                          className="bg-emerald-600 hover:bg-emerald-700"
                          disabled={saving}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingAffirmation(null)}
                          className="border-slate-400 text-slate-100 hover:bg-slate-600"
                          disabled={saving}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <p className="text-lg font-medium italic">{affirmation.text}</p>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingAffirmation(affirmation)}
                          className="text-slate-200 hover:text-white hover:bg-slate-600"
                          disabled={saving}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteAffirmation(affirmation.id)}
                          className="text-slate-200 hover:text-white hover:bg-slate-600"
                          disabled={saving}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
              
              {affirmations.length === 0 && !loading && (
                <div className="text-center py-4 text-slate-600 italic">
                  No affirmations yet. Add your first one above!
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quotes Section */}
      <Card className="bg-gradient-to-r from-slate-800 to-slate-900 text-white">
        <CardHeader>
          <CardTitle>Inspirational Quotes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Textarea
              placeholder="Add a new quote..."
              value={newQuote}
              onChange={(e) => setNewQuote(e.target.value)}
              rows={3}
              className="bg-slate-700 text-white border-slate-600 placeholder:text-slate-400"
              disabled={loading || saving}
            />
            <Button 
              onClick={addQuote} 
              className="bg-slate-600 hover:bg-slate-500 text-white"
              disabled={loading || saving || !newQuote.trim()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Quote
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-4 text-slate-400">
              Loading your quotes...
            </div>
          ) : (
            <div className="space-y-3">
              {quotes.map((quote, index) => (
                <Card
                  key={quote.id}
                  className={`p-4 bg-gradient-to-r ${quoteColors[index % quoteColors.length]} text-white`}
                >
                  {editingQuote?.id === quote.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editingQuote.text}
                        onChange={(e) => setEditingQuote({ ...editingQuote, text: e.target.value })}
                        rows={3}
                        className="bg-slate-700 text-white border-slate-600"
                        disabled={saving}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => updateQuote(quote.id, editingQuote.text)}
                          className="bg-emerald-600 hover:bg-emerald-700"
                          disabled={saving}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingQuote(null)}
                          className="border-slate-400 text-slate-100 hover:bg-slate-600"
                          disabled={saving}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div>
                        <blockquote className="text-lg italic mb-2">"{quote.text}"</blockquote>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingQuote(quote)}
                          className="text-slate-200 hover:text-white hover:bg-slate-600"
                          disabled={saving}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteQuote(quote.id)}
                          className="text-slate-200 hover:text-white hover:bg-slate-600"
                          disabled={saving}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
              
              {quotes.length === 0 && !loading && (
                <div className="text-center py-4 text-slate-400 italic">
                  No quotes yet. Add your first one above!
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}