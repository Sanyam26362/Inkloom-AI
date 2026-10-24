# Blinkit Diwali 2026 — AI Brand Governance & Compliance Guidelines

* **Platform:** Inkloom AI Content Compliance Auditor
* **Client Brand:** Blinkit
* **Campaign Event:** Diwali 2026
* **Document ID:** `INK-BLK-DIW2026-BG-01`
* **Disclaimer:** *These are mock prototype guidelines created for testing and judging within the Inkloom AI compliance platform. They do not represent official Blinkit legal or corporate policy.*

---

## 1. Purpose

This document defines the deterministic brand-governance rules for evaluating static visuals, copy, audio, and video assets submitted for the **Blinkit Diwali 2026** campaign. Every rule in this specification is structured so an automated AI auditor in **Inkloom** can parse visual cues, color hex values, OCR text strings, and audio transcripts to output a repeatable compliance verdict (`PASS`, `NEEDS_REVIEW`, or `FAIL`).

---

## 2. Campaign Objective

The **Blinkit Diwali 2026** campaign celebrates the warmth, joy, and convenience of preparing for Diwali with family and friends. Campaign assets must position the **Blinkit app** as a helpful, reliable, and festive partner for last-minute festival essentials, gifts, sweets, and home decorations—while maintaining strict safety, environmental responsibility (zero firecrackers or fireworks), and accessibility standards.

---

## 3. Diwali Visual Requirements

Every campaign visual asset must unmistakably and visibly communicate **Diwali**.

* **Core Rule:** A visual is **not** Diwali-compliant if it only uses Blinkit yellow (`#F8C200`) and charcoal (`#1C1C1E`) colors without visible festive context.
* **Minimum Cue Threshold:** Every Diwali poster or visual frame must include **at least two ($2$) clear Diwali cues** from the approved list below:
  1. **Diya lamps** (traditional clay or brass oil lamps with a calm flame)
  2. **Rangoli** (traditional floor art or geometric floral patterns)
  3. **Marigold flowers** (garlands, torans, or loose blossoms)
  4. **Festive lights** (warm string lights, fairy lights, or hanging LED curtains)
  5. **Lanterns** (traditional paper or decorative *kandil* lanterns)
  6. **Indian sweets** (*mithai* such as laddoos, kaju katli, barfi, or gulab jamun in festive serving ware)
  7. **Gift boxes** (wrapped festive hampers, dry-fruit boxes, or decorative gift bags)
  8. **Traditional festive decoration** (brass *kalash*, *torans*, banana leaves, or festive tableware)
  9. **The word "Diwali" or an equivalent festive headline** (e.g., *"Happy Diwali"*, *"Diwali Ready with the Blinkit app"*, *"Shubh Deepavali"*)

> **Auditor Rule:** If an asset contains $0$ cues, it triggers an automatic `FAIL`. If an asset contains only $1$ cue (or cues that are visually indistinct/ambiguous), it triggers `NEEDS_REVIEW`.

---

## 4. Prohibited Visual Elements

To ensure public safety, environmental compliance, intellectual property protection, and brand neutrality, the following visual elements are **strictly prohibited** across all images, illustrations, icons, and video frames:

