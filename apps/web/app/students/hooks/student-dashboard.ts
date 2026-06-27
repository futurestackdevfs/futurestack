'use client';

import { useState, useEffect } from 'react';
import { loadToken } from '@/app/auth/lib/token-store';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002';

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
        const token = await loadToken();
        if (!token) {
          if (!cancelled) {
            setError('Not authenticated');
            setIsLoading(false);
          }
          return;
        }

        const res = await fetch(`${API}/student/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
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
