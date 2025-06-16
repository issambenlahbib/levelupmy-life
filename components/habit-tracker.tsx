"use client"
import React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Trash2, GripVertical, ChevronLeft, ChevronRight } from "lucide-react"
import { db } from "@/lib/firebase/firebaseConfig"
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore"
import { useAuth } from "./contexts/auth-context"
import { debounce } from "lodash"

interface Habit {
  id: string
  name: string
  completions: Record<string, boolean>
}

export function HabitTracker() {
  const { user } = useAuth()
  const [habits, setHabits] = useState<Habit[]>([])
  const [newHabitName, setNewHabitName] = useState("")
  const [currentWeekStart, setCurrentWeekStart] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  const currentDate = new Date()
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

  const daysToShow = 7
  const maxWeeks = Math.ceil(daysInMonth / daysToShow)

  // Load habits from Firestore
  useEffect(() => {
    if (!user) return
    
    const loadHabits = async () => {
      try {
        setLoading(true)
        const userDocRef = doc(db, "habitTrackers", user.uid)
        const docSnap = await getDoc(userDocRef)
        
        if (docSnap.exists()) {
          const data = docSnap.data()
          setHabits(data.habits || [])
        } else {
          await setDoc(userDocRef, { habits: [] })
          setHabits([])
        }
      } catch (error) {
        console.error("Error loading habits:", error)
      } finally {
        setLoading(false)
      }
    }

    loadHabits()
  }, [user])

  // Debounced save function
  const saveHabits = debounce(async () => {
    if (!user || saving) return
    
    try {
      setSaving(true)
      const userDocRef = doc(db, "habitTrackers", user.uid)
      await updateDoc(userDocRef, { habits })
      setLastSaved(new Date())
    } catch (error) {
      console.error("Error saving habits:", error)
    } finally {
      setSaving(false)
    }
  }, 1000)

  // Save whenever habits change
  useEffect(() => {
    if (habits.length > 0 && user) {
      saveHabits()
    }
  }, [habits])

  const addHabit = () => {
    if (newHabitName.trim()) {
      const newHabit: Habit = {
        id: Date.now().toString(),
        name: newHabitName.trim(),
        completions: {},
      }
      
      setHabits([...habits, newHabit])
      setNewHabitName("")
    }
  }

  const deleteHabit = (id: string) => {
    setHabits(habits.filter((habit) => habit.id !== id))
  }

  const toggleCompletion = (habitId: string, day: number) => {
    const dateKey = `${currentYear}-${currentMonth + 1}-${day}`
    
    setHabits(
      habits.map((habit) => {
        if (habit.id === habitId) {
          return {
            ...habit,
            completions: {
              ...habit.completions,
              [dateKey]: !habit.completions[dateKey],
            },
          }
        }
        return habit
      }),
    )
  }

  const getDayName = (day: number) => {
    const date = new Date(currentYear, currentMonth, day)
    return date.toLocaleDateString("en-US", { weekday: "short" })
  }

  const getCurrentDays = () => {
    const startDay = currentWeekStart * daysToShow + 1
    const endDay = Math.min(startDay + daysToShow - 1, daysInMonth)
    return Array.from({ length: endDay - startDay + 1 }, (_, i) => startDay + i)
  }

  const navigateWeek = (direction: "prev" | "next") => {
    if (direction === "prev" && currentWeekStart > 0) {
      setCurrentWeekStart(currentWeekStart - 1)
    } else if (direction === "next" && currentWeekStart < maxWeeks - 1) {
      setCurrentWeekStart(currentWeekStart + 1)
    }
  }

  const currentDays = getCurrentDays()

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-electric-blue/30">
      <CardHeader>
        <CardTitle className="text-electric-blue text-xl font-bold">
          Habit Tracker - {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          {saving && <span className="ml-2 text-sm text-electric-blue">Saving...</span>}
          {lastSaved && !saving && (
            <span className="ml-2 text-sm text-green-600">
              Saved at {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </CardTitle>
        <div className="flex gap-2">
          <Input
            placeholder="Add new habit..."
            value={newHabitName}
            onChange={(e) => setNewHabitName(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && addHabit()}
            className="border-electric-blue/50 focus:border-electric-blue"
            disabled={saving}
          />
          <Button 
            onClick={addHabit} 
            className="bg-electric-blue hover:bg-electric-blue/80 text-white"
            disabled={saving || !newHabitName.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-full">
            {/* Navigation */}
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="outline"
                onClick={() => navigateWeek("prev")}
                disabled={currentWeekStart === 0 || saving}
                className="border-electric-blue text-electric-blue hover:bg-electric-blue hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-electric-green font-bold text-lg">
                Week {currentWeekStart + 1} of {maxWeeks}
              </span>
              <Button
                variant="outline"
                onClick={() => navigateWeek("next")}
                disabled={currentWeekStart >= maxWeeks - 1 || saving}
                className="border-electric-blue text-electric-blue hover:bg-electric-blue hover:text-white"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Loading indicator */}
            {loading && (
              <div className="text-center py-8 text-electric-blue">
                Loading your habits...
              </div>
            )}

            {!loading && (
              <div className="w-full">
                {/* Date row as a separate section with transparent background */}
                <div className="flex items-center bg-transparent mb-2">
                  <div className="w-48"></div> {/* Placeholder for habit name column */}
                  {currentDays.map((day) => (
                    <div
                      key={day}
                      className="flex-1 text-center font-bold text-electric-orange p-2"
                    >
                      <div>{day}</div>
                      <div className="text-xs text-electric-cyan">{getDayName(day)}</div>
                    </div>
                  ))}
                </div>

                {/* Habit rows as separate sections */}
                {habits.length > 0 ? (
                  habits.map((habit) => (
                    <div key={habit.id} className="flex items-center bg-white mb-2 p-2 rounded-lg shadow-sm">
                      <div className="flex items-center gap-2 w-48">
                        <GripVertical className="h-4 w-4 text-electric-purple" />
                        <span className="truncate font-medium text-slate-800">{habit.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteHabit(habit.id)}
                          disabled={saving}
                          className="text-electric-red hover:bg-electric-red/20 ml-auto"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      {currentDays.map((day) => {
                        const dateKey = `${currentYear}-${currentMonth + 1}-${day}`
                        const isCompleted = habit.completions[dateKey] || false
                        return (
                          <div
                            key={day}
                            className="flex-1 flex justify-center items-center"
                          >
                            <Checkbox
                              checked={isCompleted}
                              onCheckedChange={() => toggleCompletion(habit.id, day)}
                              disabled={saving}
                              className="border-2 border-electric-blue data-[state=checked]:bg-electric-green data-[state=checked]:border-electric-green"
                            />
                          </div>
                        )
                      })}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-electric-blue">
                    No habits yet. Add your first habit!
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}