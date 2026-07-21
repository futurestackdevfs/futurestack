"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { RingIndicator } from "@/components/ui/RingIndicator"
import { useAuth } from "../../hooks/use-auth"

interface VdoCipherVideoPlayerProps {
  videoId: string
  title: string
  durationSeconds: number
  initialPosition?: number
  isCompleted?: boolean
  onProgress?: (positionSec: number) => void
  onComplete?: () => void
}

function fmtTime(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

export default function VdoCipherVideoPlayer({
  videoId,
  title,
  durationSeconds,
  initialPosition = 0,
  isCompleted = false,
  onProgress,
  onComplete,
}: VdoCipherVideoPlayerProps) {
  const { token } = useAuth()
  const [playerData, setPlayerData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [position, setPosition] = useState(initialPosition)
  const [saved, setSaved] = useState(initialPosition)
  const [playing, setPlaying] = useState(false)
  const lastSentRef = useRef(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const positionRef = useRef(0)
  const videoReadyRef = useRef(false)

  const getVideoOtp = useCallback(async () => {
    if (!token) {
      setError("Authentication required")
      return
    }

    try {
      const res = await fetch(`/api/student/videos/${videoId}/otp`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.status === 400) {
        setError("This video is still being processed. Please check back in a few minutes.")
        return
      }
      if (res.status === 403) {
        setError("You are not enrolled in this course.")
        return
      }
      if (!res.ok) throw new Error("Failed to load video")

      const data = await res.json()
      setPlayerData(data)
      videoReadyRef.current = true
    } catch (err) {
      setError("Failed to load video player. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [videoId, token])

  useEffect(() => {
    getVideoOtp()
  }, [getVideoOtp])

  useEffect(() => {
    if (!playerData?.otp || !playerData?.playbackInfo) return

    videoReadyRef.current = true

    const handleMessage = (e: MessageEvent) => {
      if (e.origin !== 'https://player.vdocipher.com') return

      const { event, data } = e.data || {}

      if (event === 'timeupdate') {
        const positionSec = Math.floor(data.currentTime)
        positionRef.current = positionSec
        sendProgressHeartbeat(videoId, positionSec)
      }

      if (event === 'ended') {
        const positionSec = Math.floor(data.duration)
        sendProgressHeartbeat(videoId, positionSec)
      }

      if (event === 'playing') {
        intervalRef.current = setInterval(() => {
          setPosition((prev) => {
            const next = Math.min(prev + 1, durationSeconds)
            return next
          })
        }, 1000)
      }

      if (event === 'pause') {
        if (intervalRef.current) clearInterval(intervalRef.current)
      }

      if (event === 'loadeddata') {
        setPlaying(true)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [playerData])

  const sendProgressHeartbeat = useCallback(async (videoId: string, positionSec: number, token?: string) => {
    const authToken = token || useAuth().token
    if (!authToken) return

    let lastHeartbeat = 0
    const now = Date.now()
    if (now - lastHeartbeat < 10000) return
    lastHeartbeat = now

    try {
      const res = await fetch(`/api/student/videos/${videoId}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ positionSec }),
      })

      const data = await res.json()
      setSaved(positionSec)
      lastSentRef.current = positionSec

      if (data.justCompleted && onComplete) {
        onComplete()
      }
    } catch (err) {
      console.warn('Progress heartbeat failed:', err)
    }
  }, [onComplete])

  const sendProgress = useCallback(
    async (pos: number) => {
      await sendProgressHeartbeat(videoId, pos)
      onProgress?.(pos)
    },
    [videoId, onProgress, sendProgressHeartbeat],
  )

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  useEffect(() => {
    if (playing && !isCompleted && videoReadyRef.current) {
      progressIntervalRef.current = setInterval(() => {
        if (positionRef.current < durationSeconds) {
          setPosition((prev) => {
            const next = Math.min(prev + 1, durationSeconds)
            return next
          })
        }
      }, 1000)

      return () => {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
      }
    }
  }, [playing, isCompleted, durationSeconds])

  useEffect(() => {
    if (!playing || isCompleted) return
    if (position - lastSentRef.current >= 5 || position >= durationSeconds) {
      sendProgress(position)
      onProgress?.(position)
    }
  }, [position, playing, isCompleted, durationSeconds, sendProgress, onProgress])

  useEffect(() => {
    if (position >= durationSeconds && !isCompleted && playing && videoReadyRef.current) {
      sendProgress(durationSeconds)
      setPlaying(false)
      onComplete?.()
    }
  }, [position, durationSeconds, isCompleted, playing, onComplete, sendProgress])

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
      if (position > lastSentRef.current) {
        sendProgress(position)
      }
    }
  }, [sendProgress])

  const progressPct = durationSeconds > 0 ? (position / durationSeconds) * 100 : 0
  const completed = isCompleted || position >= durationSeconds

  if (loading) {
    return (
      <div className="relative w-full aspect-[16/9] bg-black overflow-hidden flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[var(--orange)] border-t-transparent rounded-full animate-spin" />
          <span className="text-[var(--text3)] text-[10px]">Loading video player...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="relative w-full aspect-[16/9] bg-black overflow-hidden flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center px-4">
          <div className="text-3xl">⚠️</div>
          <div className="text-[var(--text)] font-bold text-[12px]">Video Unavailable</div>
          <div className="text-[var(--text3)] text-[10px] max-w-[240px]">{error}</div>
          <button
            onClick={() => {
              setError(null)
              videoReadyRef.current = false
              getVideoOtp()
            }}
            className="px-4 py-2 rounded text-[10px] font-bold bg-gradient-to-r from-[var(--orange)] to-[var(--orange2)] text-white border-none cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!playerData?.otp || !playerData?.playbackInfo) {
    return (
      <div className="relative w-full aspect-[16/9] bg-black overflow-hidden flex items-center justify-center">
        <div className="text-[var(--text3)] text-[10px]">Initializing video player...</div>
      </div>
    )
  }

  const playerSrc = `https://player.vdocipher.com/v2/?otp=${playerData.otp}&playbackInfo=${playerData.playbackInfo}`

  return (
    <div className="relative w-full aspect-[16/9] bg-black overflow-hidden group">
      <iframe
        src={playerSrc}
        style={{ width: '100%', height: '100%', border: 'none' }}
        allow="encrypted-media"
        allowFullScreen
        title={title}
      />

      <div className="absolute top-[10px] left-[10px] z-[2] bg-gradient-to-r from-[var(--orange)] to-[var(--orange2)] text-white text-[8px] font-bold px-[9px] py-[3px] rounded-[4px] uppercase tracking-[.06em]">
        {completed ? "✓ Completed" : playing ? "▶ Now Playing" : "⏸ Paused"}
      </div>

      <div className="absolute bottom-[42px] right-[10px] z-[2] bg-black/65 text-white text-[10px] px-[7px] py-[2px] rounded-[4px]">
        {fmtTime(position)} / {fmtTime(durationSeconds)}
      </div>

      <div className="absolute bottom-[10px] left-[10px] z-[2]">
        <div className="text-white text-[12.5px] font-bold px-[8px] py-[3px] rounded-[4px] bg-black/50">
          {title}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-[4px] bg-white/20 z-[3]">
        <div
          className="h-full bg-gradient-to-r from-[var(--orange)] to-[var(--orange2)] transition-[width] duration-1000"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <RingIndicator
        percentage={progressPct}
        size={24}
        strokeWidth={3}
        color="var(--orange)"
        backgroundColor="rgba(255,255,255,0.1)"
        className="absolute top-[10px] right-[10px] z-[3]"
      />
    </div>
  )
}
