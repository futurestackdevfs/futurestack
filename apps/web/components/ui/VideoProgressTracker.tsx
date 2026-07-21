"use client"

import { useState, useEffect, useRef, useCallback } from "react"

interface CompletedVideo {
  id: string;
  videoId: string;
  userId: string;
  completedAt: string;
}

export function VideoProgressTracker({
  videoId,
  studentId,
  isAuthenticated,
}: {
  videoId: string;
  studentId: string;
  isAuthenticated: boolean;
}) {
  const [progress, setProgress] = useState(0)
  const [isCompleted, setIsCompleted] = useState(false)
  const [completedVideos, setCompletedVideos] = useState<CompletedVideo[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const lastSentRef = useRef(0)

  const pulseIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const sendIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const sendProgress = useCallback(
    (positionSec: number) => {
      if (!isAuthenticated) return

      const now = Date.now()
      const timeSinceLast = now - lastSentRef.current
      if (timeSinceLast < 10000) return

      lastSentRef.current = now

      fetch(`/api/student/videos/${videoId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positionSec }),
      }).then((res) => {
        if (res.ok) {
          res.json().then((data) => {
            if (data.justCompleted) {
              const completedVideo: CompletedVideo = {
                id: crypto.randomUUID(),
                videoId,
                userId: studentId,
                completedAt: new Date().toISOString(),
              }
              setCompletedVideos((prev) => [...prev, completedVideo])
              setIsCompleted(true)
            }
          })
        }
      })
    },
    [videoId, isAuthenticated, studentId]
  )

  useEffect(() => {
    if (!isPlaying) {
      if (pulseIntervalRef.current) clearInterval(pulseIntervalRef.current)
      if (sendIntervalRef.current) clearInterval(sendIntervalRef.current)
      return
    }

    pulseIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setIsCompleted(true)
          clearInterval(sendIntervalRef.current)
          return 100
        }
        return prev + 0.5
      })
    }, 500)

    sendIntervalRef.current = setInterval(() => {
      sendProgress(Math.round(progress))
    }, 10000)

    return () => {
      if (pulseIntervalRef.current) clearInterval(pulseIntervalRef.current)
      if (sendIntervalRef.current) clearInterval(sendIntervalRef.current)
    }
  }, [isPlaying, progress, sendProgress])

  useEffect(() => {
    return () => {
      if (pulseIntervalRef.current) clearInterval(pulseIntervalRef.current)
      if (sendIntervalRef.current) clearInterval(sendIntervalRef.current)
    }
  }, [])

  const getRingColor = () => {
    if (progress >= 100) return "var(--green)"
    if (progress > 80) return "var(--orange2)"
    if (progress > 60) return "var(--orange)"
    return "var(--blue)"
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium" style={{ color: "var(--text)" }}>
          Video Progress
        </div>
        <div className="text-xs" style={{ color: "var(--text3)" }}>
          {completedVideos.length} of {completedVideos.length + 1} videos completed
        </div>
      </div>

      <div className="w-full h-2 bg-[var(--border)] rounded-full overflow-hidden">
        <div
          className="h-full transition-all duration-300 ease-out rounded-full"
          style={{
            width: `${progress}%`,
            background: getRingColor(),
          }}
        />
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1" style={{ color: "var(--text3)" }}>
          <span>⏱</span>
          <span>{Math.round(progress * (100 / 0.5))} seconds watched</span>
        </span>
        <span className="flex items-center gap-1" style={{ color: isCompleted ? "var(--green)" : "var(--text3)" }}>
          {isCompleted ? (
            <>
              <span>✓</span>
              <span>Completed</span>
            </>
          ) : (
            <>
              <span>⏳</span>
              <span>In Progress</span>
            </>
          )}
        </span>
      </div>

      {completedVideos.length > 0 && (
        <div className="text-xs style={{ color: var(--green)" }}>
          Completed videos:
          {completedVideos.map((v) => (
            <span key={v.id} className="ml-2">✓</span>
          ))}
        </div>
      )}
    </div>
  )
}
