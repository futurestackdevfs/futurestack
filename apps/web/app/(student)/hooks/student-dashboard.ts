'use client';

import useSWR from 'swr';

export interface DashboardUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface NextVideo {
  id: string;
  title: string;
  sectionTitle: string;
}

export interface EnrolledCourse {
  courseId: string;
  title: string;
  thumbnailUrl: string | null;
  progressPercent: number;
  completedVideos: number;
  totalVideos: number;
  hoursRemaining: number;
  nextVideo: NextVideo | null;
}

export interface StudentDashboard {
  user: DashboardUser;
  enrolledCourses: EnrolledCourse[];
  resumeCourses: EnrolledCourse[];
}

export function useStudentDashboard() {
  const { data, isLoading, error } = useSWR<StudentDashboard>('/api/student/dashboard');
  return {
    data: data ?? null,
    isLoading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
  };
}
