# Blinkit Diwali 2026 — Deterministic Design System & Asset Specification

* **Platform:** Inkloom AI Content Compliance Auditor
* **Client Brand:** Blinkit
* **Campaign Event:** Diwali 2026
* **Document ID:** `INK-BLK-DIW2026-DS-02`
* **Disclaimer:** *These are mock prototype design-system specifications created for testing and judging within the Inkloom AI compliance platform. They do not represent official Blinkit legal or corporate policy.*

---

## 1. Color Palette

All campaign posters, banners, UI cards, and video end-frames must strictly adhere to the five approved Blinkit Diwali 2026 hex codes.

### 1.1 Approved Swatches

| Color Name | Hex Code | RGB Value | Role & Usage Proportion |
| :--- | :--- | :--- | :--- |
| **Blinkit Yellow** | `#F8C200` | `rgb(248, 194, 0)` | **Primary Brand Canvas ($40\% \text{ – } 65\%$):** Main background fill, primary brand header bar, or festive frame border. |
| **Charcoal** | `#1C1C1E` | `rgb(28, 28, 30)` | **Primary Ink & Contrast Canvas ($20\% \text{ – } 45\%$):** Primary typography on Yellow/White, high-contrast CTA buttons, or dark-mode festive night canvas. |
| **White** | `#FFFFFF` | `rgb(255, 255, 255)` | **Clean Surface & Inverse Ink ($10\% \text{ – } 30\%$):** Product cards, text containers, and primary typography over Charcoal (`#1C1C1E`). |
| **Green** | `#00A36C` | `rgb(0, 163, 108)` | **Functional Accent ($5\% \text{ – } 15\%$):** Secondary badges, positive confirmation tags, or leaf/toran illustration accents (never used as sole indicator without text). |
| **Orange Accent** | `#FF6B35` | `rgb(255, 107, 53)` | **Festive Warmth Accent ($5\% \text{ – } 15\%$):** Marigold flower illustrations, diya flame glow, rangoli highlights, and festive decorative borders. |

### 1.2 Approved Contrast Pairings & Prohibitions
* **Approved Pairings:**
  * `#1C1C1E` (Charcoal text) on `#F8C200` (Blinkit Yellow background) — Contrast ratio $\approx 11.8:1$ (`PASS`)
  * `#FFFFFF` (White text) on `#1C1C1E` (Charcoal background) — Contrast ratio $\approx 17.1:1$ (`PASS`)
  * `#1C1C1E` (Charcoal text) on `#FFFFFF` (White container) — Contrast ratio $\approx 17.1:1$ (`PASS`)
* **Strictly Prohibited Pairings:**
  * `#FFFFFF` (White text) directly on `#F8C200` (Blinkit Yellow) — Contrast ratio $\approx 1.4:1$ (`FAIL`)
  * `#FF6B35` (Orange text) directly on `#F8C200` (Blinkit Yellow) — Contrast ratio $\approx 2.1:1$ (`FAIL`)
  * `#00A36C` (Green text) directly on `#1C1C1E` (Charcoal) for small body text (`FAIL`)

> **Auditor Rule:** If an asset uses unapproved dominant background colors (e.g., neon purple, royal blue, magenta), Inkloom flags `NEEDS_REVIEW` (if minor/partial) or `FAIL` (if off-brand and lacking Diwali context).

---

## 2. Typography Guidance

Typography must prioritize instant legibility on mobile screens and maintain a friendly, modern geometric aesthetic.

### 2.1 Type Hierarchy & Mobile Scaling
* **Font Family:** Clean geometric sans-serif (e.g., *Okra*, *Inter*, or *Plus Jakarta Sans*). Prohibits unreadable decorative cursive or heavy Gothic novelty fonts.
* **Primary Headline (H1):**
  * Weight: Bold / ExtraBold ($700 \text{ – } 800$)
  * Length: $3$ to $8$ words maximum.
  * Minimum Size ($1080\text{ px}$ canvas): $64\text{ px}$ to $88\text{ px}$ (Line height $1.15$).
