import { useState, useEffect, useRef } from "react"
import { ROSTER, ADMINS, initials } from "./constants.js"
import {
  resolveToken,
  getExistingVote,
  getAllWinners,
  hasSeenCelebration,
  markCelebrationSeen,
} from "./supabase.js"
import useVotingState from "./hooks/useVotingState.js"
import { FrameBar, Card, Note, Spinner } from "./components/UI.jsx"
import VotingView from "./components/VotingView.jsx"
import AdminView from "./components/AdminView.jsx"
import AdminHeaderStrip from "./components/AdminHeaderStrip.jsx"
import PinGate from "./components/PinGate.jsx"
import SplashScreen from "./components/SplashScreen.jsx"
import HofStrip from "./components/HofStrip.jsx"
import WinnerReveal from "./components/WinnerReveal.jsx"
import VotingClosedScreen from "./components/VotingClosedScreen.jsx"
import WinnerLinkView from "./components/WinnerLinkView.jsx"
import styles from "./App.module.css"

const WINNER_LINK_KEY = "pclteotm"

export default function App() {
  const [appState, setAppState] = useState("loading")
  const [voterName, setVoterName] = useState(null)
  const [existingVote, setExistingVote] = useState(null)
  const [isAdminRoute, setIsAdminRoute] = useState(false)
  const [token, setToken] = useState(null)
  const [winners, setWinners] = useState(null)
  const [revealWinner, setRevealWinner] = useState(null)
  const [showReveal, setShowReveal] = useState(false)
  const [isPreview, setIsPreview] = useState(false)
  const [shouldCelebrate, setShouldCelebrate] = useState(false)
  const [adminMenuOpen, setAdminMenuOpen] = useState(false)

  const [showSplash, setShowSplash] = useState(() =>
    !!new URLSearchParams(window.location.search).get("token")
  )
  const [mainVisible, setMainVisible] = useState(() =>
    !new URLSearchParams(window.location.search).get("token")
  )

  const headerRef = useRef(null)
  const { monthKey, monthLabel, isOpen, loading: votingLoading } = useVotingState()
  const isClosed = isOpen === false

  // Show celebration 500ms after page settles post-splash
  useEffect(() => {
    if (!mainVisible || !shouldCelebrate) return
    const t = setTimeout(() => setShowReveal(true), 500)
    return () => clearTimeout(t)
  }, [mainVisible, shouldCelebrate])

  // Close admin menu on outside click
  useEffect(() => {
    if (!adminMenuOpen) return
    function close() { setAdminMenuOpen(false) }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [adminMenuOpen])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const rawToken = params.get("token")
    const admin    = params.get("admin")

    if (admin === "true") {
      setIsAdminRoute(true)
      setAppState("admin-pin")
      return
    }

    if (!rawToken) {
      setAppState("no-token")
      return
    }

    if (!monthKey) return // wait for voting state to resolve first
    initVoter(rawToken)
  }, [monthKey])

  async function initVoter(rawToken) {
    try {
      const name = await resolveToken(rawToken)

      if (!name || !ROSTER.includes(name)) {
        setAppState("invalid-token")
        return
      }

      setVoterName(name)
      setToken(rawToken)

      const [existing, allWinners] = await Promise.all([
        getExistingVote(monthKey, name),
        getAllWinners(),
      ])

      if (existing) setExistingVote(existing)
      setWinners(allWinners)

      if (allWinners.length > 0) {
        const seen = await hasSeenCelebration(rawToken, allWinners[0].month)
        if (!seen) {
          setRevealWinner(allWinners[0])
          setShouldCelebrate(true)
        }
      }

      setAppState("voter")
    } catch (e) {
      console.error(e)
      setAppState("error")
    }
  }

  async function dismissReveal() {
    const wasPreview = isPreview
    setShowReveal(false)
    setIsPreview(false)
    if (!wasPreview && token && revealWinner) {
      await markCelebrationSeen(token, revealWinner.month)
    }
  }

  function simulateWinner() {
    setAdminMenuOpen(false)
    const candidates = ROSTER.filter(n => n !== voterName)
    const pick = candidates[Math.floor(Math.random() * candidates.length)]
    setRevealWinner({
      winners: [pick],
      label: monthLabel,
      month: monthKey,
      comments: ["Sample comment — real quotes appear once voting closes"],
    })
    setIsPreview(true)
    setShowReveal(true)
  }

  const isAdmin = ADMINS.includes(voterName)

  // ── Standalone winner link — just the reveal popup, nothing else ───────────
  if (new URLSearchParams(window.location.search).get("key") === WINNER_LINK_KEY) {
    return <WinnerLinkView />
  }

  // ── Admin route ──────────────────────────────────────────────────────────
  if (isAdminRoute) {
    if (votingLoading) {
      return (
        <div className={styles.adminRoot}>
          <div className={styles.pinWrap}><Card><Spinner /></Card></div>
        </div>
      )
    }
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

  // ── Voter route: voting closed — full-screen takeover ──────────────────────
  if (votingLoading) {
    return <div className={styles.voterRoot}><FrameBar /></div>
  }

  if (isClosed) {
    return <VotingClosedScreen monthLabel={monthLabel} />
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
        {voterName && (
          <div
            className={`${styles.voterIdChip} ${isAdmin ? styles.voterIdChipAdmin : ""}`}
            onClick={isAdmin ? e => { e.stopPropagation(); setAdminMenuOpen(v => !v) } : undefined}
            role={isAdmin ? "button" : undefined}
            tabIndex={isAdmin ? 0 : undefined}
            aria-label={isAdmin ? "Admin menu" : undefined}
          >
            <div className={`${styles.voterIdAv} ${isAdmin ? styles.voterIdAvAdmin : ""}`}>
              {initials(voterName)}
            </div>
            <span className={styles.voterIdTxt}>
              Voting as <strong>{voterName}</strong>
            </span>
            {isAdmin && adminMenuOpen && (
              <div className={styles.adminMenu}>
                <button className={styles.adminMenuBtn} onClick={simulateWinner}>
                  🎲 Simulate winner
                </button>
              </div>
            )}
          </div>
        )}
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
        <HofStrip winners={winners} />
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
                onVoteCast={(choice) => setExistingVote(choice)}
              />
            )}
          </main>
        </div>
      </div>

      {showReveal && revealWinner && (
        <WinnerReveal
          winner={revealWinner}
          isPreview={isPreview}
          onDismiss={dismissReveal}
        />
      )}
    </div>
  )
}
