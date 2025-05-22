export interface UserProfile {
  id: string
  address: string
  username: string
  profilePicture: string
  createdAt: string
  updatedAt: string
}

export interface Task {
  id: string
  title: string
  description: string
  status: string
  priority: string
  reward?: string
  rewardAmount?: number
  userId: string
  assigneeId?: string
  assignee?: {
    id: string
    username: string
    profilePicture: string
  }
  submission?: {
    content: string
    submittedAt: string
    status: "pending" | "approved" | "rejected"
    feedback?: string
  }
  paid?: boolean
  createdAt: string
  updatedAt?: string
}

export interface Bounty {
  id: string
  title: string
  description: string
  daoName: string
  daoImage: string
  reward: string
  rewardAmount: number
  category: string
  daysAgo: number
}

// Add the Project interface after the existing interfaces

export interface Project {
  id: string
  title: string
  description: string
  status: "active" | "completed" | "archived"
  createdBy: string
  members?: string[]
  createdAt: string
  updatedAt?: string
  dueDate?: string
  category?: string
  tags?: string[]
  coverImage?: string
}
