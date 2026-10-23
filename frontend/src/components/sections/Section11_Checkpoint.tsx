"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";

export function Section11_Checkpoint() {
  return (
    <section className="py-16 bg-white text-center">
      <div className="max-w-[1164px] mx-auto px-4 sm:px-6 flex flex-col items-center">
        <h2 className="font-['Domine',serif] text-2xl sm:text-[34px] font-bold text-[#111827] leading-[1.25] mb-4 max-w-[800px]">
          Your final checkpoint before anything goes live
        </h2>

        <p className="font-['Lato',sans-serif] text-base sm:text-lg text-[#4b5563] leading-relaxed max-w-[760px] mb-8">
          Filestage helps teams move fast with less risk by creating a centralized System of Evidence for every asset. Each review decision gets logged as you go, leaving a clear audit trail that’s traceable and defensible.
        </p>

        {/* Trust layer diagram */}
        <div className="w-full max-w-[1000px] mb-10 rounded-2xl overflow-hidden border border-gray-200/80 shadow-md bg-[#fafafa] p-4">
          <Image
            src="/images/04-content-creation-trust-layer-dam-2-1536x.webp"
            alt="Content creation - Trust layer - DAM"
            width={1024}
            height={324}
            className="w-full h-auto object-contain rounded-lg"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/dashboard"
            className="inline-flex justify-center items-center px-10 py-3.5 font-['Lato',sans-serif] text-base font-bold text-white bg-[#005797] hover:bg-[#004578] rounded-full shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer"
          >
            Start Now
          </Link>
          <a
            href="#demo"
            className="inline-flex justify-center items-center px-8 py-3.5 font-['Lato',sans-serif] text-base font-bold text-[#005797] border-2 border-[#005797] rounded-full hover:bg-blue-50/60 transition-all duration-300 cursor-pointer"
          >
            Let&apos;s talk
          </a>
        </div>
      </div>
    </section>
  );
}
