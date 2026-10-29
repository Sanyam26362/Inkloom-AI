import React from "react";
import type { Metadata } from "next";
import { Archivo, Roboto_Mono } from "next/font/google";
import "@/app/landing.css";
import { LandingNav } from "@/components/landing/LandingNav";
import { Hero } from "@/components/landing/Hero";
import { Ticker } from "@/components/landing/Ticker";

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

export default function LandingV2Page() {
  return (
    <div className={`nb-landing ${archivo.variable} ${robotoMono.variable}`}>
      {/* 0. LandingNav */}
      <LandingNav />

      <main className="w-full">
        {/* 1. Hero */}
        <Hero />

        {/* 2. Ticker */}
        <Ticker />
      </main>
    </div>
  );
}
