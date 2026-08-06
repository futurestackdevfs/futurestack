"use client";

import { useState } from "react";
import { TopNav } from "@/components/layout/marketing-top-nav";
import Link from "next/link";

const initialItems = [
  { id: 1, emoji: "⚛️", thumbCls: "bg-[linear-gradient(135deg,#0d1f3c,#0a2a1a)]", cat: "Full Stack Development", name: "MERN Stack Development — Complete Bootcamp", rating: "★ 0.0", reviews: "0", hours: "38 hrs", modules: "20 modules", price: 2999, oldPrice: 5999 },
  { id: 2, emoji: "🐍", thumbCls: "bg-[linear-gradient(135deg,#1a1a0d,#0d1a2e)]", cat: "Programming", name: "Python Programming — From Zero to Pro", rating: "★ 0.0", reviews: "0", hours: "52 hrs", modules: "20 modules", price: 1999, oldPrice: 3999 },
  { id: 3, emoji: "📊", thumbCls: "bg-[linear-gradient(135deg,#0d0d2e,#1a0d2e)]", cat: "Data Science", name: "Data Science with Python & Pandas", rating: "★ 0.0", reviews: "0", hours: "44 hrs", modules: "16 modules", price: 3499, oldPrice: 6999 },
];

const savedItems = [
  { emoji: "🧠", bg: "linear-gradient(135deg,#08041a,#040c18)", name: "Generative AI & LLM Engineering", price: "₹4,499", oldPrice: "₹8,999" },
  { emoji: "☁️", bg: "linear-gradient(135deg,#0a1020,#142010)", name: "AWS Solutions Architect — Professional", price: "₹3,999", oldPrice: "₹7,499" },
];

function formatPrice(n: number) { const v = Number.isFinite(n) ? n : 0; return "₹" + v.toLocaleString("en-IN"); }

const inputCls =
  "w-full h-11 rounded-lg bg-[var(--bg2)] border border-[var(--border)] px-3.5 text-[13px] text-[var(--text)] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[var(--muted)] focus:border-[var(--blue)] focus:shadow-[0_0_0_3px_var(--blue-d)]";

const labelCls =
  "block text-[11px] font-semibold text-[var(--text2)] uppercase tracking-[.04em] mb-1.5";

const primaryBtnCls =
  "w-full h-12 rounded-xl bg-[linear-gradient(135deg,var(--orange),var(--orange2))] text-white text-[14px] font-extrabold flex items-center justify-center gap-2 shadow-[0_5px_18px_rgba(240,90,26,.35)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(240,90,26,.45)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-[var(--shadow)] ${className}`}>
      {children}
    </div>
  );
}

function LabeledInput({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div className="flex flex-col">
      <label className={labelCls}>{label}</label>
      <input className={inputCls} {...props} />
    </div>
  );
}

