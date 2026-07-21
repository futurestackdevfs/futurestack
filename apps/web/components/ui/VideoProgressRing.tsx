"use client"

import { useState, useEffect } from "react"

export function VideoProgressRing({
  videoId,
  initialProgress = 0,
  isActive = false,
}: {
  videoId: string;
  initialProgress?: number;
  isActive?: boolean;
}) {
  const [progress, setProgress] = useState(initialProgress)

  useEffect(() => {
    if (!isActive) return

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + 2
      })
    }, 500)

    return () => clearInterval(interval)
  }, [isActive])

  const radius = 20
  const circumference = radius * 2 * Math.PI
  const strokeDashoffset = circumference - (progress / 100) * circumference

  const getColor = () => {
    if (progress >= 100) return "var(--green)"
    if (progress > 80) return "var(--orange2)"
    if (progress > 60) return "var(--orange)"
    return "var(--blue)"
  }

  return (
    <div className="relative inline-block w-10 h-10">
      <svg width="40" height="40" className="transform -rotate-90">
        <circle
          cx="20"
          cy="20"
          r="20"
          stroke="var(--border)"
          strokeWidth="2"
          fill="none"
        />
        <circle
          cx="20"
          cy="20"
          r="20"
          stroke={getColor()}
          strokeWidth="2"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          style={{ transition: "stroke-dashoffset 0.3s ease-in-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[8px] font-bold" style={{ color: progress >= 50 ? "white" : getColor() }}>
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  )
}
