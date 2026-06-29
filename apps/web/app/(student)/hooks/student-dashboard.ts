'use client';

import { useState, useEffect } from 'react';

const API = '/api';

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
}

interface UseStudentDashboardResult {
  data: StudentDashboard | null;
  isLoading: boolean;
  error: string | null;
}

export function useStudentDashboard(): UseStudentDashboardResult {
  const [data, setData] = useState<StudentDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchDashboard() {
      try {
        // Token is in HttpOnly cookie — proxy forwards it automatically
        const res = await fetch(`${API}/student/dashboard`, {
          credentials: 'same-origin',
        });

        if (res.status === 401) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('fs:session-expired'));
          }
          if (!cancelled) {
            setError('Session expired');
            setIsLoading(false);
          }
          return;
        }

        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { message?: string };
          throw new Error(body.message ?? `Request failed (${res.status})`);
        }

        const json = (await res.json()) as StudentDashboard;
        if (!cancelled) {
          setData(json);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard');
          setIsLoading(false);
        }
      }
    }

    fetchDashboard();
    return () => { cancelled = true; };
  }, []);

  return { data, isLoading, error };
}
