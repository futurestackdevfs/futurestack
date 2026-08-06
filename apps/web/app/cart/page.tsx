"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { TopNav } from "@/components/layout/marketing-top-nav";
import Link from "next/link";
import { authFetch } from "@/app/auth/lib/auth-fetch";

interface PaymentSettings {
  domesticEnabled: boolean;
  internationalEnabled: boolean;
}

type Currency = "INR" | "USD";

interface CartItem {
  courseId: string;
  title: string;
  category: string;
  rating: number;
  reviews: number;
  hours: number;
  modules: number;
  lessons: number;
  price: number;
  currency: Currency;
}

interface CartCoupon {
  id: string;
  code: string;
  discountType: string;
  value: number;
}

interface CartView {
  items: CartItem[];
  coupon: CartCoupon | null;
  discountAmount: number;
  subtotal: number;
  total: number;
  currency: Currency;
}

interface WishlistItem {
  courseId: string;
  title: string;
  price: number | null;
  currency: Currency;
}

interface WishlistView {
  items: WishlistItem[];
}

interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: Currency;
  name: string;
  description: string;
  order_id: string;
  handler: (res: RazorpaySuccess) => void;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color: string };
}

interface RazorpayInstance {
  open(): void;
  on(event: string, cb: (res: unknown) => void): void;
}

interface PayNotice {
  title: string;
  body: string;
}

declare global {
  interface Window {
    Razorpay?: new (opts: RazorpayOptions) => RazorpayInstance;
  }
}

function emptyCart(currency: Currency = "INR"): CartView {
  return { items: [], coupon: null, discountAmount: 0, subtotal: 0, total: 0, currency };
}

function formatPrice(n: number, currency: Currency = "INR") {
  const v = Number.isFinite(n) ? n : 0;
  if (currency === "USD") {
    return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2 });
  }
  return "₹" + v.toLocaleString("en-IN");
}

function discountLabel(c: CartCoupon, currency: Currency): string {
  return c.discountType === "PERCENT"
    ? `${c.value}% OFF`
    : `${formatPrice(c.value, currency)} OFF`;
}

async function cartFetcher(url: string): Promise<CartView> {
  const res = await authFetch(url);
  // Not logged in (401) — treat as an empty cart rather than a hard error.
  if (res.status === 401) return emptyCart();
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message || `Request failed (${res.status})`);
  }
  return res.json();
}

async function wishlistFetcher(url: string): Promise<WishlistView> {
  const res = await authFetch(url);
  // Not logged in (401) — treat as an empty wishlist rather than a hard error.
  if (res.status === 401) return { items: [] };
  if (!res.ok) return { items: [] };
  return res.json();
}

/** Loads the Razorpay Checkout script once and resolves when it's ready. */
function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const existing = document.getElementById("razorpay-checkout-js") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Razorpay")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.id = "razorpay-checkout-js";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(script);
  });
}

const primaryBtnCls =
  "w-full h-12 rounded-xl bg-[linear-gradient(135deg,var(--orange),var(--orange2))] text-white text-[14px] font-extrabold flex items-center justify-center gap-2 shadow-[0_5px_18px_rgba(240,90,26,.35)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(240,90,26,.45)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-[var(--shadow)] ${className}`}>
      {children}
    </div>
  );
}

