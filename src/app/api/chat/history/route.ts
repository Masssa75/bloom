import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Service client to bypass RLS for reading all sessions
const serviceClient = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const childId = request.nextUrl.searchParams.get('childId')
  if (!childId) {
    return NextResponse.json({ error: 'childId required' }, { status: 400 })
  }

  // Verify user has access to this child (owner or collaborator)
  const { data: child } = await supabase
    .from('children')
    .select('id, created_by')
    .eq('id', childId)
    .single()

  if (!child) {
    // Check if user is a collaborator
    const { data: collab } = await supabase
      .from('collaborators')
      .select('id')
      .eq('child_id', childId)
      .eq('user_id', user.id)
      .single()

    if (!collab) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
  }

  // Get ALL chat sessions for this child (using service client to bypass RLS)
  const { data: sessions, error } = await serviceClient
    .from('chat_sessions')
    .select('id, created_at, updated_at, messages, user_id')
    .eq('child_id', childId)
    .order('updated_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Format sessions with preview and tool call info
  const formattedSessions = sessions?.map(session => {
    const messages = session.messages as {
      role: string
      content: string | null
      tool_calls?: { id: string; type: string; function: { name: string; arguments: string } }[]
    }[]

    const firstUserMessage = messages.find(m => m.role === 'user')
    const preview = firstUserMessage?.content?.slice(0, 100) || 'Empty session'

    // Extract unique tool names used in this session
    const toolsUsed = new Set<string>()
    messages.forEach(m => {
      if (m.tool_calls) {
        m.tool_calls.forEach(tc => {
          if (tc.function?.name) {
            toolsUsed.add(tc.function.name)
          }
        })
      }
    })

    // Count actual conversation messages (not tool messages)
    const conversationCount = messages.filter(m => m.role === 'user' || (m.role === 'assistant' && m.content)).length

    return {
      id: session.id,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
      preview: preview + (preview.length >= 100 ? '...' : ''),
      messageCount: conversationCount,
      toolsUsed: Array.from(toolsUsed)
    }
  }) || []

  return NextResponse.json({ sessions: formattedSessions })
}

// Get full session by ID
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sessionId } = await request.json()
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
  }

  // Use service client to bypass RLS
  const { data: session, error } = await serviceClient
    .from('chat_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Verify user has access to this child
  const { data: child } = await supabase
    .from('children')
    .select('id')
    .eq('id', session.child_id)
    .single()

  if (!child) {
    const { data: collab } = await supabase
      .from('collaborators')
      .select('id')
      .eq('child_id', session.child_id)
      .eq('user_id', user.id)
      .single()

    if (!collab) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
  }

  return NextResponse.json({ session })
}
