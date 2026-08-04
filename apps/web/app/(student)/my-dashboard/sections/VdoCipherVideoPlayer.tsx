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

interface PlayerData {
  otp: string
  playbackInfo: string
  initialPosition: number
}

interface VdoPlayerLike {
  video: {
    currentTime: number
    duration?: number
    addEventListener: (event: string, cb: () => void) => void
    removeEventListener: (event: string, cb: () => void) => void
  }
}

declare global {
  interface Window {
    VdoPlayer?: {
      getInstance: (iframe: HTMLIFrameElement) => VdoPlayerLike
    }
  }
}

function fmtTime(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

const HEARTBEAT_INTERVAL_MS = 10_000

function clampPosition(sec: number, duration: number): number {
  if (!Number.isFinite(sec)) return 0
  return Math.min(Math.max(0, Math.floor(sec)), duration)
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
  const [playerData, setPlayerData] = useState<PlayerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [position, setPosition] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [started, setStarted] = useState(false)
  const [otpAttempt, setOtpAttempt] = useState(0)

  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const tokenRef = useRef<string | null>(null)
  const positionRef = useRef(0)
  const lastHeartbeatAtRef = useRef(0)
  const lastSentPositionRef = useRef(-1)
  const completedRef = useRef(false)

  useEffect(() => {
    loadToken().then((t) => {
      tokenRef.current = t
      setToken(t)
    })
  }, [])

  /**
   * Persist the student's playback position to the backend.
   *
   * - Normal heartbeats are throttled to one every 10s (matches the player's
   *   'timeupdate' stream, which fires several times per second).
   * - A `force` flush bypasses the throttle and is used for terminal events
   *   (pause, end, unmount, tab hidden / page unloading) so the final position
   *   and completion are never dropped.
   * - `keepalive` lets force-flushes survive navigation/tab close.
   */
  const sendProgressHeartbeat = useCallback(
    async (positionSec: number, opts?: { force?: boolean }) => {
      const authToken = tokenRef.current
      if (!authToken) return

      const clamped = clampPosition(positionSec, durationSeconds)
      if (!opts?.force && clamped <= lastSentPositionRef.current) return

      const now = Date.now()
      if (!opts?.force && now - lastHeartbeatAtRef.current < HEARTBEAT_INTERVAL_MS) return
      lastHeartbeatAtRef.current = now

      try {
        const res = await fetch(`/api/student/videos/${videoId}/progress`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ positionSec: clamped }),
          keepalive: opts?.force ?? false,
        })
        if (!res.ok) return

        const data = await res.json()
        if (clamped > lastSentPositionRef.current) {
          lastSentPositionRef.current = clamped
        }

        if (data.justCompleted && onComplete && !completedRef.current) {
          completedRef.current = true
          onComplete()
        }
      } catch (err) {
        console.warn("Progress heartbeat failed:", err)
      }
    },
    [videoId, durationSeconds, onComplete]
  )

  // Fetches the playback OTP once a token is available (and on Retry).
  // All state updates happen after `await`, so nothing fires synchronously
  // from the effect body.
  useEffect(() => {
    if (!token) return
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(`/api/student/videos/${videoId}/otp`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (cancelled) return

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
        if (cancelled) return
        setPlayerData(data)
        if (data.initialPosition > 0) {
          setPosition(data.initialPosition)
          positionRef.current = data.initialPosition
        }
      } catch {
        if (!cancelled) setError("Failed to load video player. Please try again.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [token, videoId, otpAttempt])

  // Bridge VdoCipher playback events into the heartbeat pipeline using the
  // official VdoPlayer API (https://player.vdocipher.com/v2/api.js), which
  // exposes the iframe's <video> element via VdoPlayer.getInstance(iframe).
  useEffect(() => {
    if (!playerData?.otp || !playerData?.playbackInfo || !started) return

    let cleanup: (() => void) | null = null
    let cancelled = false

    const attach = (): (() => void) | null => {
      if (cancelled) return null
      const iframe = iframeRef.current
      const VdoPlayer = window.VdoPlayer
      if (!iframe || !VdoPlayer) return null

      let instance: VdoPlayerLike
      try {
        instance = VdoPlayer.getInstance(iframe)
      } catch {
        return null
      }
      const video = instance.video
      if (!video) return null

      const onTimeUpdate = () => {
        try {
          const positionSec = clampPosition(video.currentTime, durationSeconds)
          setPosition(positionSec)
          positionRef.current = positionSec
          if (!isCompleted) sendProgressHeartbeat(positionSec)
        } catch {
          // proxy may not be bound yet; ignore until the next tick
        }
      }

      const onPause = () => {
        try {
          sendProgressHeartbeat(video.currentTime, { force: true })
        } catch {
          sendProgressHeartbeat(positionRef.current, { force: true })
        }
      }

      const onEnded = () => {
        let positionSec = durationSeconds
        try {
          positionSec = clampPosition(video.duration ?? durationSeconds, durationSeconds)
        } catch {
          // fall back to the known duration below
        }
        sendProgressHeartbeat(positionSec, { force: true })
        setPlaying(false)
      }

      const onLoadedData = () => {
        setPlaying(true)
        const resumePos = playerData.initialPosition
        if (resumePos > 0) {
          try {
            if (video.currentTime < resumePos) video.currentTime = resumePos
          } catch {
            // proxy not ready yet; resume will be skipped
          }
        }
      }

      video.addEventListener("timeupdate", onTimeUpdate)
      video.addEventListener("pause", onPause)
      video.addEventListener("ended", onEnded)
      video.addEventListener("loadeddata", onLoadedData)

      return () => {
        video.removeEventListener("timeupdate", onTimeUpdate)
        video.removeEventListener("pause", onPause)
        video.removeEventListener("ended", onEnded)
        video.removeEventListener("loadeddata", onLoadedData)
      }
    }

    if (window.VdoPlayer) {
      cleanup = attach()
    } else {
      const script = document.createElement("script")
      script.src = "https://player.vdocipher.com/v2/api.js"
      script.async = true
      script.onload = () => {
        cleanup = attach()
      }
      document.head.appendChild(script)
      cleanup = () => {
        script.remove()
      }
    }

    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [playerData, started, durationSeconds, isCompleted, sendProgressHeartbeat])

  // Fallback send when we've moved >=5s since the last confirmed write
  useEffect(() => {
    if (!playing || isCompleted || completedRef.current) return
    if (position - lastSentPositionRef.current >= 5 || position >= durationSeconds) {
      sendProgressHeartbeat(position)
      onProgress?.(position)
    }
  }, [position, playing, isCompleted, durationSeconds, sendProgressHeartbeat, onProgress])

  // Mark complete as soon as playback reaches the end (force-flushes duration)
  useEffect(() => {
    if (!playing || isCompleted || completedRef.current) return
    if (position >= durationSeconds && durationSeconds > 0) {
      completedRef.current = true
      sendProgressHeartbeat(durationSeconds, { force: true })
      if (onComplete) onComplete()
    }
  }, [position, durationSeconds, isCompleted, playing, onComplete, sendProgressHeartbeat])

  // Flush the latest position on unmount, tab hide, and page unload
  useEffect(() => {
    const flush = () => {
      const current = positionRef.current
      if (current > lastSentPositionRef.current) {
        sendProgressHeartbeat(current, { force: true })
      }
    }
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") flush()
    }
    window.addEventListener("pagehide", flush)
    document.addEventListener("visibilitychange", handleVisibility)
    return () => {
      window.removeEventListener("pagehide", flush)
      document.removeEventListener("visibilitychange", handleVisibility)
      flush()
    }
  }, [sendProgressHeartbeat])

  const progressPct = durationSeconds > 0 ? (position / durationSeconds) * 100 : 0

  const playerSrc =
    playerData?.otp && playerData?.playbackInfo
      ? `https://player.vdocipher.com/v2/?otp=${playerData.otp}&playbackInfo=${playerData.playbackInfo}&autoplay=true`
      : null

  return (
    <div className="relative w-full aspect-[16/9] bg-black overflow-hidden rounded-lg">
      {started ? (
        playerSrc ? (
          <iframe
            ref={iframeRef}
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
              onClick={() => { setError(null); setLoading(true); setOtpAttempt(a => a + 1) }}
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
