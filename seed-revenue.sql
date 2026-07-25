-- ================================================================
-- SEED DATA: Trainer revenue ke liye sirf courses + enrollments
-- NOTE: Replace all 'id-xxx' with real UUIDs before running
-- ================================================================

-- 1. TRAINER
INSERT INTO "User" (id, email, name, password, role, "approvalStatus", "isActive", "emailVerified", "updatedAt")
SELECT
  'id-trainer-001', 'kiran.das@futurestack.in', 'Kiran Das',
  '$2b$10$8K1p/a0dL1LXMIgoEDFrwOfMQkfAjkMBcGm7m7eOudFlKxGpYdXqO',
  'TRAINER', 'APPROVED', true, true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "User" WHERE email = 'kiran.das@futurestack.in');

-- 2. STUDENT (sirf ek)
INSERT INTO "User" (id, email, name, password, role, "isActive", "emailVerified", "updatedAt")
SELECT
  'id-student-001', 'rahul.sharma@example.com', 'Rahul Sharma',
  '$2b$10$8K1p/a0dL1LXMIgoEDFrwOfMQkfAjkMBcGm7m7eOudFlKxGpYdXqO',
  'STUDENT', true, true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "User" WHERE email = 'rahul.sharma@example.com');

-- 3. COURSES (trainer ke courses)
INSERT INTO "Course" (id, title, description, price, status, "trainerId", category, code, "skillLevel", "displayOrder")
VALUES
('id-course-001', 'MERN Stack Development', 'Full-stack with MongoDB, Express, React, Node.js', 49999, 'ACTIVE', 'id-trainer-001', 'Full Stack', 'MERN', 'BEGINNER', 1),
('id-course-002', 'Data Science Foundations', 'Python, Pandas, NumPy, data visualisation', 39999, 'ACTIVE', 'id-trainer-001', 'Data Science', 'DS', 'BEGINNER', 2),
('id-course-003', 'Python Programming', 'Python from scratch to real-world projects', 29999, 'ACTIVE', 'id-trainer-001', 'Programming', 'PY', 'BEGINNER', 3),
('id-course-004', 'DevOps & Docker Essentials', 'Docker, CI/CD, cloud deployment', 34999, 'ACTIVE', 'id-trainer-001', 'DevOps', 'DEVOPS', 'INTERMEDIATE', 4)
ON CONFLICT (code) DO NOTHING;

-- 4. ENROLLMENTS (student in trainer ke courses)
INSERT INTO "Enrollment" (id, "studentId", "courseId", "amountPaid", status)
VALUES
('id-enroll-001', 'id-student-001', 'id-course-001', 49999, 'active'),  -- Full
('id-enroll-002', 'id-student-001', 'id-course-002', 20000, 'active'),  -- EMI
('id-enroll-003', 'id-student-001', 'id-course-003', 0, 'active'),      -- Pending
('id-enroll-004', 'id-student-001', 'id-course-004', 34999, 'active')   -- Full
ON CONFLICT (id) DO NOTHING;
