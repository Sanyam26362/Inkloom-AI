import type { Metadata } from "next";
import "./globals.css";
import { AppContextProvider } from "@/context/AppContext";
import { AppShell } from "@/components/shell/AppShell";

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
      className="h-full antialiased scroll-smooth"
    >
      <body className="min-h-full antialiased font-sans">
        <AppContextProvider>
          <AppShell>{children}</AppShell>
        </AppContextProvider>
      </body>
    </html>
  );
}
