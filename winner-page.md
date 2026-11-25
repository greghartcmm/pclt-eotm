# Winner Card — Redesign Instructions for Claude Code

## What this changes
The celebration overlay (the screenshot-ready winner card that appears after declaring a winner and is triggered from the Winner History panel) needs a visual redesign. The current card has a plain dark navy layout with an initials avatar. Replace it with the new design described below.

---

## Asset required first
Add the team photo to the project before implementing:

- **File:** `eotm-winner-image.jpg` (attached / in this folder)
- **Place at:** `public/eotm-winner-image.jpg`
- **Reference in code as:** `/eotm-winner-image.jpg`

---

## New card design — full spec

The card is a fixed-width white card rendered inside the existing overlay backdrop. It replaces only the inner card element — the dark backdrop, close button, and "Copy image" button remain where they are.

### Card structure (top to bottom)

```
[ Rainbow bar — 6px ]
[ Slim navy header strip ]
[ White photo section ]
[ Trophy divider ]
[ Centered winner block ]
[ Rainbow bar — 6px ]
```

---

### 1. Rainbow bar (top and bottom)
```css
height: 6px;
background: linear-gradient(90deg,
  #FB8500 0%, #FFB703 16%, #E63946 32%,
  #C77DFF 50%, #219EBC 68%, #023047 100%);
width: 100%;
```
Same bar appears at both top and bottom of the card.

---

### 2. Slim navy header strip
```css
background: #023047;
padding: 1rem 2rem;
display: flex;
align-items: center;
justify-content: space-between;
```

**Left side — two lines:**
- Line 1 eyebrow: `"COVERMYMEDS · PCLT TEAM"` — `0.58rem`, `700` weight, `0.22em` letter-spacing, uppercase, `#8ECAE6` at `0.55` opacity
- Line 2 title: `"Employee of the Month"` — Georgia serif, `1.05rem`, `800` weight, white

**Right side — month badge:**
```css
background: #FFB703;
color: #023047;
font-size: 0.68rem;
font-weight: 800;
padding: 4px 12px;
border-radius: 100px;
letter-spacing: 0.06em;
text-transform: uppercase;
white-space: nowrap;
```
Content: current month + year (e.g. `"JULY 2026"`) — pull from the same `month` value used elsewhere in the overlay.

---

### 3. White photo section
```css
background: white;
padding: 1.25rem 1.5rem 0.75rem;
```
Contains a single `<img>` tag:
```jsx
<img
  src="/eotm-winner-image.jpg"
  alt="PCLT Team"
  style={{ width: '100%', height: 'auto', display: 'block' }}
/>
```
No `object-fit`, no cropping, no gradient overlay. The image renders at full natural aspect ratio.

---

### 4. Trophy divider
```jsx
<div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0 2rem', marginBottom: '1.25rem' }}>
  <div style={{ flex: 1, height: '1.5px', background: 'linear-gradient(90deg, transparent, #E0EAF0)' }} />
  <span style={{ fontSize: '1.1rem', opacity: 0.6 }}>🏆</span>
  <div style={{ flex: 1, height: '1.5px', background: 'linear-gradient(90deg, #E0EAF0, transparent)' }} />
</div>
```

---

### 5. Centered winner block
```css
padding: 0 2rem 1.75rem;
text-align: center;
display: flex;
flex-direction: column;
align-items: center;
```

**Avatar:**
```css
width: 76px;
height: 76px;
border-radius: 50%;
background: linear-gradient(135deg, #219EBC, #1a7fa0);
display: flex;
align-items: center;
justify-content: center;
font-size: 1.25rem;
font-weight: 800;
color: white;
box-shadow: 0 6px 20px rgba(33,158,188,0.35);
border: 4px solid white;
outline: 2px solid #C8E8F4;
margin-bottom: 0.75rem;
```
Content: winner initials (same logic as current card).

For co-winners: render two avatars side by side with `gap: 0.75rem` and `flex-direction: row`.

**Winner name:**
```css
font-family: Georgia, 'Times New Roman', serif;
font-size: 1.85rem;
font-weight: 800;
color: #023047;
margin-bottom: 0.5rem;
line-height: 1.1;
```

**Featured comment** (only render this element if `featured_comment` exists):
```css
font-size: 0.95rem;
font-style: italic;
color: #FB8500;
line-height: 1.5;
margin-bottom: 0.6rem;
max-width: 380px;
```
Wrap content in quotes: `"${featured_comment}"`

**Meta line:**
```css
font-size: 0.67rem;
color: #9AABB5;
letter-spacing: 0.06em;
```
Content: `{vote_count} votes · PCLT Team`

---

## Overall card container
```css
width: 560px;
background: white;
border-radius: 16px;
overflow: hidden;
box-shadow: 0 20px 60px rgba(0,0,0,0.6);
```
This replaces the existing inner card element inside the overlay. The outer overlay backdrop, close button (✕ top-right), and "Copy image" button below the card are unchanged.

---

## Co-winner handling
- Stack both avatars side by side (row, `gap: 0.75rem`) centered
- Render both names on one line separated by `" & "`, or stacked if they don't fit
- `featured_comment` is shared — show once, centered, below both names

---

## What does NOT change
- Overlay backdrop (dark background, click-outside to close)
- Close button position and style
- "Copy image" button and its html2canvas / copy logic
- How the overlay is triggered (declaring winner + winner history row click)
- All Supabase reads (`winners` table, `featured_comment`, `vote_count`, etc.)
