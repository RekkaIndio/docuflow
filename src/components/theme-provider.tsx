"use client"

import * as React from "react"
// ThemeProvider is now a passthrough, always light theme
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
