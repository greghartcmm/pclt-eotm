# PCLT Employee of the Month — Architecture & Maintenance Guide

## Overview

A CoverMyMeds-branded internal voting app for the PCLT team. Built with React + Vite, hosted on GitHub Pages, with votes stored in Supabase (Postgres).

**Live URL:** https://greghartcmm.github.io/pclt-eotm/  
**Admin URL:** https://greghartcmm.github.io/pclt-eotm/?admin=true  
**Admin PIN:** 0406  
**GitHub Repo:** https://github.com/greghartcmm/pclt-eotm  
**Supabase Project:** https://supabase.com/dashboard/project/jkpgggdlpjhoojamnhrp  

---

## Architecture

```
Browser (React + Vite)
    │
    ├── ?token=abc123  →  Voter flow
    │       │
    │       └── Supabase JS client (anon key, safe to expose)
    │               ├── tokens table  (token → voter name, read-only)
    │               └── votes table   (month + voter → choice, read/write)
    │
    └── ?admin=true  →  PIN gate (0406) → Admin panel
            │
            └── Supabase JS client (same anon key)
                    ├── Read: votes table (live results)
                    └── Delete: votes table (reset round)
```

### Why Supabase?
GitHub Pages is static hosting — it cannot securely write data. Embedding a GitHub PAT in the JS bundle causes GitHub to automatically revoke it (secret scanning). Supabase's anon key is designed to be public; Row Level Security (RLS) controls what it can do.

### Key Design Decisions
- **Token-based identity:** Each voter gets a unique permanent URL. No login required.
- **Tokens are permanent:** Same links reused every month. Only change if roster changes.
- **Admin PIN:** Injected at build time from a GitHub Actions secret (`VITE_ADMIN_PIN`). Never in source code.
- **One vote per person per month:** Enforced by Supabase primary key `(month, voter_name)`. Upsert handles vote changes.
- **Results hidden:** Only admins see live results. Voters see a confirmation only.
- **Co-winners on tie:** No tiebreaker — both declared winners.

---

## File Structure

```
pclt-eotm/
├── src/
│   ├── App.jsx                    # Router: ?token= vs ?admin=true routes
│   ├── App.module.css             # Layout, header, tab bar styles
│   ├── constants.js               # Roster, admin list, color palette, date helpers
│   ├── supabase.js                # All Supabase operations (read/write votes, tokens)
│   ├── github.js                  # LEGACY — no longer used, can be deleted
│   ├── index.css                  # Global CSS variables (CMM brand tokens)
│   ├── main.jsx                   # React entry point
│   └── components/
│       ├── AdminView.jsx          # Two-column admin panel (links + results)
│       ├── AdminView.module.css   # Admin layout CSS
│       ├── PinGate.jsx            # PIN entry screen for admin route
│       ├── PinGate.module.css
│       ├── ResultsView.jsx        # Animated bar chart tally
│       ├── ResultsView.module.css
│       ├── UI.jsx                 # Shared primitives: FrameBar, Avatar, Card, Button
│       ├── UI.module.css
│       ├── VotingView.jsx         # Ballot UI for identified voters
│       └── VotingView.module.css
├── .github/
│   └── workflows/
│       └── deploy.yml             # GitHub Actions: build + deploy to gh-pages branch
├── index.html                     # Vite entry point
├── package.json
├── vite.config.js                 # base: '/pclt-eotm/' for GitHub Pages
└── votes.json                     # LEGACY — no longer used (was GitHub API storage)
```

---

## Supabase Database

**Project ID:** jkpgggdlpjhoojamnhrp  
**Region:** Canada (Central)  
**URL:** https://jkpgggdlpjhoojamnhrp.supabase.co  

### Tables

#### `tokens`
| Column | Type | Notes |
|--------|------|-------|
| token | text | Primary key, 16-char random string |
| voter_name | text | Must match ROSTER in constants.js exactly |

#### `votes`
| Column | Type | Notes |
|--------|------|-------|
| month | text | Format: "2026-06" (previous completed month) |
| voter_name | text | Composite primary key with month |
| choice | text | Who they voted for |
| created_at | timestamptz | Auto-set on insert |

Primary key on `(month, voter_name)` enforces one vote per person per month at the database level.

### Row Level Security Policies
- `tokens`: anyone can SELECT (read)
- `votes`: anyone can INSERT, UPDATE, SELECT; no DELETE from browser (only admin reset)
- Reset uses the same anon key with a `.delete()` call scoped to a specific month

---

## Token Map (Permanent Voter Links)

These never change unless someone joins or leaves the team.

