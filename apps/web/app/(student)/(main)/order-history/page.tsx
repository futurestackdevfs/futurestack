"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import { jsPDF } from "jspdf";
import { useAuth } from "@/app/auth/hooks/use-auth";
import { userApi, type OrderHistoryItem } from "@/app/auth/lib/auth-api";

const statusMeta: Record<OrderHistoryItem["status"], { label: string; cls: string }> = {
  PAID: { label: "Paid", cls: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 border-green-200 dark:border-green-900/40" },
  CREATED: { label: "Pending", cls: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-900/40" },
  FAILED: { label: "Failed", cls: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-900/40" },
  CANCELLED: { label: "Cancelled", cls: "bg-[var(--bg)] text-[var(--muted)] border-[var(--border2)]" },
  EXPIRED: { label: "Expired", cls: "bg-[var(--bg)] text-[var(--muted)] border-[var(--border2)]" },
};

function money(amount: number, currency: OrderHistoryItem["currency"]): string {
  return new Intl.NumberFormat(currency === "USD" ? "en-US" : "en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

function orderNumber(id: string): string {
  return `FS-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Load the brand logo as a base64 data URL so it can be embedded in the PDF.
async function loadLogo(): Promise<string | null> {
  try {
    const res = await fetch("/images/logo.png");
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ─── Invoice PDF ───────────────────────────────────────────────────────────────

async function downloadInvoice(order: OrderHistoryItem, userName: string, userEmail: string) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const M = 14;
  const contentW = W - M * 2;

  const inr = order.currency === "INR";
  const fmt = (n: number) =>
    inr
      ? `Rs. ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `$ ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const bold = () => pdf.setFont("helvetica", "bold");
  const normal = () => pdf.setFont("helvetica", "normal");

  const NAVY: [number, number, number] = [15, 23, 42];
  const BLUE: [number, number, number] = [59, 130, 246];
  const INDIGO: [number, number, number] = [37, 99, 235];
  const ORANGE: [number, number, number] = [249, 115, 22];
  const TINT: [number, number, number] = [239, 243, 255];
  const SLATE: [number, number, number] = [71, 85, 105];
  const GRAY: [number, number, number] = [148, 163, 184];
  const setC = (c: [number, number, number]) => pdf.setTextColor(c[0], c[1], c[2]);

  // ── White top zone: logo + TAX INVOICE ──
  const logo = await loadLogo();
  if (logo) {
    const probe = new Image();
    probe.src = logo;
    await probe.decode().catch(() => {});
    if (probe.naturalWidth > 0) {
      const aspect = probe.naturalWidth / probe.naturalHeight;
      const logoH = 13;
      const logoW = Math.min(48, logoH * aspect);
      pdf.addImage(logo, "PNG", M, 7, logoW, logoH);
    }
  } else {
    bold();
    pdf.setFontSize(22);
    pdf.setTextColor(11, 18, 33);
    pdf.text("FUTURESTACK", M, 17);
    normal();
  }

  setC(INDIGO);
  bold();
  pdf.setFontSize(19);
  pdf.text("TAX INVOICE", W - M, 15, { align: "right" });
  normal();
  pdf.setFontSize(8);
  setC(GRAY);
  pdf.text("Original for Recipient", W - M, 20, { align: "right" });

  // ── Company band: logo-colour shade on white ──
  pdf.setFillColor(TINT[0], TINT[1], TINT[2]);
  pdf.rect(0, 30, W, 17, "F");
  setC(NAVY);
  bold();
  pdf.setFontSize(10.5);
  pdf.text("FutureStack Learning Pvt. Ltd.", M, 38);
  normal();
  setC(ORANGE);
  bold();
  pdf.setFontSize(9);
  pdf.text("Think. Create. Conquer.", M, 43);
  normal();
  pdf.setFontSize(7.5);
  setC(SLATE);
  pdf.text("Registered Office: Pune, Maharashtra, India", W - M, 38, { align: "right" });
  pdf.text("support@futurestack.co.in", W - M, 43, { align: "right" });

  // gradient accent (blue → orange)
  pdf.setFillColor(BLUE[0], BLUE[1], BLUE[2]);
  pdf.rect(0, 47, W / 2, 1.6, "F");
  pdf.setFillColor(ORANGE[0], ORANGE[1], ORANGE[2]);
  pdf.rect(W / 2, 47, W / 2, 1.6, "F");

  // ── Billed To + Invoice Details ──
  const boxLeftW = contentW * 0.55;
  const boxRightX = M + boxLeftW + 6;
  const boxRightW = W - M - boxRightX;
  const boxTop = 58;
  const boxH = 50;
  const headH = 7.5;

  const drawBox = (x: number, w: number) => {
    pdf.setDrawColor(203, 213, 225);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(x, boxTop, w, boxH, 2.5, 2.5, "S");
    pdf.setFillColor(TINT[0], TINT[1], TINT[2]);
    pdf.rect(x, boxTop, w, headH, "F");
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.2);
    pdf.line(x, boxTop + headH, x + w, boxTop + headH);
  };

  drawBox(M, boxLeftW);
  setC(INDIGO);
  bold();
  pdf.setFontSize(7.5);
  pdf.text("BILLED TO", M + 4, boxTop + 5.2);
  normal();
  setC(NAVY);
  bold();
  pdf.setFontSize(10.5);
  pdf.text(order.billingFullName ?? userName, M + 4, boxTop + 16);
  normal();
  pdf.setFontSize(8.5);
  setC(SLATE);
  pdf.text(order.billingEmail ?? userEmail, M + 4, boxTop + 22);
  const addrLine = [order.billingAddress, [order.billingCity, order.billingState].filter(Boolean).join(", "), order.billingPincode]
    .filter(Boolean)
    .join(", ");
  let billY = boxTop + 28;
  if (addrLine) {
    const addr = pdf.splitTextToSize(addrLine, boxLeftW - 8);
    pdf.text(addr, M + 4, billY);
    billY += (addr.length - 1) * 3.6;
  }
  if (order.billingPhone) pdf.text(order.billingPhone, M + 4, billY + 8);

  drawBox(boxRightX, boxRightW);
  setC(INDIGO);
  bold();
  pdf.setFontSize(7.5);
  pdf.text("INVOICE DETAILS", boxRightX + 4, boxTop + 5.2);
  normal();
  const details: [string, string][] = [
    ["Invoice No.", orderNumber(order.id)],
    ["Invoice Date", formatDate(order.createdAt)],
    ["Order Status", statusMeta[order.status]?.label ?? order.status],
    ["Payment Mode", order.gatewayType === "DOMESTIC" ? "Razorpay (Domestic)" : "Razorpay (International)"],
  ];
  let dy = boxTop + 15;
  details.forEach(([k, v]) => {
    setC(GRAY);
    pdf.setFontSize(7.5);
    pdf.text(k, boxRightX + 4, dy);
    setC(NAVY);
    bold();
    pdf.setFontSize(8.5);
    pdf.text(String(v), boxRightX + 4 + 30, dy);
    normal();
    dy += 6.5;
  });
  if (order.razorpayPaymentId) {
    setC(GRAY);
    pdf.setFontSize(7.5);
    pdf.text("Payment ID", boxRightX + 4, dy);
    setC(NAVY);
    bold();
    pdf.setFontSize(8.5);
    pdf.text(order.razorpayPaymentId, boxRightX + 4 + 30, dy);
    normal();
  }

  // ── Items table ──
  const y = boxTop + boxH + 13;
  const colItem = M + 14;
  const colQty = W - M - 46;
  const colRate = W - M - 28;
  const colAmt = W - M - 3;

  pdf.setFillColor(INDIGO[0], INDIGO[1], INDIGO[2]);
  pdf.rect(M, y, contentW, 9, "F");
  pdf.setTextColor(255, 255, 255);
  bold();
  pdf.setFontSize(8);
  pdf.text("S.No", M + 3, y + 5.6);
  pdf.text("ITEM DESCRIPTION", colItem, y + 5.6);
  pdf.text("QTY", colQty, y + 5.6, { align: "right" });
  pdf.text("RATE", colRate, y + 5.6, { align: "right" });
  pdf.text("AMOUNT", colAmt, y + 5.6, { align: "right" });
  normal();

  let ry = y + 9;
  const rowH = 10;
  order.items.forEach((item, i) => {
    if (ry + rowH > 236) {
      pdf.addPage();
      pdf.setFillColor(INDIGO[0], INDIGO[1], INDIGO[2]);
      pdf.rect(M, 12, contentW, 8, "F");
      pdf.setTextColor(255, 255, 255);
      bold();
      pdf.setFontSize(8);
      pdf.text("S.No", M + 3, 16.6);
      pdf.text("ITEM DESCRIPTION", colItem, 16.6);
      pdf.text("QTY", colQty, 16.6, { align: "right" });
      pdf.text("RATE", colRate, 16.6, { align: "right" });
      pdf.text("AMOUNT", colAmt, 16.6, { align: "right" });
      normal();
      ry = 20;
    }
    if (i % 2 === 0) {
      pdf.setFillColor(248, 250, 252);
      pdf.rect(M, ry, contentW, rowH, "F");
    }
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.2);
    pdf.line(M, ry + rowH, W - M, ry + rowH);

    const title = pdf.splitTextToSize(item.course.title, colQty - colItem - 6);
    setC(NAVY);
    bold();
    pdf.setFontSize(8.5);
    pdf.text(String(i + 1), M + 3, ry + rowH / 2 + 1);
    pdf.text(title, colItem, ry + rowH / 2 - (title.length - 1) * 2 + 1);
    normal();
    pdf.setFontSize(8.5);
    setC(SLATE);
    pdf.text("1", colQty, ry + rowH / 2 + 1, { align: "right" });
    pdf.text(fmt(item.priceAtPurchase), colRate, ry + rowH / 2 + 1, { align: "right" });
    bold();
    setC(NAVY);
    pdf.text(fmt(item.priceAtPurchase), colAmt, ry + rowH / 2 + 1, { align: "right" });
    normal();
    ry += rowH;
  });

  // ── Totals ──
  const totalsW = 80;
  const totalsX = W - M - totalsW;
  let ty = ry + 8;
  const sumRows: [string, string][] = [
    ["Subtotal", fmt(order.subtotal)],
    ["Discount", order.discountAmount > 0 ? `- ${fmt(order.discountAmount)}` : "—"],
  ];
  if (order.gstPercent > 0) {
    sumRows.push(["GST (" + (order.gstPercent ?? 0) + "%)", fmt(order.gstAmount)]);
  }
  pdf.setFontSize(9);
  sumRows.forEach(([k, v]) => {
    setC(SLATE);
    pdf.text(k, totalsX + 4, ty);
    setC(NAVY);
    bold();
    pdf.text(v, W - M - 4, ty, { align: "right" });
    normal();
    ty += 7.5;
  });

  // gradient total bar (blue → orange)
  pdf.setFillColor(BLUE[0], BLUE[1], BLUE[2]);
  pdf.rect(totalsX, ty + 1, totalsW / 2, 13, "F");
  pdf.setFillColor(ORANGE[0], ORANGE[1], ORANGE[2]);
  pdf.rect(totalsX + totalsW / 2, ty + 1, totalsW / 2, 13, "F");
  pdf.setTextColor(255, 255, 255);
  bold();
  pdf.setFontSize(8.5);
  pdf.text("TOTAL AMOUNT", totalsX + 5, ty + 8.5);
  pdf.setFontSize(12.5);
  pdf.text(fmt(order.totalAmount), W - M - 4, ty + 8.5, { align: "right" });
  normal();

  // ── Payment summary ──
  let ny = ty + 28;
  if (ny > 205) {
    pdf.addPage();
    ny = 60;
  }
  pdf.setDrawColor(203, 213, 225);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(M, ny - 5, contentW, 32, 2.5, 2.5, "S");
  pdf.setFillColor(TINT[0], TINT[1], TINT[2]);
  pdf.rect(M, ny - 5, contentW, 7, "F");
  setC(INDIGO);
  bold();
  pdf.setFontSize(7.5);
  pdf.text("PAYMENT SUMMARY", M + 4, ny - 1);
  normal();
  pdf.setFontSize(8.5);
  setC(NAVY);
  pdf.text(`Payment Gateway: ${order.gatewayType === "DOMESTIC" ? "Razorpay (Domestic)" : "Razorpay (International)"}`, M + 4, ny + 6.5);
  pdf.text(`Transaction ID: ${order.razorpayPaymentId ?? "—"}`, M + 4, ny + 11.5);
  pdf.text(`Order Reference: ${order.razorpayOrderId ?? orderNumber(order.id)}`, M + 4, ny + 16.5);
  pdf.text(`Course${order.items.length > 1 ? "s" : ""} Purchased: ${order.items.map((it) => it.course.title).join(", ").slice(0, 96)}`, M + 4, ny + 21.5);
  ny += 38;

  setC(SLATE);
  pdf.setFontSize(7.5);
  pdf.text(
    order.gstPercent > 0
      ? `Note: GST @ ${order.gstPercent}% is included in the total above.`
      : "Note: All amounts shown above are inclusive of applicable taxes.",
    M, ny);
  pdf.text("This is a computer-generated invoice. In case of any discrepancy, please contact support@futurestack.co.in.", M, ny + 5);

  // ── Footer (logo-colour tinted band) ──
  pdf.setFillColor(TINT[0], TINT[1], TINT[2]);
  pdf.rect(0, 271, W, 26, "F");
  pdf.setFillColor(BLUE[0], BLUE[1], BLUE[2]);
  pdf.rect(0, 271, W / 2, 0.8, "F");
  pdf.setFillColor(ORANGE[0], ORANGE[1], ORANGE[2]);
  pdf.rect(W / 2, 271, W / 2, 0.8, "F");
  setC(NAVY);
  bold();
  pdf.setFontSize(8.5);
  pdf.text("Thank you for learning with FutureStack!", M, 279);
  normal();
  pdf.setFontSize(7.5);
  setC(SLATE);
  pdf.text("FutureStack Learning Pvt. Ltd. · Registered Office: Pune, Maharashtra, India", M, 285);
  pdf.text("For billing queries: support@futurestack.co.in", M, 290);

  const filename = `FutureStack_Invoice_${orderNumber(order.id)}.pdf`;
  pdf.save(filename);
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function OrderHistoryPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [animate] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/");
  }, [isLoading, isAuthenticated, router]);

  const { data: orders, isLoading: ordersLoading } = useSWR<OrderHistoryItem[]>(
    user && isAuthenticated ? ["order-history", user.role] : null,
    () => userApi.getOrders(user!.role),
  );

  const list = orders ?? [];

  async function handleDownload(order: OrderHistoryItem) {
    setDownloading(order.id);
    try {
      await downloadInvoice(order, user?.name ?? "Customer", user?.email ?? "");
    } catch {
      // ignore — PDF generation errors shouldn't break the page
    } finally {
      setTimeout(() => setDownloading(null), 600);
    }
  }

  const goToCourse = useCallback((courseTitle: string) => {
    router.push(`/courses/${slugify(courseTitle)}`);
  }, [router]);

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-[var(--bg)]">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-600/5 via-transparent to-orange-600/5 border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div style={animate ? { animation: "fadeUp .5s ease both" } : {}}>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-blue-500/10 to-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900/40">
                  Billing
                </span>
              </div>
              <h1 className="text-2xl font-bold text-[var(--text)]">Order History</h1>
              <p className="text-sm text-[var(--muted)] mt-0.5">Every purchase you have made with FutureStack, with downloadable invoices.</p>
            </div>
            <Link
              href="/courses"
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-blue-500 to-orange-500 hover:from-blue-600 hover:to-orange-600 active:scale-[0.97] transition-all duration-200 shadow-md hover:shadow-lg no-underline"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
              Browse Courses
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Orders */}
        {ordersLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm py-20 flex flex-col items-center justify-center text-center px-6">
            <div className="size-16 rounded-2xl bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--muted)]"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
            </div>
            <h2 className="text-lg font-bold text-[var(--text)] mb-1">No orders yet</h2>
            <p className="text-sm text-[var(--muted)] max-w-sm leading-relaxed mb-5">
              When you purchase a course, its invoice will appear here so you can download it anytime.
            </p>
            <Link href="/courses" className="px-5 py-2.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-blue-500 to-orange-500 hover:from-blue-600 hover:to-orange-600 transition-all duration-200 shadow-md hover:shadow-lg no-underline">
              Start Learning
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {list.map((order, i) => {
              const meta = statusMeta[order.status] ?? statusMeta.CREATED;
              return (
                <div key={order.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden" style={animate ? { animation: `fadeUp .4s ${Math.min(0.18 * i, 0.6)}s ease both` } : {}}>
                  {/* Header */}
                  <div className="px-5 py-3.5 border-b border-[var(--border)] bg-[var(--bg)]/50 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-lg bg-gradient-to-br from-blue-500/10 to-orange-500/10 border border-[var(--border)] flex items-center justify-center">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--blue2)]"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
                      </div>
                      <div>
                        <div className="font-mono text-[12px] font-bold text-[var(--text)]">{orderNumber(order.id)}</div>
                        <div className="text-[10.5px] text-[var(--text3)]">{formatDate(order.createdAt)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${meta.cls}`}>{meta.label}</span>
                      <div className="text-[15px] font-extrabold text-[var(--text)]">{money(order.totalAmount, order.currency)}</div>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-5">
                    <div className="space-y-2.5">
                      {order.items.map((item) => (
                        <div key={item.course.id} className="flex items-center gap-3">
                          {item.course.thumbnailUrl ? (
                            <img src={item.course.thumbnailUrl} alt={item.course.title} className="size-11 rounded-lg object-cover border border-[var(--border)] shrink-0" />
                          ) : (
                            <div className="size-11 rounded-lg bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center shrink-0">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--muted)]"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <button
                              onClick={() => goToCourse(item.course.title)}
                              className="block text-[13px] font-semibold text-[var(--text)] hover:text-[var(--blue2)] transition-colors text-left border-none bg-transparent p-0 cursor-pointer truncate w-full"
                            >
                              {item.course.title}
                            </button>
                            <div className="text-[11px] text-[var(--text3)]">Purchased at {money(item.priceAtPurchase, order.currency)}</div>
                          </div>
                        </div>
                      ))}
                      {order.discountAmount > 0 && (
                        <div className="flex items-center gap-2 pt-2 text-[11px] text-[var(--muted)] border-t border-dashed border-[var(--border2)]">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-600"><path d="M20 12 8 12 10 9M8 12l2 3" /></svg>
                          Coupon {order.couponId ? `(${order.couponId.slice(0, 10)})` : "applied"} · saved {money(order.discountAmount, order.currency)}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col justify-center gap-2.5 lg:min-w-[200px]">
                      <button
                        onClick={() => handleDownload(order)}
                        disabled={downloading === order.id || order.status !== "PAID"}
                        title={order.status !== "PAID" ? "Invoice available once payment is completed" : "Download tax invoice (PDF)"}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-blue-500 to-orange-500 hover:from-blue-600 hover:to-orange-600 active:scale-[0.97] transition-all duration-200 shadow-md hover:shadow-lg cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                      >
                        {downloading === order.id ? (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                        )}
                        {downloading === order.id ? "Preparing…" : order.status === "PAID" ? "Download Invoice" : "Invoice Unavailable"}
                      </button>
                      {order.items.length > 0 && (
                        <button
                          onClick={() => router.push("/my-dashboard")}
                          className="px-4 py-2 rounded-lg text-xs font-semibold text-[var(--text2)] bg-[var(--bg)] border border-[var(--border2)] hover:border-[var(--blue)] hover:text-[var(--blue)] transition-all duration-200 cursor-pointer"
                        >
                          Go to Course
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
