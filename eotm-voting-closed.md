# EOTM App — Spec: Declare Winner Closes Voting (v2)

Revised after implementation feedback. Key change from v1: no `voting_periods` table with a row per month — a **single reused row** that both Declare Winner and a new **Open Voting** button operate on. That fixes the biggest problem in v1: there was no way to ever start month 2.

SQL: `voting_state.sql`
Mockup: `eotm-voting-closed-mockup.html` (see open question in §7 — may need to change from full-screen to an in-shell swap)

---

## 1. Goal

- **Declare Winner** (existing) closes voting for the current month and records the winner(s).
- **Open Voting** (new) advances to the next month and reopens voting. This replaces the current automatic, clock-based rollover in `getVotingPeriod()` — month advancement becomes an explicit admin action instead of something that happens silently at midnight.
- Winner(s) can still be edited after Declare Winner, right up until Open Voting is clicked — this preserves the existing "Edit winner" flow instead of locking the button forever.

---

## 2. Data model

One table, one row, reused forever. Full SQL in `voting_state.sql`.

**`voting_state`**

| column | type | notes |
|---|---|---|
| `id` | smallint, pk, `check (id = 1)` | forces exactly one row to ever exist — no "two open rows" failure mode possible |
| `month_key` | text | `"2026-08"` format — matches `votes`, `winners`, `celebration_seen` (v1 used a display string and didn't match the rest of the schema; fixed here) |
| `is_open` | boolean | |
| `winner_ids` | uuid[] | array, not a single FK — supports the existing co-winner/tie behavior |
| `opened_at` | timestamptz | |
| `closed_at` | timestamptz, nullable | |

Dropped from v1:
- **No `declared_by`.** There's no per-admin identity in this app (the admin route is PIN-gated, not per-user login), so there was nothing to populate that field with.
- **No `month_label`.** Storing both a key and a display string invites drift. Compute the display label (`"August 2026"`) from `month_key` using the same formatting helper `constants.js` already has — one source of truth.
- **No FK from `votes` to this table.** `votes.month` is already a text column in the same `"2026-08"` format, so the guard just compares text values — no join, no schema change to `votes` needed.

---

## 3. Flow

### Admin — Declare Winner
1. Admin picks winner(s) from the tally (single or co-winners).
2. Clicks **Declare Winner**.
3. Confirm modal → on confirm:
   ```sql
   update voting_state
   set is_open = false, winner_ids = :ids, closed_at = now()
   where id = 1;
   ```
4. Voting page (below) flips to the closed screen.

### Admin — Edit winner (unchanged from today, still works)
- While `is_open = false` and before Open Voting is clicked, re-running the declare action just updates `winner_ids` on the same row. No lock, no separate "undo" mechanism needed — it's the same update as step 3, run again.

### Admin — Open Voting (new)
1. Only enabled while `is_open = false`.
2. Computes the next `month_key` (calendar month after the current `month_key` — same logic `getVotingPeriod()` uses today, just triggered by a click instead of the clock).
3. On click:
   ```sql
   update voting_state
   set month_key = :next_month_key, is_open = true, winner_ids = null, closed_at = null, opened_at = now()
   where id = 1;
   ```
4. Voting page flips back to the ballot for the new month.

### Voting page — reacting to state changes
- On load: fetch the single `voting_state` row. `is_open = false` → render Closed screen. `is_open = true` → render ballot for `month_key`.
- Subscribe to Realtime `postgres_changes` (`UPDATE`) on `voting_state`, id `1`. Any change — close *or* reopen — updates the page live, with no refresh.
- **Setup prerequisite:** this app doesn't use Realtime today, so the table has to be added to the publication once (`alter publication supabase_realtime add table voting_state;` — included in the SQL file). Without this step the subscription connects but never receives anything, which fails silently.

---

## 4. Guard against late votes

Client-side hiding of the ballot doesn't stop a request already in flight. `voting_state.sql` includes a `BEFORE INSERT` trigger on `votes` that checks `voting_state.is_open = true and voting_state.month_key = new.month` before allowing the insert — an RLS-policy equivalent is included commented out if you'd rather do it that way. Either approach means a vote can't land after Declare Winner regardless of client timing.

---

## 5. Closed-screen copy

- Headline: **VOTING IS** / **CLOSED**
- Month pill: display label computed from `month_key`
- Body: *"Stay tuned for the announcement of the winner of this prestigious award…"*

---

## 6. Component changes
- `useVotingState()` — shared hook, both Admin and Voting page read from it; wraps the fetch + realtime subscription.
- `VotingClosedScreen.jsx` — closed state, takes the display label as a prop.
- `DeclareWinnerButton.jsx` — confirm modal, passes an array of ids (supports co-winners), no disabled-forever state — relabels but stays clickable for edits.
- `OpenVotingButton.jsx` — new; enabled only while closed; computes and confirms the next month before writing.

---

## 7. Open question to confirm before building

Claude Code flagged that the existing dead-code `isClosed` branch in `VotingView.jsx` renders closed state as a `<Card>` inside the app's existing shell (`App.jsx`'s navy strip, the "Voting as {name}" chip, the admin's hidden simulate-winner menu) — not a full-screen takeover. The mockup as built is a full-page replacement.

**Decide:** does Closed replace the whole page, or swap just the ballot area inside the existing shell? That changes whether the mockup needs rework. If it's the in-shell swap, the existing `<Card>` pattern already has the right bones — the copy/layout in the mockup can drop straight into it, just not full-bleed.

Separately, cheap fix whenever the mockup gets touched again: swap the placeholder magenta/cyan (`#E4007C` / `#57C7E3`) for the app's real tokens (`#E70865` / `#008AD8`) in `index.css`, and drop the Google Fonts Playfair Display import in favor of the system Georgia stack the rest of the app already uses for serif (e.g. `WinnerReveal`) — no network dependency needed for something the app already does for free.

---

## 8. Acceptance criteria
- [ ] No open period on load → Closed screen renders immediately, no ballot flash.
- [ ] Someone on the voting page when Declare Winner fires sees it flip to Closed within ~1s, no refresh.
- [ ] A vote submitted in the same instant as the close is rejected at the database.
- [ ] Winner can be edited (re-declared) after Declare Winner, before Open Voting is clicked.
- [ ] Open Voting is disabled while `is_open = true`; clicking it while closed advances the month and reopens the ballot live for anyone on the page.
- [ ] Only one row ever exists in `voting_state` — enforced by the table constraint, not just app logic.
- [ ] Closed-screen copy reflects whatever `month_key` is current — verified with a non-real month value.

---

## 9. Out of scope
- Publicly revealing/announcing who won (separate screen/flow — `WinnerReveal` may already partially cover this, worth checking before building anything new)
- Notifying the team (Slack/email) that voting closed or reopened
