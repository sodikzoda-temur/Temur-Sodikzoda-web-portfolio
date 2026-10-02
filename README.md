# Temur Sodikzoda – personal website

This is my personal website: a short profile of my work in sanitation and
wastewater research, with a CV that prints cleanly to A4. It is in English
and Russian and is published with GitHub Pages at https://tsodikzoda.com/.

Pages: `/` and `/ru/` (home), `/cv/` and `/ru/cv/` (CV), and a 404 page in
both languages.

## How the site is built

- [Astro](https://astro.build) generates static HTML. There is no framework
  on the client; the only scripts are the theme switch, the mobile menu, the
  email link and the CV print button.
- `src/data/` holds all the text. `src/components/` turns it into pages,
  `src/styles/` holds the design (`print.css` for paper).
- Fonts (Inter, Source Serif 4, JetBrains Mono) are served from the site
  itself, Latin and Cyrillic only.
- A strict Content Security Policy is set in a `<meta>` tag in production
  builds; the development server leaves it out.

## Editing the content

All text lives in four files:

- `src/data/en.ts` – English text.
- `src/data/ru.ts` – Russian text.
- `src/data/publications.ts` – publications, each with an English and a
  Russian citation and a note.
- `src/data/shared.ts` – things that are the same in both languages: the
  email address (stored in two parts and assembled in the browser, so it never
  appears whole in the HTML), the LinkedIn, ResearchGate and ORCID links, and
  `SHOW_AVAILABILITY`. Set that to `true` to show the availability line
  (`contact.availability` in each language) on the home page and the CV.

The two languages must have exactly the same entries and fields. This is
checked by the types: if an entry or field is missing in `ru.ts`,
`npm run check` fails and names it. The order of entries comes from the id
lists in `src/data/types.ts` (for example `WORK_IDS`); a new entry needs a
new id there.

In Russian text, an English phrase is marked so that browsers and screen
readers pronounce it as English:

```ts
title: rich('Мониторинг ветланда (', inEnglish('constructed wetland'), '), больница Дехмой'),
```

Write plain spaces and hyphens. Non-breaking spaces (for example after
Russian prepositions and in citations) are added automatically when the site
is built (`src/lib/typography.ts`). Do not use em dashes.

The printed CV carries my name in the page footer: "Temur Sodikzoda · CV"
and «Темур Содикзода · Резюме». These two texts are in
`src/styles/print.css` (CSS cannot read them from the page); if my name or
the CV heading changes, change them there too.

### Contact card and QR code

The home page and the CV offer my contact card ("Save contact (.vcf)") and,
on computers, a QR code that a phone camera turns into a shorter version of
it. The card holds my name, current role and organisation, location, email,
mobile number (with WhatsApp and Telegram links) and profile links; the QR
code holds the name, role, organisation, mobile number, email and the site
address. Both are made from the data files, the card in the browser and the
QR code when the site is built, so they follow any change there. The mobile
number is set in `PHONE_PARTS` in `src/data/shared.ts` and appears only in the
card and the QR code, never as text on a page.

### Portrait

To show a portrait next to my name on the home page, add a square photo as
`src/assets/portrait.jpg`. Without that file the page shows no portrait.

### Social preview images

`public/og-en.png` and `public/og-ru.png` (1200×630) are shown when the site
is shared. They are made from the name, first positioning line and location
in the data. After changing those, run `npm run og` and commit the new images.
This needs Chromium from Playwright (`npx playwright install chromium`).

## Working locally

You need Node.js 22 (see `.nvmrc`).

```sh
npm ci            # install exactly the locked versions
npm run dev       # development server with live reload
npm run check     # type check, including language parity
npm run build     # production build in dist/
npm run preview   # serve the production build
npm test          # Playwright tests in Chromium, Firefox and WebKit
```

Before the first test run, install the browsers once with `npx playwright install`.

The tests build the site and serve it themselves. To run one browser:
`npx playwright test --project=chromium`. Printed CVs from the tests are
saved in the system temp folder under `qa-artefacts/print`.

## Deployment

Two GitHub Actions workflows run on every push to `main`:

- `deploy.yml` checks types, builds the site, runs the tests in Chromium and
  publishes `dist/` to GitHub Pages. A last job, `verify`, then checks the
  live site from outside: every page and the 404 page, `robots.txt`, the
  sitemap, the redirect from `http://` to `https://`, the certificate and the
  security policy and referrer tags in the pages.
- `test.yml` runs the tests in Chromium, Firefox and WebKit (also on pull
  requests).

Dependabot proposes updates for npm packages and actions once a week. For npm
packages it proposes only minor and patch versions; I upgrade major versions
by hand.

The workflows can only read the repository; only the deploy step may
publish to Pages. Repository settings they need:

- Settings → Pages → Source: **GitHub Actions**.
- Settings → Pages → **Enforce HTTPS** ticked.

GitHub Pages cannot send custom HTTP headers, so the security policy is in a
`<meta>` tag. Protections that only work as headers, such as
`frame-ancestors`, are not available; for a static site without logins or
forms this is acceptable.

## Custom domain

My domain is tsodikzoda.com, with DNS at Cloudflare. The move is done; I keep
these steps for reference, and they are the same for any domain.

1. **Verify the domain.** In my GitHub account settings (not the
   repository's) → Pages → Add a domain, enter the domain. GitHub shows a TXT
   record named `_github-pages-challenge-sodikzoda-temur` on the domain. Add
   it at the DNS provider (Cloudflare), wait a few minutes, then click
   Verify.
2. **Point the domain at GitHub Pages.** At Cloudflare, add these records,
   all with Proxy status **DNS only** (grey cloud), so that GitHub can issue
   the certificate:
   - apex (`tsodikzoda.com`): `A` records to `185.199.108.153`,
     `185.199.109.153`, `185.199.110.153` and `185.199.111.153`, and `AAAA`
     records to `2606:50c0:8000::153`, `2606:50c0:8001::153`,
     `2606:50c0:8002::153` and `2606:50c0:8003::153`;
   - `www`: a `CNAME` record to `sodikzoda-temur.github.io`.
3. **Change the address in the code.** In `src/config.ts`, set the one line
   `SITE_URL` to the domain, for example `'https://tsodikzoda.com/'`. Links,
   the sitemap, `robots.txt`, social cards and the `verify` job all follow
   from it. Commit and push.
4. **At the same time, set the custom domain** in the repository: Settings →
   Pages → Custom domain. From then on Pages serves the site at the root of
   the domain and redirects the github.io address there. Do steps 3 and 4
   together: until the new build is live, the old build still expects the
   `/Temur-Sodikzoda-web-portfolio/` path and its styles and links break.
5. **Wait for the DNS check and the certificate**, then tick **Enforce
   HTTPS** in Settings → Pages. Until then the `verify` job reports that
   `http://` does not redirect to `https://`; that is expected.
