# SIG·LAB — burda.eu.org

Osobista strona Marcina Burdy: portfolio projektów, laboratorium sieci neuronowej
uczony na żywo w przeglądarce i eksperyment z formą „instrumentu pomiarowego”.

**Zero zależności runtime.** Cała grafika (oscyloskop, wykresy ML) jest generowana
proceduralnie — WebGL1 z fallbackiem Canvas 2D — a sieć neuronowa w sekcji LAB
jest prawdziwa: forward pass, MSE, backprop i SGD napisane od zera w TypeScript.

## Stack

- [Vite 7](https://vite.dev) + TypeScript (strict) — tylko jako toolchain budowania,
- nowoczesny CSS (custom properties, `color-mix`, clamp), bez frameworków,
- self-hosted fonty (Bricolage Grotesque, Instrument Sans, JetBrains Mono — subsety
  latin + latin-ext, czyli z polskimi znakami),
- WebGL1 (własny shader) + Canvas 2D + `<canvas>`-owy trening MLP,
- publikacja: GitHub Pages + GitHub Actions (domena z `public/CNAME`).

## Szybki start

```bash
npm install
npm run dev        # serwer developerski z HMR
npm run build      # typecheck (tsc --noEmit) + build produkcyjny do dist/
npm test           # testy rdzenia ML (gradient check, zbieżność) — node tools/ml.test.ts
npm run preview    # podgląd dist/ lokalnie
```

## Struktura

```
index.html          ← CAŁĄ TREŚĆ edytujesz tutaj (teksty, projekty, kontakt)
src/
  main.ts           ← bootstrap; leniwe doładowanie scope i lab
  ui.ts             ← kursor-probnik, zegar bezela, rok w stopce, wjazdy sekcji
  scope.ts          ← oscyloskop hero (WebGL1 + fallback Canvas 2D)
  lab.ts            ← SYGNAŁ·LAB: rendering i sterowanie treningiem
  ml.ts             ← czysty rdzeń ML: MLP 1–H–1 (tanh), MSE, backprop, SGD
  styles.css        ← design system (tokeny na górze pliku: kolory, fonty, rytm)
  fonts.css         ← @font-face (generowane, nie edytuj ręcznie)
tools/
  ml.test.ts        ← testy rdzenia ML (npm test)
public/
  fonts/*.woff2     ← self-hosted fonty
  og.html / og.png  ← karta Open Graph (og.html to źródło do regeneracji PNG)
  404.html          ← strona błędu dla GitHub Pages
  CNAME             ← domena burda.eu.org
```

## Jak edytować treść

| Co | Gdzie |
|---|---|
| Imię, claim, lead, CTA | `index.html` → sekcja `CH·01` |
| Projekty | `index.html` → sekcja `CH·03` (każdy projekt to `<article class="proj">`) |
| Możliwości / statusy | `index.html` → tabela w `CH·04` |
| Zasady pracy | `index.html` → lista w `CH·05` |
| E-mail / GitHub / LinkedIn | `index.html` → sekcja `CH·06` (LinkedIn ma slot „kanał nieaktywny” — podmień na link) |
| Kolory i typografia | `src/styles.css` → blok `:root` |
| Sterowanie labem (zakresy, LR) | `src/lab.ts` → `TARGETS`, opcje w `index.html` (`#lab-lr`) |

Po zmianie tekstu w hero zaktualizuj też `og.html` (i ewentualnie wygeneruj ponownie
`og.png`: zbuduj stronę, otwórz `/og.html` w przeglądarce o wymiarach 1200×630
i zapisz zrzut jako `public/og.png`).

## Publikacja

Repo jest podpięte pod **burda.eu.org** przez GitHub Pages. Workflow
`.github/workflows/deploy.yml` buduje stronę przy każdym pushu do `main`
i publikuje katalog `dist/`.

Pierwsze wdrożenie:

1. Wypchnij `main` na GitHuba.
2. W repo: **Settings → Pages → Source: GitHub Actions**.
3. Domena: **Settings → Pages → Custom domain**: `burda.eu.org` (plik `CNAME`
   jest już w `public/`, więc zostanie wdrożony automatycznie).
4. DNS: rekord CNAME `burda.eu.org → sigpath.github.io` (lub A/AAAA na Pages)
   + włącz „Enforce HTTPS” po pierwszym deploymencie.

## Wydajność i dostępność — co już zrobione

- inicjalny JS ≈ 2 kB gzip; scope i lab doładowywane leniwie (code-splitting),
- rAF oscyloskopu pauzuje poza viewportem i w nieaktywnej karcie,
- `prefers-reduced-motion`: brak animacji, oscyloskop renderuje statyczną klatkę,
  trening NN startuje dopiero na przycisk,
- pełna dostępność klawiaturą (skip-link, widoczny focus, natywne kontrolki),
  statystyki labu w `aria-live`, canvasy z `role="img"` i etykietami,
- semantyczny HTML, jeden `<h1>`, metadane SEO/OG, sitemap, robots, 404.

## Licencja

Kod strony: do użytku własnego autora. Treść projektów linkuje do publicznych
repozytoriów na GitHubie.
