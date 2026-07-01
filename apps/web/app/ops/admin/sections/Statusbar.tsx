"use client";

import { useState, useEffect } from "react";

interface StatusbarProps {
  recordCount: number;
}

export function Statusbar({ recordCount }: StatusbarProps) {
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
      style={{
        height: 24,
        background: "var(--panel)",
        borderTop: "1px solid var(--border)",
      }}
      className="flex items-center px-3 gap-3.5 font-mono text-[9.5px] shrink-0"
    >
      <div className="sb-i flex items-center gap-1">
        <span
          style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--green)" }}
        />
        SYS_SYNC: OK
      </div>
      <span style={{ color: "var(--border2)" }}>│</span>
      <div className="sb-i">RECORDS: {recordCount}</div>
      <span style={{ color: "var(--border2)" }}>│</span>
      <div className="sb-i">MASTER_DATA: EDITABLE</div>
      <div className="ml-auto flex gap-3">
        <div className="sb-i">SESSION: sneha.nair@futurestack.in</div>
        <span style={{ color: "var(--border2)" }}>│</span>
        <div className="sb-i">{time}</div>
      </div>
    </div>
  );
}
