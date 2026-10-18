"use client";

import { useEffect, useRef, useState } from "react";
import { Btn, Field, Input, Out, Panel, Select, type SectionProps } from "./ui";

/* ───────────── Popups ───────────── */

type DialogKind = "simple" | "confirm" | "prompt";

export function PopupsSection({ bug }: SectionProps) {
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState("No dialog handled yet");
  const [toast, setToast] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const messages: Record<DialogKind, string> = {
    simple: "This is a simple popup.",
    confirm: "Do you want to continue?",
    prompt: "What is your name?",
  };
  const open = (k: DialogKind) => {
    if (k === "prompt" && bug) return; // defect: the prompt never shows
    setAnswer("");
    setDialog(k);
  };
  const close = (ok: boolean) => {
    if (dialog === "simple") setResult("Popup accepted");
    if (dialog === "confirm") setResult(ok ? "Confirm accepted" : "Confirm cancelled");
    if (dialog === "prompt") setResult(ok ? `Hello, ${answer || "stranger"}` : "Prompt cancelled");
    setDialog(null);
  };

  return (
    <div className="relative space-y-3">
      <Panel title="Popups">
        <div className="flex flex-wrap gap-3">
          <Btn id="simplePopup" onClick={() => open("simple")}>Simple popup</Btn>
          <Btn id="confirmPopup" variant="ghost" onClick={() => open("confirm")}>Confirm</Btn>
          <Btn id="promptPopup" variant="ghost" onClick={() => open("prompt")}>Prompt</Btn>
        </div>
        <div className="mt-3"><Out id="popupResult">{result}</Out></div>
      </Panel>

      <Panel title="Toast notification">
        <Btn
          id="showToast"
          onClick={() => {
            setToast(true);
            window.clearTimeout(timer.current);
            timer.current = window.setTimeout(() => setToast(false), 3500);
          }}
        >
          Show toast
        </Btn>
        <div className="mt-3 min-h-[44px]">
          {toast && <div id="toast" data-testid="toast" role="status" className="inline-flex items-center gap-2 rounded-lg bg-[var(--green)] px-4 py-2 text-sm font-semibold text-white shadow">Saved successfully!</div>}
        </div>
      </Panel>

      {dialog && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-black/40 p-4">
          <div data-testid="dialog" role="dialog" className="w-full max-w-sm rounded-xl border border-[var(--border2)] bg-[var(--surface)] p-5 shadow-2xl">
            <p className="text-sm font-semibold">{messages[dialog]}</p>
            {dialog === "prompt" && (
              <input data-testid="dialog-input" value={answer} onChange={(e) => setAnswer(e.target.value)} className="mt-3 h-9 w-full rounded-lg border border-[var(--border2)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--orange)]" />
            )}
            <div className="mt-4 flex justify-end gap-2">
              {dialog !== "simple" && <Btn data-testid="dialog-cancel" variant="ghost" onClick={() => close(false)}>Cancel</Btn>}
              <Btn data-testid="dialog-accept" onClick={() => close(true)}>OK</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────── Advanced ───────────── */

function ShadowDemo() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const root = el.shadowRoot ?? el.attachShadow({ mode: "open" });
    root.innerHTML =
      '<style>:host{display:block}input,button{font:inherit;padding:6px 10px;border-radius:8px;border:1px solid #cbd5e1}button{cursor:pointer;background:#111827;color:#fff;border-color:#111827;margin-left:8px}span{display:block;margin-top:8px;font-weight:600;color:#16a34a}</style>' +
      '<input id="shadowInput" placeholder="Type inside shadow DOM"><button id="shadowBtn" type="button">Greet</button><span id="shadowOut"></span>';
    const input = root.getElementById("shadowInput") as HTMLInputElement;
    const out = root.getElementById("shadowOut") as HTMLElement;
    root.getElementById("shadowBtn")?.addEventListener("click", () => {
      out.textContent = `Hello, ${input.value}`;
    });
  }, []);
  return <div ref={host} id="shadowHost" data-testid="shadowHost" />;
}

