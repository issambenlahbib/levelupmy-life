"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Palette, Plus, Trash2 } from "lucide-react"
import { db } from "@/lib/firebase/firebaseConfig"
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore"
import { useAuth } from "./contexts/auth-context"
import { debounce } from "lodash"

interface ChecklistItem {
  id: string
  text: string
  completed: boolean
}

interface LifeAreaDetails {
  notes: string
  checklist: ChecklistItem[]
}

interface LifeArea {
  id: string
  name: string
  score: number
  color: string
  details: LifeAreaDetails
}

const distinctManlyColors = [
  "#8B0000", "#000080", "#006400", "#8B4513", "#4B0082", "#2F4F4F", 
  "#800080", "#B8860B", "#556B2F", "#8B008B", "#483D8B", "#2E8B57", 
  "#A0522D", "#191970", "#800000", "#008B8B", "#9932CC", "#8FBC8F", 
  "#CD853F", "#4682B4", "#D2691E", "#708090"
]

const defaultAreas: LifeArea[] = [
  { id: "career", name: "Career & Work", score: 5, color: "#8B0000", details: { notes: "", checklist: [] } },
  { id: "finance", name: "Finance", score: 5, color: "#000080", details: { notes: "", checklist: [] } },
  { id: "health", name: "Health & Fitness", score: 5, color: "#006400", details: { notes: "", checklist: [] } },
  { id: "family", name: "Family & Relationships", score: 5, color: "#8B4513", details: { notes: "", checklist: [] } },
  { id: "social", name: "Social Life", score: 5, color: "#4B0082", details: { notes: "", checklist: [] } },
  { id: "personal", name: "Personal Growth", score: 5, color: "#2F4F4F", details: { notes: "", checklist: [] } },
  { id: "fun", name: "Fun & Recreation", score: 5, color: "#800080", details: { notes: "", checklist: [] } },
  { id: "environment", name: "Physical Environment", score: 5, color: "#B8860B", details: { notes: "", checklist: [] } },
]

