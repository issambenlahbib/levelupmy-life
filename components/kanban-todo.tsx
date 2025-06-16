"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, Edit, Trash2, FileText } from "lucide-react"
import { db } from "@/lib/firebase/firebaseConfig"
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore"
import { useAuth } from "./contexts/auth-context"
import { debounce } from "lodash"

interface Task {
  id: string
  title: string
  description: string
  notes: string
  status: "todo" | "inprogress" | "completed"
  createdAt: string
  completedAt?: string
}

export function KanbanTodo() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [viewingNotes, setViewingNotes] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Load tasks from Firestore
  useEffect(() => {
    if (!user) return

    const loadTasks = async () => {
      try {
        setLoading(true)
        const userDocRef = doc(db, "users", user.uid, "tasks", "data")
        const docSnap = await getDoc(userDocRef)

        if (docSnap.exists()) {
          const data = docSnap.data()
          setTasks(data.tasks || [])
        } else {
          // Create new document if it doesn't exist
          await setDoc(userDocRef, { tasks: [] })
          setTasks([])
        }
      } catch (error) {
        console.error("Error loading tasks:", error)
      } finally {
        setLoading(false)
      }
    }

    loadTasks()
  }, [user])

  // Auto-delete completed tasks after 1 week
  useEffect(() => {
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    setTasks((prevTasks) =>
      prevTasks.filter((task) => {
        if (task.status === "completed" && task.completedAt) {
          const completedDate = new Date(task.completedAt)
          return completedDate > oneWeekAgo
        }
        return true
      }),
    )
  }, [])

  // Debounced save function
  const saveTasks = debounce(async () => {
    if (!user || saving) return

    try {
      setSaving(true)
      const userDocRef = doc(db, "users", user.uid, "tasks", "data")
      await updateDoc(userDocRef, { tasks })
      setLastSaved(new Date())
    } catch (error) {
      console.error("Error saving tasks:", error)
    } finally {
      setSaving(false)
    }
  }, 1000)

  // Save whenever tasks change
  useEffect(() => {
    if (tasks.length > 0 && user) {
      saveTasks()
    }
  }, [tasks])

  const addTask = () => {
    if (newTaskTitle.trim()) {
      const newTask: Task = {
        id: Date.now().toString(),
        title: newTaskTitle.trim(),
        description: "",
        notes: "",
        status: "todo",
        createdAt: new Date().toISOString(),
      }
      setTasks([...tasks, newTask])
      setNewTaskTitle("")
    }
  }

  const updateTask = (updatedTask: Task) => {
    setTasks(tasks.map((task) => (task.id === updatedTask.id ? updatedTask : task)))
  }

  const deleteTask = (id: string) => {
    setTasks(tasks.filter((task) => task.id !== id))
  }

  const moveTask = (id: string, newStatus: Task["status"]) => {
    setTasks(
      tasks.map((task) => {
        if (task.id === id) {
          const updatedTask = { ...task, status: newStatus }
          if (newStatus === "completed") {
            updatedTask.completedAt = new Date().toISOString()
          }
          return updatedTask
        }
        return task
      }),
    )
  }

  const openEditDialog = (task?: Task) => {
    if (task) {
      setEditingTask(task)
    } else {
      setEditingTask({
        id: "",
        title: "",
        description: "",
        notes: "",
        status: "todo",
        createdAt: new Date().toISOString(),
      })
    }
    setIsDialogOpen(true)
  }

  const saveTask = () => {
    if (!editingTask || !editingTask.title.trim()) return

    if (editingTask.id) {
      updateTask(editingTask)
    } else {
      const newTask = {
        ...editingTask,
        id: Date.now().toString(),
        title: editingTask.title.trim(),
      }
      setTasks([...tasks, newTask])
    }

    setIsDialogOpen(false)
    setEditingTask(null)
  }

  const getTasksByStatus = (status: Task["status"]) => {
    return tasks.filter((task) => task.status === status)
  }

  const getTaskCardColor = (status: Task["status"]) => {
    switch (status) {
      case "todo":
        return "bg-red-100 border-red-300 dark:bg-red-950/30 dark:border-red-800"
      case "inprogress":
        return "bg-orange-100 border-orange-300 dark:bg-orange-950/30 dark:border-orange-800"
      case "completed":
        return "bg-green-100 border-green-300 dark:bg-green-950/30 dark:border-green-800"
      default:
        return "bg-background"
    }
  }

  const columns = [
    { id: "todo", title: "To Do" },
    { id: "inprogress", title: "In Progress" },
    { id: "completed", title: "Completed" },
  ] as const

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Task Board</h2>
        <div className="flex items-center gap-2">
          {saving && <span className="text-sm text-slate-500">Saving...</span>}
          {lastSaved && !saving && (
            <span className="text-sm text-green-600">
              Saved at {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <Input
            placeholder="Quick add task..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && addTask()}
            className="w-64"
            disabled={loading || saving}
          />
          <Button onClick={addTask} disabled={loading || saving}>
            <Plus className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => openEditDialog()} disabled={loading || saving}>
            <Plus className="h-4 w-4 mr-2" />
            Detailed Task
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-slate-600">
          Loading your tasks...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {columns.map((column) => (
            <Card key={column.id} className="bg-white dark:bg-gray-900">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {column.title}
                  <span className="text-sm font-normal">{getTasksByStatus(column.id).length}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {getTasksByStatus(column.id).map((task) => (
                  <Card key={task.id} className={`p-3 shadow-sm border-2 ${getTaskCardColor(task.status)}`}>
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium text-sm">{task.title}</h4>
                        <div className="flex gap-1">
                          {task.notes && (
                            <Button variant="ghost" size="sm" onClick={() => setViewingNotes(task)} disabled={saving}>
                              <FileText className="h-3 w-3" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(task)} disabled={saving}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteTask(task.id)} disabled={saving}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {task.description && <p className="text-xs text-muted-foreground">{task.description}</p>}

                      <div className="flex gap-1 flex-wrap">
                        {columns.map(
                          (col) =>
                            col.id !== task.status && (
                              <Button
                                key={col.id}
                                variant="outline"
                                size="sm"
                                className="text-xs h-6"
                                onClick={() => moveTask(task.id, col.id)}
                                disabled={saving}
                              >
                                → {col.title}
                              </Button>
                            ),
                        )}
                      </div>

                      {task.status === "completed" && task.completedAt && (
                        <p className="text-xs text-muted-foreground">
                          Completed: {new Date(task.completedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </Card>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Task Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTask?.id ? "Edit Task" : "Add New Task"}</DialogTitle>
          </DialogHeader>
          {editingTask && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <Input
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                  placeholder="Task title..."
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <Textarea
                  value={editingTask.description}
                  onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                  placeholder="Task description..."
                  rows={3}
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Notes</label>
                <Textarea
                  value={editingTask.notes}
                  onChange={(e) => setEditingTask({ ...editingTask, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={4}
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <select
                  value={editingTask.status}
                  onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value as Task["status"] })}
                  className="w-full p-2 border rounded-md"
                  disabled={saving}
                >
                  {columns.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button onClick={saveTask} className="flex-1" disabled={saving || !editingTask.title.trim()}>
                  {editingTask.id ? "Update" : "Add"} Task
                </Button>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={saving}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Notes Dialog */}
      <Dialog open={!!viewingNotes} onOpenChange={() => setViewingNotes(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{viewingNotes?.title} - Notes</DialogTitle>
          </DialogHeader>
          {viewingNotes && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <pre className="whitespace-pre-wrap text-sm">{viewingNotes.notes || "No notes available."}</pre>
              </div>
              <Button onClick={() => setViewingNotes(null)} className="w-full" disabled={saving}>
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}