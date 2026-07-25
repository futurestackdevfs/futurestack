"use client"

import { useState, useEffect } from "react"

interface RingIndicatorProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  label?: boolean;
  className?: string;
}

export function RingIndicator({
  percentage,
  size = 32,
  strokeWidth = 2,
  color = "var(--orange)",
  backgroundColor = "var(--border)",
  label,
  className,
}: RingIndicatorProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div
      className={`relative inline-block ${className}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          style={{ transition: "stroke-dashoffset 0.35s ease-in-out" }}
        />
      </svg>
      {label && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="text-[8px] font-bold"
            style={{ color: percentage >= 50 ? "white" : color }}
          >
            {Math.round(percentage)}%
          </span>
        </div>
      )}
    </div>
  );
}
