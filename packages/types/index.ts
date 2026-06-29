// Auth
export interface AuthUser {
  id: string
  email: string
  name: string
  role: 'STUDENT' | 'TRAINER' | 'COORDINATOR' | 'SUPPORT' | 'ADMIN'
  avatarUrl: string | null
  emailVerified: boolean
}

export interface AuthResponse {
  accessToken: string
  user: AuthUser
}

// Dashboard
export interface CourseProgress {
  courseId: string
  title: string
  thumbnailUrl: string | null
  progressPercent: number
  completedVideos: number
  totalVideos: number
  hoursRemaining: number
  nextVideo: {
    id: string
    title: string
    sectionTitle: string
  } | null
}

export interface StudentDashboard {
  user: AuthUser
  enrolledCourses: CourseProgress[]
}