* **Subheadline / Supporting Copy (H2):**
  * Weight: Medium / SemiBold ($500 \text{ – } 600$)
  * Length: Maximum $15$ words.
  * Minimum Size ($1080\text{ px}$ canvas): $36\text{ px}$ to $48\text{ px}$ (Line height $1.3$).
* **CTA Button Label:**
  * Weight: Bold ($700$)
  * Minimum Size ($1080\text{ px}$ canvas): $32\text{ px}$ to $40\text{ px}$.
  * Must reference the **"Blinkit app"** either inside the CTA (e.g., *"Order on the Blinkit app"*) or immediately in the H1/H2.
* **Legal / Footnote Text:**
  * Minimum Size ($1080\text{ px}$ canvas): $22\text{ px}$ on a solid high-contrast background bar.

### 2.2 Copy Compliance in Typography
* Never typeset prohibited words: **"guaranteed"**, **"instant"**, **"always"**, or **"100%"**.
* Never typeset unapproved delivery time promises.

---

## 3. Logo Placement

1. **Approved Zones:** Top-left corner, top-center header, or bottom-right corner within the designated safe area.
2. **Clear Space:** Maintain a minimum clear padding around the Blinkit wordmark equal to $0.5 \times$ the height of the letter **"b"** in the logo.
3. **Logo Contrast:**
   * On `#F8C200` (Blinkit Yellow) or `#FFFFFF` (White) backgrounds, use the standard Charcoal (`#1C1C1E`) and Green (`#00A36C`) Blinkit logo.
   * On `#1C1C1E` (Charcoal) backgrounds, place the logo inside a `#F8C200` pill container or use the approved inverse lockup.
4. **Prohibition:** Never overlay festive garlands, diya flames, or product cutouts on top of the Blinkit logo. Never include unlicensed third-party logos.

---

## 4. Safe Area and Spacing

To prevent crucial text or Diwali visual cues from being cropped or obscured by platform UI overlays:

* **Standard Square & Portrait Posters ($1:1$ and $4:5$):**
  * Outer Safe Margin: $6\%$ inset from all four edges (e.g., $65\text{ px}$ on a $1080 \times 1080\text{ px}$ canvas).
  * No text, logos, or primary CTA buttons may cross into the outer $6\%$ margin.
* **Vertical Stories & Reels ($9:16$ — $1080 \times 1920\text{ px}$):**
  * Top Safe Zone: $14\%$ inset ($270\text{ px}$) to clear profile headers and progress bars.
  * Bottom Safe Zone: $20\%$ inset ($384\text{ px}$) to clear captions, audio tickers, and interaction buttons.
  * Left/Right Safe Zone: $6\%$ inset ($65\text{ px}$).
* **Element Spacing:** Maintain at least $24\text{ px}$ vertical padding between the headline, subheadline, and CTA button.

---

## 5. Poster Layout Rules

1. **Three-Zone Modular Grid:**
   * **Header Zone ($15\% \text{ – } 20\%$):** Blinkit logo and top decorative border (e.g., marigold *toran* or hanging *lanterns*).
   * **Hero Typography & CTA Zone ($35\% \text{ – } 45\%$):** Short festive headline, supporting copy mentioning **"Blinkit app"**, and high-contrast CTA button placed on an uncluttered solid `#F8C200`, `#1C1C1E`, or `#FFFFFF` surface.
   * **Festive Visual & Product Zone ($40\% \text{ – } 50\%$):** Showcases products (sweets, gift boxes, decor) paired with approved Diwali cues (lit *diyas*, *rangoli*).
