// GitHub API helpers for reading/writing votes.json
// The PAT is stored in localStorage on admin machines only.

const VOTES_PATH = "votes.json"

function getConfig() {
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
  return !!getConfig()
}

// Fetch the current votes.json from the repo (raw, no auth needed if public)
// Returns { data, sha } where data is the parsed JSON
export async function fetchVotes(owner, repo) {
  const cfg = getConfig()
  const effectiveOwner = owner || cfg?.owner
  const effectiveRepo = repo || cfg?.repo

  if (!effectiveOwner || !effectiveRepo) throw new Error("GitHub repo not configured.")

  const headers = { Accept: "application/vnd.github+json" }
  if (cfg?.pat) headers["Authorization"] = `Bearer ${cfg.pat}`

  const res = await fetch(
    `https://api.github.com/repos/${effectiveOwner}/${effectiveRepo}/contents/${VOTES_PATH}`,
    { headers }
  )

  if (res.status === 404) {
    // File doesn't exist yet — return empty state
    return { data: {}, sha: null }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `GitHub API error: ${res.status}`)
  }

  const json = await res.json()
  const decoded = atob(json.content.replace(/\n/g, ""))
  return { data: JSON.parse(decoded), sha: json.sha }
}

// Write updated votes.json back to the repo
// Requires PAT with contents:write
export async function writeVotes(data, sha, message = "Update votes") {
  const cfg = getConfig()
  if (!cfg?.pat || !cfg?.owner || !cfg?.repo) {
    throw new Error("GitHub config (owner, repo, PAT) required to write votes.")
  }

  const content = btoa(JSON.stringify(data, null, 2))

  const body = { message, content }
  if (sha) body.sha = sha // required for update; omit for initial creation

  const res = await fetch(
    `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${VOTES_PATH}`,
    {
      method: "PUT",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${cfg.pat}`,
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

// Cast a single vote atomically:
// 1. Read current votes.json (get SHA)
// 2. Merge in the new vote
// 3. Write back with SHA (GitHub rejects if file changed since read)
// Returns { success, alreadyVoted, error }
export async function castVoteToGithub(monthKey, voterName, choice) {
  const cfg = getConfig()
  if (!cfg) return { success: false, error: "GitHub not configured." }

  try {
    const { data, sha } = await fetchVotes()

    // Guard: already voted this month
    if (data[monthKey]?.[voterName]) {
      return { success: false, alreadyVoted: true }
    }

    // Merge vote
    if (!data[monthKey]) data[monthKey] = {}
    data[monthKey][voterName] = choice

    await writeVotes(data, sha, `Vote: ${voterName} → ${choice} (${monthKey})`)
    return { success: true }
  } catch (err) {
    // 409 = SHA conflict (two simultaneous writes) — caller should retry
    if (err.message?.includes("409") || err.message?.toLowerCase().includes("conflict")) {
      return { success: false, conflict: true, error: "Conflict — please try again." }
    }
    return { success: false, error: err.message }
  }
}

// Write token map for a given period (admin only)
export async function writeTokens(tokens) {
  const cfg = getConfig()
  if (!cfg) throw new Error("GitHub not configured.")

  const { data, sha } = await fetchVotes()
  data["_tokens"] = { ...(data["_tokens"] || {}), ...tokens }
  await writeVotes(data, sha, "Generate voter tokens")
}
