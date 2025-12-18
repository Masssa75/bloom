import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

async function addTestUserToMichael() {
  // Get test user ID
  const { data: testUser } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', 'claude-test@bloom.wunderkind.world')
    .single()

  console.log('Test user:', testUser)

  if (!testUser) {
    console.log('Test user not found')
    return
  }

  // Add as collaborator on Michael
  const MICHAEL_ID = 'c8b85995-d7d7-4380-8697-d0045aa58b8b'

  const { data, error } = await supabase
    .from('collaborators')
    .upsert({
      child_id: MICHAEL_ID,
      user_id: testUser.id,
      role: 'member'
    }, { onConflict: 'child_id,user_id' })

  if (error) {
    console.error('Error:', error)
  } else {
    console.log('Added test user as collaborator on Michael')
  }
}

addTestUserToMichael()
