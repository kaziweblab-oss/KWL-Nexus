import type { Metadata } from "next";
import { BrandThemeProvider } from "@/components/shared/BrandThemeProvider";
import { Header } from "@/components/shared/Header";
import { SessionProvider } from "@/components/shared/SessionProvider";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import { LanguageProvider } from "@/components/shared/LanguageProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { Footer } from "@/components/ui/Footer";
import "./globals.css";

export const metadata: Metadata = {
  // Use the deployed URL when configured so OG/canonical URLs never fall back to localhost.
  ...(process.env.NEXTAUTH_URL ? { metadataBase: new URL(process.env.NEXTAUTH_URL) } : {}),
  title: "KWL NEXUS Store",
  description: "Discover the next generation of productivity apps. Where Innovation Meets Connection.",
  manifest: "/manifest.json",
  openGraph: {
    title: "KWL NEXUS Store",
    description: "Discover, download, and deploy useful apps. Where Innovation Meets Connection.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "KWL NEXUS" }],
  },
  icons: {
    icon: [
      { url: "/branding/favicons/kwl-nexus-favicon.svg", type: "image/svg+xml" },
      { url: "/branding/favicons/kwl-nexus-favicon.ico", sizes: "any", type: "image/x-icon" },
      { url: "/branding/favicons/kwl-nexus-favicon.png", sizes: "16x16", type: "image/png" },
      { url: "/branding/favicons/kwl-nexus-favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/branding/favicons/kwl-nexus-favicon.png", sizes: "512x512", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico", sizes: "any", type: "image/x-icon" }
    ],
    apple: [{ url: "/branding/app-icons/kwl-nexus-app-icon-rounded.png", sizes: "1024x1024", type: "image/png" }],
    shortcut: "/branding/favicons/kwl-nexus-favicon.ico"
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <SessionProvider>
          <ThemeProvider>
            <LanguageProvider>
              <BrandThemeProvider>
                <ToastProvider>
                  <Header />
                  {children}
                  <Footer />
                </ToastProvider>
              </BrandThemeProvider>
            </LanguageProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
