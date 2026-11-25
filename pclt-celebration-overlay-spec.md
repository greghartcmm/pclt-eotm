# Winner Celebration Overlay — Spec
**Reference mockup:** `pclt-celebration-overlay-mockup.html`
Click "First-time visitor" vs "Returning visitor" at the top to see both paths.

---

## Overview

New behavior: the **first** time a voter opens the voting page after a new winner is announced, the normal splash → voting-page transition plays as-is, then a celebration overlay appears on top of the voting page announcing that month's winner. Every subsequent visit for that same winner skips the overlay and goes straight to the ballot.

This is additive — no existing screens change.

---

## 1. Trigger logic

### New table: `celebration_seen`

```sql
create table celebration_seen (
  token text not null,
  winner_month text not null,   -- e.g. "2026-08", matches winners.month
  seen_at timestamptz default now(),
  primary key (token, winner_month)
);
```

Keyed to `token` (not device/browser), so a voter who opens their link on phone and desktop only sees it once — consistent with how the rest of the app already treats the token as voter identity.

### On page load

```jsx
const winner = getWinnerHistory()[0]; // most recent, already fetched for HOF strip
const alreadySeen = winner
  ? await hasSeenCelebration(token, winner.month)
  : true; // no winner yet → never show

const shouldCelebrate = winner && !alreadySeen;
```

`hasSeenCelebration` is a single-row lookup on `celebration_seen` by `(token, winner.month)`.

---

## 2. Sequence

1. Splash screen plays exactly as today — **no changes to splash.**
2. Splash transitions out, voting page (hero + HOF strip + ballot) renders underneath — **no changes to this transition.**
3. If `shouldCelebrate`: wait ~500ms after the voting page has settled, then mount the celebration overlay (fade + scale in, ~280ms).
4. If not `shouldCelebrate`: nothing further happens — normal voting page.

The 500ms pause matters — mounting the overlay in the same frame as the page transition makes both feel like one confusing motion. Letting the voting page land first, then having the overlay arrive as its own beat, reads as two intentional moments instead of one messy one.

---

## 3. Celebration overlay — design specs

Same backdrop/card conventions as the existing Hall of Fame modal, so it reads as part of the same system rather than a new pattern.

```css
/* Overlay backdrop — same as HOF modal */
position: fixed; inset: 0; z-index: 600;
background: rgba(2,48,71,0.72);
display: flex; align-items: center; justify-content: center;
padding: 1.25rem;
```

```css
/* Card */
background: white; border-radius: 20px;
max-width: 380px; width: 100%;
padding: 2.25rem 1.75rem 1.75rem;
text-align: center;
box-shadow: 0 28px 70px rgba(0,0,0,0.5);
position: relative;
```

**Close button (✕):** top-right, same treatment as `.modal-close`.

**Portrait:** reuses `winner.portrait_url` (same asset as the HOF strip), shown large:
```css
width: 132px; height: 132px; border-radius: 50%;
border: 5px solid var(--amber);
margin: 0 auto 1.1rem;
box-shadow: 0 0 0 8px rgba(255,183,3,0.15); /* soft radiant ring */
```

**Kicker:** `"🎉 [Month] [Year] Winner"` — same treatment as `.hof-kicker` (teal, uppercase, letter-spaced).

**Headline:** `"Congrats, {first_name}!"`
```css
font-family: Georgia, serif; font-size: 1.7rem; font-weight: 900;
color: var(--navy); line-height: 1.15; margin-bottom: 0.5rem;
```

**Featured comment** (only if `winner.featured_comment` exists) — same italic treatment as `.hof-comment`, wrapped in quotes.

**CTA:**
```css
background: var(--amber); color: var(--navy);
font-weight: 800; font-size: 0.85rem;
border-radius: 10px; padding: 0.7rem 1.5rem;
border: none; cursor: pointer; margin-top: 1.25rem;
```
Label: `"Let's vote →"`

**Confetti:** a handful of small dots in brand colors (amber, orange, teal, sky, magenta), scattered around the card, one-shot burst animation on mount. Respect `prefers-reduced-motion: reduce` — no animation, dots appear static or are omitted entirely.

---

## 4. Dismissal

Any of the following dismiss the overlay and mark it seen:
- Click "Let's vote →"
- Click ✕
- Click the backdrop

```jsx
async function dismiss() {
  await markCelebrationSeen(token, winner.month); // upsert into celebration_seen
  setShowCelebration(false);
}
```

No auto-dismiss timer — let the voter close it themselves so it doesn't feel rushed or get missed.

---

## 5b. Admin: simulate a winner (preview mode)

Before voting closes, admins need to see what the celebration overlay will actually look like — portrait size, name length, comment wrap — without declaring a real winner.

**Who:** Greg Hart, Megan Wetzel, Bridget Readey. Don't hardcode names in the frontend — add an `is_admin` boolean to the `people` table (the same table that already maps voter names → `portrait_url`) and check it after resolving the voter's token to their person record.

**Where:** the voter-ID element in the top-right of the hero (the existing avatar + "Voting as {name}"). For non-admins this stays exactly as it is today — static, not clickable. For admins, it becomes a button that opens a small menu:

```jsx
{isAdmin && (
  <div className="voter-id" onClick={toggleAdminMenu} style={{ cursor: 'pointer' }}>
    {/* existing avatar + "Voting as" text, unchanged */}
    {adminMenuOpen && (
      <div className="admin-menu">
        <button onClick={simulateWinner}>🎲 Simulate winner</button>
      </div>
    )}
  </div>
)}
```

**On click "Simulate winner":**

```jsx
function simulateWinner() {
  const candidates = getCurrentCandidates(); // this month's nominees — same list the ballot renders
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  setPreviewWinner(pick);
  setShowCelebration(true, { preview: true }); // same overlay component, preview flag
}
```

Each click re-rolls a new random name from the **current month's candidate list** — not past winners — since the point is previewing before this month's vote is even closed.

**What's different from the real overlay:**
- A small `PREVIEW` label on the card (dashed border or muted badge — visually distinct so it can't be mistaken for a real announcement mid-glance).
- Featured comment is a placeholder ("Sample comment — real quotes appear once voting closes") since a candidate who hasn't won yet has no `featured_comment` on file.
- **Nothing is written anywhere.** No row in `winners`, no row in `celebration_seen`. It's a pure client-side preview — dismissing it just closes the overlay, with no effect on any other voter's session.

Dismissal is identical to the real overlay (✕ / backdrop / CTA) — it just skips the `markCelebrationSeen` write.

---

## 6. Edge cases

- **No winner yet (`winners.length === 0`):** overlay never shows. Same as HOF strip's State 0.
- **Voter's first-ever visit, and a winner already exists:** overlay **does** show — "first time this voter has seen this winner" is the actual condition, not "first time this voter has ever voted."
- **Winner re-declared / corrected after the fact:** if `winner.month` value is reused, the overlay won't re-show for voters who already saw it. If a correction needs to force a re-announcement, that requires a manual delete from `celebration_seen` — not building auto-handling for this, it's rare enough to be a one-off DB fix.
- **Voter has the HOF strip modal open in another action and a winner just changed:** not a real race condition in practice (winner is only declared once a month, offline of live voting), no handling needed.

---

## What does NOT change

- Splash screen (design, timing, content)
- Splash → voting page transition
- Hero header, HOF strip, ballot — all as specced previously
- Vote submission and Supabase write logic
- Admin page
- `winners` table and real winner-declaration flow — simulate mode never writes to it
