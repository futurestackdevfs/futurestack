export function StaffLoginForm() {
  return (
    <form className="relative z-[2] flex flex-col gap-2.5">
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-medium text-[var(--text2)]">Staff Email</label>
        <input type="email" placeholder="Enter your staff email" className="h-9 border-none outline-none px-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] text-[12px] transition duration-300 placeholder:text-[var(--muted)] focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.08)]" />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-medium text-[var(--text2)]">Password</label>
        <input type="password" placeholder="Enter password" className="h-9 border-none outline-none px-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] text-[12px] transition duration-300 placeholder:text-[var(--muted)] focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.08)]" />
      </div>

      <div className="flex justify-between items-center">
        <label className="flex items-center gap-1 text-[10px] text-[var(--muted)]">
          <input type="checkbox" />
          Remember me
        </label>
        <a href="#" className="text-[10px] text-[var(--blue)] font-semibold">Forgot Password?</a>
      </div>

      <button type="submit" className="h-[38px] border-none rounded-xl bg-[linear-gradient(135deg,#ff6b00,#2563eb)] text-white text-[13px] font-semibold cursor-pointer shadow-[0_8px_18px_rgba(37,99,235,0.18)] transition duration-300 hover:-translate-y-0.5">Sign In</button>
    </form>
  );
}
