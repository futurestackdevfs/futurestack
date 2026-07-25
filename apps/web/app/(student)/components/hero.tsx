export function Hero() {
  return (
    <section
      className="relative flex min-h-[250px] items-center overflow-hidden rounded-2xl border border-white/6 bg-[var(--hero-bg)] shadow-[var(--shadow-lg)] [animation:fadeUp_.5s_ease_both]"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 60% 50%, rgba(45,126,247,.2) 0%, transparent 60%), radial-gradient(ellipse at 90% 30%, rgba(255,106,26,.14) 0%, transparent 50%)",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="flex h-[280px] w-full items-center justify-center overflow-hidden rounded-xl">
          <img src="/images/mainbanner.png" alt="Technology" className="block h-full w-full" />
        </div>
      </div>
    </section>
  );
}