export default function CartPage() {
  const [step, setStep] = useState(1);
  const [items, setItems] = useState(initialItems);
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [method, setMethod] = useState("card");
  const [processing, setProcessing] = useState(false);

  const subtotal = items.reduce((s, i) => s + i.price, 0);
  const originalTotal = items.reduce((s, i) => s + i.oldPrice, 0);
  const totalCount = items.length;
  const bundleDiscount = originalTotal - subtotal;
  const promoDiscount = promoApplied ? Math.round(subtotal * 0.1) : 0;
  const total = subtotal - promoDiscount;

  function removeItem(id: number) {
    setItems(prev => prev.filter(i => i.id !== id));
  }

  function goToStep(n: number) {
    setStep(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function applyPromo() {
    if (promoInput.trim()) setPromoApplied(true);
  }

  function processPayment() {
    setProcessing(true);
    setTimeout(() => { setProcessing(false); goToStep(3); }, 1600);
  }

  const steps = ["Cart", "Payment", "Confirmation"];

  return (
    <>
      <TopNav />
      <div className="h-[56px]" />

      <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8 pb-16 pt-7 sm:pt-8">
        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-6">
          {steps.map((label, i) => {
            const n = i + 1;
            const done = n < step;
            const active = n === step;
            return (
              <div key={label} className="flex items-center gap-2 sm:gap-3">
                {i > 0 && <div className={`h-px w-8 sm:w-16 ${done || active ? "bg-[var(--orange)]" : "bg-[var(--border2)]"}`} />}
                <div className="flex flex-col items-center gap-1.5">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-extrabold transition-all duration-250 ${active ? "bg-[linear-gradient(135deg,var(--orange),var(--orange2))] text-white shadow-[0_3px_12px_rgba(240,90,26,.35)]" : done ? "bg-[var(--green)] text-white" : "bg-[var(--bg2)] border-[1.5px] border-[var(--border2)] text-[var(--text3)]"}`}>
                    {done ? "✓" : n}
                  </div>
                  <span className={`hidden sm:block text-[11px] font-semibold whitespace-nowrap ${active ? "text-[var(--text)]" : done ? "text-[var(--green)]" : "text-[var(--text3)]"}`}>{label}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Step 1: Cart */}
        {step === 1 && (
          <>
            <div className="flex items-baseline justify-between mb-5">
              <div className="flex items-baseline gap-3">
                <h1 className="font-['Inter_Tight',sans-serif] text-2xl sm:text-3xl font-extrabold text-[var(--text)] tracking-[-.01em]">Your Cart</h1>
                <span className="text-xs font-medium text-[var(--muted)]">{totalCount} {totalCount === 1 ? "course" : "courses"}</span>
              </div>
              <Link href="/courses" className="hidden sm:inline text-[13px] font-semibold text-[var(--blue)] hover:underline no-underline">Continue browsing →</Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-5 items-start">
              <div className="flex flex-col gap-4">
                {items.length > 0 && (
                <Card className="overflow-hidden">
                  {items.map((item, i) => (
                    <div key={item.id} className={`flex items-center gap-3 px-4 sm:px-5 min-h-[104px] sm:min-h-[124px] py-3 animate-[fadeUp_.3s_ease_both] ${i > 0 ? "border-t border-[var(--border)]" : ""}`}>
                      <div className={`w-16 h-16 sm:w-[84px] sm:h-[84px] shrink-0 rounded-xl flex items-center justify-center text-[24px] sm:text-[34px] shadow-[0_3px_10px_rgba(0,0,0,.18)] relative overflow-hidden before:content-[''] before:absolute before:inset-0 before:bg-[linear-gradient(135deg,rgba(255,255,255,.1),transparent_60%)] ${item.thumbCls}`}>
                        {item.emoji}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="hidden sm:block text-[10px] font-semibold text-[var(--muted)] uppercase tracking-[.08em]">{item.cat}</div>
                        <div className="text-[13.5px] sm:text-[15px] font-bold text-[var(--text)] leading-snug line-clamp-2">{item.name}</div>

                        <div className="hidden sm:flex flex-wrap items-center gap-x-3 text-[11px] text-[var(--muted)] mt-1.5">
                          <span>{item.rating} ({item.reviews} reviews)</span>
                          <span className="h-[3px] w-[3px] rounded-full bg-[var(--border2)]" />
                          <span>⏱ {item.hours}</span>
                          <span className="h-[3px] w-[3px] rounded-full bg-[var(--border2)]" />
                          <span>📚 {item.modules}</span>
                        </div>
                        <div className="hidden sm:inline-flex mt-2 items-center gap-1.5 text-[10px] font-bold text-[var(--green)] bg-[var(--green-d)] px-2.5 py-1 rounded-full">🎁 Certificate included</div>

                        <div className="flex items-center justify-between gap-3 mt-2 sm:mt-3">
                          <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
                            <span className="font-['Inter_Tight',sans-serif] text-[16px] sm:text-lg font-extrabold text-[var(--text)]">{formatPrice(item.price)}</span>
                            <span className="text-[10px] sm:text-[11px] text-[var(--muted)] line-through">{formatPrice(item.oldPrice)}</span>
                          </div>
                          <span className="text-[10px] font-bold text-[var(--green)] bg-[var(--green-d)] px-2 py-0.5 rounded-full hidden sm:inline">{Math.round((1 - item.price / item.oldPrice) * 100)}% OFF</span>
                        </div>
                      </div>

                      <button
                        onClick={() => removeItem(item.id)}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] text-[var(--muted)] hover:text-[var(--red)] hover:bg-[var(--red-d)] bg-transparent border-none cursor-pointer transition-colors duration-150 shrink-0"
                        aria-label={`Remove ${item.name}`}
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </Card>
                )}

                {items.length === 0 && (
                  <Card className="flex flex-col items-center text-center py-14 px-6">
                    <div className="text-[56px] opacity-40 mb-4">🛒</div>
                    <div className="font-['Inter_Tight',sans-serif] text-lg font-bold text-[var(--text)] mb-1.5">Your cart is empty</div>
                    <div className="text-[13px] text-[var(--muted)] mb-6 max-w-[320px]">Browse our courses and add something to get started.</div>
                    <Link href="/courses" className="px-6 py-2.5 rounded-xl bg-[linear-gradient(135deg,var(--orange),var(--orange2))] text-white text-[13px] font-extrabold shadow-[0_5px_18px_rgba(240,90,26,.35)] transition-all duration-200 hover:-translate-y-0.5 no-underline">Browse Courses</Link>
                  </Card>
                )}

                {items.length > 0 && savedItems.length > 0 && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[var(--orange)]">// saved</span>
                      <span className="font-['Inter_Tight',sans-serif] text-sm font-extrabold text-[var(--text)]">Saved for Later</span>
                      <div className="flex-1 h-px bg-[linear-gradient(90deg,var(--border),transparent)]" />
                    </div>
                    {savedItems.map(s => (
                      <div key={s.name} className="bg-[var(--card-hover)] border border-[var(--border)] rounded-xl px-4 py-2.5 flex items-center gap-3 mb-1.5">
                        <div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center text-lg" style={{ background: s.bg }}>{s.emoji}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12.5px] font-bold text-[var(--text)] truncate">{s.name}</div>
                          <div className="text-[11px] text-[var(--muted)] mt-px">{s.price} · was {s.oldPrice}</div>
                        </div>
                        <button className="text-[11px] font-bold text-[var(--blue)] border border-[var(--blue-d)] px-3.5 py-1.5 rounded-full bg-transparent cursor-pointer transition-all duration-150 hover:bg-[var(--blue-d)] whitespace-nowrap">Move to Cart</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Order summary */}
              <Card className="p-5 lg:sticky lg:top-[76px]">
                <div className="font-['Inter_Tight',sans-serif] text-base font-extrabold text-[var(--text)] mb-3.5">Order Summary</div>
                <div className="flex flex-col gap-2.5 text-[13px]">
                  <div className="flex justify-between"><span className="text-[var(--text2)]">Subtotal ({totalCount} items)</span><span className="text-[var(--text)] font-semibold">{formatPrice(originalTotal)}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--text2)]">Bundle Discount</span><span className="text-[var(--green)] font-semibold">−{formatPrice(bundleDiscount)}</span></div>
                  {promoApplied && <div className="flex justify-between"><span className="text-[var(--text2)]">Promo (FUTURE10)</span><span className="text-[var(--green)] font-semibold">−{formatPrice(promoDiscount)}</span></div>}
                </div>

                {!promoApplied ? (
                  <div className="flex gap-2 mt-4">
                    <input
                      className="flex-1 h-10 rounded-lg bg-[var(--bg2)] border border-[var(--border)] px-3 text-[12px] text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--blue)]"
                      placeholder="Promo code"
                      value={promoInput}
                      onChange={e => setPromoInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") applyPromo(); }}
                    />
                    <button className="px-4 rounded-lg bg-[var(--text)] text-[var(--surface)] text-[12px] font-bold whitespace-nowrap cursor-pointer border-none" onClick={applyPromo}>Apply</button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-[var(--green-d)] border border-[var(--green-d)] rounded-lg px-3 py-2.5 mt-4 text-[12px]">
                    <span className="text-[var(--green)] font-bold flex items-center gap-1.5">✓ FUTURE10 applied</span>
                    <button className="text-[var(--muted)] text-[11px] bg-transparent border-none cursor-pointer hover:text-[var(--red)]" onClick={() => setPromoApplied(false)}>Remove</button>
                  </div>
                )}

                <div className="h-px bg-[var(--border)] my-3.5" />
                <div className="flex justify-between items-baseline mb-4">
                  <span className="font-['Inter_Tight',sans-serif] text-[15px] font-bold text-[var(--text)]">Total</span>
                  <span className="font-['Inter_Tight',sans-serif] text-[28px] font-extrabold text-[var(--text)] tracking-[-.01em]">{formatPrice(total)}</span>
                </div>

                <button className={primaryBtnCls} onClick={() => goToStep(2)}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                  Proceed to Checkout
                </button>
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-[var(--muted)] mt-2">🔒 Secure checkout · 256-bit SSL encrypted</div>

                <div className="flex flex-col gap-2 mt-4 pt-3.5 border-t border-[var(--border)] text-[12px] text-[var(--text2)]">
                  {["🛡️  7-day money-back guarantee", "🏅  Verified certificate on completion", "♾️  Lifetime access to course materials"].map(t => (
                    <div key={t} className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[var(--bg2)] flex items-center justify-center text-[13px] shrink-0">{t.slice(0, 2)}</div>
                      <span>{t.slice(4)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </>
        )}

        {/* Step 2: Payment */}
        {step === 2 && (
          <>
            <div className="flex items-baseline justify-between mb-5">
              <h1 className="font-['Inter_Tight',sans-serif] text-2xl sm:text-3xl font-extrabold text-[var(--text)] tracking-[-.01em]">Checkout</h1>
              <span className="text-xs font-medium text-[var(--muted)]">{totalCount} courses · {formatPrice(total)}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-5 items-start">
              <div className="flex flex-col gap-4">
                <Card className="p-5">
                  <div className="font-['Inter_Tight',sans-serif] text-[15px] font-extrabold text-[var(--text)] mb-4 flex items-center gap-2.5">
                    <span className="w-[22px] h-[22px] rounded-full bg-[var(--orange-d)] text-[var(--orange)] text-[11px] font-bold flex items-center justify-center shrink-0">1</span>
                    Billing Details
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <LabeledInput label="Full Name" defaultValue="Rahul Sharma" />
                    <LabeledInput label="Email" type="email" defaultValue="rahul.sharma@email.com" />
                    <LabeledInput label="Phone" type="tel" placeholder="+91 98765 43210" />
                    <LabeledInput label="GSTIN (optional)" placeholder="For business invoice" />
                  </div>
                </Card>

                <Card className="p-5">
                  <div className="font-['Inter_Tight',sans-serif] text-[15px] font-extrabold text-[var(--text)] mb-4 flex items-center gap-2.5">
                    <span className="w-[22px] h-[22px] rounded-full bg-[var(--orange-d)] text-[var(--orange)] text-[11px] font-bold flex items-center justify-center shrink-0">2</span>
                    Payment Method
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
                    {["card", "upi", "netbanking", "wallet"].map(m => (
                      <div
                        key={m}
                        className={`rounded-xl border-[1.5px] px-2 py-3.5 flex flex-col items-center gap-1.5 cursor-pointer transition-all duration-180 ${method === m ? "border-[var(--orange)] bg-[var(--orange-d)]" : "border-[var(--border)] bg-[var(--bg2)] hover:border-[var(--border2)]"}`}
                        onClick={() => setMethod(m)}
                      >
                        <div className="text-xl">{m === "card" ? "💳" : m === "upi" ? "📱" : m === "netbanking" ? "🏦" : "👛"}</div>
                        <div className={`text-[10.5px] font-semibold ${method === m ? "text-[var(--orange)]" : "text-[var(--text2)]"}`}>{m === "netbanking" ? "Netbanking" : m.charAt(0).toUpperCase() + m.slice(1)}</div>
                      </div>
                    ))}
                  </div>

                  {method === "card" && (
                    <div className="flex flex-col gap-3.5">
                      <LabeledInput label="Card Number" placeholder="1234  5678  9012  3456" maxLength={19} inputMode="numeric" />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <LabeledInput label="Expiry Date" placeholder="MM / YY" maxLength={7} />
                        <LabeledInput label="CVV" placeholder="•••" maxLength={3} inputMode="numeric" />
                      </div>
                      <LabeledInput label="Name on Card" placeholder="As shown on card" />
                    </div>
                  )}

                  {method === "upi" && <LabeledInput label="UPI ID" placeholder="yourname@upi" />}
                  {method === "netbanking" && <div className="text-[13px] text-[var(--muted)]">You&apos;ll be redirected to your bank to complete the payment.</div>}
                  {method === "wallet" && <div className="text-[13px] text-[var(--muted)]">Pay instantly using your preferred wallet balance.</div>}

                  <div className="flex items-center justify-center gap-4 mt-5 pt-3.5 border-t border-[var(--border)]">
                    <span className="text-[10.5px] text-[var(--muted)]">🔒 PCI-DSS Compliant</span>
                    <span className="text-[10.5px] text-[var(--muted)]">🛡️ Razorpay Secured</span>
                    <span className="text-[10.5px] text-[var(--muted)]">↩️ 7-Day Refund</span>
                  </div>
                </Card>
              </div>

              <Card className="p-5 lg:sticky lg:top-[76px]">
                <div className="font-['Inter_Tight',sans-serif] text-base font-extrabold text-[var(--text)] mb-3.5">Order Summary</div>
                {items.map(item => (
                  <div key={item.id} className="flex justify-between items-center gap-3 text-[12px] py-1">
                    <span className="text-[var(--text2)] truncate">{item.name}</span>
                    <span className="text-[var(--text)] font-semibold shrink-0">{formatPrice(item.price)}</span>
                  </div>
                ))}
                <div className="h-px bg-[var(--border)] my-2.5" />
                <div className="flex flex-col gap-2 text-[13px]">
                  <div className="flex justify-between"><span className="text-[var(--text2)]">Subtotal</span><span className="text-[var(--text)] font-semibold">{formatPrice(originalTotal)}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--text2)]">Bundle Discount</span><span className="text-[var(--green)] font-semibold">−{formatPrice(bundleDiscount)}</span></div>
                  {promoApplied && <div className="flex justify-between"><span className="text-[var(--text2)]">Promo (FUTURE10)</span><span className="text-[var(--green)] font-semibold">−{formatPrice(promoDiscount)}</span></div>}
                </div>
                <div className="h-px bg-[var(--border)] my-2.5" />
                <div className="flex justify-between items-baseline mb-4">
                  <span className="font-['Inter_Tight',sans-serif] text-[15px] font-bold text-[var(--text)]">Total Payable</span>
                  <span className="font-['Inter_Tight',sans-serif] text-[28px] font-extrabold text-[var(--text)] tracking-[-.01em]">{formatPrice(total)}</span>
                </div>

                <button className={primaryBtnCls} onClick={processPayment} disabled={processing}>
                  {processing ? "⏳ Processing Payment…" : `Pay ${formatPrice(total)} Securely`}
                </button>
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-[var(--muted)] mt-2">🔒 Your payment info is encrypted & secure</div>

                <div className="mt-3.5 text-center">
                  <button className="text-[11.5px] text-[var(--muted)] bg-transparent border-none cursor-pointer hover:text-[var(--red)] transition-colors duration-150" onClick={() => goToStep(1)}>← Back to Cart</button>
                </div>
              </Card>
            </div>
          </>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <div className="flex flex-col items-center text-center py-8 sm:py-12 px-4 animate-[fadeUp_.4s_ease_both]">
            <div className="w-[76px] h-[76px] rounded-full bg-[linear-gradient(135deg,var(--green),#4ade80)] flex items-center justify-center mb-5 shadow-[0_8px_28px_rgba(22,163,74,.35)] animate-[checkPop_.5s_cubic-bezier(.34,1.56,.64,1)_both]">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <h1 className="font-['Inter_Tight',sans-serif] text-2xl sm:text-3xl font-extrabold text-[var(--text)] mb-2 tracking-[-.01em]">Payment Successful! 🎉</h1>
            <p className="text-[13px] text-[var(--muted)] max-w-[380px] leading-relaxed mb-6">Your enrollment is confirmed. We&apos;ve sent the receipt and course access details to your email.</p>

            <Card className="px-6 py-4 w-full max-w-[420px] mb-6 text-left">
              <div className="flex justify-between text-[12px] py-1.5"><span className="text-[var(--muted)]">Order ID</span><span className="text-[var(--text)] font-bold">FS-ORD-88291</span></div>
              <div className="flex justify-between text-[12px] py-1.5"><span className="text-[var(--muted)]">Amount Paid</span><span className="text-[var(--text)] font-bold">{formatPrice(total)}</span></div>
              <div className="flex justify-between text-[12px] py-1.5"><span className="text-[var(--muted)]">Courses Enrolled</span><span className="text-[var(--text)] font-bold">{totalCount}</span></div>
            </Card>

            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-[420px]">
              <Link href="/courses" className="flex-1 px-6 py-3 rounded-xl text-[13px] font-bold bg-[linear-gradient(135deg,var(--orange),var(--orange2))] text-white shadow-[0_4px_14px_rgba(240,90,26,.3)] text-center no-underline">Go to Courses →</Link>
              <button className="flex-1 px-6 py-3 rounded-xl text-[13px] font-bold bg-transparent text-[var(--text2)] border-[1.5px] border-[var(--border2)] cursor-pointer">Download Invoice</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