export function AdvancedSection({ bug }: SectionProps) {
  const [file, setFile] = useState("");
  const [uploaded, setUploaded] = useState("No file uploaded");
  const [dropped, setDropped] = useState(false);
  const [pct, setPct] = useState(0);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearInterval(timer.current), []);

  return (
    <div className="grid gap-3 @2xl:grid-cols-2">
      <Panel title="File upload">
        <div className="space-y-3">
          <input id="fileUpload" data-testid="fileUpload" type="file" onChange={(e) => setFile(e.target.files?.[0]?.name ?? "")} className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--btn-bg)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[var(--btn-text)]" />
          <Btn id="uploadBtn" disabled={!file} onClick={() => setUploaded(`Uploaded: ${file}`)}>Upload</Btn>
          <Out id="uploadResult">{uploaded}</Out>
        </div>
      </Panel>

      <Panel title="Drag & drop">
        <div className="flex flex-wrap items-center gap-4">
          <div id="dragItem" data-testid="dragItem" draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", "item")} className="cursor-grab rounded-lg bg-[var(--orange)] px-4 py-2 text-sm font-bold text-white">Drag me</div>
          <div
            id="dropZone"
            data-testid="dropZone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); if (!bug) setDropped(true); }}
            className={`flex h-16 min-w-[160px] flex-1 items-center justify-center rounded-lg border-2 border-dashed text-sm font-semibold ${dropped ? "border-[var(--green)] bg-[var(--green-d)] text-[var(--green)]" : "border-[var(--border2)] text-[var(--muted)]"}`}
          >
            {dropped ? "Dropped: Drag me" : "Drop here"}
          </div>
        </div>
      </Panel>

      <Panel title="Shadow DOM">
        <ShadowDemo />
      </Panel>

      <Panel title="Progress bar">
        <Btn
          id="startProgress"
          onClick={() => {
            window.clearInterval(timer.current);
            setPct(0);
            let p = 0;
            timer.current = window.setInterval(() => {
              p = Math.min(100, p + 4);
              setPct(p);
              if (p >= 100) window.clearInterval(timer.current);
            }, 100);
          }}
        >
          Start
        </Btn>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-[var(--border)]">
          <div id="progressBar" data-testid="progressBar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className="h-full rounded-full bg-[var(--orange)] transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div id="progressLabel" data-testid="progressLabel" className="mt-1 text-sm font-bold tabular-nums">{pct}%</div>
      </Panel>
    </div>
  );
}

/* ───────────── Shopping ───────────── */

const PRODUCTS = [
  { slug: "laptop-stand", name: "Laptop Stand", price: 1499, cat: "Accessories" },
  { slug: "wireless-mouse", name: "Wireless Mouse", price: 799, cat: "Accessories" },
  { slug: "keyboard", name: "Keyboard", price: 2499, cat: "Accessories" },
  { slug: "usb-hub", name: "USB Hub", price: 999, cat: "Accessories" },
  { slug: "webcam", name: "Webcam", price: 1899, cat: "Accessories" },
  { slug: "notebook", name: "Notebook", price: 199, cat: "Stationery" },
];