2. **Text-to-Image Isolation:**
   * Text must **never** overlap busy multi-colored imagery (such as intricate rangoli patterns or assortments of Indian sweets).
   * If text must sit over a photographic background, place a solid `#1C1C1E` or `#FFFFFF` container card ($100\%$ opacity, minimum $16\text{ px}$ corner radius) behind the text.
3. **No Color-Only Signifiers:**
   * Discount tags, availability pills, or category highlights using `#00A36C` (Green) or `#FF6B35` (Orange Accent) must include explicit text labels or recognizable icons so meaning is preserved for color-blind users.

---

## 6. Diwali Decoration Rules

Every poster layout must integrate **at least two ($2$) approved Diwali cues** from the following list:
* **Diya lamps:** Use warm `#FF6B35` and `#F8C200` tones for the flame and brass/terracotta tones for the lamp base. Flames must look calm and steady—never like sparks or explosions.
* **Rangoli:** Place geometric or floral rangoli motifs in bottom corners or as a subtle framing halo around hero products, keeping them clear of body text.
* **Marigold flowers:** Use `#F8C200` and `#FF6B35` alternating blossoms as top header garlands (*torans*) or framing borders.
* **Festive lights / Lanterns:** Hang traditional *kandil* lanterns or warm string lights from the top border without obstructing the headline.
* **Indian sweets / Gift boxes:** Group *mithai* platters and wrapped gift boxes in the hero product zone with clean studio lighting.
* **Traditional festive decoration:** Include brass *kalash*, mango/banana leaf *torans*, or festive platters where appropriate.
* **Explicit "Diwali" Headline:** Include the word **"Diwali"** (or an equivalent unmistakable festive greeting like *"Shubh Deepavali"*) in the primary H1 headline.

> **Mandatory Prohibition:** Never use crackers, firecrackers (*anar*, *chakri*, rockets, sparklers), fireworks, firework smoke, or explosion starbursts as decorative fillers. A poster that only uses `#F8C200` and `#1C1C1E` without at least $2$ Diwali cues is non-compliant (`FAIL` if $0$ cues; `NEEDS_REVIEW` if $1$ weak cue).

---

## 7. Image Composition Rules

1. **Single Clear Focal Point:** Arrange products and festive cues in a balanced triangular or central composition with at least $30\%$ clean negative space for typography.
2. **Lighting & Atmosphere:** Warm, inviting indoor or studio lighting. Avoid smoky, hazy, or chaotic outdoor night scenes that resemble firework smoke.
3. **Zero Prohibited Objects:** Ensure background props contain no weapons, dangerous objects (knives, open matchboxes), copyrighted characters (e.g., Spider-Man toys), unlicensed third-party brand logos, or political/religiously sensitive symbols.
4. **Alt Text Metadata:** Every exported image asset must include an embedded or sidecar alt text description specifying the visual layout, Diwali cues, and exact copy.

---

## 8. Social Media Dimensions

All visual assets uploaded to Inkloom must match one of the approved standard dimensions:

| Placement Channel | Aspect Ratio | Pixel Dimensions ($W \times H$) | Safe Zone Requirement |
| :--- | :--- | :--- | :--- |
| **Instagram / Facebook Feed Square** | $1:1$ | $1080 \times 1080\text{ px}$ | $65\text{ px}$ ($6\%$) all sides |
| **Instagram / Facebook Portrait** | $4:5$ | $1080 \times 1350\text{ px}$ | $65\text{ px}$ left/right, $80\text{ px}$ top/bottom |
| **Instagram Stories / Reels / Shorts** | $9:16$ | $1080 \times 1920\text{ px}$ | $270\text{ px}$ top, $384\text{ px}$ bottom, $65\text{ px}$ sides |
| **YouTube / Web Landscape Banner** | $16:9$ | $1920 \times 1080\text{ px}$ | $96\text{ px}$ ($5\%$) all sides |
| **Blinkit In-App Hero Banner** | $2:1$ | $1200 \times 600\text{ px}$ | $48\text{ px}$ all sides; minimum $32\text{ px}$ headline |

