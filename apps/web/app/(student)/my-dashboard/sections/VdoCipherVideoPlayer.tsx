"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { loadToken } from "@/app/auth/lib/token-store"

interface VdoCipherVideoPlayerProps {
  videoId: string
  title: string
  durationSeconds: number
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
  isCompleted = false,
  onProgress,
  onComplete,
}: VdoCipherVideoPlayerProps) {
  const [token, setToken] = useState<string | null>(null)
  const [playerData, setPlayerData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [position, setPosition] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [started, setStarted] = useState(false)

  const positionRef = useRef(0)
  const lastSentRef = useRef(0)
  const lastHeartbeatRef = useRef(0)
  const videoReadyRef = useRef(false)

  useEffect(() => {
    loadToken().then(t => {
      setToken(t)
      if (!t) {
        setError("Authentication required")
        setLoading(false)
      }
    })
  }, [])

  const sendProgressHeartbeat = useCallback(async (positionSec: number) => {
    if (!token) return

    const now = Date.now()
    if (now - lastHeartbeatRef.current < 10000) return
    lastHeartbeatRef.current = now

    try {
      const res = await fetch(`/api/student/videos/${videoId}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ positionSec }),
      })

      const data = await res.json()
      lastSentRef.current = positionSec

      if (data.justCompleted && onComplete) {
        onComplete()
      }
    } catch (err) {
      console.warn('Progress heartbeat failed:', err)
    }
  }, [videoId, token, onComplete])

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
        positionRef.current = data.initialPosition
      }
      videoReadyRef.current = true
    } catch {
      setError("Failed to load video player. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [videoId, token])

  useEffect(() => { if (token) getVideoOtp() }, [token, getVideoOtp])

  useEffect(() => {
    if (!playerData?.otp || !playerData?.playbackInfo) return

    const handleMessage = (e: MessageEvent) => {
      if (e.origin !== 'https://player.vdocipher.com') return
      const { event, data } = e.data || {}

      if (event === 'timeupdate') {
        const positionSec = Math.floor(data.currentTime)
        setPosition(positionSec)
        positionRef.current = positionSec
        sendProgressHeartbeat(positionSec)
      }

      if (event === 'ended') {
        const positionSec = Math.floor(data.duration)
        sendProgressHeartbeat(positionSec)
      }

      if (event === 'loadeddata') {
        setPlaying(true)
        const resumePos = playerData.initialPosition
        if (resumePos > 0) {
          const iframe = document.querySelector<HTMLIFrameElement>(`iframe[title="${title}"]`)
          iframe?.contentWindow?.postMessage({ event: 'seek', data: { currentTime: resumePos } }, '*')
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [playerData, sendProgressHeartbeat, title])

  useEffect(() => {
    if (!playing || isCompleted) return
    if (position - lastSentRef.current >= 5 || position >= durationSeconds) {
      sendProgressHeartbeat(position)
      onProgress?.(position)
    }
  }, [position, playing, isCompleted, durationSeconds, sendProgressHeartbeat, onProgress])

  useEffect(() => {
    if (position >= durationSeconds && !isCompleted && playing && videoReadyRef.current) {
      sendProgressHeartbeat(durationSeconds)
      setPlaying(false)
      onComplete?.()
    }
  }, [position, durationSeconds, isCompleted, playing, onComplete, sendProgressHeartbeat])

  useEffect(() => {
    return () => {
      if (positionRef.current > lastSentRef.current) {
        sendProgressHeartbeat(positionRef.current)
      }
    }
  }, [sendProgressHeartbeat])

  const progressPct = durationSeconds > 0 ? (position / durationSeconds) * 100 : 0
  const completed = isCompleted || position >= durationSeconds

  const playerSrc = playerData?.otp && playerData?.playbackInfo
    ? `https://player.vdocipher.com/v2/?otp=${playerData.otp}&playbackInfo=${playerData.playbackInfo}&autoplay=true`
    : null

  return (
    <div className="relative w-full aspect-[16/9] bg-black overflow-hidden rounded-lg">
      {started ? (
        playerSrc ? (
          <iframe
            src={playerSrc}
            style={{ width: '100%', height: '100%', border: 'none' }}
            allow="encrypted-media; autoplay"
            allowFullScreen
            title={title}
          />
        ) : (
          !loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <div className="text-gray-400 text-sm">Loading player...</div>
            </div>
          )
        )
      ) : (
        <div className="absolute inset-0 bg-black flex items-center justify-center cursor-pointer" onClick={() => setStarted(true)}>
          <button
            className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center transition-transform hover:scale-110 border-none cursor-pointer"
            style={{ boxShadow: "0 6px 28px rgba(37,99,235,.55)" }}
          >
            <div className="w-0 h-0 border-solid border-t-[11px] border-b-[11px] border-l-[20px] border-transparent border-l-white ml-[4px]" />
          </button>
          <div className="absolute top-3 left-3 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">
            Start Playing
          </div>
          {position > 0 && (
            <div className="absolute bottom-3 left-3 bg-black/70 text-white text-xs font-mono px-2 py-1 rounded">
              Resume · {fmtTime(position)} / {fmtTime(durationSeconds)}
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800">
            <div className="h-full bg-blue-500 transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      )}

      {loading && !started && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="text-gray-400 text-sm">Loading video...</div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black px-4">
          <div className="text-center">
            <div className="text-red-400 text-sm mb-1">{error}</div>
            <button
              onClick={() => { setError(null); setLoading(true); getVideoOtp() }}
              className="text-xs text-blue-400 underline bg-transparent border-none cursor-pointer"
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