export function ShoppingSection({ bug }: SectionProps) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("All");
  const [cart, setCart] = useState<Record<string, number | "">>({});
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [couponMsg, setCouponMsg] = useState("");
  const [ordered, setOrdered] = useState(false);

  const shown = PRODUCTS.filter((p) => (cat === "All" || p.cat === cat) && p.name.toLowerCase().includes(query.trim().toLowerCase()));
  const lines = PRODUCTS.filter((p) => p.slug in cart);
  const count = lines.reduce((n, p) => n + (Number(cart[p.slug]) || 0), 0);
  const subtotal = lines.reduce((n, p) => n + p.price * (Number(cart[p.slug]) || 0), 0);
  const total = Math.round(subtotal * (1 - discount));

  return (
    <div className="grid gap-3 @2xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="space-y-3">
        <div className="grid gap-2.5 @md:grid-cols-2">
          <Input id="productSearch" placeholder="Search products" value={query} onChange={(e) => setQuery(e.target.value)} />
          <Select id="category" value={cat} onChange={(e) => setCat(e.target.value)}>
            <option>All</option>
            <option>Accessories</option>
            <option>Stationery</option>
          </Select>
        </div>
        <div className="grid gap-2.5 @md:grid-cols-2">
          {shown.map((p) => (
            <div key={p.slug} data-testid={`product-${p.slug}`} className="product-card flex items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
              <div>
                <div className="text-sm font-bold">{p.name}</div>
                <div className="text-xs text-[var(--muted)]">₹{p.price}</div>
              </div>
              <Btn id={`add-${p.slug}`} className="add-to-cart h-8 px-3 text-xs" onClick={() => { setOrdered(false); setCart((c) => ({ ...c, [p.slug]: (Number(c[p.slug]) || 0) + 1 })); }}>Add</Btn>
            </div>
          ))}
          {shown.length === 0 && <p className="text-sm text-[var(--muted)]">No products match.</p>}
        </div>
      </div>

      <Panel title="Cart">
        <div className="mb-2 text-xs text-[var(--muted)]">Items: <b id="cartCount" data-testid="cartCount" className="text-[var(--text)]">{count}</b></div>
        <ul id="cartItems" data-testid="cartItems" className="space-y-2">
          {lines.map((p) => (
            <li key={p.slug} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate">{p.name}</span>
              <input id={`qty-${p.slug}`} data-testid={`qty-${p.slug}`} type="number" min={0} value={cart[p.slug]} onChange={(e) => setCart((c) => ({ ...c, [p.slug]: e.target.value === "" ? "" : Math.max(0, Number(e.target.value)) }))} className="h-8 w-16 rounded-lg border border-[var(--border2)] bg-[var(--surface)] px-2 text-sm" />
            </li>
          ))}
        </ul>
        <div className="mt-3 flex gap-2">
          <Input id="coupon" placeholder="Coupon code" value={code} onChange={(e) => setCode(e.target.value)} />
          <Btn
            id="applyCoupon"
            variant="ghost"
            onClick={() => {
              if (!bug && code.trim().toUpperCase() === "FUTURE10") {
                setDiscount(0.1);
                setCouponMsg("Coupon applied: 10% off");
              } else {
                setDiscount(0);
                setCouponMsg("Invalid coupon");
              }
            }}
          >
            Apply
          </Btn>
        </div>
        {couponMsg && <div id="couponMsg" data-testid="couponMsg" className="mt-2 text-xs font-semibold text-[var(--text2)]">{couponMsg}</div>}
        <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-3 text-sm font-bold">
          Total <span id="orderTotal" data-testid="orderTotal">₹{total}</span>
        </div>
        <Btn id="checkoutBtn" className="mt-3 w-full" disabled={count === 0} onClick={() => setOrdered(true)}>Checkout</Btn>
        {ordered && <div className="mt-3"><Out id="orderSuccess" tone="ok">Order placed! Thank you.</Out></div>}
      </Panel>
    </div>
  );
}

/* ───────────── Practice Lab ───────────── */

