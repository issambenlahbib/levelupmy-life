"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Trash2, Upload, FileText, Download, ChevronDown, ChevronRight, Palette } from "lucide-react"
import { db } from "@/lib/firebase/firebaseConfig"
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore"
import { useAuth } from "./contexts/auth-context"
import { debounce } from "lodash"

interface SubNote {
  id: string
  title: string
  content: string
  completed?: boolean
  color: string
}

interface Note {
  id: string
  title: string
  content: string
  subNotes: SubNote[]
  attachments: { id: string; name: string; url: string; type: string }[]
  createdAt: string
  updatedAt: string
  expanded?: boolean
  color: string
}

interface Category {
  id: string
  name: string
  notes: Note[]
  color: string
}

const manlyColors = [
  "#1E3A8A", "#7F1D1D", "#065F46", "#7B341E", "#701A75",
  "#450A0A", "#374151", "#0F172A", "#422006", "#2D3748",
  "#9F580A", "#3F3F46"
]

const defaultCategories: Category[] = [
  { id: "personal", name: "Personal", notes: [], color: "#1E3A8A" },
  { id: "shopping", name: "Shopping", notes: [], color: "#7F1D1D" },
  { id: "books", name: "From Books", notes: [], color: "#065F46" },
  { id: "work", name: "Work", notes: [], color: "#7B341E" },
  { id: "ideas", name: "Ideas", notes: [], color: "#701A75" },
]

