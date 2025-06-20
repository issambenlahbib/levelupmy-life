"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { ChevronLeft, ChevronRight, Plus, Trash2, Eye, EyeOff } from "lucide-react"
import { db } from "@/lib/firebase/firebaseConfig"
import { doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore"
import { useAuth } from "./contexts/auth-context"
import { debounce } from "lodash"

interface Task {
  id: string
  title: string
  startHour: number
  duration: number
  date: string
  color: string
  visible: boolean
}

const taskColors = [
  "#1E3A8A", // Deep Navy
  "#065F46", // Forest Green
  "#7B341E", // Rust Brown
  "#701A75", // Deep Purple
  "#450A0A", // Mahogany
  "#374151", // Gunmetal
  "#0F172A", // Midnight Blue
  "#422006", // Coffee Brown
]

export function CalendarView() {
  const { user } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [tasks, setTasks] = useState<Record<string, Task[]>>({})
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [newTaskHour, setNewTaskHour] = useState(9)
  const [newTaskDuration, setNewTaskDuration] = useState(1)
  const [newTaskColor, setNewTaskColor] = useState(taskColors[0])
  const [showTasksOnCalendar, setShowTasksOnCalendar] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Get month key for Firestore
  const getMonthKey = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    return `${year}-${month}`
  }

  // Load tasks from Firestore
  useEffect(() => {
    if (!user) return
    
    const monthKey = getMonthKey()
    const userDocRef = doc(db, "users", user.uid, "calendar", monthKey)
    
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setTasks(docSnap.data().tasks || {})
      } else {
        setTasks({})
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [currentDate, user])

  // Debounced save function
  const saveTasks = debounce(async () => {
    if (!user || saving) return
    
    try {
      setSaving(true)
      const monthKey = getMonthKey()
      const userDocRef = doc(db, "users", user.uid, "calendar", monthKey)
      await setDoc(userDocRef, { tasks }, { merge: true })
      setLastSaved(new Date())
    } catch (error) {
      console.error("Error saving tasks:", error)
    } finally {
      setSaving(false)
    }
  }, 1000) // 1 second debounce

  // Save whenever tasks change
  useEffect(() => {
    if (Object.keys(tasks).length > 0 && user) {
      saveTasks()
    }
  }, [tasks])

  useEffect(() => {
    localStorage.setItem("showTasksOnCalendar", JSON.stringify(showTasksOnCalendar))
  }, [showTasksOnCalendar])

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }

    return days
  }

  const formatDateKey = (date: Date) => {
    return date.toISOString().split("T")[0]
  }

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const openDayPlanner = (date: Date) => {
    setSelectedDate(formatDateKey(date))
  }

  const addTask = () => {
    if (!selectedDate || !newTaskTitle.trim()) return

    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle.trim(),
      startHour: newTaskHour,
      duration: newTaskDuration,
      date: selectedDate,
      color: newTaskColor,
      visible: true,
    }

    setTasks((prev) => ({
      ...prev,
      [selectedDate]: [...(prev[selectedDate] || []), newTask],
    }))

    setNewTaskTitle("")
    setNewTaskHour(9)
    setNewTaskDuration(1)
  }

  const deleteTask = (taskId: string) => {
    if (!selectedDate) return

    setTasks((prev) => ({
      ...prev,
      [selectedDate]: (prev[selectedDate] || []).filter((task) => task.id !== taskId),
    }))
  }

  const toggleTaskVisibility = (taskId: string) => {
    if (!selectedDate) return

    setTasks((prev) => ({
      ...prev,
      [selectedDate]: (prev[selectedDate] || []).map((task) =>
        task.id === taskId ? { ...task, visible: !task.visible } : task
      ),
    }))
  }

  const getTasksForDate = (date: string) => {
    return tasks[date] || []
  }

  const getVisibleTasksForDate = (date: string) => {
    return getTasksForDate(date).filter((task) => task.visible)
  }

  const hours = Array.from({ length: 24 }, (_, i) => i)
  const days = getDaysInMonth(currentDate)

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <Card className="bg-gradient-to-r from-slate-100 to-slate-200 border-2 border-slate-300">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-slate-800 text-xl font-bold">
              {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              {loading && <span className="ml-2 text-sm text-slate-500">Loading...</span>}
              {saving && <span className="ml-2 text-sm text-slate-500">Saving...</span>}
              {lastSaved && !saving && (
                <span className="ml-2 text-sm text-green-600">
                  Saved at {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowTasksOnCalendar(!showTasksOnCalendar)}
                className="border-slate-400 text-slate-700"
              >
                {showTasksOnCalendar ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Hide Tasks
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Show Tasks
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigateMonth("prev")}
                className="border-slate-400 text-slate-700"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => navigateMonth("next")}
                className="border-slate-400 text-slate-700"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Day headers */}
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="p-2 text-center font-bold text-sm text-slate-700 bg-slate-300 rounded">
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {days.map((day, index) => (
              <div key={index} className="aspect-square">
                {day && (
                  <Button
                    variant="ghost"
                    className="w-full h-full p-1 flex flex-col items-start justify-start hover:bg-slate-300 border border-slate-300 text-left"
                    onClick={() => openDayPlanner(day)}
                  >
                    <span className="text-sm font-bold text-slate-800 mb-1">{day.getDate()}</span>
                    {showTasksOnCalendar && getVisibleTasksForDate(formatDateKey(day)).length > 0 && (
                      <div className="w-full space-y-1">
                        {getVisibleTasksForDate(formatDateKey(day))
                          .slice(0, 3)
                          .map((task) => (
                            <div
                              key={task.id}
                              className="text-xs px-1 py-0.5 rounded text-white truncate"
                              style={{ backgroundColor: task.color }}
                              title={task.title}
                            >
                              {task.title}
                            </div>
                          ))}
                        {getVisibleTasksForDate(formatDateKey(day)).length > 3 && (
                          <div className="text-xs text-slate-700">
                            +{getVisibleTasksForDate(formatDateKey(day)).length - 3} more
                          </div>
                        )}
                      </div>
                    )}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Day Planner Dialog */}
      <Dialog open={!!selectedDate} onOpenChange={() => setSelectedDate(null)}>
  <DialogContent className="w-full sm:w-[95vw] max-w-[1200px] max-h-[80vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle className="text-slate-800">
        Day Planner -{" "}
        {selectedDate &&
          new Date(selectedDate).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
      </DialogTitle>
    </DialogHeader>

    {selectedDate && (
      <div className="space-y-4">
        {/* Add Task Form */}
        <Card className="bg-gradient-to-r from-slate-100 to-slate-200 border border-slate-300">
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[150px] sm:min-w-[200px]">
                <label className="block text-sm font-medium mb-1 text-slate-700">Task</label>
                <Input
                  placeholder="Task title..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="border-slate-400"
                  disabled={saving}
                />
              </div>
              <div className="w-1/2 sm:w-auto">
                <label className="block text-sm font-medium mb-1 text-slate-700">Start Hour</label>
                <select
                  value={newTaskHour}
                  onChange={(e) => setNewTaskHour(Number(e.target.value))}
                  className="p-2 border border-slate-400 rounded-md w-full"
                  disabled={saving}
                >
                  {hours.map((hour) => (
                    <option key={hour} value={hour}>
                      {hour.toString().padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-1/2 sm:w-auto">
                <label className="block text-sm font-medium mb-1 text-slate-700">Duration (hrs)</label>
                <Input
                  type="number"
                  min="0.5"
                  max="12"
                  step="0.5"
                  value={newTaskDuration}
                  onChange={(e) => setNewTaskDuration(Number(e.target.value))}
                  className="w-full sm:w-20 border-slate-400"
                  disabled={saving}
                />
              </div>
              <div className="w-1/2 sm:w-auto">
                <label className="block text-sm font-medium mb-1 text-slate-700">Color</label>
                <select
                  value={newTaskColor}
                  onChange={(e) => setNewTaskColor(e.target.value)}
                  className="p-2 border border-slate-400 rounded-md w-full"
                  style={{ backgroundColor: newTaskColor, color: "white" }}
                  disabled={saving}
                >
                  {taskColors.map((color) => (
                    <option key={color} value={color} style={{ backgroundColor: color }} />
                  ))}
                </select>
              </div>
              <Button 
                onClick={addTask} 
                className="bg-slate-800 hover:bg-slate-700 text-white"
                disabled={!newTaskTitle.trim() || saving}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Gantt-style Schedule */}
        <Card className="bg-white border border-slate-300">
          <CardHeader>
            <CardTitle className="text-slate-800">Daily Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full overflow-x-auto">
              <div className="min-w-[1100px]">
                {/* Hour headers */}
                <div className="grid grid-cols-[200px_repeat(24,1fr)] gap-1 mb-2">
                  <div className="font-bold text-slate-700">Tasks</div>
                  {hours.map((hour) => (
                    <div key={hour} className="text-center text-xs font-bold text-slate-700">
                      {hour.toString().padStart(2, "0")}
                    </div>
                  ))}
                </div>

                {/* Task rows */}
                {getTasksForDate(selectedDate).map((task) => (
                  <div key={task.id} className="grid grid-cols-[200px_repeat(24,1fr)] gap-1 mb-2 items-center">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={task.visible}
                        onCheckedChange={() => toggleTaskVisibility(task.id)}
                        className="border-slate-500"
                        disabled={saving}
                      />
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: task.color }} />
                      <span
                        className={`text-sm truncate font-medium ${!task.visible ? "text-slate-400" : "text-slate-800"}`}
                      >
                        {task.title}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteTask(task.id)}
                        className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 ml-auto"
                        disabled={saving}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    {hours.map((hour) => {
                      const isTaskHour = hour >= task.startHour && hour < task.startHour + task.duration
                      return (
                        <div
                          key={hour}
                          className={`h-8 border border-slate-200 ${
                            isTaskHour ? "text-white font-bold" : "bg-slate-50"
                          } ${!task.visible ? "opacity-30" : ""}`}
                          style={{
                            backgroundColor: isTaskHour ? task.color : undefined,
                          }}
                        />
                      )
                    })}
                  </div>
                ))}

                {getTasksForDate(selectedDate).length === 0 && (
                  <div className="text-center text-slate-500 py-8">No tasks scheduled for this day</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )}
  </DialogContent>
</Dialog>

    </div>
  )
}