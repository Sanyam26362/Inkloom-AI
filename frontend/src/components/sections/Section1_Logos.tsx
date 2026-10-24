"use client";

import React from "react";
import Image from "next/image";

export function Section1_Logos() {
  return (
    <section className="relative my-10 font-sans text-base leading-[1.4] text-text-primary bg-background">
      <div className="max-w-[1164px] mx-auto px-4 sm:px-6 text-center">
        <h3 className="shrink-0 mb-[7px] px-[15px] max-w-full font-sans text-lg font-normal leading-[1.2] text-center text-equally-action-color">
          Engineered for high-velocity brands, quick commerce &amp; modern creative teams
        </h3>

        <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 md:gap-14 pt-6 opacity-90 transition-all duration-300">
          {/* Blinkit Benchmark Profile */}
          <div className="h-[32px] px-3 py-1 rounded-sm bg-[#F8C200]/20 border border-[#F8C200]/50 flex items-center justify-center">
            <span className="font-black text-xl tracking-tight text-[#1C1C1E] font-sans">
              blink<span className="text-[#00A36C]">it</span>
            </span>
          </div>

          {/* Capri-Sun */}
          <div className="h-[30px] flex items-center justify-center grayscale hover:grayscale-0 transition-all">
            <Image
              src="/images/52-caprisun-logo.webp"
              alt="Capri-Sun"
              width={100}
              height={30}
              className="h-[28px] w-auto object-contain"
            />
          </div>

          {/* Siemens */}
          <div className="h-[30px] flex items-center justify-center grayscale hover:grayscale-0 transition-all">
            <Image
              src="/images/50-siemens-logo.webp"
              alt="Siemens"
              width={110}
              height={30}
              className="h-[26px] w-auto object-contain"
            />
          </div>

          {/* Liebherr */}
          <div className="h-[30px] flex items-center justify-center grayscale hover:grayscale-0 transition-all">
            <Image
              src="/images/49-liebherr-logo-2.webp"
              alt="Liebherr"
              width={130}
              height={30}
              className="h-[26px] w-auto object-contain"
            />
          </div>

          {/* Lonsdale */}
          <div className="h-[30px] flex items-center justify-center grayscale hover:grayscale-0 transition-all">
            <Image
              src="/images/51-lonsdale-logo.webp"
              alt="Lonsdale"
              width={105}
              height={30}
              className="h-[26px] w-auto object-contain"
            />
          </div>

          {/* Sharp */}
          <div className="h-[30px] flex items-center justify-center grayscale hover:grayscale-0 transition-all">
            <span className="font-black text-2xl tracking-wider text-[#e60012] font-sans uppercase">
              SHARP
            </span>
          </div>

          {/* Bosch Rexroth */}
          <div className="h-[30px] flex items-center justify-center grayscale hover:grayscale-0 transition-all">
            <span className="font-semibold text-lg tracking-tight text-[#003865] font-sans">
              Bosch Rexroth
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
