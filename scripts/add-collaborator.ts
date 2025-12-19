import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function addCollaborator() {
  const ALEX_ID = '6e702a66-e366-4bb7-8eae-e62cae2b13a0'

  // Get Marc's user ID (the owner of Michael)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email')
    .ilike('email', '%marc%')
    .single()

  if (!profile) {
    console.log('Could not find Marc profile, listing all profiles:')
    const { data: all } = await supabase.from('profiles').select('id, email')
    console.log(all)
    return
  }

  console.log('Found profile:', profile.email)

  // Add as admin collaborator on Alex
  const { error } = await supabase
    .from('collaborators')
    .insert({
      child_id: ALEX_ID,
      user_id: profile.id,
      role: 'admin'
    })

  if (error) {
    console.log('Error (might already exist):', error.message)
  } else {
    console.log('✅ Added as collaborator on Alex!')
  }
}

addCollaborator()
