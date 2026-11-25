# Admin Page Redesign — Implementation Spec
**Reference mockup:** `pclt-admin-optionC.html`

---

## Overview

Full visual redesign of the admin page. The voter-page serif hero header is replaced with a compact utility strip. A new full-width stat banner surfaces the key numbers immediately. The live results section uses a document-style leaderboard with proportional vote bars instead of a card-in-a-card layout. Button hierarchy is simplified. Winner history moves below the two-column grid so it is structurally separate from live results.

All changes are **admin page only**. The voter page is unchanged.

---

## Page background

```css
background: #F4F7F9;
```

Matches the voter page background — both pages now share the same base.

---

## 1. Admin header strip
**Replaces:** the full voter-page serif hero (eyebrow + large serif title + description paragraph).

```
[Rainbow bar 5px]
[Navy header strip]
```

### Rainbow bar
```css
height: 5px;
background: linear-gradient(90deg, #FB8500 0%, #FFB703 16%, #E63946 32%, #C77DFF 50%, #219EBC 68%, #023047 100%);
```

### Header strip
```css
background: #023047;
padding: 0.85rem 2rem;
display: flex;
align-items: center;
justify-content: space-between;
gap: 1rem;
flex-wrap: wrap;
```

**Left side — two lines:**
- Line 1: `"COVERMYMEDS · PCLT TEAM"` — `0.57rem`, `700` weight, `0.22em` letter-spacing, uppercase, `#8ECAE6` at `0.55` opacity
- Line 2: `"Employee of the Month — Admin"` — Georgia serif, `1.1rem`, `800` weight, white. The word `Month` is `font-style: normal; color: #FFB703` (amber)

**Right side:**
- **Voting status pill** (dynamic — changes based on whether voting is open or closed):
  ```css
  display: flex; align-items: center; gap: 6px;
  background: rgba(42,157,111,0.18);
  border: 1px solid rgba(42,157,111,0.30);
  border-radius: 100px;
  padding: 4px 12px;
  font-size: 0.67rem; font-weight: 700; color: #5DCCAA;
  ```
  Contains an animated green dot (`width: 6px; height: 6px; border-radius: 50%; background: #5DCCAA; animation: pulse 2s ease-in-out infinite`) and text e.g. `"Voting open · closes Aug 5"`
- **"View voter page →"** text link: `0.72rem`, `600` weight, `rgba(255,255,255,0.35)`, no underline. Hover: `#8ECAE6`

---

## 2. Page layout

```css
max-width: 1080px;
margin: 0 auto;
padding: 1.75rem 1.5rem 4rem;
```

Layout order inside the page:
1. Stat banner card (full width)
2. Two-column grid: `grid-template-columns: 1fr 330px; gap: 1.25rem; align-items: start`
   - Left: Live results card
   - Right: Voter links card
3. Winner history card (full width, below the grid)

---

## 3. Shared card style

All three main content areas (stat banner, live results, voter links, winner history) use this base:

```css
background: white;
border: 1px solid #E2EBF0;
border-radius: 14px;
box-shadow: 0 1px 8px rgba(2,48,71,0.05);
```

---

## 4. Stat banner card

Sits above the two-column grid. Full width of the page container.

```css
padding: 1.1rem 1.75rem;
display: flex; align-items: center; gap: 0; flex-wrap: wrap;
margin-bottom: 1.25rem;
```

### Three stat items

Each stat:
```css
display: flex; flex-direction: column;
padding: 0 2.5rem 0 0; margin-right: 2.5rem;
border-right: 1px solid #C8E8F4;
flex-shrink: 0;
```
Last stat item: `border-right: none`

Stat number:
```css
font-size: 2.4rem; font-weight: 900; line-height: 1;
color: #023047; letter-spacing: -0.02em;
```
Votes cast and Turnout % use `color: #219EBC` (teal accent).

Stat label:
```css
font-size: 0.6rem; font-weight: 700; letter-spacing: 0.16em;
text-transform: uppercase; color: #7AABB8; margin-top: 3px;
```

Values: **4** VOTES CAST · **12** ELIGIBLE · **33%** TURNOUT

### Turnout progress bar (right of stats)

```css
flex: 1; min-width: 200px; padding-left: 2.5rem;
```

Above bar:
```css
display: flex; justify-content: space-between;
font-size: 0.68rem; margin-bottom: 6px;
```
Left: `"4 of 12 voted"` — `font-weight: 700; color: #023047`
Right: `"Voting closes Aug 5"` — `color: #7AABB8`

Bar track:
```css
height: 7px; background: #C8E8F4; border-radius: 4px; overflow: hidden;
```
Bar fill:
```css
height: 100%; width: 33%; /* dynamic */
background: linear-gradient(90deg, #219EBC, #8ECAE6); border-radius: 4px;
```

