"use client";

import React from "react";
import Image from "next/image";

export function Section1_Logos() {
  return (
    <section className="py-12 bg-white border-y border-gray-100 overflow-hidden">
      <div className="max-w-[1164px] mx-auto px-4 sm:px-6 text-center">
        <h3 className="font-['Lato',sans-serif] text-lg sm:text-[22px] font-normal text-[#111827] mb-8 leading-[1.3]">
          Trusted by professionals from top brands and agencies
        </h3>

        <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 md:gap-16 opacity-85 grayscale hover:grayscale-0 transition-all duration-300">
          {/* Capri-Sun */}
          <div className="h-[30px] flex items-center justify-center">
            <Image
              src="/images/52-caprisun-logo.webp"
              alt="Capri-Sun"
              width={100}
              height={30}
              className="h-[28px] w-auto object-contain"
            />
          </div>

          {/* Siemens */}
          <div className="h-[30px] flex items-center justify-center">
            <Image
              src="/images/50-siemens-logo.webp"
              alt="Siemens"
              width={110}
              height={30}
              className="h-[26px] w-auto object-contain"
            />
          </div>

          {/* Liebherr */}
          <div className="h-[30px] flex items-center justify-center">
            <Image
              src="/images/49-liebherr-logo-2.webp"
              alt="Liebherr"
              width={130}
              height={30}
              className="h-[26px] w-auto object-contain"
            />
          </div>

          {/* Lonsdale */}
          <div className="h-[30px] flex items-center justify-center">
            <Image
              src="/images/51-lonsdale-logo.webp"
              alt="Lonsdale"
              width={105}
              height={30}
              className="h-[26px] w-auto object-contain"
            />
          </div>

          {/* Penny */}
          <div className="h-[30px] flex items-center justify-center">
            <span className="font-extrabold text-2xl tracking-tighter text-[#cc0000] font-sans">
              PENNY.
            </span>
          </div>

          {/* Sharp */}
          <div className="h-[30px] flex items-center justify-center">
            <span className="font-black text-2xl tracking-wider text-[#e60012] font-sans uppercase">
              SHARP
            </span>
          </div>

          {/* Lukkien */}
          <div className="h-[30px] flex items-center justify-center">
            <span className="font-bold text-xl tracking-wide text-[#374151] font-sans">
              lukkien
            </span>
          </div>

          {/* Rexroth */}
          <div className="h-[30px] flex items-center justify-center">
            <span className="font-semibold text-lg tracking-tight text-[#003865] font-sans">
              Bosch Rexroth
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
