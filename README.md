# THEBETTERSELF — website

Static, dependency-free site. Open `index.html` directly or serve the folder with any static host
(Netlify, Vercel, Cloudflare Pages, GitHub Pages, plain Nginx).

```
thebetterself/
├── index.html            main page: hero, 30-day result, method, coaching, Juan, apply, FAQ, final
├── privacy.html          legal placeholder
├── terms.html            legal placeholder
├── css/styles.css        design system + all section styles
├── js/main.js            behaviour (nav, reveals, sliders, form, founding spots)
└── assets/
    ├── brand/            logo + monogram SVGs, favicons, touch icon
    └── img/              photos (WebP + JPEG fallbacks), OG image
        └── transformations/   placeholder before/after images + PROMPTS.md
```

## Things to edit before launch

| What | Where |
|------|-------|
| Founding spots taken (manual, never automatic) | `js/main.js` → `CONFIG.foundingSpots.taken` |
| Intro animation | plays once per browser session (`sessionStorage`), skipped for reduced-motion users |
| Form backend | `js/main.js` → `CONFIG.formEndpoint` (POSTs JSON). Empty = confirmation only, no data sent. |
| 30-day before/after photos | `assets/img/transformations/tf-01-before|after.{jpg,webp}` (real photos; `tools/import-transformation.py` re-imports a pair) |
| Hero image | `assets/img/juan-hero-{800,1200,1600}.webp` + `juan-hero.jpg` (currently a treated crop of Juan's portrait; swap for a lifestyle photo if preferred) |
| Instagram URL, contact email | `index.html` footer (search `EDITABLE`) |
| Canonical URL / OG image URL | `index.html` `<head>` |
| FAQ answers that depend on undefined policy | `index.html` — look for `<!-- EDITABLE` comments (payment, response time, platform) |
| Privacy / Terms text | `privacy.html`, `terms.html` |
| Real client stories | `index.html` → `.story` items (add `<img>`, quote, result; remove the "coming soon" flag) |

## Brand

- Wordmark: `THEBETTERSELF` set in Inter Tight (THE / SELF weight 500, BETTER weight 700).
- Monogram: `TBS` in a thin-framed square. Used for favicon, touch icon, mobile nav, social avatars.
- Colours: `#0a0a0a` black · `#141414` charcoal · `#f5f3ee` warm white · `#ece9e2` off-white · greys `#dcd8cf / #b9b5ac / #86827a / #4b4945` · accent `#b8a98c` (used only on the founding counter).
- Type: Inter Tight for headlines (uppercase, -0.035em tracking), Inter for body and labels.

## Honesty rules baked into the site

- The before/after pair is real and labelled as real photographs, with a results-vary note.
- No testimonials, names, statistics or reviews are invented; the stories section ships as labelled placeholders.
- The founding counter is static and config-driven.
- The form success message does not claim an email was sent.
- No guaranteed results, no medical claims, no invented certifications.
