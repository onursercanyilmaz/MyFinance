import type { Metadata } from "next";
import "./globals.css";
import { BudgetProvider } from "@/lib/store";
import { LanguageProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "MyFinance — Personal Wallet & Budget Tracker",
  description: "MyFinance is a bilingual personal wallet, budget and investment tracker.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className="min-h-screen bg-zinc-50 font-sans text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <LanguageProvider>
            <BudgetProvider>{children}</BudgetProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
