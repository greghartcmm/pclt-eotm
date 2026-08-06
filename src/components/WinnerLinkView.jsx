import { useEffect, useState } from "react"
import { getLatestWinner } from "../supabase.js"
import { FrameBar, Spinner } from "./UI.jsx"
import WinnerReveal from "./WinnerReveal.jsx"
import styles from "./WinnerLinkView.module.css"

export default function WinnerLinkView() {
  const [winner, setWinner] = useState(undefined) // undefined = loading, null = none declared
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    getLatestWinner().then(setWinner)
  }, [])

  if (winner === undefined) {
    return (
      <div className={styles.shell}>
        <FrameBar />
        <div className={styles.center}><Spinner /></div>
      </div>
    )
  }

  if (!winner || dismissed) {
    return (
      <div className={styles.shell}>
        <FrameBar />
        <div className={styles.center}>
          <p className={styles.empty}>
            {winner ? "Closed." : "No winner has been declared yet."}
          </p>
        </div>
      </div>
    )
  }

  return (
    <WinnerReveal
      winner={winner}
      isPreview={false}
      onDismiss={() => setDismissed(true)}
      hideCta
    />
  )
}
