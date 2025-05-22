"use client"

import { DialogTrigger } from "@/components/ui/dialog"

import type React from "react"

import { useState, useEffect } from "react"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { useFirebase } from "./firebase-provider"
import { useWeb3 } from "./web3-provider"
import { Button } from "@/components/ui/button"
import {
  Loader2,
  CheckCircle,
  CircleEllipsis,
  Circle,
  Clock,
  Edit,
  Trash2,
  User,
  Calendar,
  MoreHorizontal,
  XCircle,
  ChevronLeft,
  Search,
  Plus,
  Filter,
  SortDesc,
  UserCircle,
  FileEdit,
  AlertCircle,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { Task, UserProfile } from "@/lib/types"
import { format } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { PaymentPopup } from "./payment-popup"

type Column = {
  id: string
  title: string
  icon: React.ReactNode
  tasks: Task[]
  count: number
}

export function KanbanBoard() {
  const { addTask, getTasks, updateTask, deleteTask, isInitialized, getUserProfiles, getUserProfile } = useFirebase()
  const { account } = useWeb3()
  const { toast } = useToast()
  const [columns, setColumns] = useState<Column[]>([
    {
      id: "todo",
      title: "To Do",
      icon: <Circle className="h-5 w-5 text-gray-400" />,
      tasks: [],
      count: 0,
    },
    {
      id: "inprogress",
      title: "In Progress",
      icon: <Clock className="h-5 w-5 text-yellow-500" />,
      tasks: [],
      count: 0,
    },
    {
      id: "review",
      title: "In Review",
      icon: <CircleEllipsis className="h-5 w-5 text-blue-500" />,
      tasks: [],
      count: 0,
    },
    {
      id: "done",
      title: "Done",
      icon: <CheckCircle className="h-5 w-5 text-green-500" />,
      tasks: [],
      count: 0,
    },
  ])
  const [newTask, setNewTask] = useState<Omit<Task, "id" | "userId" | "createdAt">>({
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
  })
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false)
  const [activeView, setActiveView] = useState("all")
  const [isEditMode, setIsEditMode] = useState(false)
  const [editedTask, setEditedTask] = useState<Partial<Task>>({})
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false)
  const [submissionContent, setSubmissionContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterPriority, setFilterPriority] = useState("all")
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState("")
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [createdTasks, setCreatedTasks] = useState<Task[]>([])
  const [assignedTasks, setAssignedTasks] = useState<Task[]>([])
  // New states for payment popup
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [taskBeingPaid, setTaskBeingPaid] = useState<Task | null>(null)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [isPaymentPopupOpen, setIsPaymentPopupOpen] = useState(false)
  const [taskToPay, setTaskToPay] = useState<Task | null>(null)

  const firebase = useFirebase()

  useEffect(() => {
    if (account && isInitialized) {
      fetchAllTasks()
      fetchUsers()
    }
  }, [account, isInitialized])

  useEffect(() => {
    if (selectedTask) {
      setEditedTask({
        title: selectedTask.title,
        description: selectedTask.description,
        priority: selectedTask.priority,
        reward: selectedTask.reward,
        rewardAmount: selectedTask.rewardAmount,
        assigneeId: selectedTask.assigneeId,
      })
    }
  }, [selectedTask, isEditMode])

  // Update columns whenever the active view or tasks change
  useEffect(() => {
    updateColumnsBasedOnView()
  }, [activeView, allTasks, createdTasks, assignedTasks])

  if (!isInitialized) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Initializing Firebase...</p>
        </div>
      </div>
    )
  }

  const fetchAllTasks = async () => {
    if (!account) return

    setIsLoading(true)
    try {
      // Fetch tasks created by the user
      const userCreatedTasks = await getTasks(account)
      setCreatedTasks(userCreatedTasks)

      // Fetch tasks assigned to the user from Firestore
      const db = firebase.db
      if (!db) {
        console.error("Firestore is not initialized")
        return
      }

      const { collection, query, where, getDocs } = await import("firebase/firestore")
      const q = query(collection(db, "tasks"), where("assigneeId", "==", account))
      const querySnapshot = await getDocs(q)
      const assignedTasksData = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Task)
      setAssignedTasks(assignedTasksData)

      // Combine both sets of tasks, removing duplicates
      const combinedTasks = [...userCreatedTasks]

      assignedTasksData.forEach((assignedTask) => {
        if (!combinedTasks.some((task) => task.id === assignedTask.id)) {
          combinedTasks.push(assignedTask)
        }
      })

      // After fetching tasks, ensure assignee information is populated
      const tasksWithAssigneeInfo = await Promise.all(
        combinedTasks.map(async (task) => {
          // If task has assigneeId but no assignee info, fetch the user profile
          if (task.assigneeId && !task.assignee) {
            try {
              const assigneeProfile = await getUserProfile(task.assigneeId)
              if (assigneeProfile) {
                return {
                  ...task,
                  assignee: {
                    id: assigneeProfile.id,
                    username: assigneeProfile.username,
                    profilePicture: assigneeProfile.profilePicture,
                  },
                }
              }
            } catch (error) {
              console.error("Error fetching assignee profile:", error)
            }
          }
          return task
        }),
      )

      setAllTasks(tasksWithAssigneeInfo)

      updateColumnsWithTasks(combinedTasks)
    } catch (error) {
      console.error("Error fetching tasks:", error)
      toast({
        title: "Error",
        description: "Failed to fetch tasks",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const updateColumnsBasedOnView = () => {
    let tasksToShow: Task[] = []

    switch (activeView) {
      case "created":
        tasksToShow = createdTasks
        break
      case "assigned":
        tasksToShow = assignedTasks
        break
      case "all":
      default:
        tasksToShow = allTasks
        break
    }

    updateColumnsWithTasks(tasksToShow)
  }

  const updateColumnsWithTasks = (tasks: Task[]) => {
    // Reset columns
    const updatedColumns = columns.map((column) => ({
      ...column,
      tasks: [],
      count: 0,
    }))

    // Distribute tasks to columns
    tasks.forEach((task) => {
      const columnIndex = updatedColumns.findIndex((col) => col.id === task.status)
      if (columnIndex !== -1) {
        updatedColumns[columnIndex].tasks.push(task)
        updatedColumns[columnIndex].count = updatedColumns[columnIndex].tasks.length
      }
    })

    setColumns(updatedColumns)
  }

  const fetchUsers = async () => {
    setIsLoadingUsers(true)
    try {
      const users = await getUserProfiles()
      setAvailableUsers(users)
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setIsLoadingUsers(false)
    }
  }

  const handleCreateTask = async () => {
    if (!account) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to create tasks",
        variant: "destructive",
      })
      return
    }

    if (!newTask.title) {
      toast({
        title: "Missing information",
        description: "Please provide a task title",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Convert "no_reward" to undefined for the reward field
      const taskToCreate = {
        ...newTask,
        reward: newTask.reward === "no_reward" ? undefined : newTask.reward,
        userId: account,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const taskId = await addTask(taskToCreate)

      // If an assignee was selected, find their details
      let assignee
      if (newTask.assigneeId) {
        const assigneeProfile = availableUsers.find((user) => user.id === newTask.assigneeId)
        if (assigneeProfile) {
          assignee = {
            id: assigneeProfile.id,
            username: assigneeProfile.username,
            profilePicture: assigneeProfile.profilePicture,
          }
        }
      }

      const newTaskWithId = {
        id: taskId,
        ...newTask,
        userId: account,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        assignee,
      }

      // Update our task lists
      setCreatedTasks((prev) => [...prev, newTaskWithId])
      setAllTasks((prev) => [...prev, newTaskWithId])

      // If the task is assigned to the current user, add it to assignedTasks too
      if (newTask.assigneeId === account) {
        setAssignedTasks((prev) => [...prev, newTaskWithId])
      }

      // Update columns based on current view
      updateColumnsBasedOnView()

      setNewTask({
        title: "",
        description: "",
        status: "todo",
        priority: "medium",
      })

      setIsDialogOpen(false)

      toast({
        title: "Task created",
        description: "Your task has been created successfully",
      })
    } catch (error) {
      console.error("Error creating task:", error)
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
    setIsTaskDetailOpen(true)
    setIsEditMode(false)
  }

  const handleEditTask = async () => {
    if (!selectedTask || !editedTask) return

    setIsLoading(true)

    try {
      // Convert "no_reward" to undefined for the reward field
      const updatedTaskData = {
        ...editedTask,
        reward: editedTask.reward === "no_reward" ? undefined : editedTask.reward,
        assigneeId: editedTask.assigneeId,
        updatedAt: new Date().toISOString(),
      }

      // If assignee changed, fetch the assignee details
      let assignee = selectedTask.assignee
      if (editedTask.assigneeId && editedTask.assigneeId !== selectedTask.assigneeId) {
        const assigneeProfile = availableUsers.find((user) => user.id === editedTask.assigneeId)
        if (assigneeProfile) {
          assignee = {
            id: assigneeProfile.id,
            username: assigneeProfile.username,
            profilePicture: assigneeProfile.profilePicture,
          }
        }
      }

      const updatedTask = {
        ...selectedTask,
        ...editedTask,
        assignee,
        updatedAt: new Date().toISOString(),
      }

      await updateTask(selectedTask.id, updatedTaskData)

      // Update our task lists
      const updateTaskInList = (list: Task[]) => list.map((task) => (task.id === updatedTask.id ? updatedTask : task))

      setAllTasks(updateTaskInList(allTasks))
      setCreatedTasks(updateTaskInList(createdTasks))
      setAssignedTasks(updateTaskInList(assignedTasks))

      // Update columns based on current view
      updateColumnsBasedOnView()

      setSelectedTask(updatedTask)
      setIsEditMode(false)

      toast({
        title: "Task updated",
        description: "The task has been updated successfully",
      })
    } catch (error) {
      console.error("Error updating task:", error)
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteTask = async () => {
    if (!selectedTask) return

    setIsLoading(true)

    try {
      await deleteTask(selectedTask.id)

      // Remove the task from our task lists
      const removeTaskFromList = (list: Task[]) => list.filter((task) => task.id !== selectedTask.id)

      setAllTasks(removeTaskFromList(allTasks))
      setCreatedTasks(removeTaskFromList(createdTasks))
      setAssignedTasks(removeTaskFromList(assignedTasks))

      // Update columns based on current view
      updateColumnsBasedOnView()

      setIsTaskDetailOpen(false)
      setSelectedTask(null)

      toast({
        title: "Task deleted",
        description: "The task has been deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting task:", error)
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitWork = async () => {
    if (!selectedTask || !submissionContent) return

    setIsSubmitting(true)

    try {
      const submission = {
        content: submissionContent,
        submittedAt: new Date().toISOString(),
        status: "pending" as const,
      }

      const updatedTask = {
        ...selectedTask,
        submission,
        status: "review",
        updatedAt: new Date().toISOString(),
      }

      await updateTask(selectedTask.id, {
        submission,
        status: "review",
        updatedAt: new Date().toISOString(),
      })

      // Update our task lists
      const updateTaskInList = (list: Task[]) => list.map((task) => (task.id === updatedTask.id ? updatedTask : task))

      setAllTasks(updateTaskInList(allTasks))
      setCreatedTasks(updateTaskInList(createdTasks))
      setAssignedTasks(updateTaskInList(assignedTasks))

      // Update columns based on current view
      updateColumnsBasedOnView()

      setSelectedTask(updatedTask)
      setIsSubmitDialogOpen(false)
      setSubmissionContent("")

      toast({
        title: "Work submitted",
        description: "Your work has been submitted for review",
      })
    } catch (error) {
      console.error("Error submitting work:", error)
      toast({
        title: "Error",
        description: "Failed to submit work",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleApproveSubmission = async () => {
    if (!selectedTask || !selectedTask.submission) return

    setIsLoading(true)

    try {
      const updatedSubmission = {
        ...selectedTask.submission,
        status: "approved" as const,
      }

      const updatedTask = {
        ...selectedTask,
        submission: updatedSubmission,
        status: "done",
        updatedAt: new Date().toISOString(),
      }

      await updateTask(selectedTask.id, {
        submission: updatedSubmission,
        status: "done",
        updatedAt: new Date().toISOString(),
      })

      // Update our task lists
      const updateTaskInList = (list: Task[]) => list.map((task) => (task.id === updatedTask.id ? updatedTask : task))

      setAllTasks(updateTaskInList(allTasks))
      setCreatedTasks(updateTaskInList(createdTasks))
      setAssignedTasks(updateTaskInList(assignedTasks))

      // Update columns based on current view
      updateColumnsBasedOnView()

      setSelectedTask(updatedTask)

      // If the task has a reward, show the payment dialog
      if (updatedTask.reward && updatedTask.rewardAmount && updatedTask.assigneeId) {
        setTaskBeingPaid(updatedTask)
        setIsPaymentDialogOpen(true)
      } else {
        toast({
          title: "Submission approved",
          description: "The work submission has been approved",
        })
      }
    } catch (error) {
      console.error("Error approving submission:", error)
      toast({
        title: "Error",
        description: "Failed to approve submission",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRejectSubmission = async () => {
    if (!selectedTask || !selectedTask.submission) return

    setIsLoading(true)

    try {
      const updatedSubmission = {
        ...selectedTask.submission,
        status: "rejected" as const,
      }

      const updatedTask = {
        ...selectedTask,
        submission: updatedSubmission,
        status: "inprogress",
        updatedAt: new Date().toISOString(),
      }

      await updateTask(selectedTask.id, {
        submission: updatedSubmission,
        status: "inprogress",
        updatedAt: new Date().toISOString(),
      })

      // Update our task lists
      const updateTaskInList = (list: Task[]) => list.map((task) => (task.id === updatedTask.id ? updatedTask : task))

      setAllTasks(updateTaskInList(allTasks))
      setCreatedTasks(updateTaskInList(createdTasks))
      setAssignedTasks(updateTaskInList(assignedTasks))

      // Update columns based on current view
      updateColumnsBasedOnView()

      setSelectedTask(updatedTask)

      toast({
        title: "Submission rejected",
        description: "The work submission has been rejected",
      })
    } catch (error) {
      console.error("Error rejecting submission:", error)
      toast({
        title: "Error",
        description: "Failed to reject submission",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePaymentComplete = async (taskId: string) => {
    setIsLoading(true)

    try {
      // Update the task with paid status
      const updatedTask = {
        ...taskToPay!,
        paid: true,
        updatedAt: new Date().toISOString(),
      }

      await updateTask(taskId, {
        paid: true,
        updatedAt: new Date().toISOString(),
      })

      // Update our task lists
      const updateTaskInList = (list: Task[]) => list.map((task) => (task.id === updatedTask.id ? updatedTask : task))

      setAllTasks(updateTaskInList(allTasks))
      setCreatedTasks(updateTaskInList(createdTasks))
      setAssignedTasks(updateTaskInList(assignedTasks))

      // Update columns based on current view
      updateColumnsBasedOnView()

      // Close the payment popup
      setIsPaymentPopupOpen(false)
      setTaskToPay(null)

      toast({
        title: "Payment successful",
        description: "The task has been marked as paid",
      })
    } catch (error) {
      console.error("Error marking task as paid:", error)
      toast({
        title: "Error",
        description: "Failed to mark task as paid",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle payment for a task
  const handlePayTask = async () => {
    if (!taskBeingPaid) return

    setIsProcessingPayment(true)

    try {
      // Simulate payment processing delay
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const updatedTask = {
        ...taskBeingPaid,
        paid: true,
        updatedAt: new Date().toISOString(),
      }

      await updateTask(taskBeingPaid.id, {
        paid: true,
        updatedAt: new Date().toISOString(),
      })

      // Update our task lists
      const updateTaskInList = (list: Task[]) => list.map((task) => (task.id === updatedTask.id ? updatedTask : task))

      setAllTasks(updateTaskInList(allTasks))
      setCreatedTasks(updateTaskInList(createdTasks))
      setAssignedTasks(updateTaskInList(assignedTasks))

      // Update columns based on current view
      updateColumnsBasedOnView()

      // If the task being paid is also the selected task, update it
      if (selectedTask && selectedTask.id === updatedTask.id) {
        setSelectedTask(updatedTask)
      }

      toast({
        title: "Payment successful",
        description: `Successfully paid ${updatedTask.rewardAmount} ${updatedTask.reward} to the assignee.`,
      })

      // Close the payment dialog
      setIsPaymentDialogOpen(false)
      setTaskBeingPaid(null)
    } catch (error) {
      console.error("Error processing payment:", error)
      toast({
        title: "Payment failed",
        description: "Failed to process payment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessingPayment(false)
    }
  }

  const onDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result

    // If there's no destination or the item is dropped in the same place
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
      return
    }

    // Find the task that was dragged
    const sourceColumn = columns.find((col) => col.id === source.droppableId)
    if (!sourceColumn) return

    const task = sourceColumn.tasks.find((task) => task.id === draggableId)
    if (!task) return

    // Create a new array of columns
    const newColumns = [...columns]

    // Remove the task from the source column
    const sourceColumnIndex = newColumns.findIndex((col) => col.id === source.droppableId)
    newColumns[sourceColumnIndex].tasks.splice(source.index, 1)
    newColumns[sourceColumnIndex].count = newColumns[sourceColumnIndex].tasks.length

    // Add the task to the destination column
    const destinationColumnIndex = newColumns.findIndex((col) => col.id === destination.droppableId)

    // Update the task status to match the new column
    const updatedTask = {
      ...task,
      status: destination.droppableId,
      updatedAt: new Date().toISOString(),
      // Preserve the assignee information
      assignee: task.assignee,
    }

    newColumns[destinationColumnIndex].tasks.splice(destination.index, 0, updatedTask)
    newColumns[destinationColumnIndex].count = newColumns[destinationColumnIndex].tasks.length

    // Update state
    setColumns(newColumns)

    // Check if the task is being moved to the 'done' state and has a reward
    if (
      destination.droppableId === "done" &&
      source.droppableId !== "done" &&
      task.reward &&
      task.rewardAmount &&
      !task.paid &&
      task.userId === account
    ) {
      // Show payment popup
      setTaskToPay(task)
      setIsPaymentPopupOpen(true)
    }

    // Update in Firebase
    try {
      await updateTask(task.id, {
        status: destination.droppableId,
        updatedAt: new Date().toISOString(),
      })

      // Update our task lists
      const updateTaskInList = (list: Task[]) => list.map((t) => (t.id === updatedTask.id ? updatedTask : t))

      setAllTasks(updateTaskInList(allTasks))
      setCreatedTasks(updateTaskInList(createdTasks))
      setAssignedTasks(updateTaskInList(assignedTasks))
    } catch (error) {
      console.error("Error updating task:", error)
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive",
      })
      // Revert the UI change if the update fails
      fetchAllTasks()
    }
  }

  // Filter tasks based on search query and priority filter
  const getFilteredTasks = (tasks: Task[]) => {
    return tasks.filter((task) => {
      const matchesSearch =
        searchQuery === "" ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesPriority = filterPriority === "all" || task.priority === filterPriority

      return matchesSearch && matchesPriority
    })
  }

  // Filter users based on search query
  const getFilteredUsers = (users: UserProfile[], query: string) => {
    if (!query) return users

    return users.filter(
      (user) =>
        user.username.toLowerCase().includes(query.toLowerCase()) ||
        user.address.toLowerCase().includes(query.toLowerCase()),
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "todo":
        return <Clock className="h-4 w-4 text-gray-500" />
      case "in-progress":
        return <AlertCircle className="h-4 w-4 text-amber-500" />
      case "done":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      default:
        return null
    }
  }

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case "high":
        return "priority-badge-high"
      case "medium":
        return "priority-badge-medium"
      case "low":
        return "priority-badge-low"
      default:
        return ""
    }
  }

  const getTaskCardClass = (priority: string) => {
    switch (priority) {
      case "high":
        return "priority-high"
      case "medium":
        return "priority-medium"
      case "low":
        return "priority-low"
      default:
        return ""
    }
  }

  const getAssignedUser = (walletAddress: string) => {
    return availableUsers.find((user) => user.address === walletAddress)
  }

  return (
    <div className="p-4 min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:bg-gray-900 dark:from-gray-900 dark:to-gray-800">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">My Task Board</h1>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-button">
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Task title"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Task description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={newTask.status} onValueChange={(value) => setNewTask({ ...newTask, status: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="inprogress">In Progress</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={newTask.priority}
                    onValueChange={(value) => setNewTask({ ...newTask, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="assignee">Assignee</Label>
                <div className="relative">
                  <Input
                    placeholder="Search by username or wallet address..."
                    value={assigneeSearchQuery}
                    onChange={(e) => setAssigneeSearchQuery(e.target.value)}
                    className="w-full"
                  />
                  <div
                    className={`absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md ${
                      assigneeSearchQuery ? "block" : "hidden"
                    }`}
                  >
                    <div className="max-h-60 overflow-auto p-1">
                      <div
                        className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent"
                        onClick={() => {
                          setNewTask({ ...newTask, assigneeId: undefined })
                          setAssigneeSearchQuery("")
                        }}
                      >
                        <User className="h-4 w-4" />
                        <span>Unassigned</span>
                      </div>
                      {isLoadingUsers ? (
                        <div className="flex items-center justify-center p-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : (
                        getFilteredUsers(availableUsers, assigneeSearchQuery).map((user) => (
                          <div
                            key={user.id}
                            className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent"
                            onClick={() => {
                              setNewTask({ ...newTask, assigneeId: user.id })
                              setAssigneeSearchQuery("")
                            }}
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={user.profilePicture || "/placeholder.svg"} alt={user.username} />
                              <AvatarFallback>{user.username.substring(0, 2)}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span>{user.username}</span>
                              <span className="text-xs text-muted-foreground">{user.address.substring(0, 10)}...</span>
                            </div>
                          </div>
                        ))
                      )}
                      {assigneeSearchQuery && getFilteredUsers(availableUsers, assigneeSearchQuery).length === 0 && (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">No users found</div>
                      )}
                    </div>
                  </div>
                </div>
                {newTask.assigneeId && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm">Selected:</span>
                    {(() => {
                      const user = availableUsers.find((user) => user.id === newTask.assigneeId)
                      return (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={user?.profilePicture || "/placeholder.svg"} alt={user?.username} />
                            <AvatarFallback>{user?.username?.substring(0, 2) || "UN"}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{user?.username || "Unknown User"}</span>
                        </div>
                      )
                    })()}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 rounded-full"
                      onClick={() => setNewTask({ ...newTask, assigneeId: undefined })}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="reward">Reward (Optional)</Label>
                  <Select
                    value={newTask.reward || "no_reward"}
                    onValueChange={(value) =>
                      setNewTask({ ...newTask, reward: value === "no_reward" ? undefined : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select token" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no_reward">No Reward</SelectItem>
                      <SelectItem value="USDC">USDC</SelectItem>
                      <SelectItem value="ETH">ETH</SelectItem>
                      <SelectItem value="BNB">BNB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="rewardAmount">Amount (Optional)</Label>
                  <Input
                    id="rewardAmount"
                    type="number"
                    value={newTask.rewardAmount || ""}
                    onChange={(e) =>
                      setNewTask({
                        ...newTask,
                        rewardAmount: e.target.value ? Number.parseFloat(e.target.value) : undefined,
                      })
                    }
                    placeholder="0.00"
                    disabled={!newTask.reward}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTask} disabled={isLoading} className="gradient-button">
                {isLoading ? "Creating..." : "Create Task"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Tabs value={activeView} onValueChange={setActiveView} className="w-full md:w-auto">
            <TabsList className="bg-white/80 dark:bg-[#1e1e1e] p-1 shadow-sm">
              <TabsTrigger value="all" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
                <Circle className="h-4 w-4" />
                All Tasks
              </TabsTrigger>
              <TabsTrigger
                value="created"
                className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white"
              >
                <FileEdit className="h-4 w-4 text-purple-500" />
                Created by Me
              </TabsTrigger>
              <TabsTrigger
                value="assigned"
                className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white"
              >
                <UserCircle className="h-4 w-4 text-blue-500" />
                Assigned to Me
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1 h-10 bg-white dark:bg-[#1e1e1e]">
                  <SortDesc className="h-4 w-4" />
                  Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Newest First</DropdownMenuItem>
                <DropdownMenuItem>Oldest First</DropdownMenuItem>
                <DropdownMenuItem>Priority (High to Low)</DropdownMenuItem>
                <DropdownMenuItem>Priority (Low to High)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1 h-10 bg-white dark:bg-[#1e1e1e]">
                  <Filter className="h-4 w-4" />
                  Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setFilterPriority("all")}>All Priorities</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterPriority("high")}>High Priority</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterPriority("medium")}>Medium Priority</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterPriority("low")}>Low Priority</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9 h-10 bg-white dark:bg-[#1e1e1e] border-gray-200 dark:border-[#333] w-[200px]"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-[#1e1e1e] rounded-lg p-4 shadow-md">
              <div className="flex items-center gap-2 mb-4">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-6 w-32" />
              </div>
              <div className="space-y-4">
                {Array.from({ length: 2 }).map((_, j) => (
                  <div key={j} className="bg-gray-50 dark:bg-[#2a2a2a] p-3 rounded-lg">
                    <Skeleton className="h-5 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4 mb-3" />
                    <div className="flex justify-between">
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {columns.map((column) => (
              <div
                key={column.id}
                className="kanban-column kanban-column-todo bg-white/80 dark:bg-[#1e1e1e] rounded-lg p-4 shadow-md"
              >
                <h2 className="mb-4 font-semibold flex items-center gap-2">
                  {column.icon}
                  {column.title} ({column.count})
                </h2>
                <Droppable droppableId={column.id}>
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="min-h-[400px] space-y-3">
                      {getFilteredTasks(column.tasks).map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`task-card ${getTaskCardClass(task.priority)} bg-white dark:bg-[#2a2a2a] p-3 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-[#333] shadow-sm border border-gray-100 dark:border-gray-700`}
                              onClick={() => handleTaskClick(task)}
                            >
                              <div className="mb-2 font-medium">{task.title}</div>
                              <div className="mb-2 text-sm text-muted-foreground">
                                {task.description?.length > 100
                                  ? `${task.description.substring(0, 100)}...`
                                  : task.description}
                              </div>
                              <div className="flex items-center justify-between">
                                <div
                                  className={`rounded-full px-2 py-1 text-xs ${
                                    task.priority === "high"
                                      ? "priority-badge-high"
                                      : task.priority === "medium"
                                        ? "priority-badge-medium"
                                        : "priority-badge-low"
                                  }`}
                                >
                                  {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                </div>
                                {task.reward && task.rewardAmount && (
                                  <div className="rounded-full bg-purple-100 dark:bg-purple-600/20 px-2 py-1 text-xs text-purple-600 dark:text-purple-400">
                                    {task.rewardAmount} {task.reward}
                                  </div>
                                )}
                                {task.paid && (
                                  <Badge
                                    variant="outline"
                                    className="ml-1 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-500 border-green-200 dark:border-green-500/50"
                                  >
                                    Paid
                                  </Badge>
                                )}
                              </div>
                              <div className="mt-2 flex items-center justify-between">
                                {task.assignee || task.assigneeId ? (
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-5 w-5">
                                      <AvatarImage
                                        src={task.assignee?.profilePicture || "/placeholder.svg"}
                                        alt={task.assignee?.username || "Assignee"}
                                      />
                                      <AvatarFallback>{task.assignee?.username?.substring(0, 2) || "A"}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs text-muted-foreground">
                                      {task.assignee?.username || (task.assigneeId === account ? "You" : "Assigned")}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">Unassigned</span>
                                  </div>
                                )}

                                <div className="flex items-center gap-1">
                                  {/* Show paid badge if task is paid */}
                                  {task.paid && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs bg-green-100 dark:bg-green-600/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-600/20"
                                    >
                                      Paid
                                    </Badge>
                                  )}

                                  {/* Show task ownership indicator */}
                                  {task.userId === account && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs bg-purple-100 dark:bg-purple-600/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-600/20"
                                    >
                                      Owner
                                    </Badge>
                                  )}
                                  {task.assigneeId === account && task.userId !== account && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs bg-blue-100 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-600/20"
                                    >
                                      Assignee
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      )}

      {/* Task Detail Dialog */}
      <Dialog open={isTaskDetailOpen} onOpenChange={setIsTaskDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          {selectedTask && (
            <>
              <DialogHeader>
                <div className="flex justify-between items-center">
                  <DialogTitle>{isEditMode ? "Edit Task" : selectedTask.title}</DialogTitle>
                  {selectedTask.userId === account && !isEditMode && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setIsEditMode(true)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Task
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleDeleteTask} className="text-red-500">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Task
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                {!isEditMode && (
                  <DialogDescription>
                    <div className="flex gap-2 mt-2">
                      <Badge
                        variant="outline"
                        className={
                          selectedTask.priority === "high"
                            ? "priority-badge-high"
                            : selectedTask.priority === "medium"
                              ? "priority-badge-medium"
                              : "priority-badge-low"
                        }
                      >
                        {selectedTask.priority.charAt(0).toUpperCase() + selectedTask.priority.slice(1)} Priority
                      </Badge>
                      <Badge variant="outline" className="bg-secondary/50">
                        {selectedTask.status === "todo"
                          ? "To Do"
                          : selectedTask.status === "inprogress"
                            ? "In Progress"
                            : selectedTask.status === "review"
                              ? "In Review"
                              : "Done"}
                      </Badge>
                      {selectedTask.reward && selectedTask.rewardAmount && (
                        <Badge
                          variant="outline"
                          className="bg-purple-100 dark:bg-purple-600/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-600/50"
                        >
                          {selectedTask.rewardAmount} {selectedTask.reward}
                        </Badge>
                      )}
                      {selectedTask.paid && (
                        <Badge
                          variant="outline"
                          className="bg-green-100 dark:bg-green-600/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-600/50"
                        >
                          Paid
                        </Badge>
                      )}
                    </div>
                  </DialogDescription>
                )}
              </DialogHeader>

              {isEditMode ? (
                <div className="py-4">
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-title">Title</Label>
                      <Input
                        id="edit-title"
                        value={editedTask.title || ""}
                        onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-description">Description</Label>
                      <Textarea
                        id="edit-description"
                        value={editedTask.description || ""}
                        onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="edit-priority">Priority</Label>
                        <Select
                          value={editedTask.priority || "medium"}
                          onValueChange={(value) => setEditedTask({ ...editedTask, priority: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="edit-assignee">Assignee</Label>
                        <div className="relative">
                          <Input
                            placeholder="Search by username or wallet address..."
                            value={assigneeSearchQuery}
                            onChange={(e) => setAssigneeSearchQuery(e.target.value)}
                            className="w-full"
                          />
                          <div
                            className={`absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md ${
                              assigneeSearchQuery ? "block" : "hidden"
                            }`}
                          >
                            <div className="max-h-60 overflow-auto p-1">
                              <div
                                className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent"
                                onClick={() => {
                                  setEditedTask({ ...editedTask, assigneeId: undefined })
                                  setAssigneeSearchQuery("")
                                }}
                              >
                                <User className="h-4 w-4" />
                                <span>Unassigned</span>
                              </div>
                              {isLoadingUsers ? (
                                <div className="flex items-center justify-center p-2">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                </div>
                              ) : (
                                getFilteredUsers(availableUsers, assigneeSearchQuery).map((user) => (
                                  <div
                                    key={user.id}
                                    className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent"
                                    onClick={() => {
                                      setEditedTask({ ...editedTask, assigneeId: user.id })
                                      setAssigneeSearchQuery("")
                                    }}
                                  >
                                    <Avatar className="h-6 w-6">
                                      <AvatarImage
                                        src={user.profilePicture || "/placeholder.svg"}
                                        alt={user.username}
                                      />
                                      <AvatarFallback>{user.username.substring(0, 2)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                      <span>{user.username}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {user.address.substring(0, 10)}...
                                      </span>
                                    </div>
                                  </div>
                                ))
                              )}
                              {assigneeSearchQuery &&
                                getFilteredUsers(availableUsers, assigneeSearchQuery).length === 0 && (
                                  <div className="px-2 py-1.5 text-sm text-muted-foreground">No users found</div>
                                )}
                            </div>
                          </div>
                        </div>
                        {editedTask.assigneeId && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm">Selected:</span>
                            {(() => {
                              const user = availableUsers.find((user) => user.id === editedTask.assigneeId)
                              return (
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage
                                      src={user?.profilePicture || "/placeholder.svg"}
                                      alt={user?.username}
                                    />
                                    <AvatarFallback>{user?.username?.substring(0, 2) || "UN"}</AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm">{user?.username || "Unknown User"}</span>
                                </div>
                              )
                            })()}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 rounded-full"
                              onClick={() => setEditedTask({ ...editedTask, assigneeId: undefined })}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="edit-reward">Reward</Label>
                        <Select
                          value={editedTask.reward || "no_reward"}
                          onValueChange={(value) =>
                            setEditedTask({ ...editedTask, reward: value === "no_reward" ? undefined : value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select token" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="no_reward">No Reward</SelectItem>
                            <SelectItem value="USDC">USDC</SelectItem>
                            <SelectItem value="ETH">ETH</SelectItem>
                            <SelectItem value="BNB">BNB</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="edit-rewardAmount">Amount</Label>
                        <Input
                          id="edit-rewardAmount"
                          type="number"
                          value={editedTask.rewardAmount || ""}
                          onChange={(e) =>
                            setEditedTask({
                              ...editedTask,
                              rewardAmount: e.target.value ? Number.parseFloat(e.target.value) : undefined,
                            })
                          }
                          placeholder="0.00"
                          disabled={!editedTask.reward}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-4">
                  <div className="mb-4">
                    <h3 className="text-sm font-medium mb-1">Description</h3>
                    <p className="text-sm text-muted-foreground">{selectedTask.description}</p>
                  </div>

                  <div className="mb-4">
                    <h3 className="text-sm font-medium mb-1">Task Owner</h3>
                    <div className="flex items-center gap-2">
                      <FileEdit className="h-4 w-4 text-purple-500" />
                      <span className="text-sm">
                        {selectedTask.userId === account ? "You" : selectedTask.userId.substring(0, 10) + "..."}
                      </span>
                    </div>
                  </div>

                  {selectedTask.assignee ? (
                    <div className="mb-4">
                      <h3 className="text-sm font-medium mb-1">Assigned to</h3>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage
                            src={selectedTask.assignee.profilePicture || "/placeholder.svg"}
                            alt={selectedTask.assignee.username}
                          />
                          <AvatarFallback>{selectedTask.assignee.username.substring(0, 2)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{selectedTask.assignee.username}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <h3 className="text-sm font-medium mb-1">Assigned to</h3>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Unassigned</span>
                      </div>
                    </div>
                  )}

                  <div className="mb-4">
                    <h3 className="text-sm font-medium mb-1">Created</h3>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {selectedTask.createdAt ? format(new Date(selectedTask.createdAt), "PPP") : "Unknown date"}
                      </p>
                    </div>
                  </div>

                  {/* Show payment status if task has a reward */}
                  {selectedTask.reward && selectedTask.rewardAmount && (
                    <div className="mb-4">
                      <h3 className="text-sm font-medium mb-1">Payment Status</h3>
                      <div className="flex items-center gap-2">
                        {selectedTask.paid ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-green-500">Paid</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-4 w-4 text-yellow-500" />
                            <span className="text-sm text-yellow-500">Pending Payment</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedTask.submission && (
                    <div className="mb-4">
                      <h3 className="text-sm font-medium mb-1">Submission</h3>
                      <div className="rounded-md border p-3 bg-gray-50 dark:bg-[#2a2a2a] border-gray-200 dark:border-[#333]">
                        <div className="flex justify-between items-center mb-2">
                          <Badge
                            variant="outline"
                            className={
                              selectedTask.submission.status === "approved"
                                ? "bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-500 border-green-200 dark:border-green-500/50"
                                : selectedTask.submission.status === "rejected"
                                  ? "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-500 border-red-200 dark:border-red-500/50"
                                  : "bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-500 border-yellow-200 dark:border-yellow-500/50"
                            }
                          >
                            {selectedTask.submission.status.charAt(0).toUpperCase() +
                              selectedTask.submission.status.slice(1)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(selectedTask.submission.submittedAt), "PPp")}
                          </span>
                        </div>
                        <p className="text-sm">{selectedTask.submission.content}</p>

                        {selectedTask.submission.feedback && (
                          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-[#333]">
                            <p className="text-xs font-medium">Feedback:</p>
                            <p className="text-sm">{selectedTask.submission.feedback}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <DialogFooter>
                {isEditMode ? (
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsEditMode(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleEditTask} disabled={isLoading} className="gradient-button">
                      {isLoading ? "Updating..." : "Update Task"}
                    </Button>
                  </div>
                ) : (
                  <div className="flex justify-between">
                    {selectedTask.assigneeId === account &&
                      selectedTask.status === "inprogress" &&
                      !selectedTask.submission && (
                        <Button onClick={() => setIsSubmitDialogOpen(true)} className="gradient-button">
                          Submit Work
                        </Button>
                      )}

                    {selectedTask.userId === account && selectedTask.status === "review" && selectedTask.submission && (
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={handleRejectSubmission}>
                          Reject
                        </Button>
                        <Button onClick={handleApproveSubmission} disabled={isLoading} className="gradient-button">
                          {isLoading ? "Approving..." : "Approve"}
                        </Button>
                      </div>
                    )}

                    <Button variant="outline" onClick={() => setIsTaskDetailOpen(false)}>
                      Close
                    </Button>
                  </div>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Submit Work Dialog */}
      <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Work</DialogTitle>
            <DialogDescription>Please provide a link to your work submission.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="submission">Submission Content</Label>
              <Textarea
                id="submission"
                placeholder="Paste your link here..."
                value={submissionContent}
                onChange={(e) => setSubmissionContent(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSubmitDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitWork} disabled={isSubmitting} className="gradient-button">
              {isSubmitting ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pay for Task</DialogTitle>
            <DialogDescription>
              You are about to pay {taskBeingPaid?.rewardAmount} {taskBeingPaid?.reward} for this task.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to proceed?</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePayTask} disabled={isProcessingPayment} className="gradient-button">
              {isProcessingPayment ? (
                <>
                  Processing Payment...
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                </>
              ) : (
                "Pay Now"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <PaymentPopup
        isOpen={isPaymentPopupOpen}
        onClose={() => setIsPaymentPopupOpen(false)}
        task={taskToPay}
        onPaymentComplete={handlePaymentComplete}
      />
    </div>
  )
}
