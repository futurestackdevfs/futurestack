"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { loadToken } from "@/app/auth/lib/token-store";
import VdoCipherVideoPlayer from "./VdoCipherVideoPlayer";

interface ProjectVideo {
  id: string;
  title: string;
  durationSeconds: number;
  isCompleted: boolean;
  uniqueSecsWatched: number;
  lastPositionSec: number;
}

interface ProjectCurriculum {
  id: string;
  week: string;
  title: string;
  desc: string;
  order: number;
  videos: ProjectVideo[];
}

interface ProjectProgress {
  projectId: string;
  totalVideos: number;
  completedVideos: number;
  progressPercent: number;
  totalDuration: number;
  watchedDuration: number;
  curriculum: ProjectCurriculum[];
}

interface ProjectDetail {
  id: string;
  name: string;
  image?: string | null;
  shortDesc?: string;
  overview?: string;
  stack?: string[];
  trainer?: {
    name: string;
    careerPath?: string;
    bio?: string;
  } | null;
}

interface Props {
  projectId: string;
  onBack: () => void;
}

function fmtTime(seconds: number): string {
  if (!seconds) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ProjectLearningView({ projectId, onBack }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProjectProgress | null>(null);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [activeVideo, setActiveVideo] = useState<ProjectVideo | null>(null);
  const [activeCurriculumId, setActiveCurriculumId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadToken().then(setToken);
  }, []);

  const fetchProgress = useCallback(async () => {
    if (!token || !projectId) return;
    try {
      const res = await fetch(`/api/student/projects/${projectId}/progress`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProgress(data);

      // Auto-select first incomplete video
      if (!activeVideo) {
        for (const week of data.curriculum) {
          for (const video of week.videos) {
            if (!video.isCompleted) {
              setActiveVideo(video);
              setActiveCurriculumId(week.id);
              return;
            }
          }
        }
        // All completed - select first video
        if (data.curriculum.length > 0 && data.curriculum[0].videos.length > 0) {
          setActiveVideo(data.curriculum[0].videos[0]);
          setActiveCurriculumId(data.curriculum[0].id);
        }
      }
    } catch (e: any) {
      setError(e.message || "Failed to load progress");
    }
  }, [token, projectId, activeVideo]);

  const fetchProject = useCallback(async () => {
    if (!token || !projectId) return;
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProject(data);
    } catch (e: any) {
      setError(e.message || "Failed to load project");
    }
  }, [token, projectId]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([fetchProgress(), fetchProject()])
      .finally(() => setLoading(false));
  }, [token, projectId, fetchProgress, fetchProject]);

  const handleVideoComplete = useCallback(() => {
    // Refresh progress after video completion
    fetchProgress();
  }, [fetchProgress]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3">
        <span className="inline-block w-5 h-5 border-2 border-[var(--border)] border-t-[var(--orange)] rounded-full animate-spin" />
        <span className="text-[13px] text-[var(--muted)]">Loading project...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <div className="text-[14px] text-[var(--red)]">{error}</div>
        <button onClick={onBack} className="text-[12px] text-[var(--orange)] hover:underline cursor-pointer">
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  if (!progress || !project) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <div className="text-[14px] text-[var(--text3)]">Project not found</div>
        <button onClick={onBack} className="text-[12px] text-[var(--orange)] hover:underline cursor-pointer">
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 px-4 py-6">
      {/* Main Content - Video Player */}
      <div className="flex-1 min-w-0">
        {/* Back button */}
        <button
          onClick={onBack}
          className="mb-4 text-[12px] text-[var(--muted)] hover:text-[var(--orange)] cursor-pointer flex items-center gap-1"
        >
          ← Back to Dashboard
        </button>

        {/* Video Player */}
        {activeVideo && (
          <div className="mb-6">
            <VdoCipherVideoPlayer
              videoId={activeVideo.id}
              title={activeVideo.title}
              durationSeconds={activeVideo.durationSeconds}
              isCompleted={activeVideo.isCompleted}
              onComplete={handleVideoComplete}
              type="project"
            />
          </div>
        )}

        {/* Project Info */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-[12px] p-5">
          <h2 className="text-[18px] font-bold text-[var(--text)] mb-2">{project.name}</h2>
          {project.shortDesc && (
            <p className="text-[13px] text-[var(--text2)] leading-[1.6] mb-4">{project.shortDesc}</p>
          )}
          {project.trainer && (
            <div className="flex items-center gap-3 pt-4 border-t border-[var(--border)]">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4db33d] to-[#2d7ef7] flex items-center justify-center text-[14px] font-bold text-white">
                {project.trainer.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="text-[13px] font-semibold text-[var(--text)]">{project.trainer.name}</div>
                {project.trainer.careerPath && (
                  <div className="text-[11px] text-[var(--orange)]">{project.trainer.careerPath}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar - Curriculum */}
      <div className="w-full lg:w-[360px] shrink-0">
        {/* Progress Stats */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-[12px] p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-semibold text-[var(--text)]">Progress</span>
            <span className="text-[14px] font-bold text-[var(--orange)]">{progress.progressPercent}%</span>
          </div>
          <div className="h-[6px] bg-[var(--border)] rounded-full overflow-hidden mb-3">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{
                width: `${progress.progressPercent}%`,
                background: progress.progressPercent >= 100
                  ? "var(--green)"
                  : "linear-gradient(90deg, var(--orange), var(--orange2))",
              }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-[var(--text3)]">
            <span>{progress.completedVideos}/{progress.totalVideos} videos</span>
            <span>{fmtTime(progress.watchedDuration)} / {fmtTime(progress.totalDuration)}</span>
          </div>
        </div>

        {/* Curriculum List */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-[12px] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <span className="text-[13px] font-semibold text-[var(--text)]">Curriculum</span>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            {progress.curriculum.map((week) => {
              const weekCompleted = week.videos.every(v => v.isCompleted);
              return (
                <div key={week.id}>
                  {/* Week Header */}
                  <div className="px-4 py-2.5 bg-[var(--bg)] border-b border-[var(--border)] flex items-center gap-2">
                    <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${weekCompleted ? "bg-[var(--green-d)] text-[var(--green)]" : "bg-[var(--orange-d)] text-[var(--orange)]"}`}>
                      {weekCompleted ? "✓" : week.order + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold text-[var(--text)] truncate">{week.title}</div>
                      <div className="text-[9px] text-[var(--text3)]">{week.week}</div>
                    </div>
                  </div>
                  {/* Videos */}
                  {week.videos.map((video) => {
                    const isActive = activeVideo?.id === video.id;
                    return (
                      <button
                        key={video.id}
                        onClick={() => {
                          setActiveVideo(video);
                          setActiveCurriculumId(week.id);
                        }}
                        className={`w-full text-left px-4 py-2.5 flex items-center gap-2.5 border-b border-[var(--border)] last:border-b-0 transition-colors cursor-pointer ${
                          isActive ? "bg-[var(--orange-d)]" : "hover:bg-[var(--bg)]"
                        }`}
                      >
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                          video.isCompleted
                            ? "bg-[var(--green)] text-white"
                            : isActive
                              ? "bg-[var(--orange)] text-white"
                              : "bg-[var(--border)] text-[var(--text3)]"
                        }`}>
                          {video.isCompleted ? "✓" : ""}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className={`text-[11px] truncate ${isActive ? "font-semibold text-[var(--orange)]" : "text-[var(--text)]"}`}>
                            {video.title}
                          </div>
                          <div className="text-[9px] text-[var(--text3)]">
                            {fmtTime(video.durationSeconds)}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
