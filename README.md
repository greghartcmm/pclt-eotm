# PCLT Employee of the Month

A CoverMyMeds-branded internal voting app for the PCLT team. Built with React + Vite, deployed to GitHub Pages, votes stored in `votes.json` in this repo.

---

## How it works

- **Voters** receive a personalized link (e.g. `https://your-org.github.io/pclt-eotm/?token=abc123`) from an admin
- **The link identifies them** — no login required, no typing their name
- **One vote per person per month**, can't vote for yourself
- **Votes are stored** in `votes.json` in this repo via the GitHub API
- **Results are admin-only** until voting is closed

---

## First-time setup (do this once)

### 1. Create the GitHub repo

Create a new GitHub repo (e.g. `pclt-eotm`) under your org or personal account. It can be **public or private** — the app reads `votes.json` from the raw GitHub API.

> ⚠️ If the repo is **private**, voters won't be able to read `votes.json` without a PAT. Recommend making the repo **public** (votes are visible in the file, but not in the app UI).

### 2. Update `vite.config.js`

Change the `base` to match your repo name:

```js
base: '/pclt-eotm/',   // ← change to your repo name
```

### 3. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_ORG/pclt-eotm.git
git push -u origin main
```

### 4. Enable GitHub Pages

In the repo → **Settings → Pages**:
- Source: **Deploy from a branch**
- Branch: **gh-pages** / root

The GitHub Actions workflow (`.github/workflows/deploy.yml`) will build and publish automatically on every push to `main`.

### 5. Create a Personal Access Token (PAT)

Admins need a PAT to write votes and generate tokens.

1. Go to GitHub → **Settings → Developer settings → Personal access tokens → Fine-grained tokens**
2. Create a token with:
   - **Repository access:** only `pclt-eotm`
   - **Permissions → Contents:** Read and write
3. Copy the token (`ghp_…`) — you'll paste it into the app's Admin panel

---

## Admin workflow (monthly)

1. Open the app with your voter link (or use "Admin setup" if first time)
2. Click **Admin panel**
3. Enter your GitHub owner, repo, and PAT → **Save connection**
4. Click **Generate voter links** → copy each person's link
5. Paste links into individual emails or Teams messages — one per person
6. Use **Load results** to see the live tally anytime
7. When voting is done, declare the winner and share results with the team
8. Next month: click **Clear votes for [month]** to start fresh (tokens reuse automatically)

---

## Collision handling

Each vote is written as `{ month: { voterName: choice } }`. Since every voter owns a unique key, two people voting simultaneously write to different keys — no data loss possible. In the rare event of a SHA conflict (two writes in the same millisecond), the app retries up to 3 times automatically.

---

## Data shape (`votes.json`)

```json
{
  "_tokens": {
    "x7k2mQ9pabc123": "Greg Hart",
    "p9nQ2rTxyz456":  "Miranda Delatore"
  },
  "2026-06": {
    "Greg Hart":      "Miranda Delatore",
    "Lauren Fields":  "Doug Bedell"
  }
}
```

---

## Roster & admins

Edit `src/constants.js` to update the team roster or admin list.

```js
export const ROSTER = [
  "Doug Bedell",
  // ...
]

export const ADMINS = ["Bridget Readey", "Greg Hart", "Megan Wetzel"]
```

---

## Local development

```bash
npm install
npm run dev
```

To test with a token locally, generate tokens in admin mode first, then visit:
```
http://localhost:5173/pclt-eotm/?token=YOUR_TOKEN
```
