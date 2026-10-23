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
    role: "Manager Marketing Projects",
    company: "Kärcher",
    avatar: "/images/41-johannes-morath-1.webp",
    headline: "Since rolling out Filestage, we’ve saved 100s of hours on our artwork reviews",
    quote:
      "Filestage gives our suppliers and agencies a centralized platform to submit creative assets for feedback and approval. This helps us deliver content at speed and scale.",
  },
  {
    id: 2,
    name: "Melissa Abrini",
    role: "Creative Director",
    company: "Creative Agency Story",
    avatar: "/images/53-melissa-abrini.webp",
    headline: "Before Filestage, our review process was pretty chaotic. Feedback came flying in from all directions.",
    quote:
      "Now we have a clear, centralized review workflow. Clients and stakeholders can see exactly what needs to be signed off, and version history is always crystal clear.",
  },
  {
    id: 3,
    name: "Naeran Rubio",
    role: "Associate Director of Content & Communications",
    company: "Sharp",
    avatar: "/images/59-sarah-chen.webp",
    headline: "Our designer simply uploads the video, sends it to the group, and everyone is able to comment directly.",
    quote:
      "Filestage made review cycles drastically shorter. The time savings across our entire marketing department have been immense.",
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
    <section className="py-20 bg-white">
      <div className="max-w-[1084px] mx-auto px-4 sm:px-6">
        <div className="bg-[#f9fafb] border border-gray-100 rounded-2xl p-8 sm:p-12 relative overflow-hidden shadow-sm">
          {/* Decorative quote icon */}
          <div className="absolute top-6 right-8 text-[#e5e7eb] select-none pointer-events-none">
            <svg className="w-20 h-20 opacity-40" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
            </svg>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8">
            <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-white shadow-md shrink-0 bg-gray-100">
              <Image
                src={current.avatar}
                alt={current.name}
                width={80}
                height={80}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="font-['Lato',sans-serif] text-[18px] font-bold text-[#111827] leading-tight">
                {current.name}
              </p>
              <p className="font-['Lato',sans-serif] text-[15px] text-[#4b5563]">
                {current.role}, <span className="font-semibold text-[#005797]">{current.company}</span>
              </p>
            </div>
          </div>

          <blockquote className="mb-6">
            <h3 className="font-['Domine',serif] text-2xl sm:text-[31px] font-bold text-[#111827] leading-[1.3] mb-4">
              &ldquo;{current.headline}&rdquo;
            </h3>
            <p className="font-['Lato',sans-serif] text-base sm:text-lg text-[#374151] leading-relaxed max-w-[850px]">
              {current.quote}
            </p>
          </blockquote>

          {/* Carousel Navigation Buttons & Dots */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200/60">
            <div className="flex items-center gap-2">
              {testimonials.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                    currentIndex === idx ? "w-8 bg-[#005797]" : "w-2.5 bg-gray-300 hover:bg-gray-400"
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={prevSlide}
                className="w-10 h-10 rounded-full border border-gray-300 hover:border-gray-400 flex items-center justify-center text-gray-700 hover:text-black bg-white shadow-sm transition-colors cursor-pointer"
                aria-label="Previous testimonial"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={nextSlide}
                className="w-10 h-10 rounded-full border border-gray-300 hover:border-gray-400 flex items-center justify-center text-gray-700 hover:text-black bg-white shadow-sm transition-colors cursor-pointer"
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
