import * as React from "react"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-linear-to-b from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 p-3 md:p-4 transition-all overflow-hidden">

      {/* Main content - Centered */}
      <div className="flex-1 flex items-center justify-center w-full">
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

