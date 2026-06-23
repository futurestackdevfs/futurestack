"use client";

import { useState } from "react";
import { TopNav } from "@/components/shared/top-nav";
import Link from "next/link";

const initialItems = [
  { id: 1, emoji: "⚛️", thumbCls: "bg-[linear-gradient(135deg,#0d1f3c,#0a2a1a)]", cat: "Full Stack Development", name: "MERN Stack Development — Complete Bootcamp", rating: "★ 4.8", reviews: "2.4k", hours: "38 hrs", modules: "20 modules", price: 2999, oldPrice: 5999 },
  { id: 2, emoji: "🐍", thumbCls: "bg-[linear-gradient(135deg,#1a1a0d,#0d1a2e)]", cat: "Programming", name: "Python Programming — From Zero to Pro", rating: "★ 4.7", reviews: "5.1k", hours: "52 hrs", modules: "20 modules", price: 1999, oldPrice: 3999 },
  { id: 3, emoji: "📊", thumbCls: "bg-[linear-gradient(135deg,#0d0d2e,#1a0d2e)]", cat: "Data Science", name: "Data Science with Python & Pandas", rating: "★ 4.9", reviews: "1.2k", hours: "44 hrs", modules: "16 modules", price: 3499, oldPrice: 6999 },
];

const savedItems = [
  { emoji: "🧠", bg: "linear-gradient(135deg,#08041a,#040c18)", name: "Generative AI & LLM Engineering", price: "₹4,499", oldPrice: "₹8,999" },
  { emoji: "☁️", bg: "linear-gradient(135deg,#0a1020,#142010)", name: "AWS Solutions Architect — Professional", price: "₹3,999", oldPrice: "₹7,499" },
];

function formatPrice(n: number) { return "₹" + n.toLocaleString("en-IN"); }

