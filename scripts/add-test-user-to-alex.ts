import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function addTestUser() {
  const ALEX_ID = '6e702a66-e366-4bb7-8eae-e62cae2b13a0'
  const TEST_EMAIL = 'claude-test@bloom.wunderkind.world'

  // Get test user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('email', TEST_EMAIL)
    .single()

  if (!profile) {
    console.log('Could not find test user profile')
    return
  }

  console.log('Found profile:', profile.email, profile.id)

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
    console.log('✅ Added test user as collaborator on Alex!')
  }
}

addTestUser()