export function LifeWheel() {
  const { user } = useAuth()
  const [areas, setAreas] = useState<LifeArea[]>(defaultAreas)
  const [editingArea, setEditingArea] = useState<LifeArea | null>(null)
  const [isColorDialogOpen, setIsColorDialogOpen] = useState(false)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [selectedArea, setSelectedArea] = useState<LifeArea | null>(null)
  const [newChecklistItem, setNewChecklistItem] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Load life wheel data from Firestore
  useEffect(() => {
    if (!user) return

    const loadLifeWheel = async () => {
      try {
        setLoading(true)
        const userDocRef = doc(db, "users", user.uid, "lifeWheel", "data")
        const docSnap = await getDoc(userDocRef)

        if (docSnap.exists()) {
          const data = docSnap.data()
          const savedAreas = data.areas || defaultAreas
          const areasWithDetails = savedAreas.map((area: any) => ({
            ...area,
            details: area.details || { notes: "", checklist: [] },
          }))
          setAreas(areasWithDetails)
        } else {
          await setDoc(userDocRef, { areas: defaultAreas })
          setAreas(defaultAreas)
        }
      } catch (error) {
        console.error("Error loading life wheel data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadLifeWheel()
  }, [user])

  // Debounced save function
  const saveLifeWheel = debounce(async () => {
    if (!user || saving) return

    try {
      setSaving(true)
      const userDocRef = doc(db, "users", user.uid, "lifeWheel", "data")
      await updateDoc(userDocRef, { areas })
      setLastSaved(new Date())
    } catch (error) {
      console.error("Error saving life wheel data:", error)
    } finally {
      setSaving(false)
    }
  }, 1000)

  // Save whenever areas change
  useEffect(() => {
    if (user && !loading && areas.length > 0) {
      saveLifeWheel()
    }
  }, [areas, loading])

  const updateScore = (id: string, score: number) => {
    setAreas(areas.map((area) => (area.id === id ? { ...area, score } : area)))
  }

  const updateColor = (id: string, color: string) => {
    setAreas(areas.map((area) => (area.id === id ? { ...area, color } : area)))
    setIsColorDialogOpen(false)
    setEditingArea(null)
  }

  const updateAreaDetails = (id: string, details: LifeAreaDetails) => {
    setAreas(areas.map((area) => (area.id === id ? { ...area, details } : area)))
  }

  const addChecklistItem = () => {
    if (newChecklistItem.trim() && selectedArea) {
      const newItem: ChecklistItem = {
        id: Date.now().toString(),
        text: newChecklistItem.trim(),
        completed: false,
      }
      const updatedDetails = {
        ...selectedArea.details,
        checklist: [...selectedArea.details.checklist, newItem],
      }
      updateAreaDetails(selectedArea.id, updatedDetails)
      setSelectedArea({ ...selectedArea, details: updatedDetails })
      setNewChecklistItem("")
    }
  }

  const toggleChecklistItem = (itemId: string) => {
    if (selectedArea) {
      const updatedDetails = {
        ...selectedArea.details,
        checklist: selectedArea.details.checklist.map((item) =>
          item.id === itemId ? { ...item, completed: !item.completed } : item,
        ),
      }
      updateAreaDetails(selectedArea.id, updatedDetails)
      setSelectedArea({ ...selectedArea, details: updatedDetails })
    }
  }

  const deleteChecklistItem = (itemId: string) => {
    if (selectedArea) {
      const updatedDetails = {
        ...selectedArea.details,
        checklist: selectedArea.details.checklist.filter((item) => item.id !== itemId),
      }
      updateAreaDetails(selectedArea.id, updatedDetails)
      setSelectedArea({ ...selectedArea, details: updatedDetails })
    }
  }

  const updateNotes = (notes: string) => {
    if (selectedArea) {
      const updatedDetails = {
        ...selectedArea.details,
        notes,
      }
      updateAreaDetails(selectedArea.id, updatedDetails)
      setSelectedArea({ ...selectedArea, details: updatedDetails })
    }
  }

  const resetScores = () => {
    setAreas(areas.map((area) => ({ ...area, score: 5 })))
  }

  const openAreaDetails = (area: LifeArea) => {
    setSelectedArea(area)
    setIsDetailsDialogOpen(true)
  }

  const createWheelPath = (area: LifeArea, index: number) => {
    const centerX = 300
    const centerY = 300
    const maxRadius = 250
    const minRadius = 50
    const radius = minRadius + (area.score / 10) * (maxRadius - minRadius)

    const angleStep = (2 * Math.PI) / areas.length
    const startAngle = index * angleStep - Math.PI / 2
    const endAngle = (index + 1) * angleStep - Math.PI / 2

    const x1 = centerX + minRadius * Math.cos(startAngle)
    const y1 = centerY + minRadius * Math.sin(startAngle)
    const x2 = centerX + radius * Math.cos(startAngle)
    const y2 = centerY + radius * Math.sin(startAngle)
    const x3 = centerX + radius * Math.cos(endAngle)
    const y3 = centerY + radius * Math.sin(endAngle)
    const x4 = centerX + minRadius * Math.cos(endAngle)
    const y4 = centerY + minRadius * Math.sin(endAngle)

    const largeArcFlag = angleStep > Math.PI ? 1 : 0

    return `M ${x1} ${y1} L ${x2} ${y2} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x3} ${y3} L ${x4} ${y4} A ${minRadius} ${minRadius} 0 ${largeArcFlag} 0 ${x1} ${y1} Z`
  }

  const getTextPosition = (index: number) => {
    const centerX = 300
    const centerY = 300
    const textRadius = 280
    const angleStep = (2 * Math.PI) / areas.length
    const angle = index * angleStep + angleStep / 2 - Math.PI / 2

    const x = centerX + textRadius * Math.cos(angle)
    const y = centerY + textRadius * Math.sin(angle)

    return { x, y, angle }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white border-2 border-slate-300">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-slate-800 text-xl font-bold">Life Balance Wheel</CardTitle>
            <div className="flex items-center gap-4">
              {saving && <span className="text-sm text-slate-500">Saving...</span>}
              {lastSaved && !saving && (
                <span className="text-sm text-green-600">
                  Saved at {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <Button 
                variant="outline" 
                onClick={resetScores} 
                className="border-slate-400 text-slate-700"
                disabled={saving || loading}
              >
                Reset All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="text-center py-8 text-slate-600">
              Loading your life wheel data...
            </div>
          )}
          
          {!loading && (
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="flex-1 flex justify-center">
                <svg width="600" height="600" viewBox="0 0 600 600" className="max-w-full h-auto">
                  {[2, 4, 6, 8, 10].map((level) => (
                    <circle
                      key={level}
                      cx="300"
                      cy="300"
                      r={50 + (level / 10) * 200}
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="1"
                    />
                  ))}

                  {areas.map((_, index) => {
                    const angle = (index * 2 * Math.PI) / areas.length - Math.PI / 2
                    const x = 300 + 250 * Math.cos(angle)
                    const y = 300 + 250 * Math.sin(angle)
                    return <line key={index} x1="300" y1="300" x2={x} y2={y} stroke="#e5e7eb" strokeWidth="1" />
                  })}

                  {areas.map((area, index) => (
                    <g key={area.id}>
                      <path
                        d={createWheelPath(area, index)}
                        fill={area.color}
                        stroke="#fff"
                        strokeWidth="2"
                        opacity="0.8"
                        className="cursor-pointer hover:opacity-100"
                        onClick={() => openAreaDetails(area)}
                      />
                    </g>
                  ))}

                  {areas.map((area, index) => {
                    const { x, y } = getTextPosition(index)
                    return (
                      <text
                        key={`label-${area.id}`}
                        x={x}
                        y={y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={area.color}
                        fontSize="14"
                        fontWeight="700"
                        className="select-none cursor-pointer"
                        onClick={() => openAreaDetails(area)}
                      >
                        <tspan x={x} dy="-0.3em">
                          {area.name.split(" ")[0]}
                        </tspan>
                        {area.name
                          .split(" ")
                          .slice(1)
                          .map((word, i) => (
                            <tspan key={i} x={x} dy="1.2em">
                              {word}
                            </tspan>
                          ))}
                      </text>
                    )
                  })}

                  <circle cx="300" cy="300" r="50" fill="#f9fafb" stroke="#e5e7eb" strokeWidth="2" />
                  <text x="300" y="300" textAnchor="middle" dominantBaseline="middle" fontSize="16" fontWeight="bold">
                    Life Balance
                  </text>
                </svg>
              </div>

              <div className="w-full lg:w-80 space-y-4">
                <h3 className="text-lg font-bold text-slate-800">Adjust Your Life Areas</h3>
                {areas.map((area) => (
                  <div key={area.id} className="space-y-2 p-3 rounded-lg bg-white border border-slate-300">
                    <div className="flex items-center justify-between">
                      <label
                        className="text-sm font-bold cursor-pointer hover:underline"
                        style={{ color: area.color }}
                        onClick={() => openAreaDetails(area)}
                      >
                        {area.name}
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{area.score}/10</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingArea(area)
                            setIsColorDialogOpen(true)
                          }}
                          className="h-6 w-6 p-0"
                          disabled={saving || loading}
                        >
                          <Palette className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <Slider
                      value={[area.score]}
                      onValueChange={(value) => updateScore(area.id, value[0])}
                      max={10}
                      min={1}
                      step={1}
                      className="w-full"
                      disabled={saving || loading}
                    />
                  </div>
                ))}

                <div className="mt-6 p-4 bg-slate-100 rounded-lg border border-slate-300">
                  <h4 className="font-bold mb-2 text-slate-800">Average Score</h4>
                  <div className="text-3xl font-bold text-slate-700">
                    {(areas.reduce((sum, area) => sum + area.score, 0) / areas.length).toFixed(1)}/10
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle style={{ color: selectedArea?.color }}>
              {selectedArea?.name} - Details & Planning
              {saving && <span className="ml-2 text-sm text-slate-500">Saving...</span>}
            </DialogTitle>
          </DialogHeader>
          {selectedArea && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h4 className="text-lg font-semibold">Notes & Reflections</h4>
                <Textarea
                  value={selectedArea.details.notes}
                  onChange={(e) => updateNotes(e.target.value)}
                  placeholder="Add your thoughts, goals, and reflections for this life area..."
                  rows={4}
                  className="resize-none"
                  disabled={saving || loading}
                />
              </div>

              <div className="space-y-3">
                <h4 className="text-lg font-semibold">Action Items & Goals</h4>

                <div className="flex gap-2">
                  <Input
                    value={newChecklistItem}
                    onChange={(e) => setNewChecklistItem(e.target.value)}
                    placeholder="Add a new action item or goal..."
                    onKeyPress={(e) => e.key === "Enter" && addChecklistItem()}
                    disabled={saving || loading}
                  />
                  <Button 
                    onClick={addChecklistItem} 
                    disabled={saving || loading || !newChecklistItem.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedArea.details.checklist.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                      <Checkbox 
                        checked={item.completed} 
                        onCheckedChange={() => toggleChecklistItem(item.id)} 
                        disabled={saving || loading}
                      />
                      <span className={`flex-1 ${item.completed ? "line-through text-muted-foreground" : ""}`}>
                        {item.text}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteChecklistItem(item.id)}
                        className="h-6 w-6 p-0"
                        disabled={saving || loading}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>

                {selectedArea.details.checklist.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">
                    No action items yet. Add some goals to work towards!
                  </p>
                )}
              </div>

              <div className="p-4 bg-muted/30 rounded-lg">
                <h4 className="font-semibold mb-2">Progress Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Current Score:</span>
                    <span className="ml-2 font-bold" style={{ color: selectedArea.color }}>
                      {selectedArea.score}/10
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Completed Items:</span>
                    <span className="ml-2 font-bold">
                      {selectedArea.details.checklist.filter((item) => item.completed).length}/
                      {selectedArea.details.checklist.length}
                    </span>
                  </div>
                </div>
              </div>

              <Button 
                onClick={() => setIsDetailsDialogOpen(false)} 
                className="w-full"
                disabled={saving || loading}
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isColorDialogOpen} onOpenChange={setIsColorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose Color for {editingArea?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-6 gap-3 p-4">
            {distinctManlyColors.map((color) => (
              <button
                key={color}
                className="w-12 h-12 rounded-full border-2 border-gray-300 hover:border-gray-600 transition-colors"
                style={{ backgroundColor: color }}
                onClick={() => editingArea && updateColor(editingArea.id, color)}
                disabled={saving || loading}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}   