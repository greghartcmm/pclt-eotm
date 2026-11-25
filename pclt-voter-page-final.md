# Voter Page — Winner Recognition & Voter ID Spec
**Reference mockup:** `pclt-voter-page-final.html`
Toggle the switcher at the top to see all three winner states.

---

## Overview

Two additions to the voter page:
1. **Voter identity** moves from a full-width row inside the ballot card to a lightweight absolute-positioned element in the hero header — zero height impact.
2. **Hall of Fame strip** appears between the hero and the ballot card, conditionally rendered based on how many past winners exist.

Everything else on the voter page is unchanged.

---

## 1. Hero header — no changes to height or border-radius

The hero header keeps its **existing height and straight bottom edge** (no `border-radius`).

Add `position: relative` to the hero container to anchor the voter ID element.

**Remove** the existing voter row from inside the ballot card entirely.

---

## 2. Voter identity — absolute positioned in hero

```jsx
// Positioned absolute — does not affect hero height
<div style={{
  position: 'absolute',
  top: '0.85rem',
  right: '1.25rem',
  display: 'flex',
  alignItems: 'center',
  gap: '7px',
}}>
  <div style={{
    width: 26, height: 26, borderRadius: '50%',
    background: 'rgba(255,255,255,0.12)',
    border: '1.5px solid rgba(255,255,255,0.20)',
    color: 'rgba(255,255,255,0.70)',
    fontSize: '0.52rem', fontWeight: 800,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>
    {initials}  {/* e.g. "GH" */}
  </div>
  <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.38)', whiteSpace: 'nowrap' }}>
    Voting as <strong style={{ color: 'rgba(255,255,255,0.58)', fontWeight: 700 }}>{voterName}</strong>
  </span>
</div>
```

### Mobile (≤ 480px)
Hide the text label — show only the avatar circle:
```css
@media (max-width: 480px) {
  .voter-text { display: none; }
  .voter-av {
    width: 28px; height: 28px; font-size: 0.55rem;
    background: rgba(255,255,255,0.15);
    border-color: rgba(255,255,255,0.25);
    color: rgba(255,255,255,0.80);
  }
}
```

---

## 3. Hall of Fame strip — conditional rendering

The strip renders **between the hero and the ballot card**, flush with the page edges (full width, white background, 1px bottom border matching `var(--border)`).

### Rendering logic — three states

```jsx
const winners = getWinnerHistory(); // from winners Supabase table, sorted newest first
const mostRecent = winners[0];
const pastWinners = winners.slice(1); // all except most recent
```

#### State 0 — No winners (`winners.length === 0`)
**Do not render the strip at all.** Page goes straight from hero to ballot.

```jsx
{winners.length > 0 && <HofStrip ... />}
```

#### State 1 — Exactly one winner (`winners.length === 1`)
Render the strip with winner portrait + info only.
**Do not render:** the divider, the past-winner circles, or the "View all" link.
The strip is **not clickable** (no modal to open).

```jsx
<div className="hof-strip" style={{ cursor: 'default' }}>
  <HofWinner winner={mostRecent} />
  {/* Nothing else */}
</div>
```

#### State 2+ — Multiple winners (`winners.length >= 2`)
Render the full strip. Winner on the left, divider, past-winner circles + "View all" on the right.
The entire strip is clickable and opens the Hall of Fame modal.

```jsx
<div className="hof-strip" onClick={openModal}>
  <HofWinner winner={mostRecent} />
  <div className="hof-divider" />
  <HofPastWinners winners={pastWinners} onViewAll={openModal} />
</div>
```

---

## 4. HOF strip — design specs

```css
.hof-strip {
  background: white;
  border-bottom: 1px solid var(--border); /* #E4ECF0 */
  padding: 0.85rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 1.25rem;
  transition: background 0.13s;
}
/* State 2+ only: */
.hof-strip:hover { background: #FAFCFD; cursor: pointer; }
```

### Winner section (left)

```css
.hof-winner {
  display: flex; align-items: center; gap: 0.85rem;
  flex: 1; min-width: 0;
}
```

**Portrait circle:**
```css
width: 50px; height: 50px; border-radius: 50%; overflow: hidden;
border: 3px solid rgba(255,255,255,0.15);
```
Image: `object-fit: cover; object-position: center top`
Source: `winner.portrait_url` — the individual cartoon portrait stored per person.

**Kicker:** `"[Month] [Year] Winner"` e.g. `"June 2026 Winner"`
```css
font-size: 0.57rem; font-weight: 700; letter-spacing: 0.18em;
text-transform: uppercase; color: #219EBC; margin-bottom: 2px;
```

**Name:**
```css
font-family: Georgia, serif; font-size: 0.98rem; font-weight: 800;
color: #023047; margin-bottom: 2px; line-height: 1.1;
```

