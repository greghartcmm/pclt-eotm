# PCLT Employee of the Month — Pending Changes

> **Workflow:** Megan describes UI changes → Claude previews in the standalone HTML prototype → change is approved and logged here → Greg implements into the React app and deploys.

---

## How to queue a change

1. Open this Claude Project and describe the change you want (see prompting tips below).
2. Claude will update the HTML prototype so you can preview it live in the artifact.
3. When you're happy with it, say **"Add this to PENDING_CHANGES.md"** and Claude will append a new entry below.
4. Hand the updated `PENDING_CHANGES.md` to Greg. He'll implement each item into the React source and check it off.

---

## Prompting tips for mockups

The HTML prototype lives inside this project (`pclt-employee-of-the-month.html`). Claude can read it and render changes immediately.

**Good prompt patterns:**

| What you want | How to ask |
|---|---|
| Visual tweak | "On the voter page, make the candidate grid cards taller with more padding." |
| New element | "Add a small banner below the header that says voting closes on the 5th." |
| Behavior change | "When a candidate is selected, show their avatar larger in the reason section." |
| Mobile-specific | "On mobile, show the voter badge as a slim pill at the very top of the page, not inside the card." |
| Compare options | "Show me two versions of the vote confirmation overlay — one with confetti and one without." |

**Tips:**
- Be specific about *where* on the page the change lives (header, candidate grid, vote overlay, admin panel, etc.).
- Mention whether it should be desktop-only, mobile-only, or both.
- Reference the sim bar at the top to switch voter perspectives and the "View admin page" button to check admin-side changes.
- You can ask for multiple small tweaks in one message — Claude will apply them all to the prototype at once.

---

## Pending items

> Items are listed oldest-first. Greg checks them off as they ship.

<!-- TEMPLATE — copy this block for each new change:

### [Short title]
- **Status:** Pending
- **Description:** [What it is and why]
- **Scope:** [voter page / admin page / both / mobile only / etc.]
- **Design notes:** [Any specific colors, sizes, wording, or behavior details Greg needs]
- **Approved by:** [Your name]
- **Date queued:** [YYYY-MM-DD]

-->

### Reset votes — confirmation modal + Supabase backup
- **Status:** Pending
- **Description:** Replace the browser `confirm()` dialog with a styled in-page modal. Before clearing votes, snapshot the current votes into a `vote_backups` Supabase table (one row per month, overwritten on repeat resets). After reset, show an orange note callout in the Live Results card: *"A backup exists from [date] at [time] — [N] votes by [name], [name]…"* with a "Restore backup" button. Restore triggers its own confirmation modal, then upserts backup votes back into the `votes` table.
- **Scope:** Admin page — Live Results card
- **Design notes:**
  - Confirmation modal: styled card/overlay (not `window.confirm`). Body: *"Clear all votes for [Month]? A backup will be saved and can be restored from this panel."* Actions: Cancel (ghost) / Reset (danger).
  - Restore confirmation: *"Restore [N] votes from [date] at [time]? This will overwrite any votes cast since the reset."*
  - Backup banner: `note-orange` style, only shown when a `vote_backups` row exists for `currentMonthKey`. No expiration — banner stays until the month rolls over naturally.
  - Backup row is never deleted — keep it for the life of the month.
- **Supabase:** Requires new `vote_backups` table — see Supabase section below.
- **Approved by:** Greg Hart
- **Date queued:** 2026-07-15

---

### Declare winner — modal with comment picker
- **Status:** Pending
- **Description:** Add a "Declare winner" button to the Live Results card header actions (alongside Refresh and Reset). Button is disabled (or hidden) while voting is still open; enabled only after the cutoff (5th at 5pm ET). Clicking opens a two-step modal: step 1 selects the winner (pre-populated with current leader; ties show both with a co-winner note, admin can deselect one); step 2 shows selectable comment cards for that winner (one per submitted reason), optional — skip if no comments exist. On confirm, writes to the `winners` Supabase table. Button label changes to "Edit winner" if a winner is already declared for the current month.
- **Scope:** Admin page — Live Results card
- **Design notes:**
  - Winner selection: same card/checkbox style as candidate pick grid (magenta border when selected).
  - Comment picker: selectable cards, magenta border on selection, "None" option to store no comment. Only shows comments for the selected winner.
  - For co-winners: one shared `featured_comment` for the entry (not one per person). Show merged comment pool from all co-winners in the picker.
  - Modal is two visually distinct steps, not two separate modals — step 1 and step 2 stack vertically inside the same modal as winner is selected.
