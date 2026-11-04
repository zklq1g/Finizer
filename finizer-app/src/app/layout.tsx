import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { ActorProvider } from "@/context/ActorContext";
import { ThemeProvider } from "@/context/ThemeContext";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#5F33E1",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Finizer — Retail Finance & Valuation OS",
  description: "Retail finance ledger, parcel delivery tracking, and profit allocator",
  applicationName: "Finizer",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Finizer",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png" },
    ],
  },
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${manrope.variable} h-full antialiased`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('finizer_theme_preference');
                const isDark = theme === 'dark' || ((!theme || theme === 'system') && window.matchMedia('(prefers-color-scheme: dark)').matches);
                if (isDark) document.documentElement.classList.add('dark');
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className={`min-h-full flex flex-col ${manrope.className} bg-[#F8F9FA] dark:bg-[#0C0A14] text-[#120D26] dark:text-[#F4F3F8] transition-colors duration-200`}>
        <ThemeProvider>
          <ActorProvider>
            {children}
          </ActorProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
