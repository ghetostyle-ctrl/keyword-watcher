# 키워드와처 design system

## 1. Atmosphere & Identity
A bold, independent market-observation workspace. User explicitly replaced the former soft green reference direction with orange and black. Functional layout stays task-focused; identity now comes from a charcoal navigation rail, a charcoal market-signal panel, vivid orange action surfaces, and clear white data cards. Repeated black framing and orange data accents form one coherent system. Personas and decision path remain: connect data, register keywords, read change, inspect details.

## 2. Color
Primary brand orange **#FF6B00** (--brand), hover **#FF8126** (--brand-hover); core black **#121212** (--black). Orange-filled buttons carry black text (6.56:1), never white text. Light-surface accent text uses **#B54708** (--accent, at least 4.87:1 on peach); accent hover #93370B; accent-soft #FFF0E5; accent-tint #FFF7F0. Canvas #FAFAF8, surface #FFFFFF, surface-subtle #F7F5F2, surface-muted #F2F0EC; ink #121212, muted #62605D, subtle #716E69, line #E2DED9. Dark contexts: dark-surface #1D1D1D, dark-hover #282828, dark-line #3A3A3A, on-dark #FAFAFA, muted-on-dark #B3B3B3. Existing semantic warning #8A6318/#FBF6E8 and error/down #BF4646/#FDF0EF remain for clarity. Upward changes use dark orange plus up arrows; downward changes use red plus down arrows. No green brand surfaces remain.

Sidebar, ticker and market-signal regions scope ink/muted/accent/surface/border tokens to their dark-context equivalents. Selected navigation uses black text on solid orange. Selected category filter uses white on black. Focus outlines use dark orange on light, vivid orange on dark. Every live component continues to reference semantic tokens.

## 3. Typography
Primary font: local system UI with 'Segoe UI', 'Malgun Gothic', sans-serif fallback. No remote font required. Mono: ui-monospace for dates and code. Scale tokens: --text-xs 12px, --text-sm 13px (metadata), --text-base 14px, --text-md 16px, --text-lg 18px, --text-xl 22px, --text-2xl 28px, --text-3xl 32px. Body line height 1.6, titles 1.3, weight 400/500/600/700/800. Tabular numerals for metrics. Responsive page title 22–32px, strong 800 weight.

## 4. Spacing & Layout
Base 4px. --s1 4px, --s2 8px, --s3 12px, --s4 16px, --s5 20px, --s6 24px, --s8 32px, --s10 40px, --s12 48px, --s16 64px. Fixed-sidenav-shell: --sidebar 232px, main content max 1440px. Main scroll owner is the document; sidebar is fixed with its own overflow only if short viewport. Desktop gutter 40px, compact 24px, mobile 16px. Under 900px sidebar becomes top navigation with wrapping links. Cards intrinsic grid minmax(min(240px,100%),1fr); table owns only horizontal overflow, mobile rows have card layout. Dialog width min(560px, viewport minus 32px). Section spacing 32px.

## 5. Components
- Brand: exact Korean name **키워드와처** (user-selected spelling), 32px square SVG mark plus a single-line Korean wordmark. Mark uses the brand orange/black tokens: a magnifying glass around an upward keyword trend, replacing the old bar chart. SVG 40×40 artboard, 10px corner radius, black 2.5px rounded strokes. Wordmark uses 22px/700, -0.04em tracking; 와처 is orange on the dark rail. Mobile uses existing 18px brand token. Home-link accessible name is 키워드와처 홈. Mark source `public/brand-mark.svg` is shared by sidebar and tab icon.
- Button: icon + label, primary/secondary/ghost; min 40px height, 8px radius. Hover tonal darkening, active translateY(1px), 3px accent outline focus with 3px offset; disabled reduced contrast with explicit title/reason. Pending text reflects work.
- Badge: pill, positive/neutral/warning/error; 12px medium text, 4/8 padding, text labels supplement color.
- Card: white bordered region, 12px radius, 24px padding. Section title + metadata + content. Empty state uses icon, plain-language explanation and action; no skeleton pretending to be values.
- Field: labeled input/select/textarea, 40px minimum, 8px radius, visible focus ring, help text, inline alert on error.
- Sidebar link: icon + text, active black on solid orange, aria-current page, keyboard native anchor.
- Metric card: caption, value or em dash, explanatory line; empty means unknown rather than zero searches.
- Dialog: native dialog showModal, keyboard close and focus return, heading, contextual content; scroll owner dialog at max 85dvh.
- Tabs: semantic filter buttons aria-pressed, wrapping with category count, white-on-black active.
- Keyword table: sortable column buttons, row detail button, category badge, tabular numbers. No baseline always displays status instead of fabricated change.
- Trend history: real stored points only, gaps break the polyline, dots for single-point data; accessible companion date/value list.
- Ticker: duplicate only real rising keywords for seamless transform animation; pause button and pause on hover/focus, reduced motion static.
- Component showcase: /?showcase=1 for button, badge, card, field, empty/loading/error states. Pure design copy only, no sample keyword measurements.

## 6. Motion & Interaction
--motion-fast 140ms ease-out for opacity and transform. Ticker 40s linear transform, pause on interaction, button can disable. Native modal uses no trapping animation. Reduced-motion disables animation and transforms. Empty, loading, error, disconnected, collecting, and success must be visible text states.

## 7. Depth & Surface
Borders plus very light shadows: --shadow-card 0 2px 6px rgb(18 18 18 / 3%); --shadow-dialog 0 24px 80px rgb(32 43 39 / 16%). --radius-sm 6px, --radius-md 10px, --radius-lg 14px, --radius-pill 999px. Chart line is dark orange, grid uses --line. No decorative data graph when database is empty.

## 8. Accessibility Constraints & Accepted Debt
Target WCAG 2.2 AA: readable contrast, visible focus, headings, labels, native buttons, semantic tables, status role for async outcomes, alert for failures, reduced motion, skip link. Touch targets 40px minimum (44px mobile). Empty database, long/unbroken keyword, loading and narrow viewport must remain usable. No accepted accessibility debt. Live API validation is pending user credentials and is a data-integration limitation, not a visual debt.

### Orange/black signature details
Metric cards use a 3px black top edge; rising cards use a 3px orange top edge. The dark signal panel carries a 4px orange leading edge. These static accents encode panel hierarchy; no decorative animation or invented chart/data is added.


### Category selection and starter keywords
The keyword-management page starts with eight category buttons using the existing card, field, and orange/black selection tokens. Categories are manual starter collections, never live rankings. Each reveals 30 named keywords with native labeled checkboxes, select/clear controls, a selected/new count, and one explicit registration action. Existing tracked keywords are marked and cannot be selected again; paused entries retain their state. A neutral unselected state avoids choosing a market for the user. Category labels, descriptions and selections wrap at 375/768/1280 widths, with a two-column category grid on mobile and four columns on wide screens. Keyword choices reflow from three columns to two; each hit area is at least 44px. Selection has a visible check and text; controls have focus rings, loading/error/success text and keyboard semantics. No decorative motion is introduced. Manual registration uses a native category select with a separate custom-category option. The registered list also has a category filter. Reuse all existing color, type, spacing and radius tokens; no new visual tokens required.
