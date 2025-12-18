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

// GET /api/kimi/child/[childId]/documents - List all documents (summaries only)
// POST /api/kimi/child/[childId]/documents - Get multiple documents by IDs
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
  }

  const { childId } = await params

  // Optional filters
  const type = request.nextUrl.searchParams.get('type')
  const subtype = request.nextUrl.searchParams.get('subtype')
  const minWeight = request.nextUrl.searchParams.get('min_weight')

  let query = supabase
    .from('content_items')
    .select('id, type, subtype, title, one_liner, summary, weight, created_at')
    .eq('child_id', childId)
    .order('weight', { ascending: false })
    .order('created_at', { ascending: false })

  if (type) query = query.eq('type', type)
  if (subtype) query = query.eq('subtype', subtype)
  if (minWeight) query = query.gte('weight', parseInt(minWeight))

  const { data: documents, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    count: documents?.length || 0,
    documents: documents || []
  })
}

// POST - Get full content of multiple documents by IDs
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
  }

  const { childId } = await params
  const { document_ids } = await request.json()

  if (!document_ids || !Array.isArray(document_ids)) {
    return NextResponse.json({ error: 'document_ids array required' }, { status: 400 })
  }

  const { data: documents, error } = await supabase
    .from('content_items')
    .select('*')
    .eq('child_id', childId)
    .in('id', document_ids)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    count: documents?.length || 0,
    documents: documents?.map(doc => ({
      id: doc.id,
      type: doc.type,
      subtype: doc.subtype,
      title: doc.title,
      one_liner: doc.one_liner,
      summary: doc.summary,
      full_content: doc.full_content,
      weight: doc.weight,
      metadata: doc.metadata,
      created_at: doc.created_at
    })) || []
  })
}
