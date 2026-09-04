"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// next-themes prevents theme preference logic from leaking into server components.
// attribute="class" ensures Tailwind dark mode works; enableSystem respects OS preference.
// disableTransitionOnChange prevents flash; hydration mismatch avoided via html suppressHydrationWarning.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange storageKey="kwl-theme">
      {children}
    </NextThemesProvider>
  );
}
