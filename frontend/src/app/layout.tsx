import type { Metadata } from "next";
import "./globals.css";
import { AppContextProvider } from "@/context/AppContext";
import { Sidebar } from "@/components/shell/Sidebar";
import { Header } from "@/components/shell/Header";

export const metadata: Metadata = {
  title: "Inkloom AI — Enterprise Brand Governance Platform",
  description:
    "Real-time computational policy adherence across cross-channel enterprise collateral, LLM output gates, and autonomous pipeline sync.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className="h-full antialiased dark"
    >
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body className="min-h-full bg-surface text-on-surface antialiased flex flex-col font-sans">
        <AppContextProvider>
          <div className="flex min-h-screen w-full bg-surface">
            <Sidebar />
            <div className="pl-0 lg:pl-72 flex flex-col flex-1 min-w-0">
              <Header />
              <main className="relative pt-16 flex-1 w-full bg-surface">
                {children}
              </main>
            </div>
          </div>
        </AppContextProvider>
      </body>
    </html>
  );
}
