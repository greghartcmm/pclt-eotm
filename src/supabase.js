import { createClient } from '@supabase/supabase-js'
import { monthLabelFromKey } from './constants.js'

const SUPABASE_URL = 'https://jkpgggdlpjhoojamnhrp.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    }
  }
})

export async function resolveToken(token) {
  const { data, error } = await supabase
    .from('tokens')
    .select('voter_name')
    .eq('token', token)
    .single()
  if (error || !data) return null
  return data.voter_name
}

export async function getExistingVote(monthKey, voterName) {
  const { data, error } = await supabase
    .from('votes')
    .select('choice, reason')
    .eq('month', monthKey)
    .eq('voter_name', voterName)
    .single()
  if (error || !data) return null
  return data.choice
}

export async function castVote(monthKey, voterName, choice, reason = null) {
  const { error } = await supabase
    .from('votes')
    .upsert(
      { month: monthKey, voter_name: voterName, choice, reason: reason || null },
      { onConflict: 'month,voter_name' }
    )
  if (error) return { success: false, error: error.message }
  return { success: true }
}

// Returns { voter_name, choice, reason } rows for a month
export async function getVotes(monthKey) {
  const { data, error } = await supabase
    .from('votes')
    .select('voter_name, choice, reason')
    .eq('month', monthKey)
  if (error) return {}
  const result = {}
  data.forEach(row => {
    result[row.voter_name] = { choice: row.choice, reason: row.reason || null }
  })
  return result
}

export async function clearVotes(monthKey) {
  const { error } = await supabase
    .from('votes')
    .delete()
    .eq('month', monthKey)
  if (error) throw new Error(error.message)
}

export async function backupVotes(monthKey, votesObj) {
  const votesArray = Object.entries(votesObj).map(([voter_name, { choice, reason }]) => ({
    voter_name, choice, reason: reason || "",
  }))
  const { error } = await supabase
    .from('vote_backups')
    .upsert({ month: monthKey, reset_at: new Date().toISOString(), votes: votesArray }, { onConflict: 'month' })
  if (error) throw new Error(error.message)
}

export async function getVoteBackup(monthKey) {
  const { data, error } = await supabase
    .from('vote_backups')
    .select('*')
    .eq('month', monthKey)
    .single()
  if (error || !data) return null
  return data
}

export async function restoreVotesFromBackup(monthKey, backupVotesArr) {
  const { error: delError } = await supabase.from('votes').delete().eq('month', monthKey)
  if (delError) throw new Error(delError.message)
  if (backupVotesArr.length === 0) return
  const rows = backupVotesArr.map(({ voter_name, choice, reason }) => ({
    month: monthKey, voter_name, choice, reason: reason || null,
  }))
  const { error } = await supabase.from('votes').insert(rows)
  if (error) throw new Error(error.message)
}

export async function declareWinner(monthKey, winnerNames, featuredComment, voteCount, totalVotes, allComments = []) {
  const { error } = await supabase
    .from('winners')
    .upsert({
      month: monthKey,
      winner_names: winnerNames,
      featured_comment: featuredComment || null,
      all_comments: allComments,
      vote_count: voteCount,
      total_votes: totalVotes,
      declared_at: new Date().toISOString(),
    }, { onConflict: 'month' })
  if (error) throw new Error(error.message)
}

function resolveComments(featuredComment, allComments) {
  if (allComments && allComments.length > 0) return allComments
  return featuredComment ? [featuredComment] : []
}

export async function getWinner(monthKey) {
  const { data, error } = await supabase
    .from('winners')
    .select('*')
    .eq('month', monthKey)
    .single()
  if (error || !data) return null
  return {
    month: data.month,
    winners: data.winner_names,
    featured_comment: data.featured_comment || null,
    comments: resolveComments(data.featured_comment, data.all_comments),
    voteCount: data.vote_count,
    totalVotes: data.total_votes,
  }
}

// ─── Voting state (single reused row, id=1) ────────────────────────────────
// Source of truth for which month is currently being voted on and whether
// the ballot is open. Declare Winner closes it; Open Voting advances the
// month and reopens it. See hooks/useVotingState.js for the realtime read side.

export async function getVotingState() {
  const { data, error } = await supabase
    .from('voting_state')
    .select('month_key, is_open')
    .eq('id', 1)
    .single()
  if (error || !data) return null
  return { monthKey: data.month_key, isOpen: data.is_open }
}

export async function closeVoting(monthKey) {
  const { error } = await supabase
    .from('voting_state')
    .update({ is_open: false, closed_at: new Date().toISOString() })
    .eq('id', 1)
    .eq('month_key', monthKey)
  if (error) throw new Error(error.message)
}

export async function openVoting(nextMonthKey) {
  const { error } = await supabase
    .from('voting_state')
    .update({
      month_key: nextMonthKey,
      is_open: true,
      closed_at: null,
      opened_at: new Date().toISOString(),
    })
    .eq('id', 1)
  if (error) throw new Error(error.message)
}

export async function hasSeenCelebration(token, winnerMonth) {
  const { data, error } = await supabase
    .from('celebration_seen')
    .select('token')
    .eq('token', token)
    .eq('winner_month', winnerMonth)
    .single()
  return !error && !!data
}

export async function markCelebrationSeen(token, winnerMonth) {
  await supabase
    .from('celebration_seen')
    .upsert({ token, winner_month: winnerMonth }, { onConflict: 'token,winner_month' })
}

export async function getAllWinners() {
  const { data, error } = await supabase
    .from('winners')
    .select('month, winner_names, featured_comment, all_comments, vote_count, total_votes')
    .order('month', { ascending: false })
    .limit(24)
  if (error || !data) return []
  return data.map(row => ({
    month: row.month,
    label: monthLabelFromKey(row.month),
    winners: row.winner_names,
    voteCount: row.vote_count,
    totalVotes: row.total_votes,
    featuredComment: row.featured_comment || null,
    comments: resolveComments(row.featured_comment, row.all_comments),
  }))
}

export async function getWinnerHistory(currentMonthKey) {
  const { data, error } = await supabase
    .from('winners')
    .select('month, winner_names, featured_comment, all_comments, vote_count, total_votes')
    .neq('month', currentMonthKey)
    .order('month', { ascending: false })
    .limit(12)
  if (error || !data) return []
  return data.map(row => ({
    month: row.month,
    label: monthLabelFromKey(row.month),
    winners: row.winner_names,
    voteCount: row.vote_count,
    totalVotes: row.total_votes,
    featuredComment: row.featured_comment || null,
    comments: resolveComments(row.featured_comment, row.all_comments),
  }))
}
