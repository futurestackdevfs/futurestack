export interface Student {
  id: string;
  name: string;
  email: string;
  level: string;
  xp: number;
  streakDays: number;
  certificates: number;
}

export interface Course {
  id: string;
  name: string;
  progress: number;
  targetDate: string;
}

export interface Kpi {
  label: string;
  value: string;
  change: number;
}
