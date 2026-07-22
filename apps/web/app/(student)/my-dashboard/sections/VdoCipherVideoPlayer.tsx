"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { RingIndicator } from "@/components/ui/RingIndicator"
import { loadToken } from "@/app/auth/lib/token-store"

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
  const [token, setToken] = useState<string | null>(null)
  const [playerData, setPlayerData] = useState<any>(null)

  useEffect(() => { loadToken().then(setToken) }, [])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [position, setPosition] = useState(initialPosition)
  const [saved, setSaved] = useState(initialPosition)
  const [playing, setPlaying] = useState(false)
  const [started, setStarted] = useState(false)
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
      if (data.initialPosition > 0) {
        setPosition(data.initialPosition)
        setSaved(data.initialPosition)
      }
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
        setPosition(positionSec)
        positionRef.current = positionSec
        sendProgressHeartbeat(videoId, positionSec)
      }

      if (event === 'ended') {
        const positionSec = Math.floor(data.duration)
        sendProgressHeartbeat(videoId, positionSec)
      }

      if (event === 'pause') {
        if (intervalRef.current) clearInterval(intervalRef.current)
      }

      if (event === 'loadeddata') {
        setPlaying(true)
        if (initialPosition > 0) {
          const iframe = document.querySelector<HTMLIFrameElement>(`iframe[title="${title}"]`)
          iframe?.contentWindow?.postMessage({ event: 'seek', data: { currentTime: initialPosition } }, '*')
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [playerData])

  const sendProgressHeartbeat = useCallback(async (videoId: string, positionSec: number, bearerToken?: string) => {
    const effectiveToken = bearerToken || token
    if (!effectiveToken) return

    let lastHeartbeat = 0
    const now = Date.now()
    if (now - lastHeartbeat < 10000) return
    lastHeartbeat = now

    try {
      const res = await fetch(`/api/student/videos/${videoId}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${effectiveToken}`,
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

  const playerSrc = playerData?.otp && playerData?.playbackInfo
    ? `https://player.vdocipher.com/v2/?otp=${playerData.otp}&playbackInfo=${playerData.playbackInfo}&autoplay=true`
    : null

  const handlePlay = () => {
    setStarted(true)
  }

  return (
    <div className="relative w-full aspect-[16/9] bg-black overflow-hidden">
      {started && playerSrc ? (
        <iframe
          src={playerSrc}
          style={{ width: '100%', height: '100%', border: 'none' }}
          allow="encrypted-media; autoplay"
          allowFullScreen
          title={title}
        />
      ) : null}

      {started && !playerSrc && !loading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="text-[var(--text3)] text-[10px]">Loading player...</div>
        </div>
      ) : null}

      {/* Black bg with play button when not started */}
      {!started && (
        <div className="absolute inset-0 bg-black flex items-center justify-center">
          <button
            onClick={handlePlay}
            className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--orange)] to-[var(--orange2)] flex items-center justify-center transition-transform hover:scale-110 cursor-pointer border-none"
            style={{ boxShadow: "0 6px 28px rgba(240,90,26,.55)" }}
          >
            <div className="w-0 h-0 border-solid border-t-[11px] border-b-[11px] border-l-[20px] border-transparent border-l-white ml-[4px]" />
          </button>
          <div className="absolute top-[10px] left-[10px] bg-gradient-to-r from-[var(--orange)] to-[var(--orange2)] text-white text-[9px] font-bold px-[8px] py-[3px] rounded-[4px]">
            Start Playing
          </div>
        </div>
      )}

    </div>
  )
}
