"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { TopNav } from "@/components/layout/marketing-top-nav";
import Link from "next/link";
import { authFetch } from "@/app/auth/lib/auth-fetch";

interface PaymentSettings {
  domesticEnabled: boolean;
  internationalEnabled: boolean;
  gstPercent: number;
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
  originalPrice?: number | null;
  offPct?: number;
  hasDiscount?: boolean;
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
  gstPercent: number;
  gstAmount: number;
  total: number;
  currency: Currency;
}

interface WishlistItem {
  courseId: string;
  title: string;
  price: number | null;
  originalPrice?: number | null;
  offPct?: number;
  hasDiscount?: boolean;
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
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open(): void;
  on(event: string, cb: (res: unknown) => void): void;
}

interface PayNotice {
  kind: "cancelled" | "failed";
  title: string;
  body: string;
}

interface SuccessData {
  amount: number;
  currency: Currency;
  items: { courseId: string; title: string; price: number }[];
}

interface BillingDetails {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

const emptyBilling: BillingDetails = {
  fullName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
};

const BILLING_CACHE_KEY = "fs_billing";

function loadBillingCache(): BillingDetails | null {
  try {
    const raw = localStorage.getItem(BILLING_CACHE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<BillingDetails>;
    return v.fullName || v.email ? { ...emptyBilling, ...v } : null;
  } catch {
    return null;
  }
}

function saveBillingCache(details: BillingDetails): void {
  try {
    localStorage.setItem(BILLING_CACHE_KEY, JSON.stringify(details));
  } catch {
    // storage unavailable — non-fatal
  }
}

declare global {
  interface Window {
    Razorpay?: new (opts: RazorpayOptions) => RazorpayInstance;
  }
}

function emptyCart(currency: Currency = "INR"): CartView {
  return { items: [], coupon: null, discountAmount: 0, subtotal: 0, gstPercent: 0, gstAmount: 0, total: 0, currency };
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

const fieldBaseCls =
  "w-full h-11 rounded-lg bg-[var(--bg2)] border border-[var(--border)] px-3 text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--orange)] transition-colors duration-150";

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  textarea = false,
  maxLength,
  inputMode,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  textarea?: boolean;
  maxLength?: number;
  inputMode?: "text" | "numeric" | "email" | "tel";
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-[11px] font-bold uppercase tracking-[.06em] text-[var(--text2)]">{label}</span>
      {textarea ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className={`${fieldBaseCls} h-auto py-2.5 resize-none`}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          inputMode={inputMode}
          className={fieldBaseCls}
        />
      )}
    </label>
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
  const [success, setSuccess] = useState<SuccessData | null>(null);
  const [currency, setCurrency] = useState<Currency>("INR");
  const [billing, setBilling] = useState<BillingDetails>(emptyBilling);
  const [billingError, setBillingError] = useState("");

  // Guards the Razorpay modal lifecycle: once a payment outcome has been
  // recorded (success, failed or dismissed) any later modal events are ignored.
  const payOutcomeRef = useRef<"idle" | "success" | "notified">("idle");
  const [editingBilling, setEditingBilling] = useState(false);
  const prevBillingRef = useRef<BillingDetails | null>(null);

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
  const gstPercent = cart?.gstPercent ?? paySettings?.gstPercent ?? 0;
  const gstAmount = cart?.gstAmount ?? 0;
  const coupon = cart?.coupon ?? null;

  // Snapshotted on payment success — survives cart revalidation clearing the
  // server cart after finalization.
  const successItems = success?.items ?? items;
  const successAmount = success?.amount ?? total;
  const successCurrency = success?.currency ?? activeCurrency;

  const billingComplete = Boolean(
    billing.fullName.trim() &&
      billing.email.trim() &&
      billing.phone.trim() &&
      billing.address.trim() &&
      billing.city.trim() &&
      billing.state.trim() &&
      billing.pincode.trim(),
  );
  const showBillingForm = editingBilling || !billingComplete;

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

  function showNotice(kind: "cancelled" | "failed", title: string, body: string) {
    setPayNotice({ kind, title, body });
  }

  function setBillingField<K extends keyof BillingDetails>(key: K, value: string) {
    setBilling(b => ({ ...b, [key]: value }));
  }

  // Load saved billing once: prefer the latest order's snapshot (server truth,
  // works across devices), fall back to the local cache, else show the Add form.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await authFetch("/api/student/orders");
        if (active && res.ok) {
          const orders = (await res.json()) as {
            billingFullName?: string | null;
            billingEmail?: string | null;
            billingPhone?: string | null;
            billingAddress?: string | null;
            billingCity?: string | null;
            billingState?: string | null;
            billingPincode?: string | null;
          }[];
          const latest = orders.find(o => o.billingFullName && o.billingEmail && o.billingPhone);
          if (latest) {
            setBilling({
              fullName: latest.billingFullName ?? "",
              email: latest.billingEmail ?? "",
              phone: latest.billingPhone ?? "",
              address: latest.billingAddress ?? "",
              city: latest.billingCity ?? "",
              state: latest.billingState ?? "",
              pincode: latest.billingPincode ?? "",
            });
            return;
          }
        }
      } catch {
        // fall through to the local cache
      }
      const cached = loadBillingCache();
      if (!active) return;
      if (cached) {
        setBilling(cached);
        return;
      }
      setEditingBilling(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  function saveBilling() {
    const err = validateBilling();
    if (err) {
      setBillingError(err);
      return;
    }
    setBillingError("");
    prevBillingRef.current = null;
    saveBillingCache(billing);
    setEditingBilling(false);
  }

  function startEditBilling() {
    if (!prevBillingRef.current) prevBillingRef.current = billing;
    setEditingBilling(true);
  }

  function cancelEditBilling() {
    if (prevBillingRef.current) setBilling(prevBillingRef.current);
    prevBillingRef.current = null;
    setBillingError("");
    setEditingBilling(false);
  }

  function validateBilling(): string {
    if (!billing.fullName.trim()) return "Please enter your full name";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billing.email.trim()))
      return "Please enter a valid email address";
    if (!/^[0-9]{10,15}$/.test(billing.phone.trim()))
      return "Please enter a valid phone number (10-15 digits)";
    if (!billing.address.trim()) return "Please enter your address";
    if (!billing.city.trim()) return "Please enter your city";
    if (!billing.state.trim()) return "Please enter your state";
    if (!/^[0-9]{5,6}$/.test(billing.pincode.trim()))
      return "Please enter a valid pincode (5-6 digits)";
    return "";
  }

  async function processPayment() {
    if (processing || items.length === 0) return;
    payOutcomeRef.current = "idle";
    const billingE = validateBilling();
    if (billingE) {
      setProcessing(false);
      setPayError("");
      setBillingError(billingE);
      return;
    }
    setProcessing(true);
    setPayError("");
    setBillingError("");

    let orderData: { keyId: string; razorpayOrderId: string; amount: number; currency: Currency };
    try {
      const orderRes = await authFetch("/api/checkout/create-order", {
        method: "POST",
        body: JSON.stringify({
          currency: activeCurrency,
          fullName: billing.fullName.trim(),
          email: billing.email.trim(),
          phone: billing.phone.trim(),
          address: billing.address.trim(),
          city: billing.city.trim(),
          state: billing.state.trim(),
          pincode: billing.pincode.trim(),
        }),
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
      const handleModalDismiss = () => {
        // Fires both for a dismissal AND after a successful payment close.
        if (payOutcomeRef.current !== "idle") return;
        payOutcomeRef.current = "notified";
        // The student aborted — mark the backend order CANCELLED (not left
        // "Pending") so it shows as Cancelled in order history / admin panel.
        // Fire-and-forget; the popup still shows if this call fails.
        authFetch("/api/checkout/cancel", {
          method: "POST",
          body: JSON.stringify({ razorpayOrderId: orderData.razorpayOrderId }),
        }).catch(() => {});
        setProcessing(false);
        goToStep(2);
        // Re-sync cart from the server — a cancelled payment never clears it,
        // so any 401-stale empty cache is corrected back to the real items.
        mutate();
        showNotice(
          "cancelled",
          "Payment cancelled",
          "You've been returned to your cart. Your cart is safe — you can retry whenever you're ready.",
        );
      };

      const rzp = new Razorpay({
        key: orderData.keyId,
        amount: Math.round(orderData.amount * 100),
        currency: activeCurrency,
        name: "FutureStack",
        description: `${totalCount} course${totalCount === 1 ? "" : "s"} enrollment`,
        order_id: orderData.razorpayOrderId,
        prefill: {
          name: billing.fullName.trim(),
          email: billing.email.trim(),
          contact: billing.phone.trim(),
        },
        theme: { color: "#f05a1a" },
        // Detects the user closing/aborting the gateway — the documented
        // "checkout modal lifecycle" hook (callbacks fire even when the
        // rzp.on("modal.close") event isn't dispatched).
        modal: { ondismiss: handleModalDismiss },
        handler: async (res) => {
          // Mark success before verification so the modal.close event Razorpay
          // fires after a successful payment can't be mistaken for a cancel.
          payOutcomeRef.current = "success";
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
            setSuccess({
              amount: orderData.amount,
              currency: orderData.currency,
              items: items.map(i => ({ courseId: i.courseId, title: i.title, price: i.price })),
            });
          } catch (e) {
            payOutcomeRef.current = "idle";
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
        if (payOutcomeRef.current !== "idle") return;
        payOutcomeRef.current = "notified";
        setProcessing(false);
        goToStep(2);
        // Re-sync cart — a failed payment never clears it.
        mutate();
        showNotice(
          "failed",
          "Payment failed",
          "The payment didn't go through. Please try again.",
        );
      });
      rzp.on("modal.close", handleModalDismiss);
      rzp.open();
    } catch (e) {
      setProcessing(false);
      setPayError(e instanceof Error ? e.message : "Could not open payment");
    }
  }

  const steps = ["Cart", "Billing", "Confirmation"];

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
                          {item.hasDiscount && item.originalPrice != null && (
                            <span className="text-[9px] font-extrabold text-[var(--green)] bg-[var(--green-d)] px-2 py-0.5 rounded-full whitespace-nowrap">-{item.offPct}% off</span>
                          )}
                          {coupon && itemOff > 0 ? (
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-[10px] font-extrabold uppercase tracking-[.06em] text-[var(--green)] bg-[var(--green-d)] px-2 py-0.5 rounded-full whitespace-nowrap">🏷️ {discountLabel(coupon, activeCurrency)}</span>
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-[12px] text-[var(--muted)] line-through">{formatPrice(item.price, activeCurrency)}</span>
                                <span className="font-['Inter_Tight',sans-serif] text-lg sm:text-xl font-extrabold text-[var(--green)] tracking-[-.01em]">{formatPrice(finalPrice, activeCurrency)}</span>
                              </div>
                              <span className="text-[11px] font-bold text-[var(--green)]">−{formatPrice(itemOff, activeCurrency)} off</span>
                            </div>
                          ) : item.hasDiscount && item.originalPrice != null ? (
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-[12px] text-[var(--muted)] line-through">{formatPrice(item.originalPrice, activeCurrency)}</span>
                              <span className="font-['Inter_Tight',sans-serif] text-lg sm:text-xl font-extrabold text-[var(--green)] tracking-[-.01em]">{formatPrice(item.price, activeCurrency)}</span>
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

                  {(() => {
                    const totalOriginal = items.reduce((sum, item) => sum + (item.originalPrice ?? item.price), 0);
                    const courseDiscount = Math.max(0, totalOriginal - subtotal);
                    return (
                      <div className="flex flex-col gap-2.5 text-[13px]">
                        {totalOriginal > subtotal && (
                          <div className="flex justify-between">
                            <span className="text-[var(--text2)]">Original Price</span>
                            <span className="text-[var(--text)] font-semibold line-through">{formatPrice(totalOriginal, activeCurrency)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-[var(--text2)]">Subtotal ({totalCount} items)</span>
                          <span className="text-[var(--text)] font-semibold">{formatPrice(subtotal, activeCurrency)}</span>
                        </div>
                        {courseDiscount > 0 && (
                          <div className="flex justify-between">
                            <span className="text-[var(--green)]">Course Discount</span>
                            <span className="text-[var(--green)] font-semibold">−{formatPrice(courseDiscount, activeCurrency)}</span>
                          </div>
                        )}
                        {coupon && (
                          <div className="flex justify-between">
                            <span className="text-[var(--green)]">Promo ({coupon.code})</span>
                            <span className="text-[var(--green)] font-semibold">−{formatPrice(discountAmount, activeCurrency)}</span>
                          </div>
                        )}
                        {gstPercent > 0 && (
                          <div className="flex justify-between">
                            <span className="text-[var(--text2)]">GST ({gstPercent}%)</span>
                            <span className="text-[var(--text)] font-semibold">{formatPrice(gstAmount, activeCurrency)}</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}

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
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="font-['Inter_Tight',sans-serif] text-[15px] font-bold text-[var(--text)]">Total</span>
                    <span className="font-['Inter_Tight',sans-serif] text-[28px] font-extrabold text-[var(--text)] tracking-[-.01em]">{formatPrice(total, activeCurrency)}</span>
                  </div>
                  {(() => {
                    const totalOriginal = items.reduce((sum, item) => sum + (item.originalPrice ?? item.price), 0);
                    const totalSavings = Math.max(0, totalOriginal - subtotal) + discountAmount;
                    return totalSavings > 0 ? (
                      <div className="text-right text-[11px] font-bold text-[var(--green)] mb-3">You save {formatPrice(totalSavings, activeCurrency)} 🎉</div>
                    ) : <div className="mb-3" />;
                  })()}

                  <button className={primaryBtnCls} onClick={() => goToStep(2)} disabled={processing}>
                    Proceed to Checkout
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" transform="rotate(180)"><path d="M6 12h12" /><path d="M13 5l7 7-7 7" /></svg>
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
                          {item.price != null ? (
                            item.hasDiscount && item.originalPrice != null ? (
                              <span className="flex items-center gap-1.5">
                                <span className="text-[var(--muted)] line-through">{formatPrice(item.originalPrice, activeCurrency)}</span>
                                <span className="text-[var(--green)]">{formatPrice(item.price, activeCurrency)}</span>
                                <span className="text-[9px] font-extrabold text-[var(--green)] bg-[var(--green-d)] px-1 py-[1px] rounded-full">-{item.offPct ?? 0}%</span>
                              </span>
                            ) : (
                              formatPrice(item.price, activeCurrency)
                            )
                          ) : "Price on enquiry"}
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

        {/* Step 2: Billing details */}
        {step === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,720px)_360px] gap-5 items-start justify-center">
            <Card className="p-5 sm:p-6">
              <div className="flex flex-col gap-1 mb-5">
                <h1 className="font-['Inter_Tight',sans-serif] text-xl sm:text-2xl font-extrabold text-[var(--text)] tracking-[-.01em]">Billing Details</h1>
                <p className="text-[12px] text-[var(--muted)]">
                  {showBillingForm
                    ? "Fill these once — we'll remember them for your next purchase."
                    : "Saved for next time — you only fill these once. You can edit them anytime."}
                </p>
              </div>

              {showBillingForm ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Full Name" value={billing.fullName} onChange={v => setBillingField("fullName", v)} placeholder="e.g. Rahul Sharma" className="sm:col-span-1" />
                    <Field label="Email" value={billing.email} onChange={v => setBillingField("email", v)} placeholder="you@example.com" className="sm:col-span-1" type="email" />
                    <Field label="Phone Number" value={billing.phone} onChange={v => setBillingField("phone", v)} placeholder="e.g. 9876543210" className="sm:col-span-2" type="tel" maxLength={15} />
                    <Field label="Address" value={billing.address} onChange={v => setBillingField("address", v)} placeholder="House no, street, area" className="sm:col-span-2" textarea />
                    <Field label="City" value={billing.city} onChange={v => setBillingField("city", v)} placeholder="e.g. Mumbai" className="sm:col-span-1" />
                    <Field label="State" value={billing.state} onChange={v => setBillingField("state", v)} placeholder="e.g. Maharashtra" className="sm:col-span-1" />
                    <Field label="Pincode" value={billing.pincode} onChange={v => setBillingField("pincode", v)} placeholder="e.g. 400001" className="sm:col-span-2" maxLength={6} inputMode="numeric" />
                  </div>
                  <div className="flex flex-col gap-2.5 mt-5">
                    <button onClick={saveBilling} className={primaryBtnCls}>
                      {editingBilling ? "Save changes" : "Save & Continue →"}
                    </button>
                    {editingBilling && (
                      <button
                        onClick={cancelEditBilling}
                        className="w-full h-11 rounded-xl text-[12.5px] font-bold bg-transparent text-[var(--text2)] border-[1.5px] border-[var(--border2)] cursor-pointer transition-all duration-150 hover:text-[var(--text)] hover:border-[var(--border)]"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-2.5">
                  <div className="flex justify-between gap-4 text-[13px]">
                    <span className="text-[var(--muted)] shrink-0">Full Name</span>
                    <span className="text-[var(--text)] font-semibold text-right">{billing.fullName}</span>
                  </div>
                  <div className="flex justify-between gap-4 text-[13px]">
                    <span className="text-[var(--muted)] shrink-0">Email</span>
                    <span className="text-[var(--text)] font-semibold text-right break-all">{billing.email}</span>
                  </div>
                  <div className="flex justify-between gap-4 text-[13px]">
                    <span className="text-[var(--muted)] shrink-0">Phone</span>
                    <span className="text-[var(--text)] font-semibold text-right">{billing.phone}</span>
                  </div>
                  <div className="h-px bg-[var(--border)] my-1" />
                  <div className="flex justify-between gap-4 text-[13px]">
                    <span className="text-[var(--muted)] shrink-0">Address</span>
                    <span className="text-[var(--text)] font-semibold text-right">{billing.address}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5 text-[13px]">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[var(--muted)] text-[11px]">City</span>
                      <span className="text-[var(--text)] font-semibold">{billing.city}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[var(--muted)] text-[11px]">State</span>
                      <span className="text-[var(--text)] font-semibold">{billing.state}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[var(--muted)] text-[11px]">Pincode</span>
                      <span className="text-[var(--text)] font-semibold">{billing.pincode}</span>
                    </div>
                  </div>
                  <button
                    onClick={startEditBilling}
                    className="self-start mt-1 flex items-center gap-1.5 text-[12.5px] font-bold text-[var(--orange)] bg-[var(--orange-d)] px-3.5 py-2 rounded-lg border-none cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    ✎ Edit
                  </button>
                </div>
              )}
            </Card>

            <Card className="p-5 lg:sticky lg:top-[76px]">
              <div className="font-['Inter_Tight',sans-serif] text-base font-extrabold text-[var(--text)] mb-3.5">Order Summary</div>
              <div className="flex flex-col gap-2 text-[13px]">
                <div className="flex justify-between"><span className="text-[var(--text2)]">Subtotal ({totalCount} items)</span><span className="text-[var(--text)] font-semibold">{formatPrice(subtotal, activeCurrency)}</span></div>
                {coupon && (
                  <div className="flex justify-between">
                    <span className="text-[var(--text2)]">Promo ({coupon.code})</span>
                    <span className="text-[var(--green)] font-semibold">−{formatPrice(discountAmount, activeCurrency)}</span>
                  </div>
                )}
                {gstPercent > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[var(--text2)]">GST ({gstPercent}%)</span>
                    <span className="text-[var(--text)] font-semibold">{formatPrice(gstAmount, activeCurrency)}</span>
                  </div>
                )}
              </div>
              <div className="h-px bg-[var(--border)] my-3.5" />
              <div className="flex justify-between items-baseline mb-4">
                <span className="font-['Inter_Tight',sans-serif] text-[15px] font-bold text-[var(--text)]">Total (incl. GST)</span>
                <span className="font-['Inter_Tight',sans-serif] text-[28px] font-extrabold text-[var(--text)] tracking-[-.01em]">{formatPrice(total, activeCurrency)}</span>
              </div>

              <button className={primaryBtnCls} onClick={processPayment} disabled={processing}>
                {processing ? "⏳ Opening payment…" : `Pay ${formatPrice(total, activeCurrency)}`}
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
              </button>
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-[var(--muted)] mt-2">🔒 Secure checkout · 256-bit SSL encrypted</div>
              {billingError && <div className="text-[11px] text-[var(--red)] text-center mt-2">{billingError}</div>}
              {payError && <div className="text-[11px] text-[var(--red)] text-center mt-2">{payError}</div>}

              <button
                onClick={() => goToStep(1)}
                disabled={processing}
                className="w-full mt-4 h-10 rounded-xl text-[12.5px] font-bold bg-transparent text-[var(--text2)] border-[1.5px] border-[var(--border2)] cursor-pointer transition-all duration-150 hover:text-[var(--text)] hover:border-[var(--border)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Back to Cart
              </button>
            </Card>
          </div>
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
              {successItems.map((item, i) => (
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
                    <span className="shrink-0 font-['Inter_Tight',sans-serif] text-[13px] font-extrabold text-[var(--text)]">{formatPrice(item.price, successCurrency)}</span>
                  </Card>
                </div>
              ))}
            </div>

            <Card className="px-6 py-4 w-full max-w-[420px] mb-6 text-left animate-[fadeUp_.45s_ease_both_.3s]">
              <div className="flex justify-between text-[12px] py-1.5"><span className="text-[var(--muted)]">Amount Paid</span><span className="text-[var(--text)] font-bold">{formatPrice(successAmount, successCurrency)}</span></div>
              <div className="flex justify-between text-[12px] py-1.5"><span className="text-[var(--muted)]">Courses Enrolled</span><span className="text-[var(--text)] font-bold">{successItems.length}</span></div>
            </Card>

            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-[420px] animate-[fadeUp_.45s_ease_both_.45s]">
              <Link href="/my-dashboard" className="flex-1 px-6 py-3 rounded-xl text-[13px] font-bold bg-[linear-gradient(135deg,var(--orange),var(--orange2))] text-white shadow-[0_4px_14px_rgba(240,90,26,.3)] text-center no-underline">My Courses →</Link>
              <Link href="/courses" className="flex-1 px-6 py-3 rounded-xl text-[13px] font-bold bg-transparent text-[var(--text2)] border-[1.5px] border-[var(--border2)] cursor-pointer text-center no-underline hover:text-[var(--text)] hover:border-[var(--border)]">Browse More</Link>
            </div>
          </div>
        )}
      </div>

      {/* Cancelled / failed payment — full-screen popup */}
      {payNotice && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[3px]" onClick={() => setPayNotice(null)} />
          <div className="relative w-full max-w-[420px] bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-[var(--shadow)] px-6 pt-8 pb-6 text-center animate-[fadeUp_.25s_ease_both]">
            <button
              onClick={() => setPayNotice(null)}
              aria-label="Dismiss"
              className="absolute top-3.5 right-3.5 text-[var(--muted)] hover:text-[var(--text)] bg-transparent border-none cursor-pointer text-[15px] w-8 h-8 rounded-lg hover:bg-[var(--bg2)] flex items-center justify-center transition-colors"
            >
              ✕
            </button>
            <div className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center text-[20px] font-bold mb-4 ${payNotice.kind === "failed" ? "bg-[var(--red-d)] text-[var(--red)]" : "bg-[var(--orange-d)] text-[var(--orange)]"}`}>
              {payNotice.kind === "failed" ? "✕" : "⚠"}
            </div>
            <h3 className="font-['Inter_Tight',sans-serif] text-lg font-extrabold text-[var(--text)] mb-1.5">{payNotice.title}</h3>
            <p className="text-[12.5px] text-[var(--muted)] leading-relaxed">{payNotice.body}</p>
            <div className="flex flex-col gap-2.5 mt-6">
              <button onClick={() => { setPayNotice(null); processPayment(); }} className={primaryBtnCls}>
                Retry Payment
              </button>
              <button
                onClick={() => { setPayNotice(null); goToStep(1); }}
                className="w-full h-11 rounded-xl text-[12.5px] font-bold bg-transparent text-[var(--text2)] border-[1.5px] border-[var(--border2)] cursor-pointer transition-all duration-150 hover:text-[var(--text)] hover:border-[var(--border)]"
              >
                Back to Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