---

## 9. Audio Voiceover Rules

1. **Pacing & Tone:** $130$ to $150$ words per minute; clear, friendly, fast, and helpful delivery.
2. **Mandatory App Naming:** The voiceover script must explicitly say **"Blinkit app"** (never standalone *"app"*).
3. **Prohibited Claims in Audio:** Must never speak the words **"guaranteed"**, **"instant"**, **"always"**, **"100%"**, or unapproved delivery-minute promises.
4. **Sound Design:**
   * Background music must be mixed at $-18\text{ dB}$ to $-24\text{ dB}$ below the voiceover so speech remains clear and accessible.
   * **Strictly Prohibited SFX:** Firecracker bursts, sparkler fizzing, rocket whistles, explosions, or alarms (`FAIL`).

---

## 10. Video / Reel Rules

1. **Consistent Festive Context:** At least $2$ approved Diwali cues must be visible within the first $2\text{ seconds}$ (hook frame) and on the closing end-card.
2. **Motion Graphics:** Use smooth slide or fade transitions. Do **not** use particle bursts, sparkler trails, or firework explosion transitions (`FAIL`).
3. **Accessible Captions:** Every video/reel must feature synchronized, high-contrast captions (`#FFFFFF` text inside a solid `#1C1C1E` box, or `#1C1C1E` text inside a solid `#F8C200` box) positioned inside the $9:16$ safe zone.
4. **End-Card Compliance:** The final $2\text{ to }3\text{ seconds}$ must display the Blinkit logo, `#F8C200` / `#1C1C1E` brand colors, at least $2$ Diwali cues, and a readable CTA referencing the **"Blinkit app"**.

---

## 11. Compliance Decision Logic

Inkloom's design-system auditor enforces this exact decision logic:

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

## 12. Example Safe & Unsafe Poster Descriptions

### 12.1 Example Safe Poster Descriptions (`PASS`)
1. **Festive Sweets & Diya Square Poster ($1080 \times 1080\text{ px}$):**
   * **Canvas:** Blinkit Yellow (`#F8C200`) background with a top border of `#FF6B35` and `#F8C200` marigold garlands and `#00A36C` mango leaves.
   * **Visual Cues ($4$ cues):** Top marigold garland, two lit terracotta *diya* lamps at the bottom-left, an open gift box of *kaju katli* sweets at the bottom-right, and the headline word *"Diwali"*.
   * **Typography:** Left-aligned Charcoal (`#1C1C1E`) headline ($72\text{ px}$ Bold) on clean `#F8C200` space: *"Happy Diwali! Sweets & gifts on the Blinkit app"*. CTA button in solid `#1C1C1E` with `#FFFFFF` text: *"Shop Festive Essentials"*.
   * **Accessibility:** Contrast ratio $> 11:1$, $65\text{ px}$ safe margins respected, full alt text included.

2. **Night Lantern & Rangoli Vertical Story ($1080 \times 1920\text{ px}$):**
   * **Canvas:** Charcoal (`#1C1C1E`) background with warm paper *lanterns* (`#F8C200` and `#FF6B35`) hanging inside the top safe zone and a symmetrical floral *rangoli* at the lower middle zone.
   * **Visual Cues ($3$ cues):** Hanging lanterns, floral rangoli, and *"Diwali"* in the headline.
   * **Typography:** Centered `#FFFFFF` headline ($68\text{ px}$ Bold): *"Light up your home this Diwali"*. Subheadline in `#F8C200` ($40\text{ px}$): *"Order diyas, lanterns & decor on the Blinkit app"*. All elements clear of the $270\text{ px}$ top and $384\text{ px}$ bottom UI zones.

