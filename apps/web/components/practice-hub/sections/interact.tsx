"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Btn, Field, Input, Out, Panel, type SectionProps } from "./ui";

/* ───────────── Buttons ───────────── */

export function ButtonsSection({ bug }: SectionProps) {
  const [status, setStatus] = useState("No action yet");
  const [menu, setMenu] = useState(false);
  const [tip, setTip] = useState(false);

  return (
    <div className="space-y-3">
      <Panel title="Mouse actions">
        <div className="flex flex-wrap items-center gap-3">
          <Btn id="singleClick" onClick={() => setStatus("Single click registered")}>Click me</Btn>
          <Btn id="doubleClick" variant="ghost" onDoubleClick={() => !bug && setStatus("Double click registered")}>Double click me</Btn>
          <Btn id="rightClick" variant="ghost" onContextMenu={(e) => { e.preventDefault(); setStatus("Right click registered"); }}>Right click me</Btn>
        </div>
      </Panel>

      <Panel title="Hover, disabled & tooltip">
        <div className="flex flex-wrap items-start gap-6">
          <div className="relative" onMouseEnter={() => setMenu(true)} onMouseLeave={() => setMenu(false)}>
            <Btn id="hoverBtn" variant="ghost">Hover for menu ▾</Btn>
            {menu && (
              <div id="hoverMenu" data-testid="hoverMenu" className="absolute left-0 top-full z-10 w-44 overflow-hidden rounded-lg border border-[var(--border2)] bg-[var(--surface)] shadow-lg">
                <button id="hoverItem1" data-testid="hoverItem1" type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-[var(--bg2)]" onClick={() => setStatus("Menu item 1 selected")}>Menu item 1</button>
                <button id="hoverItem2" data-testid="hoverItem2" type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-[var(--bg2)]" onClick={() => setStatus("Menu item 2 selected")}>Menu item 2</button>
              </div>
            )}
          </div>
          <Btn id="disabledBtn" disabled>Disabled</Btn>
          <div className="relative" onMouseEnter={() => setTip(true)} onMouseLeave={() => setTip(false)}>
            <Btn id="tooltipBtn" variant="ghost">Hover for tooltip</Btn>
            {tip && <div id="tooltipText" data-testid="tooltipText" role="tooltip" className="absolute left-0 top-full z-10 mt-1 whitespace-nowrap rounded-md bg-[var(--btn-bg)] px-2.5 py-1.5 text-xs text-[var(--btn-text)]">Helpful tip: saves your draft</div>}
          </div>
          <a id="nextPageLink" data-testid="nextPageLink" href="#next" className="self-center text-sm font-semibold text-[var(--blue)] underline" onClick={(e) => { e.preventDefault(); setStatus("Navigated to next page"); }}>Next page →</a>
        </div>
      </Panel>
      <Out id="clickStatus">{status}</Out>
    </div>
  );
}

/* ───────────── Tables ───────────── */

interface Emp { id: number; name: string; role: string; salary: number }
const SEED: Emp[] = [
  { id: 1, name: "Aarav", role: "QA Engineer", salary: 54000 },
  { id: 2, name: "Priya", role: "SDET", salary: 78000 },
  { id: 3, name: "Karan", role: "Intern", salary: 32000 },
  { id: 4, name: "Meera", role: "QA Lead", salary: 96000 },
  { id: 5, name: "Rohan", role: "Developer", salary: 68000 },
  { id: 6, name: "Sneha", role: "Analyst", salary: 45000 },
  { id: 7, name: "Vikram", role: "Manager", salary: 110000 },
  { id: 8, name: "Isha", role: "Designer", salary: 52000 },
];
const PAGE = 4;