**Featured comment** (show only if `winner.featured_comment` exists):
```css
font-size: 0.7rem; color: #6b7f8a; font-style: italic; line-height: 1.3;
```
Wrap in quotes: `"${winner.featured_comment}"`

### Divider (State 2+ only)
```css
width: 1px; height: 38px; background: #E4ECF0; flex-shrink: 0;
```

### Past winners section (State 2+ only)

```css
.hof-right {
  display: flex; align-items: center; gap: 0.65rem; flex-shrink: 0;
}
```

**"Past winners" label:**
```css
font-size: 0.57rem; font-weight: 700; letter-spacing: 0.1em;
text-transform: uppercase; color: #9AAAB5; white-space: nowrap;
```

**Stacked portrait circles** — show up to 4, then a "+N" overflow circle:
```css
/* Each circle */
width: 28px; height: 28px; border-radius: 50%; overflow: hidden;
border: 2px solid white; margin-left: -6px; /* stacking overlap */
transition: transform 0.13s;
```
```css
/* First circle */
margin-left: 0;
```
```css
/* Hover */
transform: translateY(-2px); z-index: 5; position: relative;
```
```css
/* +N overflow circle */
background: #023047; display: flex; align-items: center; justify-content: center;
font-size: 0.52rem; font-weight: 800; color: #FFB703;
```

Max circles to show before overflow: `4` (so if 7 past winners, show 3 portraits + "+4" circle).

**"View all →" button:**
```css
font-size: 0.68rem; font-weight: 700; color: #219EBC;
white-space: nowrap; background: none; border: none; cursor: pointer;
```

### Mobile (≤ 560px)
```css
.hof-strip { flex-wrap: wrap; gap: 0.75rem; padding: 0.9rem 1.1rem; }
.hof-divider { display: none; }
.past-label { display: none; }
```
The winner info and past circles stack vertically. Portrait circles are self-explanatory without the label.

---

## 5. Hall of Fame modal

Opens when:
- User clicks anywhere on the strip (State 2+ only)
- User clicks "View all →"

Dismisses:
- Click the ✕ button
- Click the backdrop

```css
/* Overlay */
position: fixed; inset: 0; z-index: 500;
background: rgba(2,48,71,0.65);
display: flex; align-items: center; justify-content: center;
padding: 1.25rem;
```

```css
/* Modal card */
background: white; border-radius: 16px;
max-width: 600px; width: 100%;
max-height: 85vh; overflow-y: auto;
box-shadow: 0 24px 64px rgba(0,0,0,0.45);
```

### Modal header
```css
background: #023047; padding: 1.1rem 1.5rem;
display: flex; align-items: center; justify-content: space-between;
position: sticky; top: 0; border-radius: 16px 16px 0 0;
```
Title: `"Hall of "` + `<em style="color:#FFB703">Fame</em>` — Georgia serif, `1.05rem`, `800`, white.

Close button: `rgba(255,255,255,0.4)`, hover `white`, `font-size: 1.3rem`.

### Winner rows

One row per winner, newest first (same order as `getWinnerHistory()`).

```css
/* Row */
display: flex; align-items: center; gap: 1rem;
padding: 0.85rem 0.5rem; border-bottom: 1px solid #F0F5F8;
border-radius: 8px; cursor: pointer; transition: background 0.13s;
```
```css
/* Row hover — future: open celebration overlay */
background: #F5FBFD;
```

**Portrait:** `width: 60px; height: 60px; border-radius: 50%; overflow: hidden; border: 3px solid #E4ECF0`
Hover: `border-color: #8ECAE6`

**Month label:** `0.58rem, 700, #9AAAB5, uppercase, 0.14em tracking`
**Name:** Georgia serif, `1.05rem`, `800`, `#023047`
**Meta:** `0.66rem, #9AAAB5` — e.g. `"12 votes · PCLT Team"`
**Comment:** `0.75rem, #6b7f8a, italic` — wrapped in quotes. Only render if `featured_comment` exists.

---

## 6. Portrait images — storage

Each eligible voter has an individual cartoon portrait. Store as:
- Supabase Storage bucket: `portraits`
- Filename convention: `[initials]-portrait.png` or keyed to voter ID
- Access via `winner.portrait_url` on the winners record

The `winners` table already has `winner_names[]`. Add a `portrait_url` field or join from a `people` table that maps names → portrait URLs.

---

## 7. Data source

All winner data comes from the existing `winners` Supabase table:

```sql
-- Fetch all winners for display, newest first
select month, winner_names, featured_comment, vote_count, total_votes, declared_at
from winners
order by declared_at desc;
```

The most recent row drives the "current winner" display in the strip.
All rows (excluding most recent) populate the past-winner circles.
All rows populate the modal.

---

## What does NOT change

- Hero header height, font sizes, padding, or content
- Ballot card layout, candidate grid, selection behavior
- Vote submission and Supabase write logic
- Splash screen
- Admin page
