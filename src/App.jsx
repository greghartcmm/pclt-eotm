import { useState, useEffect, useRef } from "react"
import { ROSTER, getVotingPeriod } from "./constants.js"
import { resolveToken, getExistingVote } from "./supabase.js"
import { FrameBar, Card, Note, Spinner } from "./components/UI.jsx"
import VotingView from "./components/VotingView.jsx"
import AdminView from "./components/AdminView.jsx"
import AdminHeaderStrip from "./components/AdminHeaderStrip.jsx"
import PinGate from "./components/PinGate.jsx"
import SplashScreen from "./components/SplashScreen.jsx"
import styles from "./App.module.css"

export default function App() {
  const [appState, setAppState] = useState("loading")
  const [voterName, setVoterName] = useState(null)
  const [existingVote, setExistingVote] = useState(null)
  const [isAdminRoute, setIsAdminRoute] = useState(false)

  const [showSplash, setShowSplash] = useState(() =>
    !!new URLSearchParams(window.location.search).get("token")
  )
  const [mainVisible, setMainVisible] = useState(() =>
    !new URLSearchParams(window.location.search).get("token")
  )

  const headerRef = useRef(null)
  const { monthKey, monthLabel, isClosed } = getVotingPeriod()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token  = params.get("token")
    const admin  = params.get("admin")

    if (admin === "true") {
      setIsAdminRoute(true)
      setAppState("admin-pin")
      return
    }

    if (!token) {
      setAppState("no-token")
      return
    }

    initVoter(token)
  }, [])

  async function initVoter(token) {
    try {
      const name = await resolveToken(token)

      if (!name || !ROSTER.includes(name)) {
        setAppState("invalid-token")
        return
      }

      setVoterName(name)

      if (!isClosed) {
        const existing = await getExistingVote(monthKey, name)
        if (existing) setExistingVote(existing)
      }

      setAppState("voter")
    } catch (e) {
      console.error(e)
      setAppState("error")
    }
  }

  // ── Admin route ──────────────────────────────────────────────────────────
  if (isAdminRoute) {
    return (
      <div className={styles.adminRoot}>
        <AdminHeaderStrip monthKey={monthKey} isClosed={isClosed} />

        {appState === "admin-pin" && (
          <div className={styles.pinWrap}>
            <PinGate onUnlock={() => setAppState("admin")} />
          </div>
        )}

        {appState === "admin" && (
          <AdminView monthKey={monthKey} monthLabel={monthLabel} isClosed={isClosed} />
        )}
      </div>
    )
  }

  // ── Voter route ───────────────────────────────────────────────────────────
  return (
    <div className={styles.voterRoot}>
      {showSplash && (
        <SplashScreen
          monthLabel={monthLabel}
          headerRef={headerRef}
          onRevealPage={() => setMainVisible(true)}
          onDone={() => setShowSplash(false)}
        />
      )}

      <FrameBar />

      <header className={styles.headerStrip} ref={headerRef}>
        <div className={styles.headerInner}>
          <p className={styles.headerEyebrow}>CoverMyMeds · PCLT Team</p>
          <h1 className={styles.headerH1}>
            Employee of the<br /><span className={styles.headerH1Amber}>Month</span>
          </h1>
          <p className={styles.headerMonthLine}>
            <span className={styles.headerMonthValue}>{monthLabel}</span>
          </p>
          <p className={styles.headerDesc}>
            Who picked up the tab, talked the team into a terrible idea, or did something vaguely worthy of this unserious but coveted award?
          </p>
          <p className={styles.headerDeadline}>
            Votes must be in by EOD on the 5th.
          </p>
        </div>
      </header>

      <div className={`${styles.mainPage} ${mainVisible ? styles.mainVisible : ""}`}>
        <div className={styles.wrap}>
          <main>
            {appState === "loading" && <Card><Spinner /></Card>}

            {appState === "no-token" && (
              <Card>
                <h2 className={styles.setupH2}>No voting link detected</h2>
                <p className={styles.setupSub}>
                  To vote, use the personalized link sent to you by your PCLT admin.
                </p>
              </Card>
            )}

            {appState === "invalid-token" && (
              <Card>
                <h2 className={styles.setupH2}>Link not recognized</h2>
                <p className={styles.setupSub}>
                  This voting link isn't valid for {monthLabel}. Ask your admin to resend it.
                </p>
              </Card>
            )}

            {appState === "error" && (
              <Card>
                <Note variant="magenta">
                  Something went wrong. Please try again or contact your admin.
                </Note>
              </Card>
            )}

            {appState === "voter" && (
              <VotingView
                voterName={voterName}
                monthKey={monthKey}
                monthLabel={monthLabel}
                existingVote={existingVote}
                isClosed={isClosed}
                onVoteCast={(choice) => setExistingVote(choice)}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