### Refresh button (right of progress bar)

```css
font-size: 0.72rem; font-weight: 700;
color: #7AABB8; background: transparent;
border: 1.5px solid #C8E8F4; border-radius: 6px;
padding: 5px 11px; cursor: pointer;
white-space: nowrap; flex-shrink: 0;
margin-left: 1.5rem;
```
Hover: `color: #219EBC; border-color: #219EBC; background: white`

Label: `"↻ Refresh"` — this button refreshes the vote data. On hover only.

> **Implementation note for Greg:** Ask whether the page auto-fetches fresh data on every load/login. If yes, this button is only needed mid-session (to poll for new votes without a full page reload). If data is cached on initial load, the button is more important. Either way, keep it here.

---

## 5. Live results card (left column)

```css
padding: 1.5rem 1.75rem 1.75rem;
```

### Section label

```css
font-size: 0.6rem; font-weight: 700; letter-spacing: 0.2em;
text-transform: uppercase; color: #219EBC;
padding-bottom: 0.6rem;
border-bottom: 2px solid #219EBC;
margin-bottom: 1.1rem;
display: flex; align-items: center; justify-content: space-between;
```

Left: `"LIVE RESULTS — JULY 2026"` (dynamic month)
Right: `"Voting closes the 5th"` — `font-size: 0.68rem; color: #9AAAB5; letter-spacing: 0; text-transform: none; font-weight: 500`

### Action row

```css
display: flex; align-items: center; gap: 0.6rem;
margin-bottom: 1.25rem; flex-wrap: wrap;
```

**Declare winner button (only button in this row):**
```css
font-size: 0.8rem; font-weight: 800; color: white;
background: #219EBC; border: none; border-radius: 7px;
padding: 8px 18px; cursor: pointer;
```
Hover: `background: #1a87a0; transform: translateY(-1px)`
Label: `"🏆 Declare winner"`

> Note: button is disabled (or hidden) while voting is still open per existing logic.

### Leaderboard

Each candidate gets a full-width result row. No more cramped 140px vote bars.

```css
/* Row */
display: flex; flex-direction: column;
padding: 1rem 0; border-bottom: 1px solid #F0F5F8;
```
Last row: `border-bottom: none`

**Top row (avatar + name + vote badge):**
```css
display: flex; align-items: center; gap: 0.85rem; margin-bottom: 0.55rem;
```

Avatar — leader:
```css
width: 44px; height: 44px; border-radius: 50%;
font-size: 0.8rem; font-weight: 800; color: white;
```

Avatar — others:
```css
width: 34px; height: 34px; border-radius: 50%;
font-size: 0.65rem; font-weight: 800; color: white;
```

Name — leader:
```css
font-size: 1.1rem; font-weight: 800; color: #023047;
display: flex; align-items: center; gap: 7px;
```
Leader star: `color: #FFB703; font-size: 0.85rem`

Name — others: `font-size: 1rem; font-weight: 800; color: #023047`

Vote badge — leader:
```css
font-size: 0.8rem; font-weight: 900; color: #219EBC;
background: #E8F7FB; border-radius: 100px; padding: 4px 12px;
```

Vote badge — others:
```css
font-size: 0.8rem; font-weight: 900; color: #023047;
background: #F0F5F8; border-radius: 100px; padding: 4px 12px;
```

**Full-width vote bar (below name row):**
```css
/* Track */
height: 6px; background: #EDF2F5; border-radius: 3px; overflow: hidden;
margin-bottom: 0.55rem;
```
Leader fill: `background: linear-gradient(90deg, #219EBC, #8ECAE6); width: [pct]%`
Other fill: `background: #C8D8E0; width: [pct]%`
Width is calculated as `(votes / totalVotes) * 100%`.

**Comments (below bar):**
```css
padding-left: 53px; /* aligns under name, past avatar */
display: flex; flex-direction: column; gap: 4px;
```
Each comment:
```css
font-size: 0.75rem; color: #6B7F8A; font-style: italic; line-height: 1.45;
padding-left: 8px; border-left: 2px solid #E0EBF0;
```

### Backup callout

Sits below the leaderboard. **Only shown when a backup exists for the current month.**

```css
display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;
background: #FFFBF0; border-left: 3px solid #FFB703;
border-radius: 0 6px 6px 0; padding: 7px 12px;
margin-top: 1.5rem; flex-wrap: wrap;
```

Text: `font-size: 0.72rem; color: #7A5000; line-height: 1.4`
`"Backup saved"` in `font-weight: 700`

Right side — two actions side by side:
- **Restore button:** `font-size: 0.68rem; font-weight: 700; color: #7A5000; background: white; border: 1px solid #F5D89A; border-radius: 5px; padding: 4px 10px`
- **Reset votes link:** `font-size: 0.72rem; font-weight: 600; color: #B0A090; background: transparent; border: none; text-decoration: underline; text-underline-offset: 2px` — hover: `color: #D63946`

