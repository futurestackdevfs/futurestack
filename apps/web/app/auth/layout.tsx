import * as React from "react"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-linear-to-b from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 transition-all">

      {/* Main content - Centered */}
      <div className="flex-1 flex items-center justify-center w-full">
        {children}
      </div>

    </div>
  )
}

