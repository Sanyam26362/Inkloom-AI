"use client";

import React, { useState } from "react";
import Image from "next/image";

interface TestimonialItem {
  id: number;
  name: string;
  role: string;
  company: string;
  avatar: string;
  headline: string;
  quote: string;
}

const testimonials: TestimonialItem[] = [
  {
    id: 1,
    name: "Johannes Morath",
    role: "Marketing Operations Lead",
    company: "Blinkit Quick Commerce",
    avatar: "/images/41-johannes-morath-1.webp",
    headline: "Since rolling out BrandLens, we’ve eliminated 100% of unapproved claims across our campaigns",
    quote:
      "BrandLens instantly flags unverified delivery promises and prohibited terminology across our Instagram captions and festival push notifications. Our compliance scores improved from 72 to 98 in two weeks.",
  },
  {
    id: 2,
    name: "Melissa Abrini",
    role: "Brand Identity Director",
    company: "Story Omnichannel Agency",
    avatar: "/images/53-melissa-abrini.webp",
    headline: "Auditing multi-modal video reels and audio voiceovers used to take our legal team 48 hours.",
    quote:
      "With BrandLens's multi-modal ingestion, video spoken dialogue and on-screen text are transcribed and cross-referenced with brand guideline chunks via pgvector embeddings in under 5 seconds.",
  },
  {
    id: 3,
    name: "Naeran Rubio",
    role: "Associate Director of Content Governance",
    company: "Global Enterprise Media",
    avatar: "/images/59-sarah-chen.webp",
    headline: "The deterministic rule engine plus reverse-offset PII scrubber gives us bulletproof confidence.",
    quote:
      "We no longer worry about internal employee emails, phone numbers, or confidential pricing leaking into external LLM prompts. BrandLens masks sensitive tokens locally before audit execution.",
  },
];

export function Section3_Testimonial() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1));
  };

  const current = testimonials[currentIndex];

  return (
    <section className="relative overflow-x-clip my-20 font-sans text-base leading-[1.4] text-text-primary bg-background">
      <div className="max-w-[1084px] mx-auto px-4 sm:px-6">
        <div className="bg-palette-4/40 border border-palette-1 rounded-sm p-8 sm:p-12 relative overflow-hidden shadow-sm">
          {/* Decorative quote icon */}
          <div className="absolute top-6 right-8 text-palette-1 select-none pointer-events-none">
            <svg className="w-20 h-20 opacity-40" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
            </svg>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8">
            <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-background shadow-md shrink-0 bg-palette-7">
              <Image
                src={current.avatar}
                alt={current.name}
                width={80}
                height={80}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="font-sans text-base font-bold leading-[1.2] list-none text-text-primary">
                {current.name}
              </p>
              <p className="font-sans text-base leading-[1.4] list-none text-text-muted">
                {current.role}, <span className="font-bold text-primary">{current.company}</span>
              </p>
            </div>
          </div>

          <blockquote className="mb-6">
            <h3 className="mt-8 font-serif text-2xl font-bold leading-[1.2] list-none text-equally-action-color mb-4">
              &ldquo;{current.headline}&rdquo;
            </h3>
            <p className="mt-4 font-sans text-base leading-[1.4] list-none text-text-primary max-w-[850px]">
              {current.quote}
            </p>
          </blockquote>

          {/* Carousel Navigation Buttons & Dots */}
          <div className="flex items-center justify-between pt-6 border-t border-palette-1">
            <div className="flex items-center gap-2">
              {testimonials.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                    currentIndex === idx ? "w-8 bg-primary" : "w-2.5 bg-palette-1 hover:bg-border"
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={prevSlide}
                className="w-10 h-10 rounded-full border border-border hover:border-text-muted flex items-center justify-center text-text-muted hover:text-equally-action-color bg-background shadow-sm transition-colors cursor-pointer"
                aria-label="Previous testimonial"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={nextSlide}
                className="w-10 h-10 rounded-full border border-border hover:border-text-muted flex items-center justify-center text-text-muted hover:text-equally-action-color bg-background shadow-sm transition-colors cursor-pointer"
                aria-label="Next testimonial"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