---

## 6. Voter links card (right column)

```css
padding: 1.5rem;
position: sticky; top: 1.5rem; /* stays visible while scrolling */
```

### Section label

Same style as Live results section label (teal uppercase, 2px teal bottom border).

Left: `"VOTER LINKS"`
Subtitle (`font-size: 0.68rem; color: #9AAAB5; margin-top: 0.4rem; margin-bottom: 0.75rem`): `"July 2026 · send each person their link"` — sits **below** the teal rule so both section rules align horizontally with Live results.

### Progress row

```css
display: flex; align-items: center; gap: 10px;
background: #F8FAFB; border-radius: 8px;
padding: 10px 12px; margin-bottom: 1rem;
```

Number: `font-size: 0.95rem; font-weight: 800; color: #023047`
Format: `"3/12"` — the `/12` portion: `font-size: 1rem; color: #9AAAB5; font-weight: 600`
Sub-label below: `"voted"` — `font-size: 0.6rem; color: #9AAAB5; font-weight: 600`

Progress track: `flex: 1; height: 5px; background: #E8F1F5; border-radius: 3px; overflow: hidden`
Fill: `width: 25%; background: linear-gradient(90deg, #2A9D6F, #48C9A0)`

### Copy all links button

```css
display: block; width: 100%; margin-bottom: 1rem;
font-size: 0.78rem; font-weight: 700; color: #023047;
background: white; border: 1.5px solid #DDE6EC; border-radius: 8px;
padding: 8px; text-align: center;
```
Hover: `border-color: #219EBC; color: #219EBC`

### Voter rows

```css
/* Row */
display: flex; align-items: center; gap: 0.55rem;
padding: 6px 0; border-bottom: 1px solid #F4F8FA;
```

Avatar: `width: 26px; height: 26px; font-size: 0.57rem; font-weight: 800`
Name: `font-size: 0.78rem; font-weight: 500; color: #023047; flex: 1`

**Voted chip** — only shown for voters who have voted (no PENDING label for non-voters):
```css
font-size: 0.58rem; font-weight: 700;
background: rgba(42,157,111,0.10); color: #2A9D6F;
border: 1px solid rgba(42,157,111,0.22);
border-radius: 100px; padding: 2px 6px;
```
Content: `"✓"` (just the checkmark, no text)

Copy button per row:
```css
font-size: 0.65rem; font-weight: 700; color: #9AAAB5;
background: transparent; border: 1px solid #DDE6EC;
border-radius: 5px; padding: 2px 8px;
```
Hover: `color: #219EBC; border-color: #219EBC`

---

## 7. Winner history card (full width, below grid)

```css
margin-top: 2.5rem;
padding: 1.5rem 1.75rem 0.5rem;
```

A horizontal rule separates this from the grid above:
```css
border-top: 2px solid #E2EBF0;
/* applied as margin-top + padding-top on the card, or as a separate <hr> */
```

### Section label

Same style as other section labels (teal uppercase, 2px teal bottom border).

Left: `"WINNER HISTORY"`
Right: `"↻ Refresh"` button — same style as the stat banner refresh button

### History rows

Each row is clickable and opens the celebration overlay:

```css
display: flex; align-items: flex-start; gap: 0.9rem;
padding: 0.9rem 0.6rem; border-radius: 8px;
cursor: pointer; transition: background 0.13s;
border-bottom: 1px solid #F0F5F8;
```
Last row: `border-bottom: none`
Hover: `background: #F5FBFD`

Avatar: `width: 38px; height: 38px; border-radius: 50%; font-size: 0.7rem; font-weight: 800`

Body (flex: 1):
- Month: `font-size: 0.6rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #9AAAB5; margin-bottom: 2px`
- Name: `font-size: 0.9rem; font-weight: 800; color: #219EBC; margin-bottom: 2px`
- Meta: `font-size: 0.67rem; color: #9AAAB5; margin-bottom: 3px` — e.g. `"12 votes / 12 eligible"`
- Featured comment: `font-size: 0.75rem; color: #6B7F8A; font-style: italic; line-height: 1.4`

View affordance (right):
```css
font-size: 0.67rem; color: #C0CED4; flex-shrink: 0; margin-top: 4px;
```
Content: `"🏆 View"`
Hover (via parent row hover): `color: #219EBC`

---

## What does NOT change

- All Supabase reads and writes
- Voting open/closed logic and cutoff date
- Declare winner modal and co-winner handling
- Reset votes confirmation modal
- Backup/restore Supabase logic
- Celebration overlay component
- Voter page (completely separate)
- URL routing and auth

