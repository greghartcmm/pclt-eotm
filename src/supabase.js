import { createClient } from '@supabase/supabase-js'

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

export async function declareWinner(monthKey, winnerNames, featuredComment, voteCount, totalVotes) {
  const { error } = await supabase
    .from('winners')
    .upsert({
      month: monthKey,
      winner_names: winnerNames,
      featured_comment: featuredComment || null,
      vote_count: voteCount,
      total_votes: totalVotes,
      declared_at: new Date().toISOString(),
    }, { onConflict: 'month' })
  if (error) throw new Error(error.message)
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
    voteCount: data.vote_count,
    totalVotes: data.total_votes,
  }
}

export async function getWinnerHistory(currentMonthKey) {
  const { data, error } = await supabase
    .from('winners')
    .select('month, winner_names, featured_comment, vote_count, total_votes')
    .neq('month', currentMonthKey)
    .order('month', { ascending: false })
    .limit(12)
  if (error || !data) return []
  return data.map(row => {
    const [year, mo] = row.month.split('-')
    const label = new Date(+year, +mo - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    return {
      month: row.month,
      label,
      winners: row.winner_names,
      voteCount: row.vote_count,
      totalVotes: row.total_votes,
      featuredComment: row.featured_comment || null,
    }
  })
}
