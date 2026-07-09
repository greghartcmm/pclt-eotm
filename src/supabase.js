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
    .select('choice')
    .eq('month', monthKey)
    .eq('voter_name', voterName)
    .single()
  if (error || !data) return null
  return data.choice
}

export async function castVote(monthKey, voterName, choice) {
  const { error } = await supabase
    .from('votes')
    .upsert(
      { month: monthKey, voter_name: voterName, choice },
      { onConflict: 'month,voter_name' }
    )
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function getVotes(monthKey) {
  const { data, error } = await supabase
    .from('votes')
    .select('voter_name, choice')
    .eq('month', monthKey)
  if (error) return {}
  const result = {}
  data.forEach(row => { result[row.voter_name] = row.choice })
  return result
}

export async function clearVotes(monthKey) {
  const { error } = await supabase
    .from('votes')
    .delete()
    .eq('month', monthKey)
  if (error) throw new Error(error.message)
}
