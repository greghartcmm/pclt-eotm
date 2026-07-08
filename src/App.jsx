import { useState, useEffect } from "react"
import { ROSTER, ADMINS, previousMonthLabel, previousMonthKey } from "./constants.js"
import { fetchVotes } from "./github.js"
import { FrameBar, Card, Note, Spinner } from "./components/UI.jsx"
import VotingView from "./components/VotingView.jsx"
import AdminView from "./components/AdminView.jsx"
import PinGate from "./components/PinGate.jsx"
import styles from "./App.module.css"

export default function App() {
  const [appState, setAppState] = useState("loading")
  // loading | invalid-token | voter | no-token | error
  const [voterName, setVoterName] = useState(null)
  const [existingVote, setExistingVote] = useState(null)
  const [isAdminRoute, setIsAdminRoute] = useState(false)
  const [adminUnlocked, setAdminUnlocked] = useState(false)

  const monthKey = previousMonthKey()
  const monthLabel = previousMonthLabel()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get("token")
    const admin = params.get("admin")

    if (admin === "true") {
      setIsAdminRoute(true)
      setAppState("done")
      return
    }

    if (!token) {
      setAppState("no-token")
      return
    }

    init(token)
  }, [])

  async function init(token) {
    try {
      const ghOwner = localStorage.getItem("pclt-eotm:gh-owner") || "greghartcmm"
      const ghRepo = localStorage.getItem("pclt-eotm:gh-repo") || "pclt-eotm"

      const { data } = await fetchVotes(ghOwner, ghRepo)
      const tokenMap = data["_tokens"] || {}
      const resolvedName = tokenMap[token]

      if (!resolvedName || !ROSTER.includes(resolvedName)) {
        setAppState("invalid-token")
        return
      }

      setVoterName(resolvedName)

      const monthVotes = data[monthKey] || {}
      if (monthVotes[resolvedName]) {
        setExistingVote(monthVotes[resolvedName])
      }

      setAppState("voter")
    } catch (e) {
      console.error(e)
      setAppState("error")
    }
  }

  // --- Admin route ---
  if (isAdminRoute) {
    if (!adminUnlocked) {
      return (
        <div className={styles.root}>
          <FrameBar />
          <div className={styles.wrap}>
            <Header monthLabel={monthLabel} />
            <PinGate onUnlock={() => setAdminUnlocked(true)} />
            <footer className={styles.footer}>CoverMyMeds is a McKesson company.</footer>
          </div>
        </div>
      )
    }
    return (
      <div className={styles.root}>
        <FrameBar />
        <div className={styles.wrap}>
          <Header monthLabel={monthLabel} />
          <AdminView />
          <footer className={styles.footer}>CoverMyMeds is a McKesson company.</footer>
        </div>
      </div>
    )
  }

  // --- Voter route ---
  return (
    <div className={styles.root}>
      <FrameBar />
      <div className={styles.wrap}>
        <Header monthLabel={monthLabel} />
        <main>
          {appState === "loading" && <Card><Spinner /></Card>}

          {appState === "no-token" && (
            <Card>
              <h2 className={styles.setupH2}>No voting link detected</h2>
              <p className={styles.setupSub}>
                To vote, use the personalized link sent to you by your PCLT admin.
                Links look like: <code className={styles.code}>…?token=abc123</code>
              </p>
            </Card>
          )}

          {appState === "invalid-token" && (
            <Card>
              <h2 className={styles.setupH2}>Link not recognized</h2>
              <p className={styles.setupSub}>
                This voting link isn't valid for {monthLabel}. Check that you used
                the most recent link from your admin, or ask them to resend it.
              </p>
            </Card>
          )}

          {appState === "error" && (
            <Card>
              <Note variant="magenta">
                Something went wrong loading the app. Please try again or contact your admin.
              </Note>
            </Card>
          )}

          {appState === "voter" && (
            <VotingView
              voterName={voterName}
              monthKey={monthKey}
              monthLabel={monthLabel}
              existingVote={existingVote}
              onVoteCast={(choice) => setExistingVote(choice)}
            />
          )}
        </main>
        <footer className={styles.footer}>CoverMyMeds is a McKesson company.</footer>
      </div>
    </div>
  )
}

function Header({ monthLabel }) {
  return (
    <header className={styles.mast}>
      <div className={styles.eyebrow}>
        CoverMyMeds <span className={styles.dot}>•</span> PCLT Team
      </div>
      <h1 className={styles.h1}>Employee of the Month</h1>
      <div className={styles.period}>
        Recognizing our teammate for <strong>{monthLabel}</strong>
      </div>
    </header>
  )
}
