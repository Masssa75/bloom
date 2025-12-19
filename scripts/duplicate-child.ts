import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function duplicateMichael() {
  // Get Michael's data
  const michaelId = 'c8b85995-d7d7-4380-8697-d0045aa58b8b'

  const { data: michael, error: childError } = await supabase
    .from('children')
    .select('*')
    .eq('id', michaelId)
    .single()

  if (childError || !michael) {
    console.error('Failed to get Michael:', childError)
    return
  }

  console.log('Found Michael:', michael.name, 'Age:', michael.age)

  // Create duplicate with new name
  const { data: newChild, error: createError } = await supabase
    .from('children')
    .insert({
      name: 'Alex',
      age: michael.age,
      date_of_birth: michael.date_of_birth,
      notes: michael.notes,
      context_index: michael.context_index,
      created_by: michael.created_by
    })
    .select()
    .single()

  if (createError || !newChild) {
    console.error('Failed to create Alex:', createError)
    return
  }

  console.log('Created Alex with ID:', newChild.id)

  // Get Michael's documents
  const { data: docs, error: docsError } = await supabase
    .from('content_items')
    .select('*')
    .eq('child_id', michaelId)

  if (docsError) {
    console.error('Failed to get documents:', docsError)
    return
  }

  console.log('Found', docs?.length || 0, 'documents to duplicate')

  // Duplicate each document
  for (const doc of docs || []) {
    const { id, child_id, created_at, updated_at, ...docData } = doc

    // Replace "Michael" with "Alex" in content
    let fullContent = docData.full_content || ''
    let summary = docData.summary || ''
    let title = docData.title || ''
    let oneLiner = docData.one_liner || ''

    fullContent = fullContent.replace(/Michael/g, 'Alex')
    summary = summary.replace(/Michael/g, 'Alex')
    title = title.replace(/Michael/g, 'Alex')
    oneLiner = oneLiner.replace(/Michael/g, 'Alex')

    const { error: insertError } = await supabase
      .from('content_items')
      .insert({
        ...docData,
        child_id: newChild.id,
        full_content: fullContent,
        summary: summary,
        title: title,
        one_liner: oneLiner
      })

    if (insertError) {
      console.error('Failed to duplicate doc:', doc.title, insertError)
    } else {
      console.log('Duplicated:', doc.title)
    }
  }

  console.log('\n✅ Done! Alex ID:', newChild.id)
}

duplicateMichael()
