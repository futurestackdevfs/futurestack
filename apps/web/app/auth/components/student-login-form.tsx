export function StudentLoginForm() {
  return (
    <div
      className="relative w-full max-w-[280px] overflow-hidden rounded-[20px] border-2 p-4 transition-all duration-300 hover:-translate-y-1"
      style={{
        background: "linear-gradient(135deg, var(--surface), var(--bg))",
        borderColor: "rgba(37,99,235,0.18)",
        boxShadow: "0 0 0 1px rgba(37,99,235,0.08), 0 12px 30px rgba(37,99,235,0.12)",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.boxShadow = "0 0 0 1px rgba(37,99,235,0.15), 0 18px 40px rgba(37,99,235,0.18)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.boxShadow = "0 0 0 1px rgba(37,99,235,0.08), 0 12px 30px rgba(37,99,235,0.12)";
      }}
    >
      <div
        className="absolute -right-15 -top-15 h-[140px] w-[140px] rounded-full"
        style={{ background: "radial-gradient(rgba(37,99,235,0.18), transparent 70%)", pointerEvents: "none" }}
      />
      <div
        className="absolute -bottom-[50px] -left-[50px] h-[120px] w-[120px] rounded-full"
        style={{ background: "radial-gradient(rgba(255,106,0,0.18), transparent 70%)", pointerEvents: "none" }}
      />

      <div className="relative z-10 mb-2.5">
        <h3 className="mb-0.5 text-lg text-[var(--text)]">Student Login</h3>
        <p className="text-[11px] text-[var(--muted)]">Access your dashboard & courses</p>
      </div>

      <form className="relative z-[2] flex flex-col gap-2.5">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-[var(--text2)]">Email Address</label>
          <input type="email" placeholder="Enter your email" className="h-9 border-none outline-none px-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] text-[12px] transition duration-300 placeholder:text-[var(--muted)] focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.08)]" />
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

        <button type="submit" className="h-[38px] border-none rounded-xl bg-[linear-gradient(135deg,#ff6b00,#2563eb)] text-white text-[13px] font-semibold cursor-pointer shadow-[0_8px_18px_rgba(37,99,235,0.18)] transition duration-300 hover:-translate-y-0.5">Login</button>

        <div className="relative z-10 my-0.5 flex items-center text-center text-[9.5px] text-[var(--muted)] before:flex-1 before:h-px before:bg-[var(--border)] before:content-[''] after:flex-1 after:h-px after:bg-[var(--border)] after:content-['']">
          <span className="whitespace-nowrap px-2">or continue with</span>
        </div>

        <button
          type="button"
          className="relative z-10 flex h-[38px] cursor-pointer items-center justify-center gap-2 rounded-xl border-[1.5px] border-[var(--border)] bg-[var(--surface)] text-[12.5px] font-semibold text-[var(--text)] transition-all duration-200 hover:-translate-y-px hover:border-[var(--border2)] hover:bg-[var(--bg)] dark:bg-[var(--card-hover)] dark:hover:bg-[var(--surface)]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.69-2.26 1.1-3.71 1.1-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.14c-.22-.69-.35-1.43-.35-2.14s.13-1.45.35-2.14V7.02H2.18A10.97 10.97 0 001 12c0 1.77.43 3.45 1.18 4.98l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.02l3.66 2.84c.87-2.6 3.3-4.48 6.16-4.48z"/>
          </svg>
          Continue with Gmail
        </button>

        <div className="text-center text-[10px] text-[var(--muted)]">
          Don&apos;t have an account? <a href="#" className="font-semibold text-[var(--blue)]">Sign Up</a>
        </div>
      </form>
    </div>
  );
}
