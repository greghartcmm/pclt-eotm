import { useState, useEffect } from "react"
import { ROSTER, ADMINS, previousMonthLabel, previousMonthKey } from "./constants.js"
import { fetchVotes } from "./github.js"
import { FrameBar, Card, Note, Spinner } from "./components/UI.jsx"
import VotingView from "./components/VotingView.jsx"
import AdminView from "./components/AdminView.jsx"
import ResultsView from "./components/ResultsView.jsx"
import styles from "./App.module.css"

export default function App() {
  const [appState, setAppState] = useState("loading") 
  // loading | invalid-token | voter | admin | no-config
  const [voterName, setVoterName] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)
  const [existingVote, setExistingVote] = useState(null)
  const [votedFor, setVotedFor] = useState(null)
  const [allVotes, setAllVotes] = useState(null)

  const monthKey = previousMonthKey()
  const monthLabel = previousMonthLabel()

  useEffect(() => {
    init()
  }, [])

  async function init() {
    // 1. Read token from URL
    const params = new URLSearchParams(window.location.search)
    const token = params.get("token")

    if (!token) {
      setAppState("no-token")
      return
    }

    // 2. Fetch votes.json to resolve token → name
    try {
      // votes.json is public (GitHub Pages), so no PAT needed for reading
      const ghOwner = localStorage.getItem("pclt-eotm:gh-owner")
      const ghRepo = localStorage.getItem("pclt-eotm:gh-repo")

      if (!ghOwner || !ghRepo) {
        // No config at all — admins need to set up first
        setAppState("no-config")
        return
      }

      const { data } = await fetchVotes(ghOwner, ghRepo)
      const tokenMap = data["_tokens"] || {}
      const resolvedName = tokenMap[token]

      if (!resolvedName || !ROSTER.includes(resolvedName)) {
        setAppState("invalid-token")
        return
      }

      setVoterName(resolvedName)
      setIsAdmin(ADMINS.includes(resolvedName))

      // Check if they've already voted this month
      const monthVotes = data[monthKey] || {}
      if (monthVotes[resolvedName]) {
        setExistingVote(monthVotes[resolvedName])
      }
      setAllVotes(monthVotes)
      setAppState("voter")
    } catch (e) {
      console.error(e)
      setAppState("error")
    }
  }

  function handleVoteCast(choice) {
    setVotedFor(choice)
    setExistingVote(choice)
  }

  const currentPeriod = `Recognizing teammates for `

  return (
    <div className={styles.root}>
      <FrameBar />
      <div className={styles.wrap}>
        <header className={styles.mast}>
          <div className={styles.eyebrow}>
            CoverMyMeds <span className={styles.dot}>•</span> PCLT Team
          </div>
          <h1 className={styles.h1}>Employee of the Month</h1>
          <div className={styles.period}>
            Recognizing our teammate for <strong>{monthLabel}</strong>
          </div>
        </header>

        <main>
          {appState === "loading" && (
            <Card><Spinner /></Card>
          )}

          {appState === "no-config" && (
            <Card>
              <h2 className={styles.setupH2}>First-time setup</h2>
              <p className={styles.setupSub}>
                An admin needs to configure the GitHub connection on this device before voter links can be generated.
                If you're an admin, use the "Admin" button below.
              </p>
            </Card>
          )}

          {appState === "no-token" && (
            <Card>
              <h2 className={styles.setupH2}>No voting link detected</h2>
              <p className={styles.setupSub}>
                To vote, use the personalized link sent to you by your PCLT admin.
                Links look like: <code className={styles.code}>…?token=abc123</code>
              </p>
              <Note variant="orange">
                If you're an admin, use the button below to manage the program.
              </Note>
            </Card>
          )}

          {appState === "invalid-token" && (
            <Card>
              <h2 className={styles.setupH2}>Link not recognized</h2>
              <p className={styles.setupSub}>
                This voting link isn't valid for {monthLabel}. Check that you used the most recent link from your admin, or ask them to resend it.
              </p>
            </Card>
          )}

          {appState === "error" && (
            <Card>
              <Note variant="magenta">
                Something went wrong loading the app. Make sure the GitHub repo is public, or check the console for details.
              </Note>
            </Card>
          )}

          {appState === "voter" && !showAdmin && (
            <VotingView
              voterName={voterName}
              monthKey={monthKey}
              monthLabel={monthLabel}
              existingVote={existingVote}
              onVoteCast={handleVoteCast}
            />
          )}

          {showAdmin && isAdmin && (
            <AdminView adminName={voterName} />
          )}

          {/* Admins: toggle between voting and admin panel */}
          {(isAdmin || appState === "no-config" || appState === "no-token") && (
            <div className={styles.adminBar}>
              {isAdmin && appState === "voter" && (
                <button
                  className={styles.adminToggle}
                  onClick={() => setShowAdmin(v => !v)}
                >
                  {showAdmin ? "← Back to ballot" : "Admin panel"}
                </button>
              )}
              {(appState === "no-config" || appState === "no-token") && (
                <button
                  className={styles.adminToggle}
                  onClick={() => setShowAdmin(v => !v)}
                >
                  {showAdmin ? "← Back" : "Admin setup"}
                </button>
              )}
              {showAdmin && (appState === "no-config" || appState === "no-token") && (
                <AdminView adminName={voterName || "Admin"} />
              )}
            </div>
          )}
        </main>

        <footer className={styles.footer}>
          CoverMyMeds is a McKesson company.
        </footer>
      </div>
    </div>
  )
}