export default function CartPage() {
  const [step, setStep] = useState(1);
  const [items, setItems] = useState(initialItems);
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [method, setMethod] = useState("card");
  const [processing, setProcessing] = useState(false);

  const subtotal = items.reduce((s, i) => s + i.price, 0);
  const originalTotal = items.reduce((s, i) => s + i.oldPrice, 0);
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

  const stepCircle = (n: number) => {
    let cls = "flex items-center gap-[9px]";
    if (n < step) cls += " done";
    if (n === step) cls += " active";
    return cls;
  };

  return (
    <>
      <TopNav />
      <div className="max-w-[1100px] mx-auto pt-20 pb-15 px-6">
        {/* Steps */}
        <div className="flex items-center justify-center mb-7">
          <div className={stepCircle(1)}>
            <div className={`w-[30px] h-[30px] rounded-full flex items-center justify-center font-['Inter_Tight',sans-serif] text-[13px] font-extrabold transition-all duration-250 ${step === 1 ? "bg-[linear-gradient(135deg,var(--orange),var(--orange2))] text-white shadow-[0_3px_12px_rgba(240,90,26,.35)]" : step < 1 ? "bg-[var(--bg2)] border-[1.5px] border-[var(--border2)] text-[var(--text3)]" : "bg-[var(--green)] text-white"}`}>1</div>
            <div className={`font-['DM_Sans',system-ui,sans-serif] text-[11px] font-semibold ${step === 1 ? "text-[var(--text)]" : step < 1 ? "text-[var(--text3)]" : "text-[var(--green)]"}`}>Cart</div>
          </div>
          <div className={`w-16 h-[1.5px] mx-3.5 ${step > 1 ? "bg-[var(--green)]" : "bg-[var(--border2)]"}`} />
          <div className={stepCircle(2)}>
            <div className={`w-[30px] h-[30px] rounded-full flex items-center justify-center font-['Inter_Tight',sans-serif] text-[13px] font-extrabold transition-all duration-250 ${step === 2 ? "bg-[linear-gradient(135deg,var(--orange),var(--orange2))] text-white shadow-[0_3px_12px_rgba(240,90,26,.35)]" : step < 2 ? "bg-[var(--bg2)] border-[1.5px] border-[var(--border2)] text-[var(--text3)]" : "bg-[var(--green)] text-white"}`}>2</div>
            <div className={`font-['DM_Sans',system-ui,sans-serif] text-[11px] font-semibold ${step === 2 ? "text-[var(--text)]" : step < 2 ? "text-[var(--text3)]" : "text-[var(--green)]"}`}>Payment</div>
          </div>
          <div className={`w-16 h-[1.5px] mx-3.5 ${step > 2 ? "bg-[var(--green)]" : "bg-[var(--border2)]"}`} />
          <div className={stepCircle(3)}>
            <div className={`w-[30px] h-[30px] rounded-full flex items-center justify-center font-['Inter_Tight',sans-serif] text-[13px] font-extrabold transition-all duration-250 ${step === 3 ? "bg-[linear-gradient(135deg,var(--orange),var(--orange2))] text-white shadow-[0_3px_12px_rgba(240,90,26,.35)]" : step < 3 ? "bg-[var(--bg2)] border-[1.5px] border-[var(--border2)] text-[var(--text3)]" : "bg-[var(--green)] text-white"}`}>3</div>
            <div className={`font-['DM_Sans',system-ui,sans-serif] text-[11px] font-semibold ${step === 3 ? "text-[var(--text)]" : step < 3 ? "text-[var(--text3)]" : "text-[var(--green)]"}`}>Confirmation</div>
          </div>
        </div>

        {/* Step 1: Cart */}
        {step === 1 && (
          <>
            <div className="flex items-baseline gap-2.5 mb-5">
              <div className="font-['Inter_Tight',sans-serif] text-2xl font-extrabold text-[var(--text)] tracking-[-.01em]">Your Cart</div>
              <div className="font-['DM_Sans',system-ui,sans-serif] text-xs text-[var(--text3)]">{items.length} {items.length === 1 ? "course" : "courses"}</div>
            </div>

            <div className="grid grid-cols-[1fr,340px] gap-[22px] items-start">
              <div>
                <div className="flex flex-col gap-3">
                  {items.map(item => (
                    <div key={item.id} className="bg-[var(--card)] border border-[var(--border)] rounded-[13px] p-4 grid grid-cols-[72px,1fr,auto] gap-3.5 items-center animate-[fadeUp_.3s_ease_both] transition-[border-color,box-shadow] duration-200 hover:border-[var(--border2)] hover:shadow-[var(--sh)]">
                      <div className={`w-[72px] h-[72px] rounded-[10px] flex items-center justify-center text-[30px] shrink-0 shadow-[0_3px_10px_rgba(0,0,0,.18)] relative overflow-hidden before:content-[''] before:absolute before:inset-0 before:bg-[linear-gradient(135deg,rgba(255,255,255,.1),transparent_60%)] ${item.thumbCls}`}>{item.emoji}</div>
                      <div className="min-w-0">
                        <div className="font-['DM_Sans',system-ui,sans-serif] text-[9px] text-[var(--text3)] uppercase tracking-[.06em] mb-[3px]">{item.cat}</div>
                        <div className="text-[14px] font-bold text-[var(--text)] mb-[5px] leading-[1.3]">{item.name}</div>
                        <div className="flex items-center gap-2.5">
                          <span className="font-['DM_Sans',system-ui,sans-serif] text-[10px] text-[var(--text3)] flex items-center gap-[3px]"><span className="text-[var(--yellow)] font-bold">{item.rating}</span> ({item.reviews})</span>
                          <span className="font-['DM_Sans',system-ui,sans-serif] text-[10px] text-[var(--text3)] flex items-center gap-[3px]">⏱ {item.hours}</span>
                          <span className="font-['DM_Sans',system-ui,sans-serif] text-[10px] text-[var(--text3)] flex items-center gap-[3px]">📚 {item.modules}</span>
                        </div>
                        <div className="mt-2">
                          <span className="font-['DM_Sans',system-ui,sans-serif] text-[9px] text-[var(--blue2)] bg-[var(--blue-d)] px-2 py-[2px] rounded-[20px] inline-flex items-center gap-1 w-fit">🎁 Certificate included</span>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-2">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-['Inter_Tight',sans-serif] text-lg font-extrabold text-[var(--text)]">{formatPrice(item.price)}</span>
                          <span className="font-['DM_Sans',system-ui,sans-serif] text-[11px] text-[var(--text3)] line-through">{formatPrice(item.oldPrice)}</span>
                        </div>
                        <span className="font-['DM_Sans',system-ui,sans-serif] text-[9px] font-bold text-[var(--green)] bg-[var(--green-d)] px-[7px] py-[2px] rounded-[20px]">50% OFF</span>
                        <button className="font-['DM_Sans',system-ui,sans-serif] text-[10.5px] text-[var(--text3)] transition-colors duration-150 bg-transparent border-none cursor-pointer p-0 hover:text-[var(--red)]" onClick={() => removeItem(item.id)}>Remove</button>
                      </div>
                    </div>
                  ))}
                </div>

                {items.length === 0 && (
                  <div className="flex flex-col items-center text-center py-15 px-5">
                    <div className="text-[56px] opacity-40 mb-4">🛒</div>
                    <div className="font-['Inter_Tight',sans-serif] text-[17px] font-bold text-[var(--text)] mb-1.5">Your cart is empty</div>
                    <div className="text-xs text-[var(--text3)] mb-5">Browse our courses and add something to get started.</div>
                    <Link href="/courses" className="w-full py-[13px] rounded-[10px] bg-[linear-gradient(135deg,var(--orange),var(--orange2))] text-white text-[13.5px] font-extrabold flex items-center justify-center gap-2 shadow-[0_5px_18px_rgba(240,90,26,.35)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(240,90,26,.45)] mb-3 w-auto px-6 py-2.5 no-underline">Browse Courses</Link>
                  </div>
                )}

                {items.length > 0 && (
                  <div className="mt-[22px]">
                    <div className="flex items-center gap-[9px] mb-3">
                      <span className="font-['DM_Sans',system-ui,sans-serif] text-[9px] font-bold uppercase tracking-[.1em] text-[var(--orange)]">// saved</span>
                      <span className="font-['Inter_Tight',sans-serif] text-[13.5px] font-extrabold text-[var(--text)]">Saved for Later</span>
                      <div className="flex-1 h-px bg-[linear-gradient(90deg,var(--border),transparent)]" />
                    </div>
                    {savedItems.map(s => (
                      <div key={s.name} className="bg-[var(--card-h)] border border-[var(--border)] rounded-[11px] px-[14px] py-[11px] flex items-center gap-3 mb-2 opacity-85">
                        <div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center text-lg" style={{ background: s.bg }}>{s.emoji}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11.5px] font-bold text-[var(--text)]">{s.name}</div>
                          <div className="font-['DM_Sans',system-ui,sans-serif] text-[10px] text-[var(--text3)] mt-px">{s.price} · was {s.oldPrice}</div>
                        </div>
                        <button className="font-['DM_Sans',system-ui,sans-serif] text-[9.5px] font-bold text-[var(--blue2)] border border-[rgba(59,130,246,.25)] px-[11px] py-[4px] rounded-[20px] bg-transparent cursor-pointer transition-all duration-150 hover:bg-[var(--blue-d)]">Move to Cart</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-[var(--card)] border border-[var(--border)] rounded-[14px] p-5 sticky top-[78px]">
                <div className="font-['Inter_Tight',sans-serif] text-[15px] font-extrabold text-[var(--text)] mb-4">Order Summary</div>
                <div className="flex justify-between items-center mb-[11px] text-xs"><span className="text-[var(--text2)]">Subtotal ({items.length} items)</span><span className="text-[var(--text)] font-semibold">{formatPrice(originalTotal)}</span></div>
                <div className="flex justify-between items-center mb-[11px] text-xs"><span className="text-[var(--text2)]">Bundle Discount</span><span className="text-[var(--green)] font-semibold">−{formatPrice(bundleDiscount)}</span></div>

                {!promoApplied ? (
                  <div className="flex gap-[7px] mb-4">
                    <input className="flex-1 bg-[var(--bg2)] border border-[var(--border)] rounded-lg px-3 h-9 font-['DM_Sans',system-ui,sans-serif] text-[11px] text-[var(--text)] outline-none placeholder:text-[var(--text3)]" placeholder="Promo code" value={promoInput} onChange={e => setPromoInput(e.target.value)} />
                    <button className="px-4 rounded-lg bg-[var(--text)] text-[var(--surface)] text-[11.5px] font-bold whitespace-nowrap dark:bg-white dark:text-[#0b0e14]" onClick={applyPromo}>Apply</button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-[var(--green-d)] border border-[rgba(22,163,74,.25)] rounded-lg px-3 py-[9px] mb-4 text-[11px]">
                    <span className="text-[var(--green)] font-bold flex items-center gap-1.5">✓ FUTURE10 applied</span>
                    <button className="text-[var(--text3)] font-['DM_Sans',system-ui,sans-serif] text-[10px] bg-transparent border-none cursor-pointer" onClick={() => setPromoApplied(false)}>Remove</button>
                  </div>
                )}

                <div className="h-px bg-[var(--border)] my-3.5" />
                <div className="flex justify-between items-baseline mb-[18px]">
                  <span className="font-['Inter_Tight',sans-serif] text-[14px] font-bold text-[var(--text)]">Total</span>
                  <span className="font-['Inter_Tight',sans-serif] text-[28px] font-extrabold text-[var(--text)] tracking-[-.01em]">{formatPrice(total)}</span>
                </div>

                <button className="w-full py-[13px] rounded-[10px] bg-[linear-gradient(135deg,var(--orange),var(--orange2))] text-white text-[13.5px] font-extrabold flex items-center justify-center gap-2 shadow-[0_5px_18px_rgba(240,90,26,.35)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(240,90,26,.45)] mb-3" onClick={() => goToStep(2)}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                  Proceed to Checkout
                </button>
                <div className="flex items-center justify-center gap-1.5 font-['DM_Sans',system-ui,sans-serif] text-[9.5px] text-[var(--text3)]">🔒 Secure checkout · 256-bit SSL encrypted</div>

                <div className="flex flex-col gap-[9px] mt-[18px] pt-4 border-t border-[var(--border)]">
                  <div className="flex items-center gap-[9px] text-[11px] text-[var(--text2)]">
                    <div className="w-[26px] h-[26px] rounded-[7px] bg-[var(--bg2)] flex items-center justify-center text-xs shrink-0">🛡️</div>
                    7-day money-back guarantee
                  </div>
                  <div className="flex items-center gap-[9px] text-[11px] text-[var(--text2)]">
                    <div className="w-[26px] h-[26px] rounded-[7px] bg-[var(--bg2)] flex items-center justify-center text-xs shrink-0">🏅</div>
                    Verified certificate on completion
                  </div>
                  <div className="flex items-center gap-[9px] text-[11px] text-[var(--text2)]">
                    <div className="w-[26px] h-[26px] rounded-[7px] bg-[var(--bg2)] flex items-center justify-center text-xs shrink-0">♾️</div>
                    Lifetime access to course materials
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Step 2: Payment */}
        {step === 2 && (
          <>
            <div className="flex items-baseline gap-2.5 mb-5">
              <div className="font-['Inter_Tight',sans-serif] text-2xl font-extrabold text-[var(--text)] tracking-[-.01em]">Checkout</div>
              <div className="font-['DM_Sans',system-ui,sans-serif] text-xs text-[var(--text3)]">{items.length} courses · {formatPrice(total)}</div>
            </div>

            <div className="grid grid-cols-[1fr,340px] gap-[22px] items-start">
              <div>
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-[14px] p-[22px] mb-4">
                  <div className="font-['Inter_Tight',sans-serif] text-[14px] font-extrabold text-[var(--text)] mb-4 flex items-center gap-2">
                    <span className="w-[22px] h-[22px] rounded-full bg-[var(--orange-d)] text-[var(--orange)] font-['DM_Sans',system-ui,sans-serif] text-[10.5px] font-bold flex items-center justify-center shrink-0">1</span>
                    Billing Details
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="flex flex-col gap-1.5"><label className="font-['DM_Sans',system-ui,sans-serif] text-[10px] font-semibold text-[var(--text2)] uppercase tracking-[.04em]">Full Name</label><input className="bg-[var(--bg2)] border-[1.5px] border-[var(--border)] rounded-[9px] px-[13px] h-[42px] text-[13px] text-[var(--text)] outline-none font-['DM_Sans',sans-serif] transition-[border-color,box-shadow] duration-150 w-full focus:border-[var(--blue2)] focus:shadow-[0_0_0_3px_var(--blue-d)] placeholder:text-[var(--text3)]" defaultValue="Rahul Sharma" /></div>
                    <div className="flex flex-col gap-1.5"><label className="font-['DM_Sans',system-ui,sans-serif] text-[10px] font-semibold text-[var(--text2)] uppercase tracking-[.04em]">Email</label><input className="bg-[var(--bg2)] border-[1.5px] border-[var(--border)] rounded-[9px] px-[13px] h-[42px] text-[13px] text-[var(--text)] outline-none font-['DM_Sans',sans-serif] transition-[border-color,box-shadow] duration-150 w-full focus:border-[var(--blue2)] focus:shadow-[0_0_0_3px_var(--blue-d)] placeholder:text-[var(--text3)]" type="email" defaultValue="rahul.sharma@email.com" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5"><label className="font-['DM_Sans',system-ui,sans-serif] text-[10px] font-semibold text-[var(--text2)] uppercase tracking-[.04em]">Phone</label><input className="bg-[var(--bg2)] border-[1.5px] border-[var(--border)] rounded-[9px] px-[13px] h-[42px] text-[13px] text-[var(--text)] outline-none font-['DM_Sans',sans-serif] transition-[border-color,box-shadow] duration-150 w-full focus:border-[var(--blue2)] focus:shadow-[0_0_0_3px_var(--blue-d)] placeholder:text-[var(--text3)]" type="tel" placeholder="+91 98765 43210" /></div>
                    <div className="flex flex-col gap-1.5"><label className="font-['DM_Sans',system-ui,sans-serif] text-[10px] font-semibold text-[var(--text2)] uppercase tracking-[.04em]">GSTIN (optional)</label><input className="bg-[var(--bg2)] border-[1.5px] border-[var(--border)] rounded-[9px] px-[13px] h-[42px] text-[13px] text-[var(--text)] outline-none font-['DM_Sans',sans-serif] transition-[border-color,box-shadow] duration-150 w-full focus:border-[var(--blue2)] focus:shadow-[0_0_0_3px_var(--blue-d)] placeholder:text-[var(--text3)]" placeholder="For business invoice" /></div>
                  </div>
                </div>

                <div className="bg-[var(--card)] border border-[var(--border)] rounded-[14px] p-[22px] mb-4">
                  <div className="font-['Inter_Tight',sans-serif] text-[14px] font-extrabold text-[var(--text)] mb-4 flex items-center gap-2">
                    <span className="w-[22px] h-[22px] rounded-full bg-[var(--orange-d)] text-[var(--orange)] font-['DM_Sans',system-ui,sans-serif] text-[10.5px] font-bold flex items-center justify-center shrink-0">2</span>
                    Payment Method
                  </div>

                  <div className="grid grid-cols-4 gap-[9px] mb-[18px]">
                    {["card", "upi", "netbanking", "wallet"].map(m => (
                      <div key={m} className={`border-[1.5px] rounded-[10px] px-2 py-[13px] flex flex-col items-center gap-1.5 cursor-pointer transition-all duration-180 bg-[var(--bg2)] ${method === m ? "border-[var(--orange)] bg-[var(--orange-d)]" : "border-[var(--border)] hover:border-[var(--border3)]"}`} onClick={() => setMethod(m)}>
                        <div className="text-xl">{m === "card" ? "💳" : m === "upi" ? "📱" : m === "netbanking" ? "🏦" : "👛"}</div>
                        <div className={`font-['DM_Sans',system-ui,sans-serif] text-[9.5px] font-semibold ${method === m ? "text-[var(--orange)] font-bold" : "text-[var(--text2)]"}`}>{m === "netbanking" ? "Netbanking" : m.charAt(0).toUpperCase() + m.slice(1)}</div>
                      </div>
                    ))}
                  </div>

                  {method === "card" && (
                    <>
                      <div className="grid grid-cols-1 gap-3 mb-3">
                        <div className="flex flex-col gap-1.5"><label className="font-['DM_Sans',system-ui,sans-serif] text-[10px] font-semibold text-[var(--text2)] uppercase tracking-[.04em]">Card Number</label><input className="bg-[var(--bg2)] border-[1.5px] border-[var(--border)] rounded-[9px] px-[13px] h-[42px] text-[13px] text-[var(--text)] outline-none font-['DM_Sans',sans-serif] transition-[border-color,box-shadow] duration-150 w-full focus:border-[var(--blue2)] focus:shadow-[0_0_0_3px_var(--blue-d)] placeholder:text-[var(--text3)]" placeholder="1234  5678  9012  3456" maxLength={19} /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="flex flex-col gap-1.5"><label className="font-['DM_Sans',system-ui,sans-serif] text-[10px] font-semibold text-[var(--text2)] uppercase tracking-[.04em]">Expiry Date</label><input className="bg-[var(--bg2)] border-[1.5px] border-[var(--border)] rounded-[9px] px-[13px] h-[42px] text-[13px] text-[var(--text)] outline-none font-['DM_Sans',sans-serif] transition-[border-color,box-shadow] duration-150 w-full focus:border-[var(--blue2)] focus:shadow-[0_0_0_3px_var(--blue-d)] placeholder:text-[var(--text3)]" placeholder="MM / YY" maxLength={7} /></div>
                        <div className="flex flex-col gap-1.5"><label className="font-['DM_Sans',system-ui,sans-serif] text-[10px] font-semibold text-[var(--text2)] uppercase tracking-[.04em]">CVV</label><input className="bg-[var(--bg2)] border-[1.5px] border-[var(--border)] rounded-[9px] px-[13px] h-[42px] text-[13px] text-[var(--text)] outline-none font-['DM_Sans',sans-serif] transition-[border-color,box-shadow] duration-150 w-full focus:border-[var(--blue2)] focus:shadow-[0_0_0_3px_var(--blue-d)] placeholder:text-[var(--text3)]" placeholder="•••" maxLength={3} /></div>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        <div className="flex flex-col gap-1.5"><label className="font-['DM_Sans',system-ui,sans-serif] text-[10px] font-semibold text-[var(--text2)] uppercase tracking-[.04em]">Name on Card</label><input className="bg-[var(--bg2)] border-[1.5px] border-[var(--border)] rounded-[9px] px-[13px] h-[42px] text-[13px] text-[var(--text)] outline-none font-['DM_Sans',sans-serif] transition-[border-color,box-shadow] duration-150 w-full focus:border-[var(--blue2)] focus:shadow-[0_0_0_3px_var(--blue-d)] placeholder:text-[var(--text3)]" placeholder="As shown on card" /></div>
                      </div>
                    </>
                  )}

                  {method === "upi" && (
                    <div className="flex flex-col gap-1.5"><label className="font-['DM_Sans',system-ui,sans-serif] text-[10px] font-semibold text-[var(--text2)] uppercase tracking-[.04em]">UPI ID</label><input className="bg-[var(--bg2)] border-[1.5px] border-[var(--border)] rounded-[9px] px-[13px] h-[42px] text-[13px] text-[var(--text)] outline-none font-['DM_Sans',sans-serif] transition-[border-color,box-shadow] duration-150 w-full focus:border-[var(--blue2)] focus:shadow-[0_0_0_3px_var(--blue-d)] placeholder:text-[var(--text3)]" placeholder="yourname@upi" /></div>
                  )}

                  {method === "netbanking" && (
                    <div className="text-xs text-[var(--text3)]">Select your bank during payment.</div>
                  )}

                  {method === "wallet" && (
                    <div className="text-xs text-[var(--text3)]">Pay using your preferred wallet.</div>
                  )}

                  <div className="flex items-center justify-center gap-[18px] mt-[18px] pt-4 border-t border-[var(--border)]">
                    <span className="font-['DM_Sans',system-ui,sans-serif] text-[9.5px] text-[var(--text3)]">🔒 PCI-DSS Compliant</span>
                    <span className="font-['DM_Sans',system-ui,sans-serif] text-[9.5px] text-[var(--text3)]">🛡️ Razorpay Secured</span>
                    <span className="font-['DM_Sans',system-ui,sans-serif] text-[9.5px] text-[var(--text3)]">↩️ 7-Day Refund Policy</span>
                  </div>
                </div>
              </div>

              <div className="bg-[var(--card)] border border-[var(--border)] rounded-[14px] p-5 sticky top-[78px]">
                <div className="font-['Inter_Tight',sans-serif] text-[15px] font-extrabold text-[var(--text)] mb-4">Order Summary</div>
                {items.map(item => (
                  <div key={item.id} className="flex justify-between text-[11px] mb-2">
                    <span className="text-[var(--text2)]">{item.name.length > 30 ? item.name.slice(0, 30) + "…" : item.name}</span>
                    <span className="font-['DM_Sans',system-ui,sans-serif] text-[var(--text3)]">{formatPrice(item.price)}</span>
                  </div>
                ))}
                <div className="h-px bg-[var(--border)] my-3.5" />
                <div className="flex justify-between items-center mb-[11px] text-xs"><span className="text-[var(--text2)]">Subtotal</span><span className="text-[var(--text)] font-semibold">{formatPrice(originalTotal)}</span></div>
                <div className="flex justify-between items-center mb-[11px] text-xs"><span className="text-[var(--text2)]">Bundle Discount</span><span className="text-[var(--green)] font-semibold">−{formatPrice(bundleDiscount)}</span></div>
                {promoApplied && <div className="flex justify-between items-center mb-[11px] text-xs"><span className="text-[var(--text2)]">Promo (FUTURE10)</span><span className="text-[var(--green)] font-semibold">−{formatPrice(promoDiscount)}</span></div>}
                <div className="h-px bg-[var(--border)] my-3.5" />
                <div className="flex justify-between items-baseline mb-[18px]">
                  <span className="font-['Inter_Tight',sans-serif] text-[14px] font-bold text-[var(--text)]">Total Payable</span>
                  <span className="font-['Inter_Tight',sans-serif] text-[28px] font-extrabold text-[var(--text)] tracking-[-.01em]">{formatPrice(total)}</span>
                </div>

                <button className="w-full py-[14px] rounded-[10px] bg-[linear-gradient(135deg,var(--orange),var(--orange2))] text-white text-[14px] font-extrabold flex items-center justify-center gap-2 shadow-[0_5px_18px_rgba(240,90,26,.35)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(240,90,26,.45)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none" onClick={processPayment} disabled={processing}>
                  {processing ? "⏳ Processing Payment…" : `Pay ${formatPrice(total)} Securely`}
                </button>
                <div className="flex items-center justify-center gap-1.5 font-['DM_Sans',system-ui,sans-serif] text-[9.5px] text-[var(--text3)] mt-2.5">🔒 Your payment info is encrypted & secure</div>

                <div className="mt-4 text-center">
                  <button className="font-['DM_Sans',system-ui,sans-serif] text-[10.5px] text-[var(--text3)] transition-colors duration-150 bg-transparent border-none cursor-pointer p-0 hover:text-[var(--red)] text-[11px]" onClick={() => goToStep(1)}>← Back to Cart</button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <div className="flex flex-col items-center text-center py-15 px-5 animate-[fadeUp_.4s_ease_both]">
            <div className="w-[84px] h-[84px] rounded-full bg-[linear-gradient(135deg,var(--green),#4ade80)] flex items-center justify-center mb-[22px] shadow-[0_8px_28px_rgba(22,163,74,.35)] animate-[checkPop_.5s_cubic-bezier(.34,1.56,.64,1)_both]">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <div className="font-['Inter_Tight',sans-serif] text-2xl font-extrabold text-[var(--text)] mb-2 tracking-[-.01em]">Payment Successful! 🎉</div>
            <div className="text-[13px] text-[var(--text3)] max-w-[380px] leading-[1.6] mb-7">Your enrollment is confirmed. We've sent the receipt and course access details to your email.</div>

            <div className="bg-[var(--card)] border border-[var(--border)] rounded-[14px] px-6 py-5 w-full max-w-[420px] mb-6 text-left">
              <div className="flex justify-between text-[11.5px] mb-2.5"><span className="text-[var(--text3)]">Order ID</span><span className="text-[var(--text)] font-bold font-['DM_Sans',system-ui,sans-serif]">FS-ORD-88291</span></div>
              <div className="flex justify-between text-[11.5px] mb-2.5"><span className="text-[var(--text3)]">Amount Paid</span><span className="text-[var(--text)] font-bold font-['DM_Sans',system-ui,sans-serif]">{formatPrice(total)}</span></div>
              <div className="flex justify-between text-[11.5px]"><span className="text-[var(--text3)]">Courses Enrolled</span><span className="text-[var(--text)] font-bold font-['DM_Sans',system-ui,sans-serif]">{items.length}</span></div>
            </div>

            <div className="flex gap-2.5">
              <Link href="/students/my-courses" className="px-6 py-[11px] rounded-[9px] text-[12.5px] font-bold bg-[linear-gradient(135deg,var(--orange),var(--orange2))] text-white shadow-[0_4px_14px_rgba(240,90,26,.3)] no-underline">Go to My Courses →</Link>
              <button className="px-6 py-[11px] rounded-[9px] text-[12.5px] font-bold bg-transparent text-[var(--text2)] border-[1.5px] border-[var(--border2)]">Download Invoice</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
