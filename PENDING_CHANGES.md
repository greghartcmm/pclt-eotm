# PENDING_CHANGES.md

## Change Request: Auto Vote Cutoff + Winner History Panel

**Requested by:** Greg Hart  
**Status:** Pending implementation  
**Priority:** High  

---

## Overview

Two related features:
1. Voting automatically closes at 5pm on the 5th of each month for the prior month
2. Admin panel gains a winner history panel showing last 12 months

---

## Feature 1: Auto Vote Cutoff

### Business Rules

- Voting period covers the **prior completed month**
- Voting closes at **5:00pm ET on the 5th of the current month**
- Example: June 2026 voting closes at 5pm ET on July 5, 2026
- At cutoff:
  - Voters who open their link see the **new month's ballot** (July) with no vote selected
  - Any vote cast after cutoff records under the **new month** in Supabase
  - No votes can be changed or cast for the closed month

### Cutoff Logic

The cutoff determination happens client-side using the user's local time converted to ET.

```js
// Pseudocode
function getCurrentVotingPeriod() {
  const now = new Date()
  // Convert to ET (UTC-5 standard, UTC-4 daylight)
  const etOffset = isEDT(now) ? -4 : -5
  const nowET = new Date(now.getTime() + (etOffset * 60 * 60 * 1000))

  const day = nowET.getUTCDate()
  const hour = nowET.getUTCHours() // 17 = 5pm

  // If we're past the 5th at 5pm ET, voting is for the current month
  // Otherwise voting is for the prior month
  if (day > 5 || (day === 5 && hour >= 17)) {
    // Vote for current month
    return currentMonthKey() // e.g. "2026-07"
  } else {
    // Still voting for prior month
    return previousMonthKey() // e.g. "2026-06"
  }
}

function isEDT(date) {
  // EDT runs second Sunday in March through first Sunday in November
  // Can use Intl.DateTimeFormat to detect reliably
  const jan = new Date(date.getFullYear(), 0, 1).getTimezoneOffset()
  const jul = new Date(date.getFullYear(), 6, 1).getTimezoneOffset()
  return date.getTimezoneOffset() < Math.max(jan, jul)
}
```

### Implementation Notes

- **`src/constants.js`**: Replace `previousMonthKey()` and `previousMonthLabel()` with a single `getVotingPeriod()` function that returns `{ monthKey, monthLabel, isClosed }` based on the cutoff logic above
- **`src/App.jsx`**: Pass `isClosed` down to `VotingView`
- **`src/components/VotingView.jsx`**: When `isClosed` is true, show a "Voting closed" message instead of the ballot. Example copy: *"Voting for [Month] closed on the 5th. Check back soon for results!"*
- The monthly reset in the admin panel remains manual — admin still clicks "Reset votes" to clear votes before a new round begins. The cutoff only affects the voter UI.

### Edge Cases

- User in a non-ET timezone: use ET for cutoff calculation regardless of local timezone
- User votes right at cutoff: the period is recalculated fresh on each page load and each vote submission
- What if cutoff falls on a weekend: no special handling needed — cutoff is always the 5th at 5pm ET regardless of day of week

---

## Feature 2: Winner History Panel (Admin Only)

### Business Rules

- Show last 12 months maximum, most recent at top
- Each month shows: month name + year, winner name(s), vote count, total votes cast
- Ties show all co-winners
- Months with zero votes show "No votes recorded"
- Panel appears below the existing results card on the right column of the admin layout

### Data Source

Query Supabase `votes` table grouped by month. For each month, find the voter_name(s) with the highest count.

```js
// Pseudocode for winner calculation per month
async function getWinnerHistory() {
  const { data } = await supabase
    .from('votes')
    .select('month, choice')
    .order('month', { ascending: false })

  // Group by month
  const byMonth = {}
  data.forEach(({ month, choice }) => {
    if (!byMonth[month]) byMonth[month] = {}
    byMonth[month][choice] = (byMonth[month][choice] || 0) + 1
  })

  // For each month, find winner(s)
  return Object.entries(byMonth)
    .slice(0, 12) // last 12 months
    .map(([month, counts]) => {
      const max = Math.max(...Object.values(counts))
      const winners = Object.entries(counts)
        .filter(([, c]) => c === max)
        .map(([name]) => name)
      const totalVotes = Object.values(counts).reduce((a, b) => a + b, 0)
      return { month, winners, voteCount: max, totalVotes }
    })
}
```

### UI Spec

- Section heading: "Winner History"
- Each row: `[Month Year] — [Winner Name(s)] ([X] votes)`
- Tie display: `June 2026 — Miranda Delatore & Doug Bedell (3 votes each)`
- Month format: "June 2026" (not "2026-06")
- Winner name in **bold magenta** (`var(--magenta)`)
- Most recent month at top
- If no votes for a month that exists in the DB: skip it (don't show empty months)
- Add a "Refresh history" button

### Placement

Add as a new `<Card>` below the results card in the right column of `AdminView.jsx`. On mobile it stacks below everything else.

### New Supabase function needed in `src/supabase.js`

```js
export async function getWinnerHistory() {
  const { data, error } = await supabase
    .from('votes')
    .select('month, choice')
    .order('month', { ascending: false })

  if (error || !data) return []

  // Group by month
  const byMonth = {}
  data.forEach(({ month, choice }) => {
    if (!byMonth[month]) byMonth[month] = {}
    byMonth[month][choice] = (byMonth[month][choice] || 0) + 1
  })

  return Object.entries(byMonth)
    .slice(0, 12)
    .map(([month, counts]) => {
      const max = Math.max(...Object.values(counts))
      const winners = Object.entries(counts)
        .filter(([, c]) => c === max)
        .map(([name]) => name)
      const totalVotes = Object.values(counts).reduce((a, b) => a + b, 0)
      // Convert "2026-06" to "June 2026"
      const [year, mo] = month.split('-')
      const label = new Date(+year, +mo - 1, 1)
        .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      return { month, label, winners, voteCount: max, totalVotes }
    })
}
```

---

## Files to Change

| File | Change |
|------|--------|
| `src/constants.js` | Replace `previousMonthKey/Label` with `getVotingPeriod()` returning `{ monthKey, monthLabel, isClosed }` |
| `src/App.jsx` | Use `getVotingPeriod()`, pass `isClosed` to `VotingView` |
| `src/components/VotingView.jsx` | Show closed state when `isClosed` is true |
| `src/supabase.js` | Add `getWinnerHistory()` function |
| `src/components/AdminView.jsx` | Add winner history panel in right column |
| `src/components/AdminView.module.css` | Add styles for history panel rows |

---

## How to Implement

Tell Claude: *"Please implement the pending changes in PENDING_CHANGES.md into the React app."*

Claude will produce updated files. Download them, copy into the project, build and deploy:

```bash
VITE_ADMIN_PIN=0406 VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprcGdnZ2RscGpob29qYW1uaHJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NzkyNDIsImV4cCI6MjA5OTE1NTI0Mn0.gRElVna8f2KGdJEA33IZ91IPIbldHOaEQu7Mh4NKErM npm run build && npx gh-pages -d dist
git add .
git commit -m "Auto cutoff + winner history"
git push origin main
```

---

## Testing Checklist

- [ ] Before July 5th 5pm ET: voting shows June ballot
- [ ] After July 5th 5pm ET: voting shows July ballot, June ballot shows closed message
- [ ] Vote cast after cutoff saves to July in Supabase, not June
- [ ] Admin winner history shows correct winner for each month
- [ ] Ties show both names
- [ ] History limited to 12 months
- [ ] Mobile layout still stacks correctly