export function TablesSection({ bug }: SectionProps) {
  const [rows, setRows] = useState(SEED);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"none" | "asc" | "desc">("none");
  const [page, setPage] = useState(1);
  const [sel, setSel] = useState<number[]>([]);
  const [nw, setNw] = useState({ name: "", role: "", salary: "" });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter((r) => !q || `${r.name} ${r.role}`.toLowerCase().includes(q));
    if (sort === "none") return list;
    return [...list].sort((a, b) => (sort === "asc" ? a.salary - b.salary : b.salary - a.salary));
  }, [rows, query, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const cur = Math.min(page, pages);
  const view = filtered.slice((cur - 1) * PAGE, cur * PAGE);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Search" htmlFor="tableSearch" className="w-full @md:w-64">
          <Input id="tableSearch" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Name or role" />
        </Field>
        <span id="selectedCount" data-testid="selectedCount" className="pb-2 text-sm font-semibold text-[var(--text2)]">{sel.length} selected</span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
        <table id="employeeTable" data-testid="employeeTable" className="w-full min-w-[420px] text-left text-sm">
          <thead className="bg-[var(--panel)] text-xs uppercase text-[var(--muted)]">
            <tr>
              <th className="w-10 px-3 py-2">Pick</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Role</th>
              <th
                id="sortSalary"
                data-testid="sortSalary"
                className="cursor-pointer select-none px-3 py-2 hover:text-[var(--orange)]"
                onClick={() => !bug && setSort((s) => (s === "asc" ? "desc" : "asc"))}
              >
                Salary {sort === "asc" ? "▲" : sort === "desc" ? "▼" : "↕"}
              </th>
            </tr>
          </thead>
          <tbody>
            {view.map((r) => (
              <tr key={r.id} className="border-t border-[var(--border)]">
                <td className="px-3 py-2">
                  <input
                    id={`select-row-${r.id}`}
                    data-testid={`select-row-${r.id}`}
                    type="checkbox"
                    checked={sel.includes(r.id)}
                    onChange={() => setSel((p) => (p.includes(r.id) ? p.filter((x) => x !== r.id) : [...p, r.id]))}
                  />
                </td>
                <td className="px-3 py-2 font-semibold">{r.name}</td>
                <td className="px-3 py-2">{r.role}</td>
                <td className="px-3 py-2">₹{r.salary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-3">
        <Btn id="prevPage" variant="ghost" disabled={cur <= 1} onClick={() => setPage(cur - 1)}>← Prev</Btn>
        <span id="pageInfo" data-testid="pageInfo" className="text-sm font-semibold">Page {cur} of {pages}</span>
        <Btn id="nextPage" variant="ghost" disabled={cur >= pages} onClick={() => setPage(cur + 1)}>Next →</Btn>
      </div>
      <Panel title="Add user">
        <div className="grid gap-2.5 @md:grid-cols-4">
          <Input id="newName" placeholder="Name" value={nw.name} onChange={(e) => setNw({ ...nw, name: e.target.value })} />
          <Input id="newRole" placeholder="Role" value={nw.role} onChange={(e) => setNw({ ...nw, role: e.target.value })} />
          <Input id="newSalary" type="number" placeholder="Salary" value={nw.salary} onChange={(e) => setNw({ ...nw, salary: e.target.value })} />
          <Btn
            id="addUser"
            onClick={() => {
              if (!nw.name) return;
              setRows((p) => [...p, { id: p.length + 1, name: nw.name, role: nw.role || "—", salary: Number(nw.salary) || 0 }]);
              setNw({ name: "", role: "", salary: "" });
            }}
          >
            Add user
          </Btn>
        </div>
      </Panel>
    </div>
  );
}

/* ───────────── Dynamic ───────────── */

const FRAME_HTML =
  '<body style="margin:0;padding:12px;font-family:system-ui,sans-serif;font-size:14px"><button id="frameBtn" style="padding:6px 12px;cursor:pointer">Click inside the frame</button><p id="frameMsg" style="margin:8px 0 0;color:#16a34a;font-weight:600"></p></body>';

export function DynamicSection({ bug }: SectionProps) {
  const [items, setItems] = useState<number[]>([]);
  const next = useRef(1);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState(0);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const tabs = ["First tab content", "Second tab content", "Third tab content"];

  return (
    <div className="grid gap-3 @2xl:grid-cols-2">
      <Panel title="Add / remove items">
        <Btn id="addItem" onClick={() => setItems((p) => [...p, next.current++])}>Add item</Btn>
        <ul id="itemList" data-testid="itemList" className="mt-3 space-y-2">
          {items.map((n) => (
            <li key={n} className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm">
              Item {n}
              <button type="button" className="remove-item rounded px-2 text-lg leading-none text-[var(--red)] hover:bg-[var(--red-d)]" aria-label={`Remove item ${n}`} onClick={() => setItems((p) => p.filter((x) => x !== n))}>×</button>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Delayed loading">
        <Btn
          id="loadContent"
          disabled={loading}
          onClick={() => {
            setLoading(true);
            setLoaded(false);
            timer.current = window.setTimeout(() => { setLoading(false); setLoaded(true); }, bug ? 12000 : 2000);
          }}
        >
          Load content
        </Btn>
        <div className="mt-3 min-h-[40px]">
          {loading && <div className="flex items-center gap-2 text-sm text-[var(--muted)]"><span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border2)] border-t-[var(--orange)]" /> Loading…</div>}
          {loaded && <Out id="delayedText" tone="ok">Content loaded!</Out>}
        </div>
      </Panel>

      <Panel title="Tabs">
        <div className="flex gap-1 border-b border-[var(--border)]">
          {["tabOne", "tabTwo", "tabThree"].map((id, i) => (
            <button key={id} id={id} data-testid={id} type="button" onClick={() => setTab(i)} className={`px-4 py-2 text-sm font-semibold ${tab === i ? "border-b-2 border-[var(--orange)] text-[var(--orange)]" : "text-[var(--muted)]"}`}>
              Tab {i + 1}
            </button>
          ))}
        </div>
        <div id="tabPanel" data-testid="tabPanel" className="pt-3 text-sm">{tabs[tab]}</div>
      </Panel>

      <Panel title="Iframe">
        <iframe
          id="demoFrame"
          data-testid="demoFrame"
          title="Practice iframe"
          srcDoc={FRAME_HTML}
          className="h-28 w-full rounded-lg border border-[var(--border2)] bg-white"
          onLoad={(e) => {
            const doc = e.currentTarget.contentDocument;
            doc?.getElementById("frameBtn")?.addEventListener("click", () => {
              const m = doc.getElementById("frameMsg");
              if (m) m.textContent = "Frame button clicked";
            });
          }}
        />
      </Panel>
    </div>
  );
}

/* ───────────── Changing attributes ───────────── */

const ROTATE = ["Pending", "Processing", "Completed"];

export function ChangingSection({ bug }: SectionProps) {
  const [now, setNow] = useState(() => new Date());
  const [count, setCount] = useState(4);
  const [btnId] = useState(() => `btn_${Math.random().toString(36).slice(2, 8)}`);
  const [status, setStatus] = useState("Waiting for a click");
  const [rot, setRot] = useState(0);
  const [link, setLink] = useState(1);

  useEffect(() => {
    const a = window.setInterval(() => setNow(new Date()), 1000);
    const b = window.setInterval(() => setCount((c) => (bug && c <= 3 ? c : Math.max(0, c - 1))), 1000);
    const c = window.setInterval(() => setRot((r) => (r + 1) % ROTATE.length), 1500);
    const d = window.setInterval(() => setLink((n) => n + 1), 2000);
    return () => [a, b, c, d].forEach((t) => window.clearInterval(t));
  }, [bug]);

  return (
    <div className="grid gap-3 @2xl:grid-cols-2">
      <Panel title="Live clock">
        <div id="liveClock" data-testid="liveClock" className="font-mono text-2xl font-bold tabular-nums">{now.toLocaleTimeString()}</div>
      </Panel>
      <Panel title="Countdown">
        <div id="countdown" data-testid="countdown" className="text-2xl font-bold tabular-nums">{count === 0 ? "Done" : count}</div>
      </Panel>
      <Panel title="Rotating status">
        <div id="rotatingStatus" data-testid="rotatingStatus" className="inline-block rounded-full bg-[var(--blue-d)] px-4 py-1.5 text-sm font-bold text-[var(--blue)]">{ROTATE[rot]}</div>
      </Panel>
      <Panel title="Changing id (regenerated on every load)">
        <div className="flex flex-wrap items-center gap-3">
          <button id={btnId} data-testid="changingBtn" type="button" className="h-9 rounded-lg bg-[var(--btn-bg)] px-4 text-sm font-semibold text-[var(--btn-text)]" onClick={() => setStatus(`Clicked button ${btnId}`)}>
            My id is {btnId}
          </button>
          <Out id="changingStatus">{status}</Out>
        </div>
      </Panel>
      <Panel title="Mutating link" className="@2xl:col-span-2">
        <a id="dynamicLink" data-testid="dynamicLink" href={`/item/${link}`} onClick={(e) => e.preventDefault()} className="text-sm font-semibold text-[var(--blue)] underline">
          Item link #{link}
        </a>
        <p className="mt-1 text-xs text-[var(--muted)]">The href changes every 2 seconds but always starts with /item/.</p>
      </Panel>
    </div>
  );
}