export function LabSection({ bug }: SectionProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [plan, setPlan] = useState("");
  const [done, setDone] = useState(false);

  const [calOpen, setCalOpen] = useState(false);
  const [day, setDay] = useState(0);

  const [gen, setGen] = useState(0);
  const [stale, setStale] = useState("Idle");
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const [popup, setPopup] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState("");

  const nextDisabled = step === 1 ? !name : bug || !plan;

  return (
    <div className="relative grid gap-3 @2xl:grid-cols-2">
      <Panel title={`Wizard — step ${step} of 3`}>
        {done ? (
          <Out id="wizDone" tone="ok">Wizard completed!</Out>
        ) : (
          <div className="space-y-3">
            {step === 1 && <Field label="Your name" htmlFor="wizName"><Input id="wizName" value={name} onChange={(e) => setName(e.target.value)} /></Field>}
            {step === 2 && (
              <Field label="Plan" htmlFor="wizPlan">
                <Select id="wizPlan" value={plan} onChange={(e) => setPlan(e.target.value)}>
                  <option value="">Choose a plan</option>
                  <option>Basic</option>
                  <option>Pro</option>
                </Select>
              </Field>
            )}
            {step === 3 && <Out id="wizReview">{name} · {plan}</Out>}
            <div className="flex gap-2">
              {step < 3 ? (
                <Btn id="wizNext" disabled={nextDisabled} onClick={() => setStep(step + 1)}>Next</Btn>
              ) : (
                <Btn id="wizSubmit" onClick={() => setDone(true)}>Submit</Btn>
              )}
            </div>
          </div>
        )}
      </Panel>

      <Panel title="Custom date picker">
        <div className="space-y-2">
          <Btn id="dateTrigger" variant="ghost" onClick={() => setCalOpen((o) => !o)}>📅 Pick a date</Btn>
          {calOpen && (
            <div id="calendar" data-testid="calendar" className="grid max-w-xs grid-cols-7 gap-1 rounded-lg border border-[var(--border2)] bg-[var(--surface)] p-2">
              {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => (
                <button key={d} data-testid={`day-${d}`} type="button" onClick={() => { setDay(d); setCalOpen(false); }} className={`h-8 rounded text-xs font-semibold hover:bg-[var(--orange-d)] ${day === d ? "bg-[var(--orange)] text-white" : ""}`}>{d}</button>
              ))}
            </div>
          )}
          <Out id="pickedDate">{day ? `Picked: ${day} Oct 2026` : "No date picked"}</Out>
        </div>
      </Panel>

      <Panel title="Element that re-renders">
        <div className="flex flex-wrap items-center gap-3">
          <Btn
            id="staleBtn"
            onClick={() => {
              setStale("Working…");
              timer.current = window.setTimeout(() => { setGen((g) => g + 1); setStale("Re-rendered"); }, 900);
            }}
          >
            Refresh section
          </Btn>
          <Btn key={gen} id="staleTarget" variant="ghost" onClick={() => setStale("Fresh element clicked")}>Target #{gen}</Btn>
          <Out id="staleStatus">{stale}</Out>
        </div>
      </Panel>

      <Panel title="Popup & forgot password">
        <div className="space-y-3">
          <Btn id="openPopup" variant="ghost" onClick={() => setPopup(true)}>Open popup</Btn>
          <div>
            <button id="forgotLink" data-testid="forgotLink" type="button" className="text-sm font-semibold text-[var(--blue)] underline" onClick={() => setForgot((f) => !f)}>Forgot password?</button>
            {forgot && (
              <div className="mt-2 flex flex-wrap gap-2">
                <Input id="fpEmail" type="email" placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} className="max-w-[240px]" />
                <Btn id="fpSend" onClick={() => setSent(`Reset link sent to ${email}`)}>Send link</Btn>
              </div>
            )}
            {sent && <div className="mt-2"><Out id="fpMsg" tone="ok">{sent}</Out></div>}
          </div>
        </div>
      </Panel>

      {popup && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-black/40 p-4">
          <div id="popup" data-testid="popup" role="dialog" className="w-full max-w-sm rounded-xl border border-[var(--border2)] bg-[var(--surface)] p-5 shadow-2xl">
            <h4 className="font-bold">Newsletter popup</h4>
            <p className="mt-1 text-sm text-[var(--text2)]">Join thousands of learners getting weekly QA tips.</p>
            <div className="mt-4 flex justify-end"><Btn id="popupClose" onClick={() => setPopup(false)}>Close</Btn></div>
          </div>
        </div>
      )}
    </div>
  );
}