### 12.2 Example Unsafe Poster Descriptions (`FAIL` / `NEEDS_REVIEW`)
1. **Firecracker Sky Poster (`FAIL`):**
   * **Description:** A $1080 \times 1080\text{ px}$ poster showing colorful fireworks exploding in a smoky night sky above a box of *anar* firecrackers. Headline in `#FFFFFF` over `#F8C200` reads: *"100% Instant Diwali Delivery Guaranteed on the app!"*
   * **Why it Fails:** Contains prohibited fireworks, firecrackers, and smoke; uses prohibited words (*"100%"*, *"Instant"*, *"Guaranteed"*, standalone *"app"*); fails `#FFFFFF` on `#F8C200` contrast.

2. **Color-Only Generic Grocery Banner (`FAIL`):**
   * **Description:** A $1200 \times 600\text{ px}$ in-app banner using `#F8C200` and `#1C1C1E` stripes with photos of bread, eggs, and cooking oil. Copy reads: *"Everyday essentials delivered fast on the Blinkit app."*
   * **Why it Fails:** Does not visibly communicate Diwali ($0$ festive cues; using yellow and black colors alone is non-compliant).

3. **Ambiguous Pastel Poster (`NEEDS_REVIEW`):**
   * **Description:** A $1080 \times 1350\text{ px}$ poster with a lavender (`#E6E6FA`) and teal (`#008080`) background, a single small gift box, and copy reading *"Festive treats delivered in 9 minutes on the app."*
   * **Why it Needs Review:** Weak Diwali context (only $1$ cue—gift box—and no "Diwali" text), palette is outside approved Blinkit colors, uses standalone *"app"*, and includes an unverified delivery time claim.

---

## 13. Compliance Test Cases (Design System)

