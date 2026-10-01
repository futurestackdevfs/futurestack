"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Roadmap, TopicKind } from "@/lib/roadmap-types";

const TYPE_LABEL: Record<TopicKind, string> = {
  c: "Core topic",
  f: "Future-stack topic",
  o: "Alternative: pick one if your team uses it",
};

const NS = "http://www.w3.org/2000/svg";

interface FlatTopic {
  label: string;
  kind: TopicKind;
  stageIdx: number;
  stageNum: string;
  stageT: string;
  group: string;
}

export interface RoadmapDetailTreeProps {
  roadmap: Roadmap;
  sel: string | null;
  onSelect: (topic: string | null) => void;
  highlight: "all" | "c" | "f";
  linkMode: "sel" | "all";
}

/** Builds the needs/unlocks adjacency and a flat info map once per roadmap. */
function useGraph(roadmap: Roadmap) {
  return useMemo(() => {
    const info: Record<string, FlatTopic> = {};
    const needs: Record<string, string[]> = {};
    const unlocks: Record<string, string[]> = {};
    roadmap.stages.forEach((s, si) => {
      const num = String(si + 1).padStart(2, "0");
      s.g.forEach(([gname, items]) => {
        items.forEach(([label, k]) => {
          info[label] = { label, kind: k, stageIdx: si, stageNum: num, stageT: s.t, group: gname };
        });
      });
    });
    roadmap.rels.forEach(([a, b]) => {
      if (!info[a] || !info[b]) return;
      (unlocks[a] ||= []).push(b);
      (needs[b] ||= []).push(a);
    });
    return { info, needs, unlocks };
  }, [roadmap]);
}

