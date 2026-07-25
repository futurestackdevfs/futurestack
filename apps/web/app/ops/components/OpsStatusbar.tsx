"use client";

import { useState, useEffect } from "react";

interface OpsStatusbarProps {
  leftItems?: string[];
  sessionEmail?: string;
}

export function OpsStatusbar({ leftItems = ["SYS_SYNC: OK", "MASTER_DATA: EDITABLE"], sessionEmail = "user@futurestack.in" }: OpsStatusbarProps) {
  const [time, setTime] = useState("");

  useEffect(() => {
    function updateClock() {
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const h = String(d.getHours()).padStart(2, "0");
      const min = String(d.getMinutes()).padStart(2, "0");
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setTime(`${y}-${m}-${day} ${h}:${min} ${tz}`);
    }
    updateClock();
    const interval = setInterval(updateClock, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{ height: 24, background: "var(--panel)", borderTop: "1px solid var(--border)" }}
      className="flex items-center px-3 gap-3.5 font-mono text-[9.5px] shrink-0"
    >
      <div className="flex items-center gap-1">
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--green)" }} />
        SYS_SYNC: OK
      </div>
      <span style={{ color: "var(--border2)" }}>│</span>
      {leftItems.slice(1).map((item, i) => (
        <span key={i}>
          <span>{item}</span>
          <span style={{ color: "var(--border2)", margin: "0 12px" }}>│</span>
        </span>
      ))}
      <div className="ml-auto flex gap-3">
        <span>SESSION: {sessionEmail}</span>
        <span style={{ color: "var(--border2)" }}>│</span>
        <span>{time}</span>
      </div>
    </div>
  );
}
