"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)

  // Validation states
  const [emailError, setEmailError] = React.useState("")
  const [passwordError, setPasswordError] = React.useState("")
  const [successMessage, setSuccessMessage] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)

  const validateEmail = (value: string) => {
    if (!value) {
      return "Email is required"
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) {
      return "Please enter a valid email address"
    }
    return ""
  }

  const validatePassword = (value: string) => {
    if (!value) {
      return "Password is required"
    }
    if (value.length < 6) {
      return "Password must be at least 6 characters"
    }
    return ""
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const eError = validateEmail(email)
    const pError = validatePassword(password)

    setEmailError(eError)
    setPasswordError(pError)

    if (eError || pError) {
      setSuccessMessage("")
      return
    }

    setIsLoading(true)
    setSuccessMessage("")

    // Simulate login delay
    setTimeout(() => {
      setIsLoading(false)
      console.log("Login submitted successfully:", {
        email,
        password,
      })
      setSuccessMessage("Logged in successfully! (Mock)")
    }, 1000)
  }

  return (
    <div className="w-full max-w-4xl h-auto min-h-[400px] max-h-[90vh] md:h-[580px] flex flex-col md:grid md:grid-cols-2 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-2xl bg-white dark:bg-gray-900 transition-all bg-grid-pattern">
      
      {/* Left Column: Login Form */}
      <div className="flex flex-col p-4 sm:p-6 lg:p-10 animate-slide-in-left overflow-y-auto scrollbar-none flex-1 min-h-0">
        
        {/* Animated Sliding Tab Switcher */}
        <div className="relative flex rounded-full bg-gray-100 dark:bg-gray-800/60 p-1 w-full max-w-[200px] mx-auto shadow-inner flex-shrink-0">
          <div className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full bg-white dark:bg-gray-950 shadow-xs transition-all duration-300 ease-out" />
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="z-10 flex-1 py-2 text-xs font-semibold text-center text-foreground cursor-pointer rounded-full transition-colors"
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => router.push("/register")}
            className="z-10 flex-1 py-2 text-xs font-medium text-center text-muted-foreground hover:text-foreground cursor-pointer rounded-full transition-colors"
          >
            Sign Up
          </button>
        </div>

        <div className="space-y-3 sm:space-y-4 mt-2 sm:mt-4">
          <div className="space-y-0.5 sm:space-y-1 text-center md:text-left">
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              Welcome back
            </h1>
            <p className="text-[11px] sm:text-xs text-muted-foreground">
              Enter your credentials to access your FutureStack dashboard
            </p>
          </div>

          {/* Social login option */}
          <Button
            type="button"
            variant="outline"
            onClick={() => console.log("Google Sign In clicked")}
            className="w-full flex items-center justify-center space-x-2 py-3.5 sm:py-5 font-semibold text-[11px] sm:text-xs border-gray-200 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800 transition-all rounded-xl cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69a5.74 5.74 0 0 1-2.49 3.77v3.12h4.01c2.34-2.16 3.69-5.32 3.69-8.74Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-4.01-3.12c-1.12.75-2.55 1.19-3.95 1.19-3.04 0-5.61-2.05-6.53-4.82H1.31v3.2A11.99 11.99 0 0 0 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.47 14.34a7.16 7.16 0 0 1 0-4.68V6.46H1.31a11.99 11.99 0 0 0 0 11.08l4.16-3.2Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42A11.92 11.92 0 0 0 12 .75 11.99 11.99 0 0 0 1.31 6.46l4.16 3.2c.92-2.77 3.49-4.91 6.53-4.91Z"
              />
            </svg>
            <span className="text-gray-700 dark:text-gray-200">Continue with Google</span>
          </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200 dark:border-gray-800" />
            </div>
            <div className="relative flex justify-center text-[9px] sm:text-[10px] uppercase">
              <span className="bg-white dark:bg-gray-900 px-2 sm:px-3 text-muted-foreground font-bold tracking-wider">
                Or continue with email
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-2.5 sm:space-y-3.5">
            {successMessage && (
              <div className="p-2 text-xs text-green-600 bg-green-50 dark:bg-green-950/30 dark:text-green-400 rounded-md border border-green-200 dark:border-green-900/50 text-center font-medium">
                {successMessage}
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-0.5 sm:space-y-1">
              <Label htmlFor="email" className="text-[11px] sm:text-xs">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (e.target.value.includes("@") || emailError) {
                    setEmailError(validateEmail(e.target.value))
                  }
                }}
                onBlur={(e) => {
                  if (e.target.value) {
                    setEmailError(validateEmail(e.target.value))
                  }
                }}
                error={!!emailError}
                autoComplete="email"
                className="py-3.5 sm:py-4.5 px-3 sm:px-3.5 rounded-xl border-gray-200 dark:border-gray-800 text-xs focus-visible:ring-1 focus-visible:ring-offset-0"
              />
              {emailError && (
                <p className="text-[10px] text-red-500 font-semibold mt-0.5">{emailError}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-0.5 sm:space-y-1">
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-[11px] sm:text-xs">Password</Label>
                <Link
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    console.log("Forgot password click logged!")
                  }}
                  className="text-[10px] text-primary font-bold hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (passwordError || e.target.value.length >= 6) {
                      setPasswordError(validatePassword(e.target.value))
                    }
                  }}
                  onBlur={(e) => {
                    if (e.target.value) {
                      setPasswordError(validatePassword(e.target.value))
                    }
                  }}
                  error={!!passwordError}
                  autoComplete="current-password"
                  className="py-3.5 sm:py-4.5 pl-3 sm:pl-3.5 pr-10 sm:pr-11 rounded-xl border-gray-200 dark:border-gray-800 text-xs focus-visible:ring-1 focus-visible:ring-offset-0"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 sm:right-3.5 top-1/2 -trangray-y-1/2 text-muted-foreground hover:text-foreground text-[10px] font-bold select-none cursor-pointer focus:outline-none"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {passwordError && (
                <p className="text-[10px] text-red-500 font-semibold mt-0.5">{passwordError}</p>
              )}
            </div>

            <Button type="submit" disabled={isLoading} className="w-full py-4 sm:py-5 font-semibold text-xs rounded-xl transition-all shadow-xs mt-2 sm:mt-4 cursor-pointer">
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </div>

        <div className="text-center md:text-left mt-auto pt-3 sm:pt-4 flex-shrink-0">
          <p className="text-[11px] sm:text-xs text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/register" className="text-primary font-bold hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>

      {/* Right Column: Visual Sliding Banner */}
      <div className="hidden md:flex relative flex-col justify-between p-8 lg:p-10 overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white animate-slide-in-right">
        
        {/* Floating Background Glow Blobs */}
        <div className="absolute top-1/4 -left-10 w-72 h-72 rounded-full bg-indigo-500/15 blur-3xl animate-float-slow" />
        <div className="absolute bottom-1/4 -right-10 w-72 h-72 rounded-full bg-purple-500/15 blur-3xl animate-float-reverse" />
        
        {/* Abstract dot overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

        {/* Top badge */}
        <div className="z-10 flex items-center space-x-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-full px-3 py-1 self-start">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          <span className="text-[10px] font-semibold text-indigo-200">Elevate Your Skills</span>
        </div>

        {/* Centered Learning Platform Info */}
        <div className="z-10 my-auto max-w-sm space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold tracking-tight leading-tight bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
              Learn Tech & Career Skills
            </h2>
            <p className="text-slate-400 text-xs leading-relaxed">
              FutureStack is an online learning platform for tech and career-focused courses—structured, instructor-led programs featuring:
            </p>
          </div>

          {/* Platform Features List using custom SVGs */}
          <div className="space-y-4 pt-1">
            <div className="flex items-start space-x-3 text-xs">
              <div className="mt-0.5 w-5 h-5 flex items-center justify-center rounded-full bg-indigo-500/20 text-indigo-300 flex-shrink-0">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-slate-100">Video Lessons & Lectures</h4>
                <p className="text-[10px] text-slate-400">Step-by-step guidance from industry experts.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 text-xs">
              <div className="mt-0.5 w-5 h-5 flex items-center justify-center rounded-full bg-indigo-500/20 text-indigo-300 flex-shrink-0">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-slate-100">Hands-on Labs & Coding</h4>
                <p className="text-[10px] text-slate-400">Write code and complete tasks in live sandboxes.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 text-xs">
              <div className="mt-0.5 w-5 h-5 flex items-center justify-center rounded-full bg-indigo-500/20 text-indigo-300 flex-shrink-0">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-slate-100">Verified Certificates</h4>
                <p className="text-[10px] text-slate-400">Validate your achievements for top companies.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 text-xs">
              <div className="mt-0.5 w-5 h-5 flex items-center justify-center rounded-full bg-purple-500/20 text-purple-300 flex-shrink-0">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-slate-100">Live Progress Tracking</h4>
                <p className="text-[10px] text-slate-400">Monitor milestones and study hours automatically.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Info */}
        <div className="z-10 flex justify-between items-center text-[10px] text-slate-400 border-t border-white/5 pt-3">
          <span className="flex items-center space-x-1">
            <span className="text-amber-400">★</span>
            <span className="font-semibold text-slate-300">4.9/5 Student Rating</span>
          </span>
          <span className="font-medium text-slate-300">100% self-paced & flexible</span>
        </div>
      </div>
    </div>
  )
}