export function RoadmapDetailTree({ roadmap, sel, onSelect, highlight, linkMode }: RoadmapDetailTreeProps) {
  const { info, needs, unlocks } = useGraph(roadmap);
  const treeRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const baseGRef = useRef<SVGGElement>(null);
  const relsGRef = useRef<SVGGElement>(null);
  const nodeEls = useRef<Record<string, HTMLButtonElement | null>>({});
  const stageEls = useRef<Record<number, HTMLDivElement | null>>({});
  const [narrow, setNarrow] = useState(false);

  const box = useCallback((el: Element) => {
    const r = el.getBoundingClientRect();
    const t = treeRef.current!.getBoundingClientRect();
    return {
      l: r.left - t.left, r: r.right - t.left, tp: r.top - t.top, b: r.bottom - t.top,
      cx: (r.left + r.right) / 2 - t.left, cy: (r.top + r.bottom) / 2 - t.top,
    };
  }, []);

  const path = useCallback((g: SVGGElement, d: string, cls: string, marker?: string) => {
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", d);
    p.setAttribute("class", cls);
    if (marker) p.setAttribute("marker-end", `url(#${marker})`);
    g.appendChild(p);
  }, [box]);

  const link = useCallback((a: string, b: string, cls: string, marker: string) => {
    const relsG = relsGRef.current, tree = treeRef.current;
    const A_el = nodeEls.current[a], B_el = nodeEls.current[b];
    if (!relsG || !tree || !A_el || !B_el) return;
    const A = box(A_el), B = box(B_el), mid = tree.clientWidth / 2;
    const aRight = A.cx > mid, bRight = B.cx > mid;
    let x1: number, x2: number, c1: number, c2: number;
    if (aRight === bRight) {
      const bulge = 36 + Math.min(110, Math.abs(B.cy - A.cy) * 0.12);
      if (aRight) { x1 = A.r; x2 = B.r; c1 = c2 = Math.min(Math.max(x1, x2) + bulge, tree.clientWidth - 4); }
      else { x1 = A.l; x2 = B.l; c1 = c2 = Math.max(Math.min(x1, x2) - bulge, 4); }
    } else {
      x1 = aRight ? A.l : A.r; x2 = bRight ? B.l : B.r; c1 = c2 = (x1 + x2) / 2;
    }
    path(relsG, `M${x1},${A.cy} C${c1},${A.cy} ${c2},${B.cy} ${x2},${B.cy}`, cls, marker);
  }, [box, path]);

  const drawRels = useCallback(() => {
    const relsG = relsGRef.current;
    if (!relsG) return;
    relsG.innerHTML = "";
    if (narrow) return;
    if (linkMode === "all") {
      roadmap.rels.forEach(([a, b]) => { if (nodeEls.current[a] && nodeEls.current[b] && a !== sel && b !== sel) link(a, b, "rel-all", "rdM-all"); });
    }
    if (sel) {
      (needs[sel] || []).forEach((a) => link(a, sel, "rel-need", "rdM-need"));
      (unlocks[sel] || []).forEach((b) => link(sel, b, "rel-next", "rdM-next"));
    }
  }, [linkMode, sel, needs, unlocks, roadmap, narrow, link]);

  const drawBase = useCallback(() => {
    const tree = treeRef.current, svg = svgRef.current, baseG = baseGRef.current;
    if (!tree || !svg || !baseG) return;
    svg.setAttribute("width", String(tree.scrollWidth));
    svg.setAttribute("height", String(tree.scrollHeight));
    baseG.innerHTML = "";

    const stageBoxes = roadmap.stages.map((_, i) => (stageEls.current[i] ? box(stageEls.current[i]!) : null));
    for (let i = 0; i < stageBoxes.length - 1; i++) {
      const a = stageBoxes[i], b = stageBoxes[i + 1];
      if (!a || !b) continue;
      const x = narrow ? a.l + 18 : a.cx;
      path(baseG, `M${x},${a.b} L${x},${b.tp}`, "spine" + (roadmap.stages[i + 1].future ? " fut" : ""));
    }

    // branch lines: stage -> each group heading, queried from the DOM (data attrs are numeric/boolean only, safe to select)
    tree.querySelectorAll<HTMLElement>("[data-gnode]").forEach((gh) => {
      const stageIdx = Number(gh.dataset.stage);
      const right = gh.dataset.right === "1";
      const s = stageBoxes[stageIdx];
      if (!s) return;
      const g = box(gh);
      if (narrow) {
        const x = s.l + 18;
        path(baseG, `M${x},${s.b} L${x},${g.cy - 8} Q${x},${g.cy} ${x + 8},${g.cy} L${g.l},${g.cy}`, "branch");
        return;
      }
      const x1 = right ? s.r : s.l, y1 = s.cy, x2 = right ? g.l : g.r, y2 = g.cy, mx = (x1 + x2) / 2;
      path(baseG, `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`, "branch");
    });

    drawRels();
  }, [roadmap, narrow, box, path, drawRels]);

  const layout = useCallback(() => {
    const tree = treeRef.current;
    if (!tree) return;
    const w = tree.clientWidth;
    setNarrow((prev) => {
      const next = w < 860;
      if (next !== prev) requestAnimationFrame(drawBase);
      return next;
    });
  }, [drawBase]);

  useLayoutEffect(() => { drawBase(); }, [drawBase]);

  useEffect(() => {
    const tree = treeRef.current;
    if (!tree) return;
    let raf = 0;
    const redraw = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(layout); };
    const ro = new ResizeObserver(redraw);
    ro.observe(tree);
    window.addEventListener("resize", redraw);
    layout();
    // The stage/group boxes size themselves around 'Syne'/'DM Sans', which load
    // async (see app/layout.tsx's media=print swap trick). If a redraw already
    // ran against the fallback font's metrics, the connecting lines go stale
    // the moment the real font swaps in and box sizes shift — repaint once more
    // when fonts finish, same as the original mockup's `fonts.ready.then(redraw)`.
    let cancelled = false;
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => { if (!cancelled) redraw(); });
    }
    return () => { cancelled = true; ro.disconnect(); window.removeEventListener("resize", redraw); cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roadmap]);

  const selInfo = sel ? info[sel] : null;

  return (
    <div className="rd-tree-wrap">
      <div className={`rd-tree${narrow ? " narrow" : ""}${sel ? " focus" : ""}${highlight !== "all" ? ` hl-${highlight}` : ""}`} ref={treeRef}>
        <svg ref={svgRef} className="rd-links" aria-hidden="true">
          <defs>
            <marker id="rdM-need" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" /></marker>
            <marker id="rdM-next" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" /></marker>
            <marker id="rdM-all" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" /></marker>
          </defs>
          <g ref={baseGRef} /><g ref={relsGRef} />
        </svg>

        <div className="rd-rows">
          {roadmap.stages.map((s, si) => {
            const num = String(si + 1).padStart(2, "0");
            return (
              <div key={si} className={`rd-row${s.future ? " is-future" : ""}`}>
                <div className="rd-side-col left">
                  {s.g.map(([gname, items], gi) => (gi % 2 === 0 ? null : (
                    <Group key={gname} stageIdx={si} gname={gname} items={items} right={false}
                      info={info} needs={needs} unlocks={unlocks} sel={sel}
                      onSelect={onSelect} nodeEls={nodeEls} />
                  )))}
                </div>

                <div className="rd-center">
                  <div className="rd-stage" ref={(el) => { stageEls.current[si] = el; }}>
                    <span className="n">STAGE {num}{s.future ? " · FUTURE STACK" : ""}</span>
                    <span className="t">{s.t}</span>
                  </div>
                  <p className="rd-why">{s.why}</p>
                </div>

                <div className="rd-side-col right">
                  {s.g.map(([gname, items], gi) => (gi % 2 === 0 ? (
                    <Group key={gname} stageIdx={si} gname={gname} items={items} right={true}
                      info={info} needs={needs} unlocks={unlocks} sel={sel}
                      onSelect={onSelect} nodeEls={nodeEls} />
                  ) : null))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {sel && selInfo && (
        <aside className="rm-panel" aria-live="polite">
          <button type="button" className="rm-panel-close" onClick={() => onSelect(null)} aria-label="Close topic details">✕</button>
          <div className="rm-panel-kicker">Stage {selInfo.stageNum} · {selInfo.stageT} · {selInfo.group}</div>
          <h3 className="rm-panel-title">{sel}</h3>
          <div className="rm-panel-type">{TYPE_LABEL[selInfo.kind]}</div>
          <TopicList title="Learn first" cls="need" ids={needs[sel]} onJump={onSelect} nodeEls={nodeEls} empty="Nothing required. You can start here." />
          <TopicList title="Unlocks next" cls="next" ids={unlocks[sel]} onJump={onSelect} nodeEls={nodeEls} empty="End of this branch." />
        </aside>
      )}

      <style jsx global>{`
        .rd-tree-wrap { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 10px 18px 24px; overflow: hidden; }
        .rd-tree { position: relative; }
        .rd-links { position: absolute; left: 0; top: 0; z-index: 0; pointer-events: none; overflow: visible; }
        .rd-rows { position: relative; z-index: 1; }
        .rd-links path { fill: none; }
        .rd-links .spine { stroke: var(--rm-stage-bg); stroke-width: 2.5; }
        .rd-links .spine.fut { stroke: var(--rm-future); stroke-dasharray: 6 5; }
        .rd-links .branch { stroke: var(--rm-line); stroke-width: 2; }
        .rd-links .rel-all { stroke: var(--rm-line); stroke-width: 1.2; stroke-dasharray: 4 4; }
        .rd-links .rel-need { stroke: var(--rm-core); stroke-width: 2; }
        .rd-links .rel-next { stroke: var(--rm-future); stroke-width: 2; }

        .rd-row { position: relative; z-index: 1; display: grid; grid-template-columns: 1fr 220px 1fr; gap: 0 52px; padding-block: 22px; }
        @media (min-width: 1536px) {
          .rd-row { grid-template-columns: 1fr 260px 1fr; gap: 0 72px; }
          .rd-group { max-width: 380px; }
        }
        .rd-side-col { display: flex; flex-direction: column; gap: 20px; min-width: 0; }
        .rd-side-col.left { align-items: flex-end; }
        .rd-side-col.right { align-items: flex-start; }
        .rd-center { display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .rd-stage { width: 100%; background: var(--rm-stage-bg); color: var(--rm-stage-ink); border-radius: 12px; padding: 12px 12px 13px; text-align: center; }
        .rd-stage .n { display: block; font-size: 10.5px; font-weight: 700; letter-spacing: .1em; opacity: .7; margin-bottom: 4px; }
        .rd-stage .t { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 16px; line-height: 1.15; text-wrap: balance; }
        .rd-row.is-future .rd-stage { background: linear-gradient(135deg, var(--orange) 0%, var(--orange2) 100%); color: #fff; }
        .rd-why { position: relative; z-index: 1; font-size: 12px; line-height: 1.45; color: var(--rm-muted); text-align: center; max-width: 220px; background: var(--surface); padding: 2px 4px; border-radius: 6px; }

        .rd-group { display: flex; flex-direction: column; max-width: 310px; }
        .rd-side-col.left .rd-group { align-items: flex-end; }
        .rd-gnode { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 13px; padding: 7px 12px; border-radius: 8px; background: var(--card); border: 2px solid var(--rm-stage-bg); color: var(--text); }
        .rd-row.is-future .rd-gnode { border-color: var(--rm-future); }
        .rd-topics { list-style: none; margin: 0; padding: 6px 0 0; display: flex; flex-direction: column; gap: 5px; }
        .rd-side-col.right .rd-topics { margin-left: 14px; padding-left: 16px; border-left: 2px solid var(--rm-line); }
        .rd-side-col.left .rd-topics { margin-right: 14px; padding-right: 16px; border-right: 2px solid var(--rm-line); align-items: flex-end; }
        .rd-topics li { position: relative; display: flex; }
        .rd-topics li::before { content: ""; position: absolute; top: 50%; width: 14px; border-top: 2px solid var(--rm-line); }
        .rd-side-col.right .rd-topics li::before { left: -16px; }
        .rd-side-col.left .rd-topics li::before { right: -16px; }

        .rd-topic { display: inline-flex; align-items: center; gap: 7px; text-align: left; font-size: 13px; font-weight: 500; line-height: 1.25; color: var(--text); padding: 5px 10px; border-radius: 7px; border: 1px solid transparent; transition: opacity .15s ease, box-shadow .15s ease, transform .15s ease; cursor: pointer; }
        .rd-topic:hover { transform: translateY(-1px); }
        .rd-topic.c { background: var(--rm-core-soft); border-color: color-mix(in srgb, var(--rm-core) 35%, transparent); }
        .rd-topic.f { background: var(--rm-future-soft); border-color: color-mix(in srgb, var(--rm-future) 40%, transparent); }
        .rd-topic.o { background: var(--rm-alt-soft); border: 1px dashed var(--border2); color: var(--rm-text2); }
        .rd-topic .deg { font-size: 10px; font-weight: 700; color: var(--rm-muted); font-variant-numeric: tabular-nums; }
        .rd-topic.sel { box-shadow: 0 0 0 2px var(--text); }
        .rd-topic.need { box-shadow: 0 0 0 2px var(--rm-core); }
        .rd-topic.next { box-shadow: 0 0 0 2px var(--rm-future); }
        .rd-tree.focus .rd-topic:not(.sel):not(.need):not(.next) { opacity: .28; }
        .rd-tree.hl-c .rd-topic:not(.c),
        .rd-tree.hl-f .rd-topic:not(.f) { opacity: .2; }

        .rd-tree.narrow .rd-row { grid-template-columns: 1fr; gap: 12px; padding-block: 16px; }
        .rd-tree.narrow .rd-center { align-items: stretch; order: -1; }
        .rd-tree.narrow .rd-stage { text-align: left; }
        .rd-tree.narrow .rd-why { text-align: left; max-width: none; }
        .rd-tree.narrow .rd-side-col { align-items: flex-start; padding-left: 18px; gap: 16px; }
        .rd-tree.narrow .rd-side-col:empty { display: none; }
        .rd-tree.narrow .rd-side-col.left .rd-group { align-items: flex-start; }
        .rd-tree.narrow .rd-side-col.left .rd-topics { margin-right: 0; padding-right: 0; border-right: 0; margin-left: 14px; padding-left: 16px; border-left: 2px solid var(--rm-line); align-items: flex-start; }
        .rd-tree.narrow .rd-side-col.left .rd-topics li::before { right: auto; left: -16px; }
        .rd-tree.narrow .rd-group { max-width: 100%; }
        .rd-tree.narrow .rd-topic { white-space: normal; }

        .rm-panel { position: fixed; right: 26px; bottom: 92px; z-index: 950; width: 340px; max-width: calc(100vw - 32px); max-height: min(70vh, 560px); overflow: auto; background: var(--card); border: 1px solid var(--border2); border-radius: 14px; box-shadow: var(--shadow-lg); padding: 18px; display: grid; gap: 12px; }
        @media (max-width: 768px) { .rm-panel { left: 12px; right: 12px; bottom: 84px; width: auto; max-height: 55vh; } }
        .rm-panel-close { position: absolute; top: 10px; right: 10px; width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg); color: var(--rm-muted); font-size: 13px; }
        .rm-panel-close:hover { color: var(--text); }
        .rm-panel-kicker { font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--rm-muted); padding-right: 34px; }
        .rm-panel-title { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 20px; line-height: 1.15; padding-right: 30px; text-wrap: balance; margin-top: -6px; color: var(--text); }
        .rm-panel-type { font-size: 12.5px; color: var(--rm-text2); margin-top: -4px; }

        @media (max-width: 768px) { .rd-tree-wrap { padding: 4px 12px 16px; } }
      `}</style>
    </div>
  );
}

function Group({
  stageIdx, gname, items, right, info, needs, unlocks, sel, onSelect, nodeEls,
}: {
  stageIdx: number; gname: string; items: Array<[string, TopicKind]>; right: boolean;
  info: Record<string, FlatTopic>; needs: Record<string, string[]>; unlocks: Record<string, string[]>;
  sel: string | null; onSelect: (t: string | null) => void;
  nodeEls: React.MutableRefObject<Record<string, HTMLButtonElement | null>>;
}) {
  const deg = (label: string) => (needs[label]?.length ?? 0) + (unlocks[label]?.length ?? 0);
  return (
    <div className="rd-group">
      <div className="rd-gnode" data-gnode data-stage={stageIdx} data-right={right ? "1" : "0"}>{gname}</div>
      <ul className="rd-topics">
        {items.map(([label, k]) => {
          const d = deg(label);
          const isSel = sel === label;
          const isNeed = sel ? (needs[sel] || []).includes(label) : false;
          const isNext = sel ? (unlocks[sel] || []).includes(label) : false;
          return (
            <li key={label}>
              <button
                type="button"
                ref={(el) => { nodeEls.current[label] = el; }}
                className={`rd-topic ${k}${isSel ? " sel" : ""}${isNeed ? " need" : ""}${isNext ? " next" : ""}`}
                aria-label={`${label}. ${TYPE_LABEL[k]}. ${d} related topics.`}
                onClick={() => onSelect(sel === label ? null : label)}
              >
                <span className="txt">{label}</span>
                <span className="deg">{d || ""}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TopicList({
  title, cls, ids, onJump, nodeEls, empty,
}: {
  title: string; cls: "need" | "next"; ids?: string[];
  onJump: (t: string) => void; nodeEls: React.MutableRefObject<Record<string, HTMLButtonElement | null>>; empty: string;
}) {
  return (
    <div className={`rm-plist ${cls}`}>
      <h4 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 7, color: cls === "need" ? "var(--rm-core)" : "var(--rm-future)" }}>
        {title}
      </h4>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {!ids || ids.length === 0 ? (
          <p style={{ fontSize: 12.5, color: "var(--rm-muted)" }}>{empty}</p>
        ) : (
          ids.map((id) => (
            <button
              key={id}
              type="button"
              style={{ fontSize: 12.5, color: "var(--text)", padding: "5px 9px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--bg)" }}
              onClick={() => {
                onJump(id);
                nodeEls.current[id]?.scrollIntoView({ block: "center", behavior: "smooth" });
                nodeEls.current[id]?.focus({ preventScroll: true });
              }}
            >
              {id}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
