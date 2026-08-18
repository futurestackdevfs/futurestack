"use client";

export type BadgeClass =
  | "badge-hot"
  | "badge-new"
  | "badge-beginner"
  | "badge-popular"
  | "badge-trending";

export interface CourseCardData {
  id: string;
  name: string;
  sub: string;
  thumb: string;
  thumbClass: string;
  badge: string;
  badgeClass: BadgeClass;
  rating: string;
  count: string;
  duration: string;
}

export interface CareerPathData {
  id: string;
  icon: string;
  iconClass: string;
  name: string;
  meta: string;
}

export interface CtaCardData {
  type: string;
  icon: string;
  eyebrow: string;
  title: string;
  desc: string;
  stats: { num: string; lbl: string }[];
  btnLabel: string;
  btnClass: string;
}

export interface TrustItemData {
  icon: string;
  name: string;
  desc: string;
}

export interface ResumeItemData {
  thumbClass: string;
  thumbIcon: string;
  name: string;
  sub: string;
  pct: number;
  barClass: string;
}

export interface AchievementData {
  initial: string;
  avatarStyle?: string;
  name: string;
  action: string;
  time: string;
}

export interface QuickActionData {
  icon: string;
  label: string;
  onClick?: string;
}

export const COURSE_CARDS: CourseCardData[] = [
  { id: "mern", name: "MERN Stack", sub: "MongoDB, Express, React & Node", thumb: "/images/C1.png", thumbClass: "thumb-mern", badge: "HOT", badgeClass: "badge-hot", rating: "4.9", count: "540", duration: "10 weeks" },
  { id: "python", name: "Python Programming", sub: "From Basics to Advanced", thumb: "/images/C2.png", thumbClass: "thumb-python", badge: "BEGINNER", badgeClass: "badge-beginner", rating: "4.8", count: "600", duration: "6 weeks" },
  { id: "ds", name: "Data Science & AI", sub: "ML, NLP & Deep Learning", thumb: "/images/C3.png", thumbClass: "thumb-ds", badge: "NEW", badgeClass: "badge-new", rating: "4.9", count: "210", duration: "12 weeks" },
  { id: "devops", name: "DevOps Engineering", sub: "AWS, Docker, K8s & CI/CD", thumb: "/images/C4.png", thumbClass: "thumb-devops", badge: "POPULAR", badgeClass: "badge-popular", rating: "4.7", count: "380", duration: "9 weeks" },
  { id: "fe", name: "Frontend Development", sub: "HTML, CSS, JS & React", thumb: "/images/C5.png", thumbClass: "thumb-fe", badge: "TRENDING", badgeClass: "badge-trending", rating: "4.8", count: "450", duration: "8 weeks" },
];

export const CAREER_PATHS: CareerPathData[] = [
  { id: "fs", icon: "🌐", iconClass: "pi-fs", name: "Full Stack Developer", meta: "12 Courses · 6 Months" },
  { id: "ds", icon: "📊", iconClass: "pi-ds", name: "Data Scientist", meta: "10 Courses · 5 Months" },
  { id: "do", icon: "🔧", iconClass: "pi-do", name: "DevOps Engineer", meta: "8 Courses · 4 Months" },
  { id: "ai", icon: "🤖", iconClass: "pi-ai", name: "AI/ML Engineer", meta: "9 Courses · 5 Months" },
  { id: "fe", icon: "🎨", iconClass: "pi-fe", name: "Frontend Developer", meta: "7 Courses · 4 Months" },
];

export const CTA_CARDS: CtaCardData[] = [
  {
    type: "cta-certs",
    icon: "🏆",
    eyebrow: "✦ Recognized Credentials",
    title: "Earn Industry Certificates",
    desc: "Boost your career with certificates recognized by 400+ hiring partners",
    stats: [{ num: "40+", lbl: "Certs Available" }, { num: "98%", lbl: "Pass Rate" }],
    btnLabel: "Explore Certificates",
    btnClass: "btn-purple",
  },
  {
    type: "cta-proj",
    icon: "💻",
    eyebrow: "✦ Hands-on Learning",
    title: "Build Real Projects",
    desc: "Learn by shipping industry-grade projects for your portfolio",
    stats: [{ num: "50+", lbl: "Live Projects" }, { num: "12", lbl: "Domains" }],
    btnLabel: "View Projects",
    btnClass: "btn-blue",
  },
  {
    type: "cta-jobs",
    icon: "💼",
    eyebrow: "✦ Career Support",
    title: "Get Placed Faster",
    desc: "Access exclusive job opportunities & dedicated placement support",
    stats: [{ num: "2K+", lbl: "Hiring Partners" }, { num: "85%", lbl: "Placement Rate" }],
    btnLabel: "View Jobs",
    btnClass: "btn-green",
  },
];

