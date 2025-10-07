MZNet UI — Design Guide (Readme.UI)

Summary
- Scope: visual properties to replicate the UI 1:1 (colors, typography, spacing, borders, shadows, states, breakpoints).
- Tech: HTML5/inline CSS, Bootstrap 5 (CDN), Tailwind (CDN utilities), Google Fonts (Poppins).

Visual Identity
- Primary brand: #018942 (MZNet green).
- Supporting tones: #007F3D (brand-600), #006634 (brand-700).
- Neutrals: #FFFFFF (white), #000000 (black).
- Global color-scheme: light (":root { color-scheme: light; }").

Colors (Tokens)
- brand/500: #018942
- brand/600: #007F3D
- brand/700: #006634
- neutral/white: #FFFFFF
- neutral/black: #000000
- overlay/white-92: rgba(255, 255, 255, 0.92)
- overlay/white-90: rgba(255, 255, 255, 0.90)
- overlay/white-60: rgba(255, 255, 255, 0.60) — focus outline (buttons/links)
- overlay/white-55: rgba(255, 255, 255, 0.55) — focus-visible outline (home cards)
- overlay/white-35: rgba(255, 255, 255, 0.35) — back-link border
- overlay/white-12: rgba(255, 255, 255, 0.12) — back-link hover background
- overlay/white-08: rgba(255, 255, 255, 0.08) — back-link background
- overlay/white-25: rgba(255, 255, 255, 0.25) — text/drop shadows
- overlay/black-28: rgba(0, 0, 0, 0.28) — option-card hover shadow
- overlay/black-25: rgba(0, 0, 0, 0.25) — general shadows (cards/buttons/inputs)
- overlay/black-22: rgba(0, 0, 0, 0.22) — back-link hover shadow
- overlay/black-15: rgba(0, 0, 0, 0.15) — back-link default shadow
- input/bg-translucent: rgba(217, 217, 217, 0.20) — default input background
- ring/brand-25: rgba(1, 137, 66, 0.25) — focus ring (box-shadow 0 0 0 0.25rem)

Background
- Page gradient: linear-gradient(180deg, #018942 0%, rgba(0, 230, 110, 0.70) 50%, #000000 87.66%).

Typography
- Family: 'Poppins', 'Segoe UI', sans-serif.
- Weights: 400, 500, 600, 700.
- Hero title (hero-title): 1.45rem, 700, centered, text-shadow: 0 3.184px 6.368px overlay/white-25.
- Home title (page-title): 27.06px, line-height 35px, 700, shadow: 0 4px 4px rgba(0, 0, 0, 0.25).
- Form label (form-label): 0.75rem, 700, text-shadow: 0 1.355px 1.355px overlay/white-25; margin-bottom: 0.35rem.
- Tagline: 0.9rem, 600, letter-spacing 0.08em, centered.
- Footer: 0.75rem, letter-spacing 0.02em, color: overlay/white-90.

Spacing & Layout
- Body: margin 0; min-height 100vh; display flex; flex-direction column; color #FFF.
- Home (choice page): centered body; main width: min(390px, calc(100% - 2.5rem)); min-height 844px.
- Main container (hero-shell): flex: 1 0 auto; center alignment; padding: 3rem 1.25rem 2rem.
- Card (card-shell): width min(100%, 364px); padding 2.5rem 1.75rem.
- Responsive: ≥576px → padding 3rem 2.75rem; ≥768px → width min(100%, 420px).
- Home frame: column with 1.75rem gap; option-card internal gap 0.75rem.

Borders & Radius
- Cards (card-shell): border-radius 30px; 1.34px solid #FFFFFF.
- Inputs/Selects (input-pill): border-radius 30px; 1.36px solid #FFFFFF; padding 0.85rem 1.25rem.
- Primary button (cta-btn): border-radius 41px; border none.
- Icon wrap (home): 74×74px; 2px solid #018942; border-radius 50%.
- Back-link: border-radius 999px; 1px solid overlay/white-35.

Shadows
- Main card: box-shadow 0 22px 60px overlay/black-25; filter drop-shadow(0 6.714px 5.371px overlay/white-25).
- Inputs: box-shadow 0 5.447px 5.447px overlay/black-25.
- Button hover: box-shadow 0 10px 18px overlay/black-25.
- Option-card: default 0 6px 4px overlay/black-25; hover 0 16px 22px overlay/black-28.
- Back-link: 0 4px 10px overlay/black-15; hover 0 8px 16px overlay/black-22.

Components
- Card Shell (.card-shell):
  - Background brand/500; 1.34px white border; 30px radius; shadows above.
  - Centered content; responsive width/padding.
- Primary Button (.cta-btn):
  - Background #FFFFFF; text #018942; 700; 1rem; padding 0.75rem 1rem; 41px radius.
  - Hover: translateY(-1px) + shadow 0 10px 18px overlay/black-25.
  - Focus: outline 3px overlay/white-60; offset 2px.
- Inputs & Selects (.input-pill):
  - 30px radius; 1.36px white border; 0.85rem 1.25rem padding; soft shadow.
  - Default: input/bg-translucent background; text #FFFFFF; placeholder white 70%.
  - Address (PJ) variant: background #FFFFFF; text #018942; placeholder #018942 at 65%; white border.
  - Focus (all): box-shadow 0 0 0 0.25rem ring/brand-25 (focus ring).
  - Select: option color #018942; background #FFFFFF.
  - WebKit autofill: enforce white background and #018942 text.
- Back Link (.back-link):
  - Fixed (top 14px; left 14px); padding 6px 10px; 999px radius.
  - Background overlay/white-08; border overlay/white-35; text overlay/white-92.
  - Hover: background overlay/white-12; translateY(-1px); shadow 0 8px 16px overlay/black-22.
  - Focus: outline 3px overlay/white-60; offset 2px.
- Option Cards (Home, .option-card):
  - 298×144px; 30px radius; background #FFFFFF; text #018942; 0.2s transitions; gap 0.75rem.
  - Hover: translateY(-3px); shadow 0 16px 22px overlay/black-28.
  - Focus-visible: outline 4px overlay/white-55; outline-offset 4px.
  - Icon: 40×40 SVG inside .icon-wrap 74×74 with 2px #018942 border.

States & Accessibility
- Visible focus across buttons, links, inputs, and option-cards.
- HTML5/Bootstrap visual validation: toggles .is-valid / .is-invalid.
- Component links without underline; maintain AA contrast for text.

Breakpoints
- ≥576px (sm): card-shell padding 3rem 2.75rem.
- ≥768px (md): card-shell width min(100%, 420px).
- Height ≤844px (home): main uses min-height 100vh; frame adds 2.5rem vertical padding.

Icons & Images
- Logo: Assets/logo-mznet.png (use ../Assets in internal pages).
- Icons: inline SVGs (home) — 40×40 inside a 74px circle.

UI Dependencies (CDN)
- Google Fonts Poppins (weights 400, 500, 600, 700).
- Bootstrap 5.3.3 CSS via jsdelivr.
- Tailwind via CDN with brand color preset (no local build).

Implementation Notes
- Case-sensitive filenames (Linux). Keep exactly: “Cadastro PF/index.html” and “Cadastro PJ/Indexpj.html”.
- Internal pages link back to "../direcionamento.html"; home points to folders with spaces.
- If production lacks a root index.html, use a redirect to /direcionamento.html or a rewrite.