1. **Crackers or firecrackers** (including *anar*, *chakri*, sparklers/*phuljhari*, rockets, or string bombs, whether lit or unlit)
2. **Fireworks** (aerial bursts, sky sparks, or pyrotechnic displays)
3. **Smoke from fireworks** (haze, fumes, or smog associated with burning pyrotechnics)
4. **Explosions** (blast graphics, comic-style boom effects, or combustion effects)
5. **Weapons or dangerous objects** (knives, firearms, matches/lighters held dangerously, or hazardous materials)
6. **Political or religiously sensitive messaging** (partisan symbols, political figures, controversial slogans, or exclusionary religious depictions)
7. **Copyrighted characters** (e.g., Spider-Man, Iron Man, Mickey Mouse, Pokémon, or unauthorized celebrity likenesses)
8. **Unlicensed third-party logos** (competitor marks, unapproved brand watermarks, or modified partner logos)
9. **Generic posters with no visible Diwali context** (standard everyday grocery banners or plain yellow/black layouts lacking festive elements)

> **Auditor Rule:** Detection of any prohibited element ($1$ through $9$) results in an immediate `FAIL`.

---

## 5. Brand Voice

All copy, headlines, captions, and voiceover scripts must follow the Blinkit brand voice:

* **Clear:** Simple, direct sentences that immediately state what the customer can get on the Blinkit app.
* **Friendly:** Warm, welcoming, and celebratory without feeling overly formal or stiff.
* **Fast and Useful:** Focused on solving real festive errands (forgotten marigold garlands, extra boxes of sweets for guests, last-minute gift bags).
* **Inclusive and Respectful:** Uses welcoming Diwali language that respects cultural traditions without sectarian, political, or exclusionary framing.
* **Short and Readable Headlines:** Primary poster headlines must be concise (ideally $3$ to $8$ words) so they can be read at a glance on mobile screens.

---

## 6. Approved and Prohibited Terminology

### 6.1 Approved Terminology
* Always prefer **"Blinkit app"** instead of standalone **"app"** (e.g., *"Order festive sweets on the Blinkit app"* instead of *"Order on the app"*).
* Approved festive phrases:
  * *"Happy Diwali"*
  * *"Shubh Diwali"* / *"Shubh Deepavali"*
  * *"Diwali essentials on the Blinkit app"*
  * *"Festive gifting made simple"*
  * *"Light up your home this Diwali"*

### 6.2 Prohibited Terminology
The following words and exaggerated modifiers are **strictly prohibited** in headlines, body copy, disclaimers, and voiceovers:
* **"guaranteed"** (e.g., *"Guaranteed festive delivery"*)
* **"instant"** (e.g., *"Instant Diwali sweets delivery"*)
* **"always"** (e.g., *"Always in stock, always on time"*)
* **"100%"** (e.g., *"100% fastest delivery"* or *"100% pure gold offer"*)
* Standalone **"app"** without **"Blinkit"** preceding it (triggers `NEEDS_REVIEW` if used casually, or `FAIL` if misleading).

---

## 7. Approved Claims

1. **No Unsupported Claims:** Do not make unverified superlative or comparative claims (e.g., *"India's #1 Diwali store"*, *"Cheapest sweets in the city"*).
2. **Delivery Time Promises:** Do **not** promise specific delivery times (such as *"Delivered in 8 minutes"* or *"10-minute guaranteed delivery"*) unless the exact phrasing is backed by an explicitly approved campaign token and regional legal disclaimer.
   * **Unverified Delivery Claim:** Triggers `NEEDS_REVIEW` if phrased as an estimate without verification, or `FAIL` if paired with prohibited absolutes like *"guaranteed"* or *"instant"*.
3. **Permitted Functional Statements:**
   * *"Get Diwali sweets, diyas, and gifts delivered to your doorstep via the Blinkit app."*
   * *"Shop festive essentials on the Blinkit app."*
   * *"Forgot the marigold garlands? Order now on the Blinkit app."*

---

## 8. Accessibility Requirements

Every visual and multimedia asset must adhere to strict accessibility standards:

1. **Strong Text/Background Contrast:**
   * Body and headline text must maintain a minimum contrast ratio of $4.5:1$ ($3:1$ for large display text).
   * Use Charcoal (`#1C1C1E`) text on Blinkit Yellow (`#F8C200`) or White (`#FFFFFF`) backgrounds.
   * Never place White (`#FFFFFF`) text directly on Blinkit Yellow (`#F8C200`).
2. **No Small Text Over Busy Imagery:**
   * Do not overlay body copy or disclaimers directly across intricate rangoli patterns, glowing string lights, or multi-colored sweet boxes without a solid container or high-opacity dark/light backing plate.
3. **Mobile Readability:**
   * Important text (headline, CTA, product offer) must remain clearly legible when scaled down to a standard mobile viewport width ($360\text{ px}$ to $430\text{ px}$).
4. **No Color-Only Information:**
   * Do not rely solely on Green (`#00A36C`) or Orange (`#FF6B35`) to indicate availability, discounts, or action states; pair colors with clear text labels or icons.
5. **Meaningful Alt Text:**
   * Every static image or poster uploaded to Inkloom must include descriptive alt text ($15$ to $40$ words) specifying the Diwali cues present, the primary headline, and the CTA.

---

## 9. Image, Audio and Video Rules

### 9.1 Static Image Rules
* Must use the official Blinkit visual palette:
  * Blinkit Yellow: `#F8C200`
  * Charcoal: `#1C1C1E`
  * White: `#FFFFFF`
  * Green: `#00A36C`
  * Orange Accent: `#FF6B35`
* Must feature at least $2$ approved Diwali visual cues and $0$ prohibited elements.

### 9.2 Audio Rules
* Voiceover tone must be warm, clear, upbeat, and conversational.
* Must explicitly say **"Blinkit app"** rather than just **"app"**.
* **Prohibited Audio SFX:** Firecracker pops, rocket whistles, loud explosions, sirens, or chaotic crowd noise.
* **Approved Audio SFX:** Gentle festive instrumental music (sitar, flute, light percussion), chime transitions, and warm ambient sounds.

### 9.3 Video Rules
* Every keyframe and end-card must satisfy the visual and accessibility rules.
* No sparkler or firework particle animations in transitions or lower-thirds.
* All spoken dialogue must be accompanied by high-contrast, burnt-in captions or synchronized subtitle tracks.

---

## 10. Compliance Decision Rules

Inkloom's AI auditor must apply the following exact decision logic when evaluating any asset:

### PASS:
- Clearly shows Diwali.
- Contains no crackers or fireworks.
- Uses Blinkit colors and tone.
- Contains no unsupported claims.
- Has readable and accessible text.

### NEEDS_REVIEW:
- Diwali context is weak or unclear.
- Palette is partially outside the approved colors.
- Text or delivery claims need verification.
- The asset contains ambiguous festive imagery.

### FAIL:
- Contains crackers or fireworks.
- Does not visibly communicate Diwali.
- Uses copyrighted characters or unlicensed logos.
- Contains dangerous, political or sensitive content.
- Uses misleading or unsupported claims.

---

## 11. Safe Examples vs. Unsafe Examples

### 11.1 Safe Examples (`PASS`)
* **Safe Example 1 (Festive Gifting Poster):** A Blinkit Yellow (`#F8C200`) poster with Charcoal (`#1C1C1E`) headline reading *"Happy Diwali! Gift boxes & mithai on the Blinkit app"*. Visual shows an illustrated box of *kaju katli*, two lit clay *diya* lamps, and a marigold garland border. High-contrast CTA button in Charcoal with White text. Meaningful alt text attached.
* **Safe Example 2 (Last-Minute Decor Reel):** A $15\text{-second}$ vertical video showing a family arranging a floral *rangoli* and hanging warm paper *lanterns*. Voiceover says: *"Need extra marigold flowers for your rangoli? Order festive essentials on the Blinkit app."* Captions are displayed in White text inside a solid Charcoal pill box.

### 11.2 Unsafe Examples (`FAIL` / `NEEDS_REVIEW`)
* **Unsafe Example 1 (`FAIL` — Fireworks & Exaggerated Claim):** A dark night-sky poster showing bursting aerial fireworks and children holding sparklers, with White text over Yellow background reading *"100% Instant Delivery of Diwali Crackers on the app!"* (Violates firework ban, unsupported/exaggerated claim rules, "app" phrasing rule, and contrast rules).
* **Unsafe Example 2 (`FAIL` — Copyrighted Character & No Diwali Context):** A plain yellow poster showing Spider-Man holding a grocery bag with the headline *"Get groceries guaranteed in 5 minutes!"* (Contains copyrighted character, zero Diwali cues, and prohibited word *"guaranteed"*).
* **Unsafe Example 3 (`NEEDS_REVIEW` — Weak Context & Unverified Delivery Claim):** A pastel purple and yellow poster showing a single small unlit candle and copy reading *"Get your order in 12 minutes on the app."* (Only $1$ ambiguous festive cue, off-brand purple palette, standalone *"app"*, and unverified delivery time claim).

---

## 12. Deterministic Audit Rubric

| Audit Dimension | `PASS` Criteria | `NEEDS_REVIEW` Criteria | `FAIL` Criteria |
| :--- | :--- | :--- | :--- |
| **1. Diwali Visual Cues** | $\ge 2$ explicit approved Diwali cues clearly visible. | Only $1$ cue visible, or cues are blurry/ambiguous (e.g., generic candle instead of *diya*). | $0$ Diwali cues (e.g., yellow/black color-only layout or generic grocery poster). |
| **2. Prohibited Visuals (Pyrotechnics & Safety)** | $0$ crackers, fireworks, firework smoke, explosions, or weapons. | Heavy background bokeh or lens flare that resembles sparks and requires human confirmation. | Any visible firecracker, sparkler, firework burst, firework smoke, explosion, or weapon. |
| **3. IP & Sensitivity** | Original/licensed brand assets only; culturally respectful festive greeting. | Unclear third-party packaging visible on a product box requiring license verification. | Copyrighted characters (e.g., Spider-Man), unlicensed logos, or political/religiously sensitive content. |
| **4. Color Palette** | Primary dominance of `#F8C200`, `#1C1C1E`, `#FFFFFF`, with `#00A36C` and `#FF6B35` accents. | Minor secondary background tints outside the $5$ approved hex codes. | Completely off-brand color scheme with no recognizable Blinkit palette presence. |
| **5. Copy, Tone & Claims** | Friendly, useful tone; uses *"Blinkit app"*; $0$ prohibited words; $0$ unsupported claims. | Uses standalone *"app"*; mentions a delivery time or discount claim that needs approval lookup. | Uses *"guaranteed"*, *"instant"*, *"always"*, *"100%"*, or makes misleading/false claims. |
| **6. Accessibility** | Contrast $\ge 4.5:1$; no small text over busy areas; mobile-legible; alt text present. | Alt text is overly brief ($< 5$ words) or secondary text is near a decorative edge. | Unreadable contrast (e.g., `#FFFFFF` on `#F8C200`), tiny text over busy imagery, or missing alt text. |

---

## 13. Compliance Test Cases (Brand Guidelines)

| Test Case ID | Asset Type | Visual Description | Copy / Audio Transcript | Alt Text Status | Expected Outcome | Primary Audit Reasoning |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `BG-TC-01` | Static Poster | `#F8C200` background, clay *diya* lamps, marigold garland, box of laddoos. | *"Happy Diwali! Order fresh mithai and diyas on the Blinkit app."* (Charcoal `#1C1C1E` text) | Present & descriptive | **PASS** | Contains $4$ Diwali cues (diyas, marigold, sweets, "Diwali" headline), approved palette, uses "Blinkit app", high contrast, no prohibited elements. |
| `BG-TC-02` | Static Poster | `#1C1C1E` background with bursting sky fireworks and smoke behind a gift box. | *"Celebrate Diwali with the Blinkit app!"* (`#FFFFFF` text) | Present & descriptive | **FAIL** | Contains prohibited fireworks and smoke from fireworks. |
| `BG-TC-03` | Static Poster | Solid `#F8C200` and `#1C1C1E` geometric banner showing vegetables and milk packets only. | *"Stock up on daily groceries with the Blinkit app."* | Present & descriptive | **FAIL** | Does not visibly communicate Diwali ($0$ Diwali cues; yellow/black colors alone are not compliant). |
| `BG-TC-04` | Social Ad | Spider-Man holding a decorative paper lantern next to a bowl of sweets on `#F8C200` background. | *"Super Diwali deals on the Blinkit app!"* | Present & descriptive | **FAIL** | Uses a copyrighted character (Spider-Man). |
| `BG-TC-05` | Static Poster | `#F8C200` background, rangoli art, and gift boxes. | *"100% Instant Diwali Delivery Guaranteed on the Blinkit app!"* | Present & descriptive | **FAIL** | Uses prohibited exaggerated claims (*"100%"*, *"Instant"*, *"Guaranteed"*). |
| `BG-TC-06` | Static Poster | `#F8C200` background with a single small hanging lantern in the corner; no other festive cues or festive words. | *"Festive shopping made easy on the app."* | Present & descriptive | **NEEDS_REVIEW** | Weak Diwali context (only $1$ visual cue and no "Diwali" headline) and uses standalone *"app"* instead of *"Blinkit app"*. |
| `BG-TC-07` | Video Reel | Family lighting clay *diyas* and placing marigold *torans* on doorway; `#00A36C` and `#F8C200` end-card. | VO: *"Forgot last-minute Diwali decor? Find diyas and marigold garlands on the Blinkit app."* | Captions & alt metadata present | **PASS** | $3$ clear Diwali cues, warm tone, uses "Blinkit app", approved colors, accessible captions, no crackers. |
| `BG-TC-08` | Static Poster | Deep royal blue (`#002366`) and magenta (`#FF00FF`) background with diyas, rangoli, and sweets. | *"Happy Diwali! Order sweets on the Blinkit app in 11 minutes."* | Present & descriptive | **NEEDS_REVIEW** | Palette is partially outside approved colors and includes a specific delivery time claim requiring verification. |
| `BG-TC-09` | Static Poster | Busy full-bleed photo of colourful rangoli and fairy lights; tiny $8\text{ pt}$ `#FFFFFF` text placed directly over `#F8C200` marigold petals; sparkler held in hand. | *"Always the best Diwali prices."* | Missing | **FAIL** | Contains prohibited firecracker/sparkler, prohibited word (*"Always"*), unreadable contrast/busy background, and missing alt text. |
| `BG-TC-10` | Audio Spot | $15\text{-second}$ voiceover with gentle sitar music; companion banner shows gift boxes, festive lights, and *"Happy Diwali"* headline. | VO: *"Sending warm wishes from far away? Send Diwali gift boxes and sweets to loved ones via the Blinkit app."* | Present & descriptive | **PASS** | $3$ Diwali cues on companion visual, clean audio without cracker SFX, uses "Blinkit app", no unsupported claims. |
| `BG-TC-11` | Static Poster | Illustration of a political rally banner next to a clay *diya* and firecracker rocket. | *"Vote for change this Diwali with the Blinkit app."* | Present & descriptive | **FAIL** | Contains political messaging and prohibited firecrackers. |
| `BG-TC-12` | Static Poster | Warm soft-focus yellow lighting with golden bokeh circles that could be fairy lights or distant sparks; a single gift box in foreground. | *"Get ready for the season on the Blinkit app."* | Present & descriptive | **NEEDS_REVIEW** | Ambiguous festive imagery (bokeh could be fairy lights or sparks; only $1$ clear cue—gift box—without explicit "Diwali" text). |