- **Supabase:** Requires new `winners` table — see Supabase section below.
- **Implementation note:** As part of this item, `getWinnerHistory` in `supabase.js` must be rewritten to read from the `winners` table instead of aggregating raw votes. This unblocks the next two items.
- **Approved by:** Greg Hart
- **Date queued:** 2026-07-15

---

### Winner history panel — show featured comment + row click to celebrate
- **Status:** Pending
- **Depends on:** "Declare winner" must ship first — history now reads from the `winners` table.
- **Description:** Each history row in the Winner History panel gains a third line when a `featured_comment` exists for that month: rendered in italic muted text below the winner name and meta line. The entire row becomes clickable (cursor pointer, subtle hover state) and opens the celebration overlay for that month's winner data.
- **Scope:** Admin page — Winner History panel
- **Design notes:**
  - Comment line: italic, `var(--muted)`, same visual style as `reason-item` in live results.
  - Row hover: light `var(--cyan-tint)` or `var(--orange-tint)` background, `border-radius: 8px`.
  - Clickable area is the full row, not just a button — add a subtle `🏆` or "View" affordance on the right so it's discoverable.
- **Approved by:** Greg Hart
- **Date queued:** 2026-07-15

---

### Celebration overlay — screenshot-ready winner announcement
- **Status:** Pending
- **Depends on:** "Winner history panel" must ship first — overlay is triggered by clicking history rows.
- **Description:** Full-screen overlay (not a new route) that renders a clean, screenshot-ready winner card. Opens automatically after a winner is declared. Re-openable by clicking any row in the Winner History panel. Close button top-right, visually subtle. No admin chrome or sim bar visible inside the overlay.
- **Scope:** Admin page
- **Design notes:**
  - Background: `var(--navy)` — dark, pops in screenshot, distinct from rest of app.
  - Layout (centered, vertically): frame bar stripe at top → eyebrow "CoverMyMeds · PCLT Team" in muted white → "Employee of the Month" in large serif white → month/year in muted white → large avatar (80px) → winner name in large serif white → featured comment in italic `var(--orange)` (skip element entirely if no comment) → vote count + "PCLT Team" in small muted white → frame bar stripe at bottom.
  - Close button: top-right, white `✕`, low opacity so it doesn't show in a casual screenshot.
  - For co-winners: stack both avatars side by side, both names.
  - Overlay is dismissible via close button or clicking the backdrop outside the card.
- **Approved by:** Greg Hart
- **Date queued:** 2026-07-15

---

## Supabase setup required before implementing

Run the following in the Supabase SQL editor for project `jkpgggdlpjhoojamnhrp` before Claude Code implements the pending items above.

### 1. `vote_backups` table

```sql
create table vote_backups (
  month      text primary key,
  reset_at   timestamptz not null default now(),
  votes      jsonb not null
);

alter table vote_backups enable row level security;

create policy "Allow public access"
on vote_backups for all
using (true);
```

**Shape of `votes` jsonb:**
```json
[
  { "voter_name": "Miranda Delatore", "choice": "Greg Hart", "reason": "Fixed the thing nobody else would touch" },
  { "voter_name": "Nicole Eckl",      "choice": "Megan Wetzel", "reason": "" }
]
```

---

### 2. `winners` table

```sql
create table winners (
  month             text primary key,
  winner_names      text[] not null,
  featured_comment  text,
  vote_count        int,
  total_votes       int,
  declared_by       text,
  declared_at       timestamptz default now()
);

alter table winners enable row level security;

create policy "Allow public access"
on winners for all
using (true);
```

---

## Shipped items

<!-- Move completed entries here once Greg deploys them, changing Status to Shipped and adding a deploy date. -->

*Nothing shipped via this file yet.*
