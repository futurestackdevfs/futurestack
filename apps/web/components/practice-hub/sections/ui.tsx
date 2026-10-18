import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface SectionProps {
  /** Inject the section's defect (see Challenge.bug). */
  bug: boolean;
}

const control =
  "h-9 w-full rounded-lg border border-[var(--border2)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--orange)] disabled:cursor-not-allowed disabled:opacity-60 read-only:bg-[var(--bg2)]";

export function Input({ id, className, ...p }: InputHTMLAttributes<HTMLInputElement>) {
  return <input id={id} data-testid={id} className={cn(control, className)} {...p} />;
}

export function Textarea({ id, className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea id={id} data-testid={id} className={cn(control, "h-20 py-2", className)} {...p} />;
}

export function Select({ id, className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select id={id} data-testid={id} className={cn(control, className)} {...p}>
      {children}
    </select>
  );
}

export function Btn({
  id,
  variant = "primary",
  className,
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  return (
    <button
      id={id}
      data-testid={id}
      type="button"
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-lg px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-[var(--btn-bg)] text-[var(--btn-text)] hover:opacity-90",
        variant === "ghost" && "border border-[var(--border2)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--bg2)]",
        variant === "danger" && "bg-[var(--red)] text-white hover:opacity-90",
        className,
      )}
      {...p}
    />
  );
}

export function Field({ label, htmlFor, children, className }: { label: string; htmlFor?: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1 block text-xs font-semibold text-[var(--text2)]">
        {label}
      </label>
      {children}
    </div>
  );
}

export function Panel({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-[var(--border)] bg-[var(--card)] p-3", className)}>
      <h4 className="mb-2 text-sm font-bold text-[var(--text)]">{title}</h4>
      {children}
    </div>
  );
}

export function Out({ id, tone = "info", children }: { id?: string; tone?: "info" | "ok" | "err"; children: ReactNode }) {
  return (
    <div
      id={id}
      data-testid={id}
      className={cn(
        "rounded-lg px-3 py-2 text-sm",
        tone === "info" && "bg-[var(--bg2)] text-[var(--text2)]",
        tone === "ok" && "bg-[var(--green-d)] text-[var(--green)]",
        tone === "err" && "bg-[var(--red-d)] text-[var(--red)]",
      )}
    >
      {children}
    </div>
  );
}