export const TRUST_ITEMS: TrustItemData[] = [
  { icon: "🏅", name: "Industry Recognized", desc: "Certificates" },
  { icon: "🛠️", name: "Hands-on Projects", desc: "Real-world experience" },
  { icon: "👨‍🏫", name: "Expert Instructors", desc: "Learn from the best" },
  { icon: "☁️", name: "Lifetime Access", desc: "Learn at your pace" },
  { icon: "💼", name: "Job Assistance", desc: "Placement Support" },
  { icon: "💰", name: "Money Back", desc: "7-day guarantee" },
];

export const RESUME_ITEMS: ResumeItemData[] = [
  { thumbClass: "rt-mern", thumbIcon: "⚛️", name: "MERN Stack Development", sub: "React Components & Props", pct: 65, barClass: "pb-orange" },
  { thumbClass: "rt-python", thumbIcon: "🐍", name: "Python Programming", sub: "Functions & Modules", pct: 30, barClass: "pb-blue" },
];

export const QUICK_ACTIONS: QuickActionData[] = [
  { icon: "👤", label: "My Profile", onClick: "profile" },
  { icon: "📝", label: "Enroll Now" },
  { icon: "🎯", label: "Skill Test" },
  { icon: "🎥", label: "Live Classes" },
  { icon: "⬇️", label: "Downloads" },
  { icon: "🏅", label: "Certificates" },
  { icon: "❓", label: "Ask Doubt" },
];

export const ACHIEVEMENTS: AchievementData[] = [
  { initial: "R", name: "Rahul Sharma", action: "Completed MERN Stack", time: "2 days ago" },
  { initial: "P", avatarStyle: "background:linear-gradient(135deg,#a855f7,#ec4899)", name: "Priya Mehta", action: "Earned Python Certificate", time: "3 days ago" },
  { initial: "A", avatarStyle: "background:linear-gradient(135deg,#f59e0b,#ef4444)", name: "Arjun Singh", action: "Got Placed at TCS", time: "1 week ago" },
];

export const MEGA_COURSE_CATS = [
  { id: "web", label: "Web Development", count: 6 },
  { id: "data", label: "Data & AI", count: 6 },
  { id: "cloud", label: "Cloud & DevOps", count: 6 },
  { id: "emerging", label: "Emerging Tech", count: 6 },
];

export const MEGA_COURSE_LISTS: Record<
  string,
  { name: string; weeks?: string; soon?: boolean }[]
> = {
  web: [
    { name: "MERN Stack", weeks: "10 wks" },
    { name: "Frontend Development", weeks: "8 wks" },
    { name: "Backend with Node.js", weeks: "8 wks" },
    { name: "Full Stack Java", weeks: "10 wks" },
    { name: "Angular Development", soon: true },
    { name: "Next.js & SSR", soon: true },
  ],
  data: [
    { name: "Python Programming", weeks: "6 wks" },
    { name: "Data Science & AI", weeks: "12 wks" },
    { name: "Machine Learning", weeks: "10 wks" },
    { name: "Deep Learning & NLP", weeks: "10 wks" },
    { name: "SQL & Data Analytics", weeks: "6 wks" },
    { name: "Generative AI & LLMs", soon: true },
  ],
  cloud: [
    { name: "DevOps Engineering", weeks: "9 wks" },
    { name: "AWS Cloud Practitioner", weeks: "6 wks" },
    { name: "Docker & Kubernetes", weeks: "8 wks" },
    { name: "Microsoft Azure Fundamentals", weeks: "6 wks" },
    { name: "Google Cloud Platform", soon: true },
    { name: "Terraform & IaC", soon: true },
  ],
  emerging: [
    { name: "Embedded Systems & PCB", weeks: "10 wks" },
    { name: "Cybersecurity Fundamentals", weeks: "8 wks" },
    { name: "IoT Development", weeks: "8 wks" },
    { name: "Blockchain Development", soon: true },
    { name: "AR/VR Development", soon: true },
    { name: "Quantum Computing Basics", soon: true },
  ],
};

