import type { Metadata } from "next";
import { Geist, Geist_Mono, Domine, Lato } from "next/font/google";
import "./globals.css";
import { AppContextProvider } from "@/context/AppContext";
import { AppShell } from "@/components/shell/AppShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const domine = Domine({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-domine",
  display: "swap",
});

const lato = Lato({
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
  variable: "--font-lato",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Inkloom AI — Enterprise Brand Governance & Multi-Modal Content Auditing",
  description:
    "Autonomous computational policy adherence across cross-channel collateral, multi-modal audio & video QA, and pgvector RAG pipeline.",
  icons: {
    icon: "/icons/favicon-1.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${lato.variable} ${domine.variable} h-full antialiased scroll-smooth`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Domine:wght@400;500;600;700&family=Lato:ital,wght@0,300;0,400;0,700;0,900;1,300;1,400;1,700&display=swap"
        />
      </head>
      <body className="min-h-full antialiased font-sans bg-surface text-on-surface">
        <AppContextProvider>
          <AppShell>{children}</AppShell>
        </AppContextProvider>
      </body>
    </html>
  );
}
