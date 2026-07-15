import { useRef, useState } from "react"
import html2canvas from "html2canvas"
import { FrameBar, Avatar } from "./UI.jsx"
import styles from "./CelebrationOverlay.module.css"

export default function CelebrationOverlay({ data, onClose }) {
  const { winners, featuredComment, voteCount, label } = data
  const cardRef = useRef(null)
  const [copying, setCopying] = useState(false)
  const [copyMsg, setCopyMsg] = useState("")

  async function handleCopyImage() {
    if (!cardRef.current) return
    setCopying(true)
    setCopyMsg("")
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
      })
      canvas.toBlob(async blob => {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ])
          setCopyMsg("Copied!")
        } catch {
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = `eotm-${data.month}.png`
          a.click()
          URL.revokeObjectURL(url)
          setCopyMsg("Saved!")
        }
        setCopying(false)
        setTimeout(() => setCopyMsg(""), 2500)
      }, "image/png")
    } catch (e) {
      setCopying(false)
      setCopyMsg("Error — try a screenshot instead")
      setTimeout(() => setCopyMsg(""), 3000)
    }
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <button
        className={styles.closeBtn}
        onClick={e => { e.stopPropagation(); onClose() }}
        aria-label="Close"
      >
        ✕
      </button>

      <div className={styles.cardWrap} onClick={e => e.stopPropagation()}>
        <div className={styles.card} ref={cardRef}>
          <FrameBar />
          <div className={styles.content}>
            <p className={styles.eyebrow}>CoverMyMeds · PCLT Team</p>
            <h1 className={styles.title}>Employee of the Month</h1>
            <p className={styles.monthLabel}>{label}</p>
            <div className={styles.avatarRow}>
              {winners.map(name => (
                <Avatar key={name} name={name} size={80} />
              ))}
            </div>
            <p className={styles.winnerNames}>{winners.join(" & ")}</p>
            {featuredComment && (
              <p className={styles.comment}>"{featuredComment}"</p>
            )}
            <p className={styles.meta}>
              {voteCount != null ? `${voteCount} ${voteCount === 1 ? "vote" : "votes"} · ` : ""}PCLT Team
            </p>
          </div>
          <FrameBar />
        </div>

        <div className={styles.copyRow}>
          <button className={styles.copyBtn} onClick={handleCopyImage} disabled={copying}>
            {copying ? "Capturing…" : "Copy image"}
          </button>
          {copyMsg && <span className={styles.copyMsg}>{copyMsg}</span>}
        </div>
      </div>
    </div>
  )
}
