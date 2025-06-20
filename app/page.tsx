"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Moon, Sun, Target, Calendar, User, Zap, CheckSquare, FileText, Table, ImageIcon, LogOut } from "lucide-react"
import { HabitTracker } from "@/components/habit-tracker"
import { Journal } from "@/components/journal"
import { Goals } from "@/components/goals"
import { CalendarView } from "@/components/calendar-view"
import { Identity } from "@/components/identity"
import { LifeWheel } from "@/components/life-wheel"
import { KanbanTodo } from "@/components/kanban-todo"
import { Notes } from "@/components/notes"
import { DataTables } from "@/components/data-tables"
import { VisionBoard } from "@/components/vision-board"
import { AuthCheck } from "@/components/auth/auth-check"
import { Logo } from "@/components/auth/logo"

export default function ProductivityPlatform() {
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme")
    if (savedTheme === "dark") {
      setDarkMode(true)
      document.documentElement.classList.add("dark")
    }
  }, [])

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
    if (!darkMode) {
      document.documentElement.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("theme", "light")
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("levelup-user")
    window.location.reload()
  }

  return (
    <AuthCheck>
      <div className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-between mb-8">
            <Logo />
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={toggleDarkMode}
                className="border-manly-blue text-manly-blue hover:bg-manly-blue hover:text-white"
              >
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="text-red-600 border-red-600 hover:bg-red-600 hover:text-white"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>

          <Tabs defaultValue="habits" className="w-full">
            <TabsList className="grid w-full grid-cols-10 h-16 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700">
              <TabsTrigger
                value="habits"
                className="flex flex-col gap-1 data-[state=active]:bg-manly-blue data-[state=active]:text-white"
              >
                <Target className="h-4 w-4" />
                <span className="text-xs">Habits</span>
              </TabsTrigger>
              <TabsTrigger
                value="journal"
                className="flex flex-col gap-1 data-[state=active]:bg-manly-green data-[state=active]:text-white"
              >
                <FileText className="h-4 w-4" />
                <span className="text-xs">Journal</span>
              </TabsTrigger>
              <TabsTrigger
                value="goals"
                className="flex flex-col gap-1 data-[state=active]:bg-manly-orange data-[state=active]:text-white"
              >
                <Zap className="h-4 w-4" />
                <span className="text-xs">Goals</span>
              </TabsTrigger>
              <TabsTrigger
                value="calendar"
                className="flex flex-col gap-1 data-[state=active]:bg-manly-purple data-[state=active]:text-white"
              >
                <Calendar className="h-4 w-4" />
                <span className="text-xs">Calendar</span>
              </TabsTrigger>
              <TabsTrigger
                value="identity"
                className="flex flex-col gap-1 data-[state=active]:bg-manly-red data-[state=active]:text-white"
              >
                <User className="h-4 w-4" />
                <span className="text-xs">Identity</span>
              </TabsTrigger>
              <TabsTrigger
                value="life-wheel"
                className="flex flex-col gap-1 data-[state=active]:bg-manly-cyan data-[state=active]:text-white"
              >
                <div className="w-4 h-4 rounded-full border-2 border-current" />
                <span className="text-xs">Life Wheel</span>
              </TabsTrigger>
              <TabsTrigger
                value="kanban"
                className="flex flex-col gap-1 data-[state=active]:bg-manly-yellow data-[state=active]:text-black"
              >
                <CheckSquare className="h-4 w-4" />
                <span className="text-xs">Tasks</span>
              </TabsTrigger>
              <TabsTrigger
                value="notes"
                className="flex flex-col gap-1 data-[state=active]:bg-manly-pink data-[state=active]:text-white"
              >
                <FileText className="h-4 w-4" />
                <span className="text-xs">Notes</span>
              </TabsTrigger>
              <TabsTrigger
                value="tables"
                className="flex flex-col gap-1 data-[state=active]:bg-manly-lime data-[state=active]:text-black"
              >
                <Table className="h-4 w-4" />
                <span className="text-xs">Tables</span>
              </TabsTrigger>
              <TabsTrigger
                value="vision"
                className="flex flex-col gap-1 data-[state=active]:bg-slate-700 data-[state=active]:text-white"
              >
                <ImageIcon className="h-4 w-4" />
                <span className="text-xs">Vision</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="habits" className="mt-6">
              <HabitTracker />
            </TabsContent>

            <TabsContent value="journal" className="mt-6">
              <Journal />
            </TabsContent>

            <TabsContent value="goals" className="mt-6">
              <Goals />
            </TabsContent>

            <TabsContent value="calendar" className="mt-6">
              <CalendarView />
            </TabsContent>

            <TabsContent value="identity" className="mt-6">
              <Identity />
            </TabsContent>

            <TabsContent value="life-wheel" className="mt-6">
              <LifeWheel />
            </TabsContent>

            <TabsContent value="kanban" className="mt-6">
              <KanbanTodo />
            </TabsContent>

            <TabsContent value="notes" className="mt-6">
              <Notes />
            </TabsContent>

            <TabsContent value="tables" className="mt-6">
              <DataTables />
            </TabsContent>

            <TabsContent value="vision" className="mt-6">
              <VisionBoard />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AuthCheck>
  )
}
