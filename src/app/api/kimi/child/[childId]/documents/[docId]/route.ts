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

// GET /api/kimi/child/[childId]/documents/[docId] - Get full document content
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string; docId: string }> }
) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
  }

  const { childId, docId } = await params

  // Get full document
  const { data: document, error } = await supabase
    .from('content_items')
    .select('*')
    .eq('id', docId)
    .eq('child_id', childId)
    .single()

  if (error || !document) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  return NextResponse.json({
    id: document.id,
    type: document.type,
    subtype: document.subtype,
    title: document.title,
    one_liner: document.one_liner,
    summary: document.summary,
    full_content: document.full_content,
    weight: document.weight,
    metadata: document.metadata,
    created_at: document.created_at,
    updated_at: document.updated_at
  })
}
