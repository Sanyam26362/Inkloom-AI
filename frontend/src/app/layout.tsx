import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { AppContextProvider } from "@/context/AppContext";
import { AppShell } from "@/components/shell/AppShell";

export const metadata: Metadata = {
  title: "BrandLens — Enterprise Brand Governance & Multi-Modal Content Auditing",
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
      suppressHydrationWarning
      className="h-full antialiased scroll-smooth"
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Roboto+Mono:wght@400;600;700&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('inkloom_theme');if(t==='dark'){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full antialiased font-sans bg-surface text-on-surface" suppressHydrationWarning>
        <ClerkProvider>
          <AppContextProvider>
            <AppShell>{children}</AppShell>
          </AppContextProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
