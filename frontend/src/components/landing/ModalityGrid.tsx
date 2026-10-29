import React from "react";

export function ModalityGrid() {
  const modalities = [
    {
      title: "COPY & SOCIAL",
      stripBg: "bg-[var(--nb-yellow)]",
      summary: "Text and social posts, checked before scheduling.",
      items: [
        "Banned and preferred terminology",
        "Tone and brand voice",
        "Unapproved factual claims",
        "Aspect ratios 1:1, 4:5, 9:16",
        "Caption length and hashtag limits",
        "Alt-text present",
      ],
    },
    {
      title: "IMAGES & POSTERS",
      stripBg: "bg-[var(--nb-pink)]",
      summary: "Visual compliance, measured, not eyeballed.",
      items: [
        "Palette match using perceptual colour distance (CIELAB ΔE)",
        "WCAG 4.5:1 text contrast",
        "Off-brand or prohibited imagery",
        "Logo usage",
      ],
    },
    {
      title: "AUDIO",
      stripBg: "bg-[var(--nb-orange)]",
      summary: "Voiceovers and ads, listened to.",
      items: [
        "Mandatory phrases spoken",
        "Prohibited words and claims",
        "Tone of delivery",
        "Music and voice balance",
      ],
    },
    {
      title: "VIDEO REELS",
      stripBg: "bg-[var(--nb-blue)]",
      summary: "Frames and dialogue, reviewed together.",
      items: [
        "Frame-by-frame visual check",
        "Transcript audit",
        "Brand end-card present",
        "On-screen text and claims",
      ],
    },
  ];

  return (
    <section
      aria-labelledby="coverage-heading"
      className="w-full bg-[var(--nb-cream)] nb-section-separator py-16 sm:py-24 px-6 sm:px-10 lg:px-16"
    >
      <div className="max-w-[1280px] mx-auto">
        <span className="nb-eyebrow mb-6">COVERAGE</span>
        <h2 id="coverage-heading" className="nb-h2 mb-12 sm:mb-16 text-[var(--nb-ink)]">
          ONE AUDIT. EVERY FORMAT.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {modalities.map((mod) => (
            <div
              key={mod.title}
              className="nb-card bg-white flex flex-col justify-between overflow-hidden"
            >
              <div>
                {/* Header strip */}
                <div
                  className={`${mod.stripBg} border-b-[3px] border-[var(--nb-ink)] px-6 py-4 flex items-center justify-between`}
                >
                  <h3
                    className="text-xl sm:text-2xl font-black uppercase text-[var(--nb-ink)] tracking-tight"
                    style={{ fontFamily: "var(--font-archivo), sans-serif" }}
                  >
                    {mod.title}
                  </h3>
                </div>

                <div className="p-6 sm:p-8">
                  {/* One-line summary */}
                  <p className="nb-mono text-base font-bold text-[var(--nb-ink)] mb-6">
                    {mod.summary}
                  </p>

                  {/* Checklist */}
                  <ul className="flex flex-col gap-3">
                    {mod.items.map((item, idx) => (
                      <li
                        key={idx}
                        className="nb-mono text-sm leading-relaxed text-[var(--nb-ink)] flex items-start gap-2.5"
                      >
                        <span className="font-bold text-[var(--nb-ink)] select-none shrink-0">
                          ✓
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