function CurrencySelector({
  currency,
  enabledCurrencies,
  onChange,
}: {
  currency: Currency;
  enabledCurrencies: Currency[];
  onChange: (c: Currency) => void;
}) {
  const opts: { code: Currency; label: string }[] = ([
    { code: "INR", label: "₹ INR" },
    { code: "USD", label: "$ USD" },
  ] as { code: Currency; label: string }[]).filter(o => enabledCurrencies.includes(o.code));

  if (opts.length === 0) return null;

  return (
    <div className="flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] p-1">
      {opts.map(o => {
        const active = currency === o.code;
        return (
          <button
            key={o.code}
            type="button"
            onClick={() => onChange(o.code)}
            className={`px-3.5 py-1.5 rounded-full text-[11.5px] font-bold transition-all duration-150 cursor-pointer ${
              active
                ? "bg-[linear-gradient(135deg,var(--orange),var(--orange2))] text-white shadow-[0_3px_10px_rgba(240,90,26,.35)]"
                : "text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg2)]"
            }`}
            title={`Pay in ${o.code}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export default function CartPage() {
  const [step, setStep] = useState(1);
  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [payError, setPayError] = useState("");
  const [payNotice, setPayNotice] = useState<PayNotice | null>(null);
  const [currency, setCurrency] = useState<Currency>("INR");

  // Which currencies are enabled at checkout — driven by the admin's
  // PaymentSettings toggle. A disabled currency is not even rendered, so a
  // student never picks an option that will fail at create-order.
  const { data: paySettings } = useSWR<PaymentSettings>("/api/payment-settings/public");

  const enabledCurrencies = useMemo<Currency[]>(() => {
    const list: Currency[] = [];
    if (paySettings?.domesticEnabled !== false) list.push("INR");
    if (paySettings?.internationalEnabled === true) list.push("USD");
    return list.length > 0 ? list : ["INR"];
  }, [paySettings]);

  // If the current selection was disabled, fall back to the first enabled
  // currency without firing a render-cycle state update.
  const activeCurrency: Currency = enabledCurrencies.includes(currency)
    ? currency
    : enabledCurrencies[0];

  const {
    data: cart,
    isLoading: cartLoading,
    error: cartError,
    mutate,
  } = useSWR<CartView>(`/api/cart?currency=${activeCurrency}`, cartFetcher);

  const items = cart?.items ?? [];
  const totalCount = items.length;
  const total = cart?.total ?? 0;
  const subtotal = cart?.subtotal ?? 0;
  const discountAmount = cart?.discountAmount ?? 0;
  const coupon = cart?.coupon ?? null;

  async function removeItem(courseId: string) {
    const res = await authFetch(`/api/cart/items/${courseId}`, { method: "DELETE" });
    if (res.ok) mutate();
  }

  async function applyPromo() {
    if (!promoInput.trim()) return;
    setPromoError("");
    const res = await authFetch("/api/cart/apply-coupon", {
      method: "POST",
      body: JSON.stringify({ code: promoInput.trim() }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      setPromoError(body.message || "Invalid coupon code");
      return;
    }
    setPromoInput("");
    mutate();
  }

  async function removePromo() {
    const res = await authFetch("/api/cart/coupon", { method: "DELETE" });
    if (res.ok) mutate();
  }

  const { data: wishlist, mutate: mutateWishlist } = useSWR<WishlistView>(
    "/api/wishlist",
    wishlistFetcher,
  );
  const wishlistItems = wishlist?.items ?? [];

  async function moveToCart(courseId: string) {
    const res = await authFetch(`/api/wishlist/items/${courseId}/move-to-cart`, {
      method: "POST",
    });
    if (res.ok) {
      mutate();
      mutateWishlist();
    }
  }

  async function removeWishlistItem(courseId: string) {
    const res = await authFetch(`/api/wishlist/items/${courseId}`, {
      method: "DELETE",
    });
    if (res.ok) mutateWishlist();
  }

  function goToStep(n: number) {
    if (n !== 3) setPayError("");
    setStep(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showNotice(title: string, body: string) {
    setPayNotice({ title, body });
    window.setTimeout(() => setPayNotice(null), 5000);
  }

  async function processPayment() {
    if (processing || items.length === 0) return;
    setProcessing(true);
    setPayError("");

    let orderData: { keyId: string; razorpayOrderId: string; amount: number };
    try {
      const orderRes = await authFetch("/api/checkout/create-order", {
        method: "POST",
        body: JSON.stringify({ currency: activeCurrency }),
      });
      const body = (await orderRes.json().catch(() => ({}))) as { message?: string };
      if (!orderRes.ok) throw new Error(body.message || "Could not start checkout");
      orderData = body as unknown as typeof orderData;
    } catch (e) {
      setProcessing(false);
      setPayError(e instanceof Error ? e.message : "Could not start checkout");
      return;
    }

    try {
      await loadRazorpayScript();
    } catch (e) {
      setProcessing(false);
      setPayError(e instanceof Error ? e.message : "Could not load payment gateway");
      return;
    }

    try {
      const Razorpay = window.Razorpay;
      if (!Razorpay) {
        setProcessing(false);
        setPayError("Payment gateway is unavailable");
        return;
      }
      const rzp = new Razorpay({
        key: orderData.keyId,
        amount: Math.round(orderData.amount * 100),
        currency: activeCurrency,
        name: "FutureStack",
        description: `${totalCount} course${totalCount === 1 ? "" : "s"} enrollment`,
        order_id: orderData.razorpayOrderId,
        theme: { color: "#f05a1a" },
        handler: async (res) => {
          try {
            const verifyRes = await authFetch("/api/checkout/verify", {
              method: "POST",
              body: JSON.stringify({
                razorpay_order_id: res.razorpay_order_id,
                razorpay_payment_id: res.razorpay_payment_id,
                razorpay_signature: res.razorpay_signature,
              }),
            });
            const vbody = (await verifyRes.json().catch(() => ({}))) as { message?: string };
            if (!verifyRes.ok) throw new Error(vbody.message || "Payment could not be verified");
          } catch (e) {
            setProcessing(false);
            setPayError(e instanceof Error ? e.message : "Payment could not be verified");
            return;
          }
          setProcessing(false);
          goToStep(3);
        },
      });
      // If the student dismisses the modal, release the spinner without acting.
      rzp.on("payment.failed", () => {
        setProcessing(false);
        goToStep(1);
        showNotice("Payment failed", "The payment didn't go through. Please try again.");
      });
      rzp.on("modal.close", () => {
        setProcessing(false);
        goToStep(1);
        // Re-sync cart from the server — a cancelled/failed payment never clears
        // it, so any 401-stale empty cache is corrected back to the real items.
        mutate();
        showNotice("Payment cancelled", "You've been returned to your cart. Your cart is safe — you can retry whenever you're ready.");
      });
      rzp.open();
    } catch (e) {
      setProcessing(false);
      setPayError(e instanceof Error ? e.message : "Could not open payment");
    }
  }

  const steps = ["Cart", "Confirmation"];

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
            <div className="flex items-center justify-between mb-5 gap-3">
              <div className="flex items-baseline gap-3">
                <h1 className="font-['Inter_Tight',sans-serif] text-2xl sm:text-3xl font-extrabold text-[var(--text)] tracking-[-.01em]">Your Cart</h1>
                <span className="text-xs font-medium text-[var(--muted)]">{totalCount} {totalCount === 1 ? "course" : "courses"}</span>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <CurrencySelector currency={activeCurrency} enabledCurrencies={enabledCurrencies} onChange={setCurrency} />
                <Link href="/courses" className="hidden sm:inline text-[13px] font-semibold text-[var(--blue)] hover:underline no-underline">Continue browsing →</Link>
              </div>
            </div>

            {cartLoading && !cart ? (
              <Card className="flex flex-col items-center justify-center text-center py-16 px-6">
                <div className="w-8 h-8 rounded-full border-2 border-[var(--border2)] border-t-[var(--orange)] animate-spin mb-4" />
                <div className="text-[13px] text-[var(--muted)]">Loading your cart…</div>
              </Card>
            ) : cartError ? (
              <Card className="flex flex-col items-center text-center py-14 px-6">
                <div className="text-[48px] opacity-40 mb-4">⚠️</div>
                <div className="font-['Inter_Tight',sans-serif] text-lg font-bold text-[var(--text)] mb-1.5">Could not load your cart</div>
                <div className="text-[13px] text-[var(--muted)] mb-6 max-w-[320px]">{(cartError as Error).message}</div>
                <Link href="/courses" className="px-6 py-2.5 rounded-xl bg-[linear-gradient(135deg,var(--orange),var(--orange2))] text-white text-[13px] font-extrabold shadow-[0_5px_18px_rgba(240,90,26,.35)] transition-all duration-200 hover:-translate-y-0.5 no-underline">Browse Courses</Link>
              </Card>
            ) : items.length === 0 ? (
              <Card className="flex flex-col items-center text-center py-14 px-6">
                <div className="text-[56px] opacity-40 mb-4">🛒</div>
                <div className="font-['Inter_Tight',sans-serif] text-lg font-bold text-[var(--text)] mb-1.5">Your cart is empty</div>
                <div className="text-[13px] text-[var(--muted)] mb-6 max-w-[320px]">Browse our courses and add something to get started.</div>
                <Link href="/courses" className="px-6 py-2.5 rounded-xl bg-[linear-gradient(135deg,var(--orange),var(--orange2))] text-white text-[13px] font-extrabold shadow-[0_5px_18px_rgba(240,90,26,.35)] transition-all duration-200 hover:-translate-y-0.5 no-underline">Browse Courses</Link>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,720px)_360px] gap-5 items-start justify-center">
                <div className="flex flex-col gap-4">
                  <Card className="overflow-hidden">
                    {items.map((item, i) => {
                      const itemOff = coupon
                        ? coupon.discountType === "PERCENT"
                          ? (item.price * coupon.value) / 100
                          : subtotal > 0
                            ? (discountAmount * item.price) / subtotal
                            : 0
                        : 0;
                      const finalPrice = Math.max(0, item.price - itemOff);
                      return (
                      <div key={item.courseId} className={`flex items-center gap-4 sm:gap-5 px-4 sm:px-6 py-4 sm:py-5 animate-[fadeUp_.3s_ease_both] ${i > 0 ? "border-t border-[var(--border)]" : ""}`}>
                        <div
                          className="w-[60px] h-[56px] sm:w-[68px] sm:h-[64px] shrink-0 rounded-xl flex items-center justify-center text-[20px] sm:text-[24px] font-extrabold text-white shadow-[0_3px_10px_rgba(0,0,0,.18)]"
                          style={{ background: i % 2 === 0 ? "linear-gradient(135deg,#0d1f3c,#0a2a1a)" : "linear-gradient(135deg,#7a2a0a,#3a0a0a)" }}
                        >
                          {item.title.charAt(0).toUpperCase()}
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col gap-2">
                          <h3 className="font-['Inter_Tight',sans-serif] text-[15px] sm:text-[16px] font-bold text-[var(--text)] leading-snug line-clamp-2">{item.title}</h3>

                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-extrabold uppercase tracking-[.08em] text-[var(--orange)] bg-[var(--orange-d)] px-2 py-0.5 rounded-[6px]">{item.category}</span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[11.5px] text-[var(--text2)] mt-0.5">
                            <span className="flex items-center gap-1">
                              <span className="text-[var(--amber)] text-[12px]">★</span>
                              <span className="font-bold text-[var(--text)]">{Number(item.rating).toFixed(1)}</span>
                              <span className="text-[var(--muted)]">({item.reviews})</span>
                            </span>
                            <span className="w-px h-3.5 bg-[var(--border2)]" />
                            <span className="flex items-center gap-1">⏱ {item.hours} hrs</span>
                            <span className="w-px h-3.5 bg-[var(--border2)]" />
                            <span className="flex items-center gap-1">▦ {item.modules} modules</span>
                            <span className="w-px h-3.5 bg-[var(--border2)]" />
                            <span className="flex items-center gap-1">▶ {item.lessons} lessons</span>
                          </div>

                          <span className="inline-flex items-center gap-1.5 mt-0.5 text-[10px] font-bold text-[var(--green)] bg-[var(--green-d)] px-2.5 py-1 rounded-full w-fit">🎓 Certificate included</span>
                        </div>

                        <div className="flex flex-col items-end gap-3 shrink-0">
                          {coupon && itemOff > 0 ? (
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-[10px] font-extrabold uppercase tracking-[.06em] text-[var(--green)] bg-[var(--green-d)] px-2 py-0.5 rounded-full whitespace-nowrap">🏷️ {discountLabel(coupon, activeCurrency)}</span>
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-[12px] text-[var(--muted)] line-through">{formatPrice(item.price, activeCurrency)}</span>
                                <span className="font-['Inter_Tight',sans-serif] text-lg sm:text-xl font-extrabold text-[var(--green)] tracking-[-.01em]">{formatPrice(finalPrice, activeCurrency)}</span>
                              </div>
                              <span className="text-[11px] font-bold text-[var(--green)]">−{formatPrice(itemOff, activeCurrency)} off</span>
                            </div>
                          ) : (
                            <span className="font-['Inter_Tight',sans-serif] text-lg sm:text-xl font-extrabold text-[var(--text)] tracking-[-.01em]">{formatPrice(item.price, activeCurrency)}</span>
                          )}
                          <button
                            onClick={() => removeItem(item.courseId)}
                            className="flex items-center gap-1 text-[11px] font-bold text-[var(--muted)] hover:text-[var(--red)] bg-transparent border-none cursor-pointer transition-colors duration-150 p-1 -m-1 rounded-md hover:bg-[var(--red-d)]"
                            aria-label={`Remove ${item.title}`}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6M14 11v6" /></svg>
                            Remove
                          </button>
                        </div>
                      </div>
                      );
                    })}
                  </Card>
                </div>

                {/* Order summary */}
                <Card className="p-5 lg:sticky lg:top-[76px]">
                  <div className="font-['Inter_Tight',sans-serif] text-base font-extrabold text-[var(--text)] mb-3.5">Order Summary</div>
                  <div className="flex flex-col gap-2.5 text-[13px]">
                    <div className="flex justify-between"><span className="text-[var(--text2)]">Subtotal ({totalCount} items)</span><span className="text-[var(--text)] font-semibold">{formatPrice(subtotal, activeCurrency)}</span></div>
                    {coupon && (
                      <div className="flex justify-between">
                        <span className="text-[var(--text2)]">Promo ({coupon.code})</span>
                        <span className="text-[var(--green)] font-semibold">−{formatPrice(discountAmount, activeCurrency)}</span>
                      </div>
                    )}
                  </div>

                  {!coupon ? (
                    <div className="flex flex-col gap-1.5 mt-4">
                      <div className="flex gap-2">
                        <input
                          className="flex-1 h-10 rounded-lg bg-[var(--bg2)] border border-[var(--border)] px-3 text-[12px] text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--blue)]"
                          placeholder="Promo code"
                          value={promoInput}
                          onChange={e => setPromoInput(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") applyPromo(); }}
                        />
                        <button className="px-4 rounded-lg bg-[var(--text)] text-[var(--surface)] text-[12px] font-bold whitespace-nowrap cursor-pointer border-none" onClick={applyPromo}>Apply</button>
                      </div>
                      {promoError && <div className="text-[11px] text-[var(--red)]">{promoError}</div>}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-[var(--green-d)] border border-[var(--green-d)] rounded-lg px-3 py-2.5 mt-4 text-[12px]">
                      <span className="text-[var(--green)] font-bold flex items-center gap-1.5">✓ {coupon.code} applied</span>
                      <button className="text-[var(--muted)] text-[11px] bg-transparent border-none cursor-pointer hover:text-[var(--red)]" onClick={removePromo}>Remove</button>
                    </div>
                  )}

                  <div className="h-px bg-[var(--border)] my-3.5" />
                  <div className="flex justify-between items-baseline mb-4">
                    <span className="font-['Inter_Tight',sans-serif] text-[15px] font-bold text-[var(--text)]">Total</span>
                    <span className="font-['Inter_Tight',sans-serif] text-[28px] font-extrabold text-[var(--text)] tracking-[-.01em]">{formatPrice(total, activeCurrency)}</span>
                  </div>

                  <button className={primaryBtnCls} onClick={processPayment} disabled={processing}>
                    {processing ? "⏳ Opening payment…" : "Proceed to Checkout"}
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                  </button>
                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-[var(--muted)] mt-2">🔒 Secure checkout · 256-bit SSL encrypted</div>
                  {payError && <div className="text-[11px] text-[var(--red)] text-center mt-2">{payError}</div>}

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
            )}

            {/* Step 1b: Saved for Later */}
            {wishlistItems.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-baseline gap-3">
                    <h2 className="font-['Inter_Tight',sans-serif] text-lg sm:text-xl font-extrabold text-[var(--text)] tracking-[-.01em]">Saved for Later</h2>
                    <span className="text-xs font-medium text-[var(--muted)]">{wishlistItems.length} {wishlistItems.length === 1 ? "course" : "courses"}</span>
                  </div>
                  <Link href="/courses" className="hidden sm:inline text-[13px] font-semibold text-[var(--blue)] hover:underline no-underline">Browse more courses →</Link>
                </div>

                <Card className="overflow-hidden">
                  {wishlistItems.map((item, i) => (
                    <div key={item.courseId} className={`flex items-center gap-4 sm:gap-5 px-4 sm:px-6 py-4 animate-[fadeUp_.3s_ease_both] ${i > 0 ? "border-t border-[var(--border)]" : ""}`}>
                      <div
                        className="w-[52px] h-[48px] shrink-0 rounded-xl flex items-center justify-center text-[18px] font-extrabold text-white shadow-[0_3px_10px_rgba(0,0,0,.18)]"
                        style={{ background: i % 2 === 0 ? "linear-gradient(135deg,#0d1f3c,#0a2a1a)" : "linear-gradient(135deg,#7a2a0a,#3a0a0a)" }}
                      >
                        {item.title.charAt(0).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-[13.5px] sm:text-[15px] font-bold text-[var(--text)] leading-snug line-clamp-2">{item.title}</div>
                        <div className="mt-1 text-[11.5px] font-semibold text-[var(--text2)]">
                          {item.price != null ? formatPrice(item.price, activeCurrency) : "Price on enquiry"}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => moveToCart(item.courseId)}
                          className="px-3.5 py-2 rounded-lg text-[11px] font-bold text-white border-none cursor-pointer transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[.97] whitespace-nowrap"
                          style={{ background: "linear-gradient(135deg,var(--orange),var(--orange2))" }}
                        >
                          Add to Cart
                        </button>
                        <button
                          onClick={() => removeWishlistItem(item.courseId)}
                          className="flex items-center gap-1 text-[11px] font-bold text-[var(--muted)] hover:text-[var(--red)] bg-transparent border-none cursor-pointer transition-colors duration-150 p-1 -m-1 rounded-md hover:bg-[var(--red-d)]"
                          aria-label={`Remove ${item.title} from saved`}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6M14 11v6" /></svg>
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </Card>
              </div>
            )}
          </>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <div className="flex flex-col items-center text-center py-8 sm:py-12 px-4">
            <div className="rounded-full bg-[linear-gradient(135deg,var(--green),#4ade80)] w-[76px] h-[76px] flex items-center justify-center mb-5 animate-[checkPop_.5s_cubic-bezier(.34,1.56,.64,1)_both,ringPulse_1.6s_ease-out_.5s_2]">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
            </div>

            <h1 className="font-['Inter_Tight',sans-serif] text-2xl sm:text-3xl font-extrabold text-[var(--text)] mb-2 tracking-[-.01em] animate-[fadeUp_.45s_ease_both_.1s]">
              Congratulations! 🎉
            </h1>
            <p className="text-[13px] text-[var(--muted)] max-w-[420px] leading-relaxed mb-7 animate-[fadeUp_.45s_ease_both_.2s]">
              You&apos;re now enrolled. We&apos;ve sent the receipt and course access details to your email.
            </p>

            <div className="flex flex-col gap-3 w-full max-w-[420px] mb-7">
              {items.map((item, i) => (
                <div key={item.courseId} className="animate-[fadeUp_.45s_ease_both]"
                  style={{ animationDelay: `${0.3 + i * 0.14}s` }}>
                  <Card className="flex items-center gap-4 px-4 py-3.5 text-left">
                    <div
                      className="w-[46px] h-[42px] shrink-0 rounded-xl flex items-center justify-center text-[17px] font-extrabold text-white shadow-[0_3px_10px_rgba(0,0,0,.18)]"
                      style={{ background: i % 2 === 0 ? "linear-gradient(135deg,#0d1f3c,#0a2a1a)" : "linear-gradient(135deg,#7a2a0a,#3a0a0a)" }}
                    >
                      {item.title.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] sm:text-[14px] font-bold text-[var(--text)] leading-snug line-clamp-2">{item.title}</div>
                      <div className="mt-1 text-[11px] font-semibold text-[var(--green)] flex items-center gap-1">✓ Enrolled</div>
                    </div>
                    <span className="shrink-0 font-['Inter_Tight',sans-serif] text-[13px] font-extrabold text-[var(--text)]">{formatPrice(item.price, activeCurrency)}</span>
                  </Card>
                </div>
              ))}
            </div>

            <Card className="px-6 py-4 w-full max-w-[420px] mb-6 text-left animate-[fadeUp_.45s_ease_both_.3s]">
              <div className="flex justify-between text-[12px] py-1.5"><span className="text-[var(--muted)]">Amount Paid</span><span className="text-[var(--text)] font-bold">{formatPrice(total, activeCurrency)}</span></div>
              <div className="flex justify-between text-[12px] py-1.5"><span className="text-[var(--muted)]">Courses Enrolled</span><span className="text-[var(--text)] font-bold">{totalCount}</span></div>
            </Card>

            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-[420px] animate-[fadeUp_.45s_ease_both_.45s]">
              <Link href="/my-dashboard" className="flex-1 px-6 py-3 rounded-xl text-[13px] font-bold bg-[linear-gradient(135deg,var(--orange),var(--orange2))] text-white shadow-[0_4px_14px_rgba(240,90,26,.3)] text-center no-underline">My Courses →</Link>
              <Link href="/courses" className="flex-1 px-6 py-3 rounded-xl text-[13px] font-bold bg-transparent text-[var(--text2)] border-[1.5px] border-[var(--border2)] cursor-pointer text-center no-underline hover:text-[var(--text)] hover:border-[var(--border)]">Browse More</Link>
            </div>
          </div>
        )}
      </div>

      {/* Cancelled / failed payment popup */}
      {payNotice && (
        <div className="fixed inset-x-0 top-5 z-[100] flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto flex items-start gap-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-[var(--shadow)] px-4 py-3.5 max-w-[420px] animate-[slideDown_.3s_ease_both]">
            <div className="w-8 h-8 rounded-full bg-[var(--orange-d)] text-[var(--orange)] flex items-center justify-center text-[15px] font-bold shrink-0">⚠</div>
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="text-[13px] font-bold text-[var(--text)]">{payNotice.title}</div>
              <div className="text-[12px] text-[var(--muted)] mt-0.5 leading-relaxed">{payNotice.body}</div>
            </div>
            <button
              onClick={() => setPayNotice(null)}
              className="text-[var(--muted)] hover:text-[var(--text)] bg-transparent border-none cursor-pointer text-[14px] shrink-0 p-1 -m-1 rounded-md transition-colors"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
