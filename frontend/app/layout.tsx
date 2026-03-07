import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { QueryProvider } from "@/providers/QueryProvider"
import "./globals.css"

export const metadata: Metadata = {
  title: "Zenkai",
  description: "Personal AI learning system — challenge, struggle, recovery, mastery.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  )
}
