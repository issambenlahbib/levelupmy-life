"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Upload, Edit, Trash2, Move, ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { db } from "@/lib/firebase/firebaseConfig"
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore"
import { useAuth } from "./contexts/auth-context"
import { debounce } from "lodash"

interface VisionItem {
  id: string
  imageUrl: string
  caption: string
  position: { x: number; y: number }
  size: { width: number; height: number }
}

interface VisionPage {
  id: string
  name: string
  items: VisionItem[]
}

export function VisionBoard() {
  const { user } = useAuth()
  const [pages, setPages] = useState<VisionPage[]>([{ id: "page1", name: "Vision Board 1", items: [] }])
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [editingItem, setEditingItem] = useState<VisionItem | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [draggedItem, setDraggedItem] = useState<VisionItem | null>(null)
  const [resizingItem, setResizingItem] = useState<{ item: VisionItem; handle: string } | null>(null)
  const [newPageName, setNewPageName] = useState("")
  const [isAddingPage, setIsAddingPage] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load vision board data from Firestore
  useEffect(() => {
    if (!user) return
    
    const loadVisionBoard = async () => {
      try {
        setLoading(true)
        const userDocRef = doc(db, "visionBoards", user.uid)
        const docSnap = await getDoc(userDocRef)
        
        if (docSnap.exists()) {
          const data = docSnap.data()
          const savedPages = data.pages || [{ id: "page1", name: "Vision Board 1", items: [] }]
          // Ensure all items have size property
          const pagesWithSizes = savedPages.map((page: any) => ({
            ...page,
            items: page.items.map((item: any) => ({
              ...item,
              size: item.size || { width: 192, height: 128 },
            })),
          }))
          setPages(pagesWithSizes)
        } else {
          // Create a new document with default page
          await setDoc(userDocRef, { 
            pages: [{ id: "page1", name: "Vision Board 1", items: [] }] 
          })
          setPages([{ id: "page1", name: "Vision Board 1", items: [] }])
        }
      } catch (error) {
        console.error("Error loading vision board data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadVisionBoard()
  }, [user])

  // Debounced save function
  const saveVisionBoard = debounce(async () => {
    if (!user || saving) return
    
    try {
      setSaving(true)
      const userDocRef = doc(db, "visionBoards", user.uid)
      await updateDoc(userDocRef, { pages })
      setLastSaved(new Date())
    } catch (error) {
      console.error("Error saving vision board data:", error)
    } finally {
      setSaving(false)
    }
  }, 1000)

  // Save whenever pages change
  useEffect(() => {
    if (user && !loading) {
      saveVisionBoard()
    }
  }, [pages])

  const currentPage = pages[currentPageIndex]

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string
        const newItem: VisionItem = {
          id: Date.now().toString(),
          imageUrl,
          caption: "",
          position: { x: Math.random() * 300, y: Math.random() * 300 },
          size: { width: 192, height: 128 },
        }
        updateCurrentPage((page) => ({
          ...page,
          items: [...page.items, newItem],
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  const updateCurrentPage = (updater: (page: VisionPage) => VisionPage) => {
    setPages(pages.map((page, index) => (index === currentPageIndex ? updater(page) : page)))
  }

  const updateCaption = (id: string, caption: string) => {
    updateCurrentPage((page) => ({
      ...page,
      items: page.items.map((item) => (item.id === id ? { ...item, caption } : item)),
    }))
  }

  const deleteItem = (id: string) => {
    updateCurrentPage((page) => ({
      ...page,
      items: page.items.filter((item) => item.id !== id),
    }))
  }

  const openEditDialog = (item: VisionItem) => {
    setEditingItem(item)
    setIsDialogOpen(true)
  }

  const saveCaption = () => {
    if (editingItem) {
      updateCaption(editingItem.id, editingItem.caption)
      setIsDialogOpen(false)
      setEditingItem(null)
    }
  }

  const handleDragStart = (e: React.DragEvent, item: VisionItem) => {
    setDraggedItem(item)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (draggedItem) {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      updateCurrentPage((page) => ({
        ...page,
        items: page.items.map((item) =>
          item.id === draggedItem.id
            ? {
                ...item,
                position: {
                  x: Math.max(0, x - draggedItem.size.width / 2),
                  y: Math.max(0, y - draggedItem.size.height / 2),
                },
              }
            : item,
        ),
      }))
      setDraggedItem(null)
    }
  }

  const handleMouseDown = (e: React.MouseEvent, item: VisionItem, handle: string) => {
    e.preventDefault()
    e.stopPropagation()
    setResizingItem({ item, handle })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (resizingItem) {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      const { item, handle } = resizingItem
      const newSize = { ...item.size }
      const newPosition = { ...item.position }

      switch (handle) {
        case "se": // bottom-right
          newSize.width = Math.max(50, x - item.position.x)
          newSize.height = Math.max(50, y - item.position.y)
          break
        case "sw": // bottom-left
          newSize.width = Math.max(50, item.position.x + item.size.width - x)
          newSize.height = Math.max(50, y - item.position.y)
          newPosition.x = Math.min(x, item.position.x + item.size.width - 50)
          break
        case "ne": // top-right
          newSize.width = Math.max(50, x - item.position.x)
          newSize.height = Math.max(50, item.position.y + item.size.height - y)
          newPosition.y = Math.min(y, item.position.y + item.size.height - 50)
          break
        case "nw": // top-left
          newSize.width = Math.max(50, item.position.x + item.size.width - x)
          newSize.height = Math.max(50, item.position.y + item.size.height - y)
          newPosition.x = Math.min(x, item.position.x + item.size.width - 50)
          newPosition.y = Math.min(y, item.position.y + item.size.height - 50)
          break
      }

      updateCurrentPage((page) => ({
        ...page,
        items: page.items.map((i) => (i.id === item.id ? { ...i, size: newSize, position: newPosition } : i)),
      }))
    }
  }

  const handleMouseUp = () => {
    setResizingItem(null)
  }

  const addPage = () => {
    if (newPageName.trim()) {
      const newPage: VisionPage = {
        id: Date.now().toString(),
        name: newPageName.trim(),
        items: [],
      }
      setPages([...pages, newPage])
      setCurrentPageIndex(pages.length)
      setNewPageName("")
      setIsAddingPage(false)
    }
  }

  const deletePage = (pageIndex: number) => {
    if (pages.length > 1) {
      const newPages = pages.filter((_, index) => index !== pageIndex)
      setPages(newPages)
      if (currentPageIndex >= newPages.length) {
        setCurrentPageIndex(newPages.length - 1)
      }
    }
  }

  const navigatePage = (direction: "prev" | "next") => {
    if (direction === "prev" && currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1)
    } else if (direction === "next" && currentPageIndex < pages.length - 1) {
      setCurrentPageIndex(currentPageIndex + 1)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle>Vision Board</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigatePage("prev")}
                  disabled={currentPageIndex === 0 || saving || loading}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium">
                  {currentPage?.name} ({currentPageIndex + 1} of {pages.length})
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigatePage("next")}
                  disabled={currentPageIndex === pages.length - 1 || saving || loading}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {saving && <span className="text-sm text-slate-500">Saving...</span>}
              {lastSaved && !saving && (
                <span className="text-sm text-green-600">
                  Saved at {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsAddingPage(true)}
                  disabled={saving || loading}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Page
                </Button>
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={saving || loading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Add Image
                </Button>
                {pages.length > 1 && (
                  <Button 
                    variant="destructive" 
                    onClick={() => deletePage(currentPageIndex)}
                    disabled={saving || loading}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Page
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <input 
            ref={fileInputRef} 
            type="file" 
            accept="image/*" 
            onChange={handleFileUpload} 
            className="hidden" 
            disabled={saving || loading}
          />

          {loading ? (
            <div className="flex items-center justify-center h-[600px]">
              <div className="text-center text-slate-600">
                Loading your vision board...
              </div>
            </div>
          ) : (
            <div
              className="relative w-full h-[600px] bg-muted/20 rounded-lg border-2 border-dashed border-muted-foreground/25 overflow-hidden"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              {currentPage?.items.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <Upload className="h-12 w-12 mx-auto mb-4" />
                    <p>Drag and drop images here or click "Add Image" to get started</p>
                  </div>
                </div>
              ) : (
                currentPage?.items.map((item) => (
                  <div
                    key={item.id}
                    className="absolute group cursor-move"
                    style={{
                      left: item.position.x,
                      top: item.position.y,
                      width: item.size.width,
                      height: item.size.height,
                    }}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item)}
                  >
                    <div className="relative w-full h-full">
                      <img
                        src={item.imageUrl || "/placeholder.svg"}
                        alt={item.caption || "Vision board item"}
                        className="w-full h-full object-cover rounded-lg shadow-lg"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          onClick={() => openEditDialog(item)}
                          disabled={saving}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          onClick={() => deleteItem(item.id)}
                          disabled={saving}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      {item.caption && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/75 text-white text-xs p-2 rounded-b-lg">
                          {item.caption}
                        </div>
                      )}
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Move className="h-4 w-4 text-white" />
                      </div>

                      {/* Resize handles */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Top-left */}
                        <div
                          className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-nw-resize"
                          onMouseDown={(e) => handleMouseDown(e, item, "nw")}
                        />
                        {/* Top-right */}
                        <div
                          className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-ne-resize"
                          onMouseDown={(e) => handleMouseDown(e, item, "ne")}
                        />
                        {/* Bottom-left */}
                        <div
                          className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-sw-resize"
                          onMouseDown={(e) => handleMouseDown(e, item, "sw")}
                        />
                        {/* Bottom-right */}
                        <div
                          className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-se-resize"
                          onMouseDown={(e) => handleMouseDown(e, item, "se")}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Page Dialog */}
      <Dialog open={isAddingPage} onOpenChange={setIsAddingPage}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Vision Board Page</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Page name..."
              value={newPageName}
              onChange={(e) => setNewPageName(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addPage()}
              disabled={saving}
            />
            <div className="flex gap-2">
              <Button 
                onClick={addPage} 
                className="flex-1"
                disabled={saving || !newPageName.trim()}
              >
                Add Page
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsAddingPage(false)}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Caption Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Caption</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4">
              <img
                src={editingItem.imageUrl || "/placeholder.svg"}
                alt="Preview"
                className="w-full h-32 object-cover rounded-lg"
              />
              <div>
                <label className="block text-sm font-medium mb-2">Caption</label>
                <Input
                  value={editingItem.caption}
                  onChange={(e) => setEditingItem({ ...editingItem, caption: e.target.value })}
                  placeholder="Add a caption for this image..."
                  disabled={saving}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={saveCaption} 
                  className="flex-1"
                  disabled={saving}
                >
                  Save Caption
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
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}