| Name | Token | Voter Link |
|------|-------|-----------|
| Doug Bedell | 610b5m6909576i23 | …?token=610b5m6909576i23 |
| Miranda Delatore | 1u692h1t480h1z6h | …?token=1u692h1t480h1z6h |
| Nicole Eckl | 0a2k59070s3a6o0r | …?token=0a2k59070s3a6o0r |
| Lauren Fields | 4w360h313p2o3w33 | …?token=4w360h313p2o3w33 |
| Chrissy Hand | 3a3t46344z4q226b | …?token=3a3t46344z4q226b |
| Greg Hart | 59485o351k0o594u | …?token=59485o351k0o594u |
| Jen Miesse | 3k211u6x6h3s2c00 | …?token=3k211u6x6h3s2c00 |
| John Priskorn | 634q1k551s4w665c | …?token=634q1k551s4w665c |
| Bridget Readey | 563046285n4p0e6m | …?token=563046285n4p0e6m |
| Bill Sicheneder | 3f2u660b0e0h380t | …?token=3f2u660b0e0h380t |
| Mike Waldman | 4h6m4i39282w6l1e | …?token=4h6m4i39282w6l1e |
| Megan Wetzel | 5m640x6v6p4t6726 | …?token=5m640x6v6p4t6726 |

Full links: `https://greghartcmm.github.io/pclt-eotm/?token=TOKEN`

---

## GitHub Actions Secrets

Located at: https://github.com/greghartcmm/pclt-eotm/settings/secrets/actions

| Secret | Value | Purpose |
|--------|-------|---------|
| `VITE_ADMIN_PIN` | 0406 | Admin PIN, injected at build time |
| `VITE_SUPABASE_ANON_KEY` | eyJhbGci… | Supabase anon key, safe to expose |

---

## Deploy Process

### Automatic (via GitHub Actions)
Every push to `main` triggers a build and deploy to the `gh-pages` branch.

### Manual (faster, bypasses Actions queue)
```bash
VITE_ADMIN_PIN=0406 VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY npm run build
npx gh-pages -d dist
```

Then commit source changes separately:
```bash
git add .
git commit -m "Your message"
git push origin main
```

---

## Monthly Workflow

1. **First of the month:** Go to the admin URL, enter PIN
2. Click **Reset votes** to clear the previous month's votes
3. Click **Copy all links** and paste into a Teams message or email — one link per person
4. During the month: check **Live results** anytime via the admin panel
5. At month end: declare winner(s), announce to team
6. Repeat

---

## Adding a New Team Member

When someone joins the PCLT team, you need to update **4 things**:

### 1. `src/constants.js` — Add to ROSTER array
```js
export const ROSTER = [
  // ... existing members ...
  "New Person Name",  // ← add here
]
```

### 2. `src/components/AdminView.jsx` — Add to TOKEN_MAP
Generate a new token (16 random chars), add to the map:
```js
const TOKEN_MAP = {
  // ... existing entries ...
  "New Person Name": "generatedtoken123",  // ← add here
}
```

To generate a token, run this in your browser console:
```js
Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(36).padStart(2,'0')).join('').slice(0,16)
```

### 3. Supabase — Insert the new token
Go to https://supabase.com/dashboard/project/jkpgggdlpjhoojamnhrp/sql/new and run:
```sql
insert into tokens (token, voter_name) values
  ('generatedtoken123', 'New Person Name');
```

### 4. Rebuild and deploy
```bash
VITE_ADMIN_PIN=0406 VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY npm run build
npx gh-pages -d dist
git add .
git commit -m "Add New Person Name to roster"
git push origin main
```

---

## Removing a Team Member

### 1. Remove from `src/constants.js` ROSTER
### 2. Remove from `src/components/AdminView.jsx` TOKEN_MAP
### 3. Optionally remove from Supabase tokens table:
```sql
delete from tokens where voter_name = 'Departing Person';
```
### 4. Rebuild and deploy (same commands as above)

Their existing votes for past months remain in the database as a historical record.

---

## Changing Admins

Admins are defined in `src/constants.js`:
```js
export const ADMINS = ["Bridget Readey", "Greg Hart", "Megan Wetzel"]
```

Note: The `ADMINS` array currently controls some UI logic but the primary admin gate is the PIN at `?admin=true`. Anyone with the PIN and admin URL can access the admin panel.

To change admins, update the array and rebuild/deploy.

---

## Changing the Admin PIN

1. Go to https://github.com/greghartcmm/pclt-eotm/settings/secrets/actions
2. Update `VITE_ADMIN_PIN` with the new value
3. Rebuild and deploy (the PIN is baked into the bundle at build time)

---

## Local Development

```bash
npm install
# Create .env.local with your keys:
echo "VITE_ADMIN_PIN=0406" > .env.local
echo "VITE_SUPABASE_ANON_KEY=eyJhbGci..." >> .env.local
npm run dev
```

Test with a voter link:
```
http://localhost:5173/pclt-eotm/?token=59485o351k0o594u
```

Test admin:
```
http://localhost:5173/pclt-eotm/?admin=true
```
