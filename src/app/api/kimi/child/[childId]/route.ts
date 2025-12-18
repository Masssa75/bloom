import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Use service role key for API access (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key') || request.nextUrl.searchParams.get('api_key')
  return apiKey === process.env.KIMI_API_KEY
}

// GET /api/kimi/child/[childId] - Get child info and document summary
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
  }

  const { childId } = await params

  // Get child info
  const { data: child, error: childError } = await supabase
    .from('children')
    .select('id, name, age, date_of_birth, notes, context_index')
    .eq('id', childId)
    .single()

  if (childError || !child) {
    return NextResponse.json({ error: 'Child not found' }, { status: 404 })
  }

  // Get document summary (titles, one-liners, weights - not full content)
  const { data: documents, error: docsError } = await supabase
    .from('content_items')
    .select('id, type, subtype, title, one_liner, weight, created_at')
    .eq('child_id', childId)
    .order('weight', { ascending: false })
    .order('created_at', { ascending: false })

  if (docsError) {
    return NextResponse.json({ error: docsError.message }, { status: 500 })
  }

  return NextResponse.json({
    child: {
      id: child.id,
      name: child.name,
      age: child.age,
      date_of_birth: child.date_of_birth,
      notes: child.notes,
      context_index: child.context_index
    },
    documents: documents?.map(doc => ({
      id: doc.id,
      type: doc.type,
      subtype: doc.subtype,
      title: doc.title,
      one_liner: doc.one_liner,
      weight: doc.weight
    })) || []
  })
}