| Test Case ID | Dimensions & Format | Color Palette Used | Layout, Cues & Visual Composition | Typography & Audio / Video Details | Expected Outcome | Primary Audit Reasoning |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `DS-TC-01` | $1080 \times 1080\text{ px}$ ($1:1$ Poster) | `#F8C200`, `#1C1C1E`, `#FFFFFF`, `#FF6B35`, `#00A36C` | Clean $3\text{-zone}$ grid, $65\text{ px}$ safe margins; shows clay *diyas*, *rangoli*, and *mithai* box ($3$ cues). | `#1C1C1E` on `#F8C200` ($72\text{ px}$): *"Happy Diwali! Order sweets on the Blinkit app."* Alt text included. | **PASS** | Approved palette, $4$ total Diwali cues, strong contrast, mobile-readable text, respects safe margins, uses "Blinkit app". |
| `DS-TC-02` | $1080 \times 1920\text{ px}$ ($9:16$ Story) | `#1C1C1E`, `#F8C200`, `#FFFFFF`, `#FF6B35` | Hanging paper *lanterns*, marigold garlands, and gift boxes ($3$ cues); respects $270\text{ px}$ top / $384\text{ px}$ bottom safe zones. | `#FFFFFF` on `#1C1C1E` ($68\text{ px}$): *"Diwali gifting made simple on the Blinkit app."* | **PASS** | Compliant $9:16$ safe zones, $4$ Diwali cues, approved dark-mode contrast, compliant copy, no crackers. |
| `DS-TC-03` | $1080 \times 1080\text{ px}$ ($1:1$ Poster) | `#F8C200` and `#1C1C1E` only | Geometric yellow and charcoal chevrons with a shopping basket of detergent and apples ($0$ Diwali cues). | `#1C1C1E` on `#F8C200`: *"Order household items on the Blinkit app."* | **FAIL** | Does not visibly communicate Diwali (yellow/black palette alone without at least $2$ Diwali cues is non-compliant). |
| `DS-TC-04` | $1080 \times 1350\text{ px}$ ($4:5$ Poster) | `#1C1C1E`, `#F8C200`, `#FF6B35` | Shows a lit *chakri* firecracker spinning on the floor with smoke and aerial fireworks in the window. | *"Sparkling Diwali deals on the Blinkit app!"* | **FAIL** | Contains strictly prohibited firecrackers, fireworks, and firework smoke. |
| `DS-TC-05` | $1080 \times 1080\text{ px}$ ($1:1$ Poster) | `#F8C200`, `#FFFFFF` | Full-bleed photo of busy multi-colored rangoli and fairy lights; small $14\text{ px}$ `#FFFFFF` text placed directly on `#F8C200` area without container; rocket cracker in corner. | *"100% Guaranteed Instant Diwali Delivery!"* (No alt text). | **FAIL** | Fails contrast (`#FFFFFF` on `#F8C200`), small text over busy imagery, missing alt text, prohibited cracker, and prohibited claims. |
| `DS-TC-06` | $1080 \times 1080\text{ px}$ ($1:1$ Poster) | `#F8C200`, `#1C1C1E`, `#FF1493` (Hot Pink), `#8A2BE2` (Violet) | Dominant hot pink and violet background with a single small unlit clay lamp; no other festive decor. | *"Get your festive order in 10 minutes on the app."* | **NEEDS_REVIEW** | Palette is partially outside approved colors, Diwali context is weak ($1$ cue), uses standalone *"app"*, and has an unverified delivery claim. |
| `DS-TC-07` | $1080 \times 1920\text{ px}$ ($9:16$ Video Reel) | `#F8C200`, `#1C1C1E`, `#FFFFFF`, `#00A36C` | Video of decorating home with fairy lights, marigold *torans*, and *diyas*; smooth fade transitions; no sparkler effects. | VO: *"Light up your home this Diwali with the Blinkit app."* Synchronized `#FFFFFF` on `#1C1C1E` captions in safe zone. | **PASS** | Compliant video, audio, captions, safe zones, approved palette, and $4$ clear Diwali cues. |
| `DS-TC-08` | $1080 \times 1920\text{ px}$ ($9:16$ Video Reel) | `#1C1C1E`, `#F8C200` | Video uses animated firework explosion transitions and loud firecracker burst SFX; shows a kitchen knife cutting open a box dangerously. | VO: *"Always the fastest instant delivery on the app!"* | **FAIL** | Contains firework animations, firecracker audio SFX, dangerous weapon/object usage, and prohibited claims (*"Always"*, *"instant"*). |
| `DS-TC-09` | $1200 \times 600\text{ px}$ ($2:1$ Banner) | `#F8C200`, `#1C1C1E`, `#FFFFFF` | Shows Spider-Man and an unlicensed third-party beverage logo next to a gift box and diya. | *"Happy Diwali from the Blinkit app!"* | **FAIL** | Uses a copyrighted character (Spider-Man) and an unlicensed third-party logo. |
| `DS-TC-10` | $1080 \times 1350\text{ px}$ ($4:5$ Poster) | `#F8C200`, `#1C1C1E`, `#FFFFFF`, `#FF6B35` | Soft-focus warm yellow background with abstract glowing circles (ambiguous whether fairy lights or sparks) and one decorative bowl. | *"Warm wishes for the season from the Blinkit app."* | **NEEDS_REVIEW** | Contains ambiguous festive imagery and weak Diwali context (unclear if $\ge 2$ approved cues are present; no explicit "Diwali" text). |
| `DS-TC-11` | $1920 \times 1080\text{ px}$ ($16:9$ Banner) | `#FFFFFF`, `#1C1C1E`, `#F8C200`, `#00A36C`, `#FF6B35` | Clean split layout: left side has `#1C1C1E` text on `#F8C200` canvas; right side shows gift boxes, Indian sweets, brass *diyas*, and marigold flowers ($4$ cues). | *"Happy Diwali! Send gift boxes and sweets via the Blinkit app."* Green `#00A36C` badge includes text label *"In Stock"*. Alt text present. | **PASS** | Meets all layout, contrast, color-accessibility, Diwali cue ($\ge 2$), and copy requirements. |