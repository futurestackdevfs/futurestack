"use client";

export interface CoordinatorDashboard {
  kpi: {
    totalStudents: number;
    activeBatches: number;
    totalEnrolled: number;
    revenueMtd: number;
    revenueDelta: number;
    pipeline: number;
    newLeadsWeek: number;
    conversionRate: number;
    pendingEscalations: number;
    trainerCount: number;
  };
  recentOrders: {
    id: string;
    amount: number;
    mode: string | null;
    date: string;
  }[];
}

export interface CoordinatorBatch {
  id: string;
  title: string;
  code: string | null;
  price: number;
  trainer: { id: string; name: string; email: string } | null;
  enrolledCount: number;
  activeStudents: number;
  totalSections: number;
  students: {
    id: string;
    name: string;
    email: string;
    enrolledAt: string;
    status: string;
  }[];
}

export interface CoordinatorStudent {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  enrollments: {
    id: string;
    course: string;
    courseId: string;
    status: string;
  }[];
  totalEnrollments: number;
  activeEnrollments: number;
}

export interface CoordinatorTrainer {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  approvalStatus: string | null;
  rating: number | null;
  totalCourses: number;
  totalStudents: number;
  courses: { id: string; title: string; enrolled: number }[];
}

export interface CoordinatorEscalation {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  flag: string;
  note: string | null;
  flaggedAt: string | null;
  courses: string[];
}

export interface CoordinatorPayment {
  id: string;
  orderNo: string;
  status: string;
  currency: string;
  totalAmount: number;
  createdAt: string;
  student: { id: string; name: string; email: string };
  items: { title: string; price: number }[];
  enrollmentsCount: number;
}

export interface CoordinatorPaymentsResponse {
  summary: {
    total: number;
    created: number;
    paid: number;
    failed: number;
    cancelled: number;
    expired: number;
    totalRevenue: number;
  };
  orders: CoordinatorPayment[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}
