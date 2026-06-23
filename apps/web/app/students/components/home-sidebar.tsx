import { StudentLoginForm } from "@/app/auth/components/student-login-form";
import { QuickActions } from "./quick-actions";
import { ResumeLearning } from "./resume-learning";
import { Achievements } from "./achievements";

export function HomeSidebar() {
  return (
    <aside className="flex flex-col gap-5.5 border-l border-[var(--border)] bg-[var(--surface)] p-3 w-[260px] shrink-0 max-lg:border-l-0 max-lg:border-t max-lg:w-full">
      <StudentLoginForm />
      <QuickActions />
      <ResumeLearning />
      <Achievements />
    </aside>
  );
}
