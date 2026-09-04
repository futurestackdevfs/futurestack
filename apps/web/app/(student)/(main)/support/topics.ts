export type FieldKey = "orderId" | "courseId" | "lessonId" | "browser";
export type Priority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export interface SubTopic {
  id: string;
  label: string;
  help?: string;
  priority?: Priority;
  selfServe?: { label: string; href: string };
  fields?: FieldKey[];
}

export interface TopicCategory {
  id:
    | "PAYMENT"
    | "REFUND"
    | "COURSE_ACCESS"
    | "VIDEO"
    | "CERTIFICATE"
    | "ACCOUNT"
    | "BUG"
    | "LIVE_SESSION"
    | "OTHER";
  icon: string;
  label: string;
  blurb: string;
  subtopics: SubTopic[];
}

export const FIELD_LABEL: Record<FieldKey, string> = {
  orderId: "Order ID",
  courseId: "Which course?",
  lessonId: "Lesson / video name",
  browser: "Browser & device",
};

export const SUPPORT_TOPICS: TopicCategory[] = [
  {
    id: "PAYMENT",
    icon: "💳",
    label: "Payments & Billing",
    blurb: "Failed payment, double charge, or invoices",
    subtopics: [
      {
        id: "payment_deducted_no_access",
        label: "Money was deducted but I didn't get access",
        help: "Failed or pending payments are auto-reversed by the bank within 5–7 working days — you don't need to do anything for the refund. If your course still isn't unlocked after a successful payment, raise a ticket with your Order ID and we'll fix access right away.",
        priority: "HIGH",
        fields: ["orderId"],
      },
      {
        id: "charged_twice",
        label: "I was charged twice for the same course",
        help: "Only one charge is valid. The duplicate is usually auto-reversed within 5–7 working days. If it hasn't reversed, share your Order ID and we'll raise the refund manually.",
        priority: "HIGH",
        fields: ["orderId"],
      },
      {
        id: "need_invoice",
        label: "I need a GST invoice for my purchase",
        help: "Every paid order has a downloadable invoice on your Order History page.",
        selfServe: { label: "Open Order History", href: "/order-history" },
        fields: ["orderId"],
      },
      { id: "payment_failing", label: "My payment keeps failing at checkout", priority: "NORMAL", fields: [] },
    ],
  },
  {
    id: "REFUND",
    icon: "↩️",
    label: "Refund request",
    blurb: "Request a refund for a course or project",
    subtopics: [
      {
        id: "refund_request",
        label: "I want a refund for a course I bought",
        help: "Refunds are considered as per our refund policy (typically within 7 days of purchase and before significant course consumption). Share your Order ID and reason — the team will review and get back to you.",
        priority: "HIGH",
        fields: ["orderId"],
      },
      {
        id: "refund_status",
        label: "Where is my approved refund?",
        help: "Approved refunds are credited to your original payment method within 5–7 business days of approval. If it's been longer, raise a ticket with your Order ID.",
        priority: "NORMAL",
        fields: ["orderId"],
      },
    ],
  },
  {
    id: "COURSE_ACCESS",
    icon: "🎓",
    label: "Course access",
    blurb: "Can't open a course you're enrolled in",
    subtopics: [
      {
        id: "course_locked",
        label: "A course I paid for is still locked",
        help: "Try refreshing or signing out and back in first. If it's still locked, tell us which course and we'll restore access.",
        priority: "HIGH",
        fields: ["courseId"],
      },
      { id: "wrong_course", label: "I got access to the wrong course", priority: "HIGH", fields: ["courseId", "orderId"] },
      { id: "content_missing", label: "Some lessons or resources are missing", priority: "NORMAL", fields: ["courseId"] },
    ],
  },
  {
    id: "VIDEO",
    icon: "▶️",
    label: "Video problems",
    blurb: "Playback, buffering, or quality issues",
    subtopics: [
      {
        id: "video_not_playing",
        label: "A video won't play or keeps buffering",
        help: "Most playback issues are network/browser related. Try a different browser, disable extensions/VPN, and check your connection. If one specific video is broken for everyone, tell us which lesson.",
        priority: "NORMAL",
        fields: ["courseId", "lessonId", "browser"],
      },
      { id: "video_error", label: "A video shows an error code", priority: "NORMAL", fields: ["courseId", "lessonId", "browser"] },
      { id: "progress_not_saving", label: "My watch progress isn't saving", priority: "NORMAL", fields: ["courseId"] },
    ],
  },
  {
    id: "CERTIFICATE",
    icon: "📜",
    label: "Certificates",
    blurb: "Certificate not issued or details wrong",
    subtopics: [
      {
        id: "cert_not_issued",
        label: "I completed the course but got no certificate",
        help: "Certificates are issued once every lesson and quiz in the course is complete. Check your progress is 100%. If it is and there's still no certificate, raise a ticket.",
        priority: "NORMAL",
        fields: ["courseId"],
      },
      { id: "cert_name_wrong", label: "My name is wrong on the certificate", priority: "NORMAL", fields: ["courseId"] },
    ],
  },
  {
    id: "ACCOUNT",
    icon: "🔐",
    label: "Account & login",
    blurb: "Login, password, or email issues",
    subtopics: [
      {
        id: "cant_login",
        label: "I can't log in to my account",
        help: "Use the 'Forgot password' link on the login page to reset your password. If you signed up with Google, use 'Continue with Google'.",
        selfServe: { label: "Reset password", href: "/auth/forgot-password" },
        fields: [],
      },
      { id: "change_email", label: "I need to change my registered email", priority: "NORMAL", fields: [] },
      { id: "delete_account", label: "I want to delete my account", priority: "NORMAL", fields: [] },
    ],
  },
  {
    id: "BUG",
    icon: "🐞",
    label: "Report a bug",
    blurb: "Something on the site is broken",
    subtopics: [
      {
        id: "bug_report",
        label: "Report a bug or broken page",
        help: "Tell us exactly what you did, what you expected, and what happened instead. A screenshot and your browser/device help us reproduce it fast.",
        priority: "NORMAL",
        fields: ["browser"],
      },
    ],
  },
  {
    id: "LIVE_SESSION",
    icon: "🎥",
    label: "Live class / project",
    blurb: "Live sessions, mentors, or project support",
    subtopics: [
      { id: "missed_live", label: "I missed a live session — is there a recording?", priority: "NORMAL", fields: ["courseId"] },
      { id: "mentor_help", label: "I need help from my project mentor", priority: "NORMAL", fields: [] },
      { id: "schedule_issue", label: "The live class schedule is unclear or clashing", priority: "LOW", fields: [] },
    ],
  },
  {
    id: "OTHER",
    icon: "💬",
    label: "Something else",
    blurb: "Anything not covered above",
    subtopics: [{ id: "other", label: "Other query", priority: "NORMAL", fields: [] }],
  },
];
