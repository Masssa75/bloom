import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkLatestSession() {
  const ALEX_ID = '6e702a66-e366-4bb7-8eae-e62cae2b13a0'

  const { data: sessions, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('child_id', ALEX_ID)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    console.error('Error:', error)
    return
  }

  if (!sessions || sessions.length === 0) {
    console.log('No sessions found for Alex')
    return
  }

  const session = sessions[0]
  console.log('Session ID:', session.id)
  console.log('Created:', session.created_at)
  console.log('Updated:', session.updated_at)
  console.log('\n📋 MESSAGES:\n')

  const messages = session.messages as { role: string, content: string }[]
  for (const msg of messages) {
    console.log(`[${msg.role.toUpperCase()}]`)
    console.log(msg.content)
    console.log('-'.repeat(60))
  }
}

checkLatestSession()
