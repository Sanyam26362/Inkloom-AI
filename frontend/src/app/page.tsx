import React from "react";
import type { Metadata } from "next";
import { Archivo, Roboto_Mono } from "next/font/google";
import "@/app/landing.css";
import { LandingNav } from "@/components/landing/LandingNav";
import { Hero } from "@/components/landing/Hero";
import { Ticker } from "@/components/landing/Ticker";
import { Problem } from "@/components/landing/Problem";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ModalityGrid } from "@/components/landing/ModalityGrid";
import { ProductWalkthrough } from "@/components/landing/ProductWalkthrough";
import { HumanControl } from "@/components/landing/HumanControl";
import { Solutions } from "@/components/landing/Solutions";
import { ConsolePreview } from "@/components/landing/ConsolePreview";
import { ValueTable } from "@/components/landing/ValueTable";
import { Trust } from "@/components/landing/Trust";
import { Integrations } from "@/components/landing/Integrations";
import { Pricing } from "@/components/landing/Pricing";
import { Faq } from "@/components/landing/Faq";
import { FinalCta } from "@/components/landing/FinalCta";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { StickyCtaBar } from "@/components/landing/StickyCtaBar";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["800", "900"],
  variable: "--font-archivo",
  display: "swap",
});

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-roboto-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Inkloom AI | Brand governance for text, image, audio and video",
  description:
    "Inkloom AI audits every post, image, voiceover and video against your brand rules before it goes live, with human approval and a full audit trail.",
};

export default function LandingPage() {
  return (
    <div className={`nb-landing ${archivo.variable} ${robotoMono.variable}`}>
      {/* 0. LandingNav */}
      <LandingNav />

      <main className="w-full">
        {/* 1. Hero */}
        <Hero />

        {/* 2. Ticker */}
        <Ticker />

        {/* 3. Problem */}
        <Problem />

        {/* 4. HowItWorks */}
        <HowItWorks />

        {/* 5. ModalityGrid */}
        <ModalityGrid />

        {/* 6. ProductWalkthrough */}
        <ProductWalkthrough />

        {/* 7. HumanControl */}
        <HumanControl />

        {/* 8. Solutions */}
        <Solutions />

        {/* 9. ConsolePreview */}
        <ConsolePreview />

        {/* 10. ValueTable */}
        <ValueTable />

        {/* 11. Trust */}
        <Trust />

        {/* 12. Integrations */}
        <Integrations />

        {/* 13. Pricing */}
        <Pricing />

        {/* 14. Faq */}
        <Faq />

        {/* 15. FinalCta */}
        <FinalCta />
      </main>

      {/* Footer */}
      <LandingFooter />

      {/* Sticky Quick Action CTA Bar */}
      <StickyCtaBar />
    </div>
  );
}
