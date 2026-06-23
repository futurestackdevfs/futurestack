import * as React from "react"
import Link from "next/link"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-screen max-h-screen flex flex-col justify-center sm:justify-between bg-linear-to-b from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 p-3 md:p-4 transition-all overflow-hidden">
      {/* Header with Logo */}
      <div className="flex justify-center pt-2 md:pt-4 flex-shrink-0">
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-md">
            <svg
              className="w-4.5 h-4.5 text-primary-foreground"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">
            Future<span className="text-primary">Stack</span>
          </span>
        </Link>
      </div>

      {/* Main content - Centered */}
      <div className="flex items-center justify-center py-2 px-2 sm:px-4 w-full">
        {children}
      </div>

      {/* Footer */}
      <div className="hidden sm:block text-center pb-2 md:pb-4 flex-shrink-0">
        <p className="text-[10px] md:text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} FutureStack Inc. All rights reserved.
        </p>
      </div>
    </div>
  )
}

