"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { authFetch } from "@/app/auth/lib/auth-fetch";
import { useAuth } from "@/app/auth/hooks/use-auth";

interface PendingOrder {
  orderId: string;
  razorpayOrderId: string;
  amount: number;
  currency: "INR" | "USD";
  keyId: string;
  courseTitle: string;
}

interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (res: RazorpaySuccess) => void;
  prefill?: { name?: string; email?: string };
  theme?: { color: string };
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open(): void;
  on(event: string, cb: (res: unknown) => void): void;
}

type RazorpayWindow = { Razorpay?: new (opts: RazorpayOptions) => RazorpayInstance };

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as unknown as RazorpayWindow).Razorpay) return resolve();
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

/** Direct "pay this order" page for a sales-generated link — deliberately
 *  bypasses the cart entirely: it fetches one specific (ownership-checked)
 *  order and opens the Razorpay popup straight away. */
export default function PayOrderPage() {
  const params = useParams();
  const orderId = params?.orderId as string;
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [order, setOrder] = useState<PendingOrder | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const autoTriggered = useRef(false);
  const payOutcomeRef = useRef<"idle" | "success" | "notified">("idle");

  const ready = mounted && !authLoading;

  useEffect(() => {
    if (!ready || !isAuthenticated || !orderId) return;
    let cancelled = false;
    authFetch(`/api/checkout/pending-order/${orderId}`)
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body?.message || "This payment link is no longer valid");
        if (!cancelled) setOrder(body);
      })
      .catch((e) => { if (!cancelled) setLoadError(e instanceof Error ? e.message : "This payment link is no longer valid"); });
    return () => { cancelled = true; };
  }, [ready, isAuthenticated, orderId]);

  async function pay() {
    if (!order || paying) return;
    setPaying(true);
    setPayError(null);
    payOutcomeRef.current = "idle";
    try {
      await loadRazorpayScript();
    } catch (e) {
      setPaying(false);
      setPayError(e instanceof Error ? e.message : "Could not load payment gateway");
      return;
    }
    const Razorpay = (window as unknown as RazorpayWindow).Razorpay;
    if (!Razorpay) {
      setPaying(false);
      setPayError("Payment gateway is unavailable");
      return;
    }
    const rzp = new Razorpay({
      key: order.keyId,
      amount: Math.round(order.amount * 100),
      currency: order.currency,
      name: "FutureStack",
      description: order.courseTitle,
      order_id: order.razorpayOrderId,
      theme: { color: "#f05a1a" },
      modal: {
        ondismiss: () => {
          if (payOutcomeRef.current !== "idle") return;
          payOutcomeRef.current = "notified";
          setPaying(false);
        },
      },
      handler: async (res) => {
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
          const vbody = await verifyRes.json().catch(() => ({}));
          if (!verifyRes.ok) throw new Error(vbody?.message || "We couldn't confirm your payment. If money was deducted it will be auto-refunded, or contact support.");
          setSuccess(true);
        } catch (e) {
          payOutcomeRef.current = "idle";
          setPayError(e instanceof Error ? e.message : "Payment could not be verified");
        } finally {
          setPaying(false);
        }
      },
    });
    rzp.on("payment.failed", () => {
      if (payOutcomeRef.current !== "idle") return;
      payOutcomeRef.current = "notified";
      setPaying(false);
      setPayError("Payment failed — please try again");
    });
    rzp.open();
  }

  // Open the popup automatically the moment the order loads — no cart, no
  // extra click, exactly as the emailed link promises.
  useEffect(() => {
    if (order && !autoTriggered.current) {
      autoTriggered.current = true;
      pay();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-6">
      <div className="w-full max-w-[420px] bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-[var(--shadow)] p-7 text-center">
        <div className="text-2xl font-extrabold mb-1" style={{ color: "var(--text)" }}>
          <span className="text-[var(--orange)]">Future</span>Stack
        </div>

        {!ready ? (
          <div className="py-10 text-[13px] text-[var(--muted)]">Loading…</div>
        ) : !isAuthenticated ? (
          <>
            <p className="mt-4 text-[14px] text-[var(--text2)]">Please sign in to continue with this payment.</p>
            <Link
              href="/#student-login"
              className="mt-5 inline-block w-full px-6 py-2.5 rounded-xl bg-[linear-gradient(135deg,var(--orange),var(--orange2))] text-white text-[13px] font-extrabold shadow-[0_5px_18px_rgba(240,90,26,.35)] no-underline"
            >
              Sign In
            </Link>
          </>
        ) : success ? (
          <>
            <div className="mt-3 text-[40px]">✅</div>
            <p className="mt-2 text-[15px] font-bold text-[var(--text)]">Payment successful!</p>
            <p className="mt-1 text-[13px] text-[var(--muted)]">You now have full access to {order?.courseTitle}.</p>
            <Link
              href="/my-dashboard"
              className="mt-5 inline-block w-full px-6 py-2.5 rounded-xl bg-[linear-gradient(135deg,var(--orange),var(--orange2))] text-white text-[13px] font-extrabold no-underline"
            >
              Go to My Dashboard
            </Link>
          </>
        ) : loadError ? (
          <p className="mt-4 text-[14px] text-[var(--red,#dc2626)]">{loadError}</p>
        ) : !order ? (
          <div className="py-10 text-[13px] text-[var(--muted)]">Loading your order…</div>
        ) : (
          <>
            <p className="mt-4 text-[13px] text-[var(--muted)]">Complete your payment for</p>
            <p className="mt-1 text-[16px] font-bold text-[var(--text)]">{order.courseTitle}</p>
            <p className="mt-1 text-[24px] font-extrabold text-[var(--text)]">
              {order.currency === "USD" ? "$" : "₹"}{order.amount.toLocaleString("en-IN")}
            </p>

            {payError && <p className="mt-3 text-[12.5px] text-[var(--red,#dc2626)]">{payError}</p>}

            <button
              onClick={pay}
              disabled={paying}
              className="mt-5 w-full h-12 rounded-xl bg-[linear-gradient(135deg,var(--orange),var(--orange2))] text-white text-[14px] font-extrabold shadow-[0_5px_18px_rgba(240,90,26,.35)] disabled:opacity-50"
            >
              {paying ? "Opening payment…" : "Pay Now"}
            </button>
            <p className="mt-3 text-[11px] text-[var(--muted)]">This link is tied to your account and can&apos;t be used by anyone else.</p>
          </>
        )}
      </div>
    </div>
  );
}
