'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/auth/hooks/use-auth';
import { showToast } from '@/lib/toast';
import { userApi, authApi, type UpdateProfilePayload } from '@/app/auth/lib/auth-api';
import Image from 'next/image';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileForm {
  name: string;
  email: string;
  phone: string;
  dob: string;
  city: string;
  qualification: string;
  experience: string;
  careerPath: string;
  skills: string; // comma-separated string for textarea UX
  bio: string;
}

interface Stats {
  enrollmentCount: number;
  certificateCount: number;
}

const emptyForm = (): ProfileForm => ({
  name: '',
  email: '',
  phone: '',
  dob: '',
  city: '',
  qualification: '',
  experience: '',
  careerPath: '',
  skills: '',
  bio: '',
});

// ─── Avatar ────────────────────────────────────────────────────────────────────

function AvatarDisplay({ currentUrl, initials }: { currentUrl?: string | null; initials: string }) {
  const src = currentUrl?.startsWith('http') ? currentUrl : `/api${currentUrl ?? ''}`;
  return (
    <div className="relative shrink-0">
      {currentUrl ? (
        <Image
          src={src}
          alt="Avatar"
          width={80}
          height={80}
          className="size-20 rounded-full object-cover shadow-lg shadow-orange-500/20"
        />
      ) : (
        <div className="size-20 rounded-full bg-gradient-to-br from-blue-500 to-orange-500 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-orange-500/20">
          {initials}
        </div>
      )}
      <span className="absolute -bottom-0.5 -right-0.5 size-4 rounded-full border-[3px] border-[var(--bg)] bg-green-400 shadow-sm" />
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState<ProfileForm>(emptyForm());
  const [stats, setStats] = useState<Stats>({ enrollmentCount: 0, certificateCount: 0 });
  const [avatarUrl, setAvatarUrl] = useState<string | null | undefined>(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [animate, setAnimate] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  useEffect(() => { setAnimate(true); }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/');
  }, [isLoading, isAuthenticated, router]);

  // Fetch real profile from backend
  const fetchProfile = useCallback(async () => {
    if (!user) return;
    setFetchLoading(true);
    try {
      const data = await userApi.getProfile(user.role);
      setAvatarUrl(data.avatarUrl);
      setStats(data.stats);
      setForm({
        name: data.name ?? '',
        email: data.email ?? '',
        phone: data.phone ?? '',
        dob: data.dob ?? '',
        city: data.city ?? '',
        qualification: data.qualification ?? '',
        experience: data.experience?.toLowerCase() ?? '',
        careerPath: data.careerPath ?? '',
        skills: (data.skills ?? []).join(', '),
        bio: data.bio ?? '',
      });
    } catch {
      // Network error — silently fall back to empty form
    } finally {
      setFetchLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && !isLoading) {
      fetchProfile();
    }
  }, [user, isLoading, fetchProfile]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setSaved(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const payload: UpdateProfilePayload = {
        name: form.name || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        dob: form.dob || undefined,
        city: form.city || undefined,
        qualification: form.qualification || undefined,
        // Map lowercase → uppercase enum for backend
        experience: form.experience
          ? (form.experience.toUpperCase() as UpdateProfilePayload['experience'])
          : undefined,
        careerPath: form.careerPath || undefined,
        skills: form.skills
          ? form.skills.split(',').map(s => s.trim()).filter(Boolean)
          : [],
        bio: form.bio || undefined,
      };
      await userApi.updateProfile(user.role, payload);
      // Refresh JWT so name/email changes propagate to auth context & certificates
      try {
        const refreshed = await authApi.refreshToken(user.role);
        if (refreshed?.accessToken) {
          const decoded = JSON.parse(atob(refreshed.accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
          const { saveToken } = await import('@/app/auth/lib/token-store');
          await saveToken(decoded.sub, refreshed.accessToken);
          window.dispatchEvent(new CustomEvent('fs:auth', {
            detail: {
              user: { ...refreshed.user, id: decoded.sub },
              isAuthenticated: true,
              isLoading: false,
            },
          }));
        }
      } catch {
        // If refresh fails, the old token still works — just name/email may be stale until next login
      }
      showToast('Profile saved successfully!');
      router.push('/my-dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save profile';
      showToast(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword() {
    if (!user || resettingPassword) return;
    setResettingPassword(true);
    try {
      await authApi.forgotPassword(user.email);
      showToast('Reset link sent! Check your inbox.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send reset link';
      showToast(msg);
    } finally {
      setResettingPassword(false);
    }
  }

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg)]">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const displayName = form.name || user.name;
  const initials = displayName.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
  const joined = new Date().getFullYear();

  const inputClass = "w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--text)] outline-none transition-all duration-200 focus:border-[var(--blue2)] focus:shadow-[0_0_0_3px_var(--blue-d)] focus:bg-[var(--surface)] placeholder:text-[var(--text3)] hover:border-[var(--border2)]";
  const labelClass = "text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1.5";
  const selectClass = inputClass + " appearance-none cursor-pointer";

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-600/5 via-transparent to-orange-600/5 border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex items-center gap-5" style={animate ? { animation: 'fadeUp .5s ease both' } : {}}>
            <AvatarDisplay currentUrl={avatarUrl} initials={initials} />
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-[var(--text)] truncate">{displayName}</h1>
              <p className="text-sm text-[var(--muted)] mt-0.5">
                {user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase()}
                <span className="mx-2 text-[var(--border2)]">·</span>
                {user.email}
              </p>
              <div className="flex items-center gap-2.5 mt-2.5">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-blue-500/10 to-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900/40">
                  Active
                </span>
                <span className="text-[11px] text-[var(--text3)]">Joined {joined}</span>
              </div>
            </div>
            {/* Real stats */}
            <div className="hidden sm:flex items-center gap-6">
              {fetchLoading ? (
                <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <div className="text-center">
                    <div className="text-lg font-extrabold text-[var(--text)]">{stats.enrollmentCount}</div>
                    <div className="text-[10px] text-[var(--text3)] uppercase tracking-wider">Courses</div>
                  </div>
                  <div className="w-px h-8 bg-[var(--border)]" />
                  <div className="text-center">
                    <div className="text-lg font-extrabold text-[var(--text)]">{stats.certificateCount}</div>
                    <div className="text-[10px] text-[var(--text3)] uppercase tracking-wider">Certificates</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {fetchLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSave}>
            <div style={animate ? { animation: 'fadeUp .35s ease both' } : {}}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main */}
                <div className="lg:col-span-2 space-y-5">
                  {/* Personal Details */}
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg)]/50">
                      <div className="flex items-center gap-2.5">
                        <div className="size-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-500"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                        </div>
                        <h2 className="text-sm font-semibold text-[var(--text)]">Personal Details</h2>
                      </div>
                      <span className="text-[10px] text-[var(--text3)]">6 fields</span>
                    </div>
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Full Name</label>
                        <input
                          type="text"
                          name="name"
                          value={form.name}
                          onChange={handleChange}
                          placeholder="Enter your full name"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Email</label>
                        <input
                          type="email"
                          name="email"
                          value={form.email}
                          onChange={handleChange}
                          placeholder="Enter your email"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Phone</label>
                        <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="+91 98765 43210" className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Date of Birth</label>
                        <input type="date" name="dob" value={form.dob} onChange={handleChange} className={inputClass + ' [color-scheme:var(--color-scheme)]'} />
                      </div>
                      <div>
                        <label className={labelClass}>City</label>
                        <input type="text" name="city" value={form.city} onChange={handleChange} placeholder="e.g. Mumbai, Maharashtra" className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Qualification</label>
                        <input type="text" name="qualification" value={form.qualification} onChange={handleChange} placeholder="e.g. B.Tech Computer Science" className={inputClass} />
                      </div>
                    </div>
                  </div>

                  {/* Learning Details */}
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg)]/50">
                      <div className="flex items-center gap-2.5">
                        <div className="size-7 rounded-lg bg-orange-500/10 flex items-center justify-center">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-500"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
                        </div>
                        <h2 className="text-sm font-semibold text-[var(--text)]">Learning Details</h2>
                      </div>
                      <span className="text-[10px] text-[var(--text3)]">5 fields</span>
                    </div>
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Experience Level</label>
                        <select name="experience" value={form.experience} onChange={handleChange} className={selectClass}>
                          <option value="" disabled>Select experience level</option>
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Career Path</label>
                        <select name="careerPath" value={form.careerPath} onChange={handleChange} className={selectClass}>
                          <option value="" disabled>Select career path</option>
                          <option value="full-stack">Full Stack Developer</option>
                          <option value="frontend">Frontend Developer</option>
                          <option value="backend">Backend Developer</option>
                          <option value="data-scientist">Data Scientist</option>
                          <option value="devops">DevOps Engineer</option>
                          <option value="ai-ml">AI / ML Engineer</option>
                          <option value="cybersecurity">Cybersecurity Specialist</option>
                          <option value="mobile">Mobile Developer</option>
                          <option value="cloud">Cloud Architect</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className={labelClass}>Skills <span className="font-normal normal-case text-[var(--text3)]">(comma separated)</span></label>
                        <textarea name="skills" value={form.skills} onChange={handleChange} rows={2} placeholder="e.g. React, TypeScript, Node.js, Python, AWS" className={inputClass + ' resize-none'} />
                      </div>
                      <div className="md:col-span-2">
                        <label className={labelClass}>Bio</label>
                        <textarea name="bio" value={form.bio} onChange={handleChange} rows={3} placeholder="Tell us a bit about yourself, your goals, and what you're looking to achieve…" className={inputClass + ' resize-none'} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-5">
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-[var(--border)] bg-[var(--bg)]/50">
                      <h2 className="text-sm font-semibold text-[var(--text)]">Profile Summary</h2>
                    </div>
                    <div className="p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[var(--muted)]">Experience</span>
                        <span className="text-sm font-semibold text-[var(--text)] capitalize">{form.experience || 'Not set'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[var(--muted)]">Career Path</span>
                        <span className="text-sm font-semibold text-[var(--text)] capitalize">{form.careerPath?.replace(/-/g, ' ') || 'Not set'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[var(--muted)]">Skills</span>
                        <span className="text-sm font-semibold text-[var(--text)]">
                          {form.skills ? form.skills.split(',').filter(s => s.trim()).length + ' skills' : '0'}
                        </span>
                      </div>
                      {form.skills && (
                        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[var(--border)]">
                          {form.skills.split(',').slice(0, 4).map(s => s.trim()).filter(Boolean).map(skill => (
                            <span key={skill} className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-[var(--bg)] border border-[var(--border)] text-[var(--text)]">{skill}</span>
                          ))}
                          {form.skills.split(',').filter(s => s.trim()).length > 4 && (
                            <span className="px-2 py-0.5 text-[10px] font-medium text-[var(--text3)]">+{form.skills.split(',').filter(s => s.trim()).length - 4}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Real stats card */}
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-[var(--border)] bg-[var(--bg)]/50">
                      <h2 className="text-sm font-semibold text-[var(--text)]">Learning Stats</h2>
                    </div>
                    <div className="p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[var(--muted)]">Enrolled Courses</span>
                        <span className="text-sm font-bold text-[var(--text)]">{stats.enrollmentCount}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[var(--muted)]">Certificates Earned</span>
                        <span className="text-sm font-bold text-[var(--text)]">{stats.certificateCount}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-[var(--border)] bg-[var(--bg)]/50">
                      <h2 className="text-sm font-semibold text-[var(--text)]">Quick Actions</h2>
                    </div>
                    <div className="p-3 space-y-0.5">
                      <button type="button" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--text)] hover:bg-[var(--bg)] transition-all duration-200 cursor-pointer border-none bg-transparent text-left">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--muted)] shrink-0"><circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" /></svg>
                        Resume Learning
                      </button>
                      <button type="button" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--text)] hover:bg-[var(--bg)] transition-all duration-200 cursor-pointer border-none bg-transparent text-left">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--muted)] shrink-0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                        View Certificates
                      </button>
                      <button type="button" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--text)] hover:bg-[var(--bg)] transition-all duration-200 cursor-pointer border-none bg-transparent text-left">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--muted)] shrink-0"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22 6 12 13 2 6" /></svg>
                        Browse Courses
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-5 border-t border-[var(--border)]">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={async () => { await logout(); router.push('/'); }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-[var(--muted)] bg-[var(--bg)] border border-[var(--border)] hover:text-red-500 hover:border-red-300 dark:hover:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-200 cursor-pointer"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                    Sign Out
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  {saved && (
                    <span className="text-xs font-semibold text-green-600 dark:text-green-400 [animation:fadeIn_.2s_ease] flex items-center gap-1">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                      Saved
                    </span>
                  )}
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-blue-500 to-orange-500 hover:from-blue-600 hover:to-orange-600 active:scale-[0.97] transition-all duration-200 shadow-md hover:shadow-lg cursor-pointer border-none disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                    )}
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* Reset Password */}
        <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden" style={animate ? { animation: 'fadeUp .35s ease both' } : {}}>
          <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center gap-2.5 bg-[var(--bg)]/50">
            <div className="size-7 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-500"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-[var(--text)]">Reset Password</h2>
              <p className="text-[11px] text-[var(--text3)] mt-0.5 truncate">We'll email you a secure reset link at {user.email}</p>
            </div>
            <button
              type="button"
              onClick={handleResetPassword}
              disabled={resettingPassword}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 active:scale-[0.97] transition-all duration-200 shadow-md hover:shadow-lg cursor-pointer border-none disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {resettingPassword ? (
                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
              )}
              {resettingPassword ? 'Sending…' : 'Send Reset Link'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
