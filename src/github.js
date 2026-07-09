// GitHub API helpers for reading/writing votes.json

const VOTES_PATH = "votes.json"
const GH_OWNER   = "greghartcmm"
const GH_REPO    = "pclt-eotm"

// Write PAT is injected at build time — never visible in source
// Scoped to contents:write on this repo only
const WRITE_PAT  = import.meta.env.VITE_GH_WRITE_PAT || ""

// Admin PAT stored in localStorage (Greg only, for reset)
function getAdminConfig() {
  const raw = localStorage.getItem("pclt-eotm:gh-config")
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export function saveGithubConfig(owner, repo, pat) {
  localStorage.setItem("pclt-eotm:gh-config", JSON.stringify({ owner, repo, pat }))
}

export function clearGithubConfig() {
  localStorage.removeItem("pclt-eotm:gh-config")
}

export function hasGithubConfig() {
  return !!getAdminConfig()
}

// Read votes.json — public, no auth needed
export async function fetchVotes() {
  const res = await fetch(
    `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${VOTES_PATH}`,
    { headers: { Accept: "application/vnd.github+json" } }
  )

  if (res.status === 404) return { data: {}, sha: null }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `GitHub API error: ${res.status}`)
  }

  const json = await res.json()
  const decoded = atob(json.content.replace(/\n/g, ""))
  return { data: JSON.parse(decoded), sha: json.sha }
}

// Write votes.json — uses build-time PAT for voter writes,
// or admin localStorage PAT for admin operations (reset)
export async function writeVotes(data, sha, message = "Update votes", useAdminPat = false) {
  let pat = WRITE_PAT

  if (useAdminPat) {
    const cfg = getAdminConfig()
    if (!cfg?.pat) throw new Error("Admin PAT required.")
    pat = cfg.pat
  }

  if (!pat) throw new Error("No write token available.")

  const content = btoa(JSON.stringify(data, null, 2))
  const body = { message, content }
  if (sha) body.sha = sha

  const res = await fetch(
    `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${VOTES_PATH}`,
    {
      method: "PUT",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `token ${pat}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `GitHub write error: ${res.status}`)
  }

  return res.json()
}

// Cast or update a vote atomically with SHA conflict retry
// allowOverwrite=true means we're changing an existing vote
export async function castVoteToGithub(monthKey, voterName, choice, allowOverwrite = false) {
  let attempts = 0
  while (attempts < 3) {
    try {
      const { data, sha } = await fetchVotes()

      // If not overwriting and already voted, block it
      if (!allowOverwrite && data[monthKey]?.[voterName]) {
        return { success: false, alreadyVoted: true }
      }

      if (!data[monthKey]) data[monthKey] = {}
      data[monthKey][voterName] = choice

      const msg = allowOverwrite
        ? `Change vote: ${voterName} → ${choice} (${monthKey})`
        : `Vote: ${voterName} → ${choice} (${monthKey})`

      await writeVotes(data, sha, msg)
      return { success: true }
    } catch (err) {
      if (err.message?.includes("409") || err.message?.toLowerCase().includes("conflict")) {
        attempts++
        await new Promise(r => setTimeout(r, 400 * attempts))
        continue
      }
      return { success: false, error: err.message }
    }
  }
  return { success: false, error: "Couldn't save your vote after several attempts. Please try again." }
}
// Thu Jul  9 05:49:05 EDT 2026
