import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

// Weight assignments by title
const weightByTitle: Record<string, number> = {
  // Weight 5 - Essential daily reference
  'Quick Reference Guide': 5,
  'One-Page Summary': 5,
  'Daily One-on-One Guide': 5,
  'Plan B Conversation Guide': 5,
  'Managing Explosive Reactions': 5,

  // Weight 4 - Frequently needed
  'Case Overview': 4,
  'ALSUP Assessment': 4,
  'Behavior Contract': 4,
  'Understanding Consequence Refusal': 4,
  'Boundary Script (Enza)': 4,
  'Gifted Cognitive Profile': 4,
  'Intervention Strategies': 4,
  'Repair Without Reward': 4,

  // Weight 3 - Regular use
  'Framework Analysis (Updated)': 3,
  'Observation Checklist': 3,
  'Parent Meeting Package': 3,
  'Rough Play Assessment': 3,

  // Weight 2 - Occasional reference
  'Case Log': 2,
  'Child Interview Plan': 2,
  'Framework Analysis (Original)': 2,
  'Interview Guide': 2,
  'Mother Interview Plan': 2,
  'Parent Meeting Package (Russian)': 2,

  // Weight 1 - Archival
  'Interview Transcript': 1,
}

async function updateWeights() {
  console.log('Updating document weights...\n')

  for (const [title, weight] of Object.entries(weightByTitle)) {
    const { data, error } = await supabase
      .from('content_items')
      .update({ weight })
      .eq('title', title)
      .select('id, title')

    if (error) {
      console.log(`❌ Error updating "${title}": ${error.message}`)
    } else if (data && data.length > 0) {
      console.log(`✅ ${title} → weight ${weight}`)
    } else {
      console.log(`⚠️  "${title}" not found`)
    }
  }

  console.log('\n✨ Weight update complete!')
}

updateWeights().catch(console.error)
