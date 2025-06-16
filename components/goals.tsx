"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Edit, Trash2, GripVertical } from "lucide-react"
import { db } from "@/lib/firebase/firebaseConfig"
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore"
import { useAuth } from "./contexts/auth-context"
import { debounce } from "lodash"

interface Goal {
  id: string
  title: string
  description: string
  category: string
  color: string
  createdAt: string
}

const goalColors = [
  "#1E3A8A", // Deep Navy
  "#065F46", // Forest Green
  "#7B341E", // Rust Brown
  "#701A75", // Deep Purple
  "#450A0A", // Mahogany
  "#374151", // Gunmetal
  "#0F172A", // Midnight Blue
  "#422006", // Coffee Brown
  "#0066FF", // Electric Blue
  "#00FF66", // Electric Green
  "#FF6600", // Electric Orange
  "#6600FF", // Electric Purple
]

// Fixed categories for time periods
const categories = ["Weekly", "Monthly", "6 Months", "1 Year", "3 Years", "10 Years"]

export function Goals() {
  const { user } = useAuth()
  const [goals, setGoals] = useState<Goal[]>([])
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: categories[0],
    color: goalColors[0],
  })
  const [draggedGoal, setDraggedGoal] = useState<Goal | null>(null)
  const [draggedOverCategory, setDraggedOverCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Load goals from Firestore
  useEffect(() => {
    if (!user) return
    
    const loadGoals = async () => {
      try {
        setLoading(true)
        const userDocRef = doc(db, "users", user.uid, "goals", "data")
        const docSnap = await getDoc(userDocRef)
        
        if (docSnap.exists()) {
          const data = docSnap.data()
          setGoals(data.goals || [])
        } else {
          // Create new document if it doesn't exist
          await setDoc(userDocRef, { goals: [] })
          setGoals([])
        }
      } catch (error) {
        console.error("Error loading goals:", error)
      } finally {
        setLoading(false)
      }
    }

    loadGoals()
  }, [user])

  // Debounced save function
  const saveGoals = debounce(async () => {
    if (!user || saving) return
    
    try {
      setSaving(true)
      const userDocRef = doc(db, "users", user.uid, "goals", "data")
      await updateDoc(userDocRef, { goals })
      setLastSaved(new Date())
    } catch (error) {
      console.error("Error saving goals:", error)
    } finally {
      setSaving(false)
    }
  }, 1000)

  // Save whenever goals change
  useEffect(() => {
    if (goals.length > 0 && user) {
      saveGoals()
    }
  }, [goals])

  const openDialog = (goal?: Goal) => {
    if (goal) {
      setEditingGoal(goal)
      setFormData({
        title: goal.title,
        description: goal.description,
        category: goal.category,
        color: goal.color || goalColors[0],
      })
    } else {
      setEditingGoal(null)
      setFormData({
        title: "",
        description: "",
        category: categories[0],
        color: goalColors[0],
      })
    }
    setIsDialogOpen(true)
  }

  const saveGoal = () => {
    if (!formData.title.trim()) return

    if (editingGoal) {
      setGoals(goals.map((goal) => (goal.id === editingGoal.id ? { ...goal, ...formData } : goal)))
    } else {
      const newGoal: Goal = {
        id: Date.now().toString(),
        ...formData,
        createdAt: new Date().toISOString(),
      }
      setGoals([...goals, newGoal])
    }

    setIsDialogOpen(false)
    setEditingGoal(null)
    setFormData({ title: "", description: "", category: categories[0], color: goalColors[0] })
  }

  const deleteGoal = (id: string) => {
    setGoals(goals.filter((goal) => goal.id !== id))
  }

  const handleDragStart = (goal: Goal) => {
    setDraggedGoal(goal)
  }

  const handleDragOver = (e: React.DragEvent, category: string) => {
    e.preventDefault()
    setDraggedOverCategory(category)
  }

  const handleDragLeave = () => {
    setDraggedOverCategory(null)
  }

  const handleDrop = (category: string) => {
    if (draggedGoal && draggedGoal.category !== category) {
      setGoals(goals.map((goal) => (goal.id === draggedGoal.id ? { ...goal, category } : goal)))
    }
    setDraggedGoal(null)
    setDraggedOverCategory(null)
  }

  const getGoalsByCategory = (category: string) => {
    return goals.filter((goal) => goal.category === category)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Goals</h2>
        <div className="flex items-center gap-2">
          {saving && <span className="text-sm text-slate-500">Saving...</span>}
          {lastSaved && !saving && (
            <span className="text-sm text-green-600">
              Saved at {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => openDialog()} 
                className="bg-slate-800 hover:bg-slate-700"
                disabled={loading || saving}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Goal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingGoal ? "Edit Goal" : "Add New Goal"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Title</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Goal title..."
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Goal description..."
                    rows={3}
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Time Frame</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2 border rounded-md"
                    disabled={saving}
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Color</label>
                  <div className="flex gap-2 flex-wrap">
                    {goalColors.map((color) => (
                      <button
                        key={color}
                        className={`w-8 h-8 rounded-full border-2 ${
                          formData.color === color ? "border-gray-800" : "border-gray-300"
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setFormData({ ...formData, color })}
                        disabled={saving}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={saveGoal} 
                    className="flex-1 bg-slate-800 hover:bg-slate-700"
                    disabled={saving || !formData.title.trim()}
                  >
                    {editingGoal ? "Update" : "Add"} Goal
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-slate-600">
          Loading your goals...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {categories.map((category) => (
            <Card
              key={category}
              className={`h-fit ${draggedOverCategory === category ? "ring-2 ring-slate-500" : ""}`}
              onDragOver={(e) => handleDragOver(e, category)}
              onDragLeave={handleDragLeave}
              onDrop={() => handleDrop(category)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{category}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {getGoalsByCategory(category).map((goal) => (
                  <Card 
                    key={goal.id} 
                    className="p-3 bg-muted/50 border-l-4" 
                    style={{ borderLeftColor: goal.color }}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div
                          className="cursor-grab flex items-center"
                          draggable
                          onDragStart={() => handleDragStart(goal)}
                        >
                          <GripVertical className="h-4 w-4 text-slate-400 mr-1" />
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => openDialog(goal)}
                            disabled={saving}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => deleteGoal(goal.id)}
                            disabled={saving}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <h4 className="font-medium text-sm" style={{ color: goal.color }}>
                        {goal.title}
                      </h4>
                      {goal.description && <p className="text-xs text-muted-foreground">{goal.description}</p>}
                    </div>
                  </Card>
                ))}
                {getGoalsByCategory(category).length === 0 && (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    Drag goals here or add a new goal
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}