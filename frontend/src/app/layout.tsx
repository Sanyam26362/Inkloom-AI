import type { Metadata } from "next";
import "./globals.css";
import { AppContextProvider } from "@/context/AppContext";
import { AppShell } from "@/components/shell/AppShell";

export const metadata: Metadata = {
  title: "Filestage: Online Proofing Software – Free Trial & Demo",
  description:
    "The online proofing software for 30% faster approvals. Centralize feedback, track versions, and catch costly errors before approval with our automated online proofing software.",
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
