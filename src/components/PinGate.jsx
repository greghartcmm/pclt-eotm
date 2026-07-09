import { useState } from "react"
import { Card, Button, Note } from "./UI.jsx"
import styles from "./PinGate.module.css"

const CORRECT_PIN = import.meta.env.VITE_ADMIN_PIN

export default function PinGate({ onUnlock }) {
  const [pin, setPin] = useState("")
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    if (pin === CORRECT_PIN) {
      onUnlock()
    } else {
      setError(true)
      setShake(true)
      setPin("")
      setTimeout(() => setShake(false), 500)
    }
  }

  return (
    <Card className={`${styles.card} ${shake ? styles.shake : ""}`}>
      <div className={styles.lockIcon}>🔒</div>
      <h2 className={styles.h2}>Admin access</h2>
      <p className={styles.sub}>Enter your admin PIN to continue.</p>
      <form onSubmit={handleSubmit} autoComplete="off">
        <input
          className={`${styles.pinInput} ${error ? styles.pinError : ""}`}
          type="text"
          inputMode="numeric"
          style={{ WebkitTextSecurity: "disc" }}
          autoComplete="off"
          maxLength={8}
          value={pin}
          onChange={e => { setPin(e.target.value); setError(false) }}
          placeholder="••••"
          autoFocus
        />
        {error && <Note variant="magenta">Incorrect PIN. Try again.</Note>}
        <Button variant="primary" block className={styles.submitBtn}>
          Unlock
        </Button>
      </form>
    </Card>
  )
}
