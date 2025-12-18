import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

const MICHAEL_CHILD_ID = 'c8b85995-d7d7-4380-8697-d0045aa58b8b'
const DOCS_PATH = '/Users/marcschwyn/Desktop/projects/BambooValley/behavioral-assessments'

// Define document metadata for better categorization
// Weight scale: 5 = essential daily, 4 = frequently needed, 3 = regular use, 2 = occasional, 1 = archival
const documentMeta: Record<string, { title: string, subtype: string, oneLiner: string, priority?: string, weight: number }> = {
  'michael-quick-reference.html': {
    title: 'Quick Reference Guide',
    subtype: 'quick_reference',
    oneLiner: 'Essential strategies and key information for daily interactions',
    priority: 'high',
    weight: 5
  },
  'michael-one-page.html': {
    title: 'One-Page Summary',
    subtype: 'case_overview',
    oneLiner: 'Concise overview of Michael\'s profile and support needs',
    priority: 'high',
    weight: 5
  },
  'michael-case-overview.html': {
    title: 'Case Overview',
    subtype: 'case_overview',
    oneLiner: 'Comprehensive summary of behavioral patterns and support strategies',
    weight: 4
  },
  'michael-alsup-assessment.html': {
    title: 'ALSUP Assessment',
    subtype: 'framework_analysis',
    oneLiner: 'Assessment of Lagging Skills and Unsolved Problems',
    weight: 4
  },
  'michael-behavior-contract.html': {
    title: 'Behavior Contract',
    subtype: 'intervention_guide',
    oneLiner: 'Agreed behavioral expectations and support commitments',
    weight: 4
  },
  'michael-case-log.md': {
    title: 'Case Log',
    subtype: 'case_log',
    oneLiner: 'Chronological record of incidents and progress',
    weight: 2
  },
  'michael-child-interview-plan.html': {
    title: 'Child Interview Plan',
    subtype: 'interview_guide',
    oneLiner: 'Guide for conducting supportive conversations with Michael',
    weight: 2
  },
  'michael-consequence-refusal-understanding.html': {
    title: 'Understanding Consequence Refusal',
    subtype: 'framework_analysis',
    oneLiner: 'Analysis of resistance to consequences and CPS approach',
    weight: 4
  },
  'michael-daily-one-on-one-guide.html': {
    title: 'Daily One-on-One Guide',
    subtype: 'intervention_guide',
    oneLiner: 'Structure for daily check-ins and relationship building',
    weight: 5
  },
  'michael-enza-boundary-script.html': {
    title: 'Boundary Script (Enza)',
    subtype: 'intervention_guide',
    oneLiner: 'Scripted responses for maintaining boundaries with empathy',
    weight: 4
  },
  'michael-framework-analysis-v2.html': {
    title: 'Framework Analysis (Updated)',
    subtype: 'framework_analysis',
    oneLiner: 'Multi-framework behavioral analysis with CPS focus',
    weight: 3
  },
  'michael-framework-analysis.html': {
    title: 'Framework Analysis (Original)',
    subtype: 'framework_analysis',
    oneLiner: 'Initial multi-framework behavioral assessment',
    weight: 2
  },
  'michael-gifted-cognitive-profile.html': {
    title: 'Gifted Cognitive Profile',
    subtype: 'framework_analysis',
    oneLiner: 'Understanding asynchronous development and 2e characteristics',
    weight: 4
  },
  'michael-interventions.html': {
    title: 'Intervention Strategies',
    subtype: 'intervention_guide',
    oneLiner: 'Comprehensive guide to support strategies and approaches',
    weight: 4
  },
  'michael-interview-guide.html': {
    title: 'Interview Guide',
    subtype: 'interview_guide',
    oneLiner: 'Framework for gathering information about Michael',
    weight: 2
  },
  'michael-interview-transcript.html': {
    title: 'Interview Transcript',
    subtype: 'session_transcript',
    oneLiner: 'Record of parent/teacher interview sessions',
    weight: 1
  },
  'michael-mother-interview-plan.html': {
    title: 'Mother Interview Plan',
    subtype: 'interview_guide',
    oneLiner: 'Guide for parent interview to gather background',
    weight: 2
  },
  'michael-observation-checklist.html': {
    title: 'Observation Checklist',
    subtype: 'observation_tool',
    oneLiner: 'Structured observation framework across settings',
    weight: 3
  },
  'michael-parent-meeting-package.html': {
    title: 'Parent Meeting Package',
    subtype: 'parent_communication',
    oneLiner: 'Materials for parent collaboration meeting',
    weight: 3
  },
  'michael-parent-meeting-package-ru.html': {
    title: 'Parent Meeting Package (Russian)',
    subtype: 'parent_communication',
    oneLiner: 'Parent materials translated to Russian',
    weight: 2
  },
  'michael-plan-b-conversation-guide.html': {
    title: 'Plan B Conversation Guide',
    subtype: 'intervention_guide',
    oneLiner: 'CPS Plan B collaborative problem-solving scripts',
    weight: 5
  },
  'michael-plan-b-explosive-reactions.html': {
    title: 'Managing Explosive Reactions',
    subtype: 'intervention_guide',
    oneLiner: 'Strategies for de-escalation and emotional regulation support',
    weight: 5
  },
  'michael-repair-without-reward.html': {
    title: 'Repair Without Reward',
    subtype: 'intervention_guide',
    oneLiner: 'Rebuilding connection after conflicts without reinforcement',
    weight: 4
  },
  'michael-rough-play-assessment.html': {
    title: 'Rough Play Assessment',
    subtype: 'framework_analysis',
    oneLiner: 'Analysis of physical play behaviors and sensory needs',
    weight: 3
  }
}

async function importDocuments() {
  console.log('Starting import for Michael...\n')

  // Get all michael-* files
  const files = fs.readdirSync(DOCS_PATH).filter(f => f.startsWith('michael-'))
  console.log(`Found ${files.length} files to import\n`)

  let imported = 0
  let skipped = 0

  for (const filename of files) {
    const filePath = path.join(DOCS_PATH, filename)
    const content = fs.readFileSync(filePath, 'utf-8')
    const meta = documentMeta[filename]

    if (!meta) {
      console.log(`⚠️  No metadata for ${filename}, skipping...`)
      skipped++
      continue
    }

    // Check if already exists
    const { data: existing } = await supabase
      .from('content_items')
      .select('id')
      .eq('child_id', MICHAEL_CHILD_ID)
      .eq('title', meta.title)
      .single()

    if (existing) {
      console.log(`⏭️  ${meta.title} already exists, skipping...`)
      skipped++
      continue
    }

    // Determine content type
    const isMarkdown = filename.endsWith('.md')
    const contentType = isMarkdown ? 'markdown' : 'html'

    // Insert into content_items
    const { error } = await supabase
      .from('content_items')
      .insert({
        child_id: MICHAEL_CHILD_ID,
        type: 'document',
        subtype: meta.subtype,
        title: meta.title,
        one_liner: meta.oneLiner,
        full_content: content,
        weight: meta.weight,
        metadata: {
          priority: meta.priority || 'normal',
          content_type: contentType,
          source_file: filename
        }
      })

    if (error) {
      console.log(`❌ Error importing ${filename}: ${error.message}`)
    } else {
      console.log(`✅ Imported: ${meta.title}`)
      imported++
    }
  }

  console.log(`\n✨ Import complete!`)
  console.log(`   Imported: ${imported}`)
  console.log(`   Skipped: ${skipped}`)
}

importDocuments().catch(console.error)