export function Notes() {
  const { user } = useAuth()
  const [categories, setCategories] = useState<Category[]>(defaultCategories)
  const [selectedCategory, setSelectedCategory] = useState<string>("personal")
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [newNoteTitle, setNewNoteTitle] = useState("")
  const [editingNote, setEditingNote] = useState<{ noteId: string; field: string } | null>(null)
  const [editingSubNote, setEditingSubNote] = useState<{ noteId: string; subNoteId: string; field: string } | null>(
    null,
  )
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [isCategoryColorDialogOpen, setIsCategoryColorDialogOpen] = useState(false)
  const [editingNoteColor, setEditingNoteColor] = useState<Note | null>(null)
  const [isNoteColorDialogOpen, setIsNoteColorDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load notes data from Firestore
  useEffect(() => {
    if (!user) return
    
    const loadNotes = async () => {
      try {
        setLoading(true)
        const userDocRef = doc(db, "notes", user.uid)
        const docSnap = await getDoc(userDocRef)
        
        if (docSnap.exists()) {
          const data = docSnap.data()
          const savedCategories = data.categories || defaultCategories
          const categoriesWithDefaults = savedCategories.map((cat: any) => ({
            ...cat,
            color: cat.color || "#1E3A8A",
            notes: cat.notes.map((note: any) => ({
              ...note,
              attachments: note.attachments || [],
              subNotes: (note.subNotes || []).map((subNote: any) => ({
                ...subNote,
                color: subNote.color || "#374151",
              })),
              expanded: note.expanded || false,
              color: note.color || "#374151",
            })),
          }))
          setCategories(categoriesWithDefaults)
        } else {
          await setDoc(userDocRef, { categories: defaultCategories })
          setCategories(defaultCategories)
        }
      } catch (error) {
        console.error("Error loading notes data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadNotes()
  }, [user])

  // Debounced save function
  const saveNotes = debounce(async () => {
    if (!user || saving) return
    
    try {
      setSaving(true)
      const userDocRef = doc(db, "notes", user.uid)
      await updateDoc(userDocRef, { categories })
      setLastSaved(new Date())
    } catch (error) {
      console.error("Error saving notes data:", error)
    } finally {
      setSaving(false)
    }
  }, 1000)

  // Save whenever categories change
  useEffect(() => {
    if (user && !loading) {
      saveNotes()
    }
  }, [categories])

  const addCategory = () => {
    if (newCategoryName.trim()) {
      const newCategory: Category = {
        id: Date.now().toString(),
        name: newCategoryName.trim(),
        notes: [],
        color: manlyColors[0],
      }
      setCategories([...categories, newCategory])
      setNewCategoryName("")
      setIsAddingCategory(false)
    }
  }

  const deleteCategory = (categoryId: string) => {
    setCategories(categories.filter((cat) => cat.id !== categoryId))
    if (selectedCategory === categoryId) {
      setSelectedCategory(categories[0]?.id || "")
    }
  }

  const updateCategoryColor = (categoryId: string, color: string) => {
    setCategories(categories.map((cat) => (cat.id === categoryId ? { ...cat, color } : cat)))
    setIsCategoryColorDialogOpen(false)
    setEditingCategory(null)
  }

  const addNote = () => {
    if (newNoteTitle.trim()) {
      const newNote: Note = {
        id: Date.now().toString(),
        title: newNoteTitle.trim(),
        content: "",
        subNotes: [],
        attachments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        expanded: false,
        color: "#374151",
      }

      setCategories(
        categories.map((cat) => (cat.id === selectedCategory ? { ...cat, notes: [...cat.notes, newNote] } : cat)),
      )

      setNewNoteTitle("")
      setIsAddingNote(false)
    }
  }

  const updateNote = (noteId: string, field: string, value: string) => {
    setCategories(
      categories.map((cat) =>
        cat.id === selectedCategory
          ? {
              ...cat,
              notes: cat.notes.map((note) =>
                note.id === noteId ? { ...note, [field]: value, updatedAt: new Date().toISOString() } : note,
              ),
            }
          : cat,
      ),
    )
  }

  const updateNoteColor = (noteId: string, color: string) => {
    setCategories(
      categories.map((cat) =>
        cat.id === selectedCategory
          ? {
              ...cat,
              notes: cat.notes.map((note) =>
                note.id === noteId ? { ...note, color, updatedAt: new Date().toISOString() } : note,
              ),
            }
          : cat,
      ),
    )
    setIsNoteColorDialogOpen(false)
    setEditingNoteColor(null)
  }

  const toggleNoteExpansion = (noteId: string) => {
    setCategories(
      categories.map((cat) =>
        cat.id === selectedCategory
          ? {
              ...cat,
              notes: cat.notes.map((note) => (note.id === noteId ? { ...note, expanded: !note.expanded } : note)),
            }
          : cat,
      ),
    )
  }

  const addSubNote = (noteId: string) => {
    const newSubNote: SubNote = {
      id: Date.now().toString(),
      title: "New sub-note",
      content: "",
      completed: false,
      color: "#374151",
    }

    setCategories(
      categories.map((cat) =>
        cat.id === selectedCategory
          ? {
              ...cat,
              notes: cat.notes.map((note) =>
                note.id === noteId
                  ? { ...note, subNotes: [...note.subNotes, newSubNote], updatedAt: new Date().toISOString() }
                  : note,
              ),
            }
          : cat,
      ),
    )
  }

  const updateSubNote = (noteId: string, subNoteId: string, field: string, value: string | boolean) => {
    setCategories(
      categories.map((cat) =>
        cat.id === selectedCategory
          ? {
              ...cat,
              notes: cat.notes.map((note) =>
                note.id === noteId
                  ? {
                      ...note,
                      subNotes: note.subNotes.map((subNote) =>
                        subNote.id === subNoteId ? { ...subNote, [field]: value } : subNote,
                      ),
                      updatedAt: new Date().toISOString(),
                    }
                  : note,
              ),
            }
          : cat,
      ),
    )
  }

  const deleteSubNote = (noteId: string, subNoteId: string) => {
    setCategories(
      categories.map((cat) =>
        cat.id === selectedCategory
          ? {
              ...cat,
              notes: cat.notes.map((note) =>
                note.id === noteId
                  ? {
                      ...note,
                      subNotes: note.subNotes.filter((subNote) => subNote.id !== subNoteId),
                      updatedAt: new Date().toISOString(),
                    }
                  : note,
              ),
            }
          : cat,
      ),
    )
  }

  const deleteNote = (noteId: string) => {
    setCategories(
      categories.map((cat) =>
        cat.id === selectedCategory ? { ...cat, notes: cat.notes.filter((note) => note.id !== noteId) } : cat,
      ),
    )
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, noteId: string) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const attachment = {
          id: Date.now().toString(),
          name: file.name,
          url: e.target?.result as string,
          type: file.type,
        }

        setCategories(
          categories.map((cat) =>
            cat.id === selectedCategory
              ? {
                  ...cat,
                  notes: cat.notes.map((note) =>
                    note.id === noteId
                      ? {
                          ...note,
                          attachments: [...note.attachments, attachment],
                          updatedAt: new Date().toISOString(),
                        }
                      : note,
                  ),
                }
              : cat,
          ),
        )
      }
      reader.readAsDataURL(file)
    }
  }

  const deleteAttachment = (noteId: string, attachmentId: string) => {
    setCategories(
      categories.map((cat) =>
        cat.id === selectedCategory
          ? {
              ...cat,
              notes: cat.notes.map((note) =>
                note.id === noteId
                  ? {
                      ...note,
                      attachments: note.attachments.filter((att) => att.id !== attachmentId),
                      updatedAt: new Date().toISOString(),
                    }
                  : note,
              ),
            }
          : cat,
      ),
    )
  }

  const downloadAttachment = (attachment: { name: string; url: string }) => {
    const link = document.createElement("a")
    link.href = attachment.url
    link.download = attachment.name
    link.click()
  }

  const getCurrentCategory = () => {
    return categories.find((cat) => cat.id === selectedCategory)
  }

  const currentCategory = getCurrentCategory()

  return (
    <div className="flex h-[calc(100vh-200px)] gap-4">
      {/* Categories Sidebar */}
      <Card className="w-64 flex-shrink-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Categories</CardTitle>
            <Button 
              size="sm" 
              onClick={() => setIsAddingCategory(true)}
              disabled={saving || loading}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <div className="text-center py-4 text-slate-600">Loading categories...</div>
          ) : (
            categories.map((category) => (
              <div key={category.id} className="flex items-center justify-between">
                <Button
                  variant={selectedCategory === category.id ? "default" : "ghost"}
                  className="flex-1 justify-start"
                  onClick={() => setSelectedCategory(category.id)}
                  disabled={saving}
                  style={{
                    backgroundColor: selectedCategory === category.id ? category.color : undefined,
                    color: selectedCategory === category.id ? "white" : category.color,
                  }}
                >
                  <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: category.color }} />
                  {category.name} ({category.notes.length})
                </Button>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingCategory(category)
                      setIsCategoryColorDialogOpen(true)
                    }}
                    className="h-6 w-6 p-0"
                    disabled={saving}
                  >
                    <Palette className="h-3 w-3" />
                  </Button>
                  {category.id !== "personal" && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => deleteCategory(category.id)} 
                      className="h-6 w-6 p-0"
                      disabled={saving}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Notes List */}
      <Card className="flex-1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg" style={{ color: currentCategory?.color }}>
              {currentCategory?.name} Notes
              {saving && <span className="ml-2 text-sm text-slate-500">Saving...</span>}
              {lastSaved && !saving && (
                <span className="ml-2 text-sm text-green-600">
                  Saved at {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </CardTitle>
            <Button 
              size="sm" 
              onClick={() => setIsAddingNote(true)}
              disabled={saving || loading}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-slate-600">Loading your notes...</div>
          ) : currentCategory?.notes.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No notes yet. Click the + button to create your first note.
            </div>
          ) : (
            currentCategory?.notes.map((note) => (
              <Card key={note.id} className="p-4 border-l-4" style={{ borderLeftColor: note.color }}>
                <div className="space-y-3">
                  {/* Note Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleNoteExpansion(note.id)}
                        className="h-6 w-6 p-0"
                        disabled={saving}
                      >
                        {note.expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                      {editingNote?.noteId === note.id && editingNote?.field === "title" ? (
                        <Input
                          value={note.title}
                          onChange={(e) => updateNote(note.id, "title", e.target.value)}
                          onBlur={() => setEditingNote(null)}
                          onKeyPress={(e) => e.key === "Enter" && setEditingNote(null)}
                          className="text-lg font-semibold"
                          autoFocus
                          disabled={saving}
                        />
                      ) : (
                        <h3
                          className="text-lg font-semibold cursor-pointer hover:text-blue-600"
                          onClick={() => setEditingNote({ noteId: note.id, field: "title" })}
                          style={{ color: note.color }}
                        >
                          {note.title}
                        </h3>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(note.updatedAt).toLocaleDateString()}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingNoteColor(note)
                          setIsNoteColorDialogOpen(true)
                        }}
                        className="h-6 w-6 p-0"
                        disabled={saving}
                      >
                        <Palette className="h-3 w-3" />
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={(e) => handleFileUpload(e, note.id)}
                        className="hidden"
                        accept="*/*"
                        disabled={saving}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-6 w-6 p-0"
                        disabled={saving}
                      >
                        <Upload className="h-3 w-3" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => deleteNote(note.id)} 
                        className="h-6 w-6 p-0"
                        disabled={saving}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Note Content */}
                  {note.expanded && (
                    <div className="space-y-3 pl-6">
                      {/* Main Content */}
                      <div className="space-y-2">
                        <Textarea
                          value={note.content}
                          onChange={(e) => updateNote(note.id, "content", e.target.value)}
                          placeholder="Add note content..."
                          rows={3}
                          className="resize-none"
                          disabled={saving}
                        />
                      </div>

                      {/* Sub Notes */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium">Sub-notes & Checklists</h4>
                          <Button 
                            size="sm" 
                            onClick={() => addSubNote(note.id)} 
                            className="h-6 text-xs"
                            disabled={saving}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add
                          </Button>
                        </div>
                        {note.subNotes.map((subNote) => (
                          <div
                            key={subNote.id}
                            className="flex items-start gap-2 p-2 rounded border-l-2"
                            style={{ borderLeftColor: subNote.color, backgroundColor: `${subNote.color}10` }}
                          >
                            <Checkbox
                              checked={subNote.completed}
                              onCheckedChange={(checked) =>
                                updateSubNote(note.id, subNote.id, "completed", checked as boolean)
                              }
                              className="mt-1"
                              disabled={saving}
                            />
                            <div className="flex-1 space-y-1">
                              {editingSubNote?.subNoteId === subNote.id && editingSubNote?.field === "title" ? (
                                <Input
                                  value={subNote.title}
                                  onChange={(e) => updateSubNote(note.id, subNote.id, "title", e.target.value)}
                                  onBlur={() => setEditingSubNote(null)}
                                  onKeyPress={(e) => e.key === "Enter" && setEditingSubNote(null)}
                                  className="text-sm"
                                  autoFocus
                                  disabled={saving}
                                />
                              ) : (
                                <div
                                  className={`text-sm cursor-pointer hover:text-blue-600 ${
                                    subNote.completed ? "line-through text-muted-foreground" : ""
                                  }`}
                                  onClick={() =>
                                    setEditingSubNote({ noteId: note.id, subNoteId: subNote.id, field: "title" })
                                  }
                                  style={{ color: subNote.completed ? undefined : subNote.color }}
                                >
                                  {subNote.title}
                                </div>
                              )}
                              {editingSubNote?.subNoteId === subNote.id && editingSubNote?.field === "content" ? (
                                <Textarea
                                  value={subNote.content}
                                  onChange={(e) => updateSubNote(note.id, subNote.id, "content", e.target.value)}
                                  onBlur={() => setEditingSubNote(null)}
                                  placeholder="Add details..."
                                  rows={2}
                                  className="text-xs resize-none"
                                  autoFocus
                                  disabled={saving}
                                />
                              ) : (
                                <div
                                  className="text-xs text-muted-foreground cursor-pointer hover:text-blue-600"
                                  onClick={() =>
                                    setEditingSubNote({ noteId: note.id, subNoteId: subNote.id, field: "content" })
                                  }
                                >
                                  {subNote.content || "Click to add details..."}
                                </div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteSubNote(note.id, subNote.id)}
                              className="h-6 w-6 p-0"
                              disabled={saving}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      {/* Attachments */}
                      {note.attachments.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Attachments</h4>
                          <div className="flex flex-wrap gap-2">
                            {note.attachments.map((attachment) => (
                              <div
                                key={attachment.id}
                                className="flex items-center gap-2 bg-muted p-2 rounded-lg text-sm"
                              >
                                <FileText className="h-4 w-4" />
                                <span className="truncate max-w-[150px]">{attachment.name}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => downloadAttachment(attachment)}
                                  className="h-6 w-6 p-0"
                                  disabled={saving}
                                >
                                  <Download className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteAttachment(note.id, attachment.id)}
                                  className="h-6 w-6 p-0 text-red-500"
                                  disabled={saving}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      {/* Category Color Dialog */}
      <Dialog open={isCategoryColorDialogOpen} onOpenChange={setIsCategoryColorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose Color for {editingCategory?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-3 p-4">
            {manlyColors.map((color) => (
              <button
                key={color}
                className="w-12 h-12 rounded-full border-2 border-gray-300 hover:border-gray-600 transition-colors"
                style={{ backgroundColor: color }}
                onClick={() => editingCategory && updateCategoryColor(editingCategory.id, color)}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Note Color Dialog */}
      <Dialog open={isNoteColorDialogOpen} onOpenChange={setIsNoteColorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose Color for Note</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-3 p-4">
            {manlyColors.map((color) => (
              <button
                key={color}
                className="w-12 h-12 rounded-full border-2 border-gray-300 hover:border-gray-600 transition-colors"
                style={{ backgroundColor: color }}
                onClick={() => editingNoteColor && updateNoteColor(editingNoteColor.id, color)}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={isAddingCategory} onOpenChange={setIsAddingCategory}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Category name..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addCategory()}
              disabled={saving}
            />
            <div className="flex gap-2">
              <Button 
                onClick={addCategory} 
                className="flex-1"
                disabled={saving || !newCategoryName.trim()}
              >
                Add Category
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsAddingCategory(false)}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Note Dialog */}
      <Dialog open={isAddingNote} onOpenChange={setIsAddingNote}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Note title..."
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addNote()}
              disabled={saving}
            />
            <div className="flex gap-2">
              <Button 
                onClick={addNote} 
                className="flex-1"
                disabled={saving || !newNoteTitle.trim()}
              >
                Add Note
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsAddingNote(false)}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}