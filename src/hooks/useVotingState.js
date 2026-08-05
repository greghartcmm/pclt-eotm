import { useEffect, useState } from "react"
import { supabase, getVotingState } from "../supabase.js"
import { monthLabelFromKey } from "../constants.js"

// Shared by the voter page and the admin panel — single source of truth for
// which month is currently being voted on and whether the ballot is open.
// Reads the `voting_state` row once, then stays live via Realtime so a
// Declare Winner / Open Voting click elsewhere updates every open tab.
export default function useVotingState() {
  const [monthKey, setMonthKey] = useState(null)
  const [isOpen, setIsOpen] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    getVotingState().then(state => {
      if (!active) return
      setMonthKey(state?.monthKey ?? null)
      setIsOpen(state?.isOpen ?? null)
      setLoading(false)
    })

    const channel = supabase
      .channel("voting_state_changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "voting_state", filter: "id=eq.1" },
        ({ new: row }) => {
          if (!active) return
          setMonthKey(row.month_key)
          setIsOpen(row.is_open)
          setLoading(false)
        }
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [])

  return {
    monthKey,
    monthLabel: monthKey ? monthLabelFromKey(monthKey) : "",
    isOpen,
    loading,
  }
}