export const MEGA_PATH_CATS = [
  { id: "fullstack", label: "Full Stack Developer", meta: "12 Courses · 6 Months" },
  { id: "data", label: "Data Scientist", meta: "10 Courses · 5 Months" },
  { id: "devops", label: "DevOps Engineer", meta: "8 Courses · 4 Months" },
  { id: "aiml", label: "AI/ML Engineer", meta: "9 Courses · 5 Months" },
  { id: "frontend", label: "Frontend Developer", meta: "7 Courses · 4 Months" },
  { id: "security", label: "Cybersecurity Specialist", meta: "8 Courses · 5 Months" },
];

export const MEGA_PATH_PREVIEWS: Record<
  string,
  {
    title: string;
    level: string;
    meta: string;
    desc: string;
    skills: string[];
    snapshot: { label: string; value: string }[];
  }
> = {
  fullstack: {
    title: "Full Stack Developer",
    level: "Beginner Friendly",
    meta: "12 Courses · 6 Months · Certificate on completion",
    desc: "Learn to design, build and deploy complete web applications — from database and server logic to a polished, responsive interface.",
    skills: ["MongoDB", "Express.js", "React", "Node.js", "REST APIs"],
    snapshot: [
      { label: "Avg. Salary", value: "₹8.5 LPA" },
      { label: "Job Openings", value: "1,200+" },
      { label: "Popular Role", value: "Full Stack Dev" },
    ],
  },
  data: {
    title: "Data Scientist",
    level: "Intermediate",
    meta: "10 Courses · 5 Months · Certificate on completion",
    desc: "Build a strong foundation in statistics, Python and machine learning, then apply it to real-world data analysis and prediction problems.",
    skills: ["Python", "Pandas", "SQL", "Machine Learning", "Data Visualization"],
    snapshot: [
      { label: "Avg. Salary", value: "₹10 LPA" },
      { label: "Job Openings", value: "900+" },
      { label: "Popular Role", value: "Data Analyst" },
    ],
  },
  devops: {
    title: "DevOps Engineer",
    level: "Intermediate",
    meta: "8 Courses · 4 Months · Certificate on completion",
    desc: "Master the tools and practices behind reliable software delivery — from containers and CI/CD pipelines to cloud infrastructure.",
    skills: ["Docker", "Kubernetes", "AWS", "CI/CD", "Linux"],
    snapshot: [
      { label: "Avg. Salary", value: "₹9 LPA" },
      { label: "Job Openings", value: "700+" },
      { label: "Popular Role", value: "DevOps/SRE" },
    ],
  },
  aiml: {
    title: "AI/ML Engineer",
    level: "Advanced",
    meta: "9 Courses · 5 Months · Certificate on completion",
    desc: "Go beyond the basics of machine learning into deep learning, NLP and model deployment for production AI systems.",
    skills: ["Python", "TensorFlow", "Deep Learning", "NLP", "Model Deployment"],
    snapshot: [
      { label: "Avg. Salary", value: "₹12 LPA" },
      { label: "Job Openings", value: "650+" },
      { label: "Popular Role", value: "ML Engineer" },
    ],
  },
  frontend: {
    title: "Frontend Developer",
    level: "Beginner Friendly",
    meta: "7 Courses · 4 Months · Certificate on completion",
    desc: "Learn to craft fast, accessible and visually polished interfaces using modern HTML, CSS, JavaScript and React.",
    skills: ["HTML/CSS", "JavaScript", "React", "Responsive Design", "Accessibility"],
    snapshot: [
      { label: "Avg. Salary", value: "₹7 LPA" },
      { label: "Job Openings", value: "1,100+" },
      { label: "Popular Role", value: "Frontend Dev" },
    ],
  },
  security: {
    title: "Cybersecurity Specialist",
    level: "Advanced",
    meta: "8 Courses · 5 Months · Certificate on completion",
    desc: "Learn to identify, prevent and respond to security threats across networks, applications and cloud environments.",
    skills: ["Network Security", "Ethical Hacking", "Cloud Security", "Risk Assessment"],
    snapshot: [
      { label: "Avg. Salary", value: "₹9.5 LPA" },
      { label: "Job Openings", value: "500+" },
      { label: "Popular Role", value: "Security Analyst" },
    ],
  },
};

export const LEAD_COURSE_OPTIONS = [
  "MERN Stack",
  "Python Programming",
  "Data Science & AI",
  "DevOps Engineering",
  "Frontend Development",
  "Not sure yet",
];

export const CAREER_PATH_OPTIONS = [
  "Full Stack Developer",
  "Data Scientist",
  "DevOps Engineer",
  "AI/ML Engineer",
  "Frontend Developer",
  "Cybersecurity Specialist",
];

export const QUALIFICATION_OPTIONS = ["High School", "Diploma", "Undergraduate", "Postgraduate", "Other"];
