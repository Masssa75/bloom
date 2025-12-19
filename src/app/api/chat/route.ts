import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import { generateComponentPrompt } from '@/lib/chat/components'

// Extend timeout for this route (Netlify/Vercel)
export const maxDuration = 60 // seconds
export const dynamic = 'force-dynamic'

// Supabase client for document fetching
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Moonshot client for chat
const moonshot = new OpenAI({
  apiKey: process.env.MOONSHOT_API_KEY,
  baseURL: 'https://api.moonshot.ai/v1'
})

// Moonshot caching API (uses .cn endpoint)
const MOONSHOT_CACHE_URL = 'https://api.moonshot.cn/v1/caching'
const CACHE_TTL = 3600 // 1 hour in seconds

// Base tools (always available)
const baseTools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_child_overview',
      description: 'Get the child\'s profile, context summary, and list of available documents. Call this first to understand what information is available.',
      parameters: {
        type: 'object',
        properties: {
          child_id: {
            type: 'string',
            description: 'The child\'s UUID'
          }
        },
        required: ['child_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_document',
      description: 'Get the full content of a specific document. Use this after reviewing the document list to fetch relevant documents.',
      parameters: {
        type: 'object',
        properties: {
          child_id: {
            type: 'string',
            description: 'The child\'s UUID'
          },
          document_id: {
            type: 'string',
            description: 'The document\'s UUID from the document list'
          }
        },
        required: ['child_id', 'document_id']
      }
    }
  },
]

// Web search tool
const webSearchTool: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'web_search',
    description: 'Search the web for developmental frameworks, parenting approaches, behavioral strategies, enrichment ideas, or research relevant to this child.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'What to search for'
        }
      },
      required: ['query']
    }
  }
}

// Close interview tool - AI calls this when it has gathered enough information
const closeInterviewTool: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'close_interview',
    description: 'Close the discovery interview when you have gathered enough information to create a profile. Call this after confirming with the user that they are ready to wrap up.',
    parameters: {
      type: 'object',
      properties: {
        summary: {
          type: 'string',
          description: 'A comprehensive summary of what you learned about the child (2-3 paragraphs)'
        },
        one_liner: {
          type: 'string',
          description: 'A one-line description of the child based on the interview'
        },
        key_traits: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of 3-5 key personality traits or characteristics'
        },
        areas_to_explore: {
          type: 'array',
          items: { type: 'string' },
          description: 'Suggested frameworks or approaches to research based on what you learned'
        }
      },
      required: ['summary', 'one_liner', 'key_traits']
    }
  }
}

// Interview tools (available during interview mode)
const interviewTools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  webSearchTool,
  closeInterviewTool
]

// Interview document helpers
async function getOpenInterview(childId: string): Promise<{
  id: string
  title: string
  full_content: string | null
  metadata: { status: string }
} | null> {
  const { data } = await supabase
    .from('content_items')
    .select('id, title, full_content, metadata')
    .eq('child_id', childId)
    .eq('type', 'interview')
    .eq('metadata->>status', 'open')
    .single()
  return data
}

async function createInterviewDocument(childId: string, userId: string | null): Promise<string> {
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  const { data, error } = await supabase
    .from('content_items')
    .insert({
      child_id: childId,
      created_by: userId,
      type: 'interview',
      subtype: 'discovery',
      title: `Discovery Interview - ${dateStr}`,
      one_liner: 'Initial discovery interview (in progress)',
      full_content: `# Discovery Interview\nStarted: ${now.toISOString()}\n\n---\n\n`,
      weight: 5,
      metadata: { status: 'open' }
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to create interview document:', error)
    throw error
  }
  return data.id
}

async function appendToInterview(interviewId: string, userMessage: string, assistantMessage: string): Promise<void> {
  // Get current content
  const { data } = await supabase
    .from('content_items')
    .select('full_content')
    .eq('id', interviewId)
    .single()

  const currentContent = data?.full_content || ''
  const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  // Append the exchange
  const newContent = currentContent +
    `**[${timestamp}] Interviewer:** ${userMessage}\n\n` +
    `**[${timestamp}] Response:** ${assistantMessage}\n\n---\n\n`

  await supabase
    .from('content_items')
    .update({
      full_content: newContent,
      updated_at: new Date().toISOString()
    })
    .eq('id', interviewId)
}

async function closeInterviewDocument(
  interviewId: string,
  summary: string,
  oneLiner: string,
  keyTraits: string[]
): Promise<void> {
  const { data } = await supabase
    .from('content_items')
    .select('full_content')
    .eq('id', interviewId)
    .single()

  const currentContent = data?.full_content || ''
  const closedAt = new Date().toISOString()

  // Add summary section at the end
  const finalContent = currentContent +
    `\n## Interview Summary\n\n` +
    `**Closed:** ${closedAt}\n\n` +
    `**Key Traits:** ${keyTraits.join(', ')}\n\n` +
    `${summary}\n`

  await supabase
    .from('content_items')
    .update({
      full_content: finalContent,
      summary: summary,
      one_liner: oneLiner,
      metadata: { status: 'closed' },
      updated_at: closedAt
    })
    .eq('id', interviewId)
}

// Execute tool calls
async function executeTool(
  name: string,
  args: Record<string, unknown>,
  context?: { interviewId?: string }
): Promise<string> {
  try {
    if (name === 'get_child_overview') {
      const childId = args.child_id as string
      const { data: child } = await supabase
        .from('children')
        .select('id, name, age, date_of_birth, notes, context_index')
        .eq('id', childId)
        .single()

      if (!child) return JSON.stringify({ error: 'Child not found' })

      const { data: documents } = await supabase
        .from('content_items')
        .select('id, type, subtype, title, one_liner, weight, metadata')
        .eq('child_id', childId)
        .order('weight', { ascending: false })
        .order('created_at', { ascending: false })

      return JSON.stringify({
        child: {
          id: child.id,
          name: child.name,
          age: child.age,
          notes: child.notes,
          context_index: child.context_index
        },
        documents: (documents || []).map(d => ({
          ...d,
          // Include interview status for visibility
          status: d.type === 'interview' ? (d.metadata as { status?: string })?.status : undefined
        }))
      })
    }

    if (name === 'get_document') {
      const childId = args.child_id as string
      const docId = args.document_id as string
      const { data: document } = await supabase
        .from('content_items')
        .select('id, type, subtype, title, one_liner, summary, full_content, weight, metadata')
        .eq('id', docId)
        .eq('child_id', childId)
        .single()

      if (!document) return JSON.stringify({ error: 'Document not found' })

      return JSON.stringify({
        id: document.id,
        title: document.title,
        type: document.type,
        subtype: document.subtype,
        one_liner: document.one_liner,
        summary: document.summary,
        full_content: document.full_content,
        weight: document.weight
      })
    }

    if (name === 'web_search') {
      return JSON.stringify({
        status: 'Web search initiated',
        query: args.query as string,
        note: 'Results will be incorporated by Kimi'
      })
    }

    if (name === 'close_interview') {
      if (!context?.interviewId) {
        return JSON.stringify({ error: 'No active interview to close' })
      }

      const summary = args.summary as string
      const oneLiner = args.one_liner as string
      const keyTraits = args.key_traits as string[]
      const areasToExplore = args.areas_to_explore as string[] | undefined

      await closeInterviewDocument(context.interviewId, summary, oneLiner, keyTraits)

      return JSON.stringify({
        status: 'Interview closed successfully',
        summary,
        one_liner: oneLiner,
        key_traits: keyTraits,
        areas_to_explore: areasToExplore || [],
        next_step: 'You can now offer to research frameworks or create additional resources based on what you learned.'
      })
    }

    return JSON.stringify({ error: 'Unknown tool: ' + name })
  } catch (error) {
    return JSON.stringify({ error: String(error) })
  }
}

// Case Support Mode - when child has documents
function buildCaseSupportPrompt(childId: string, childName: string): string {
  return `You are Bloom AI, a warm and knowledgeable behavioral support assistant. You help teachers, parents, and caregivers support children's development using evidence-based approaches.

## Current Child
You are supporting **${childName}** (child ID: ${childId})

## Tools

1. **get_child_overview** - Get ${childName}'s profile and document list. Call this FIRST.
2. **get_document** - Fetch full content of a specific document
3. **web_search** - Search the web for behavioral strategies or research

## When to Fetch Documents

Use one_liner summaries for quick questions. Fetch full documents for:
- Complex/escalating situations
- Specific intervention scripts
- Deep dives into behavioral patterns

${generateComponentPrompt()}

## Important

- Prioritize strategies from ${childName}'s case files over generic advice
- Documents with weight 5 are essential references
- Keep responses concise - caregivers are busy`
}

// Discovery Interview Mode - for new or continuing interviews
function buildInterviewPrompt(childName: string, isResuming: boolean, previousTranscript?: string): string {
  const openingSection = isResuming
    ? `## Continuing Interview

You're resuming a discovery interview about **${childName}**. Review the previous conversation and pick up naturally where you left off.

Previous transcript:
${previousTranscript || '(No previous content)'}

---

Continue the conversation naturally. Reference what you've already learned and explore areas not yet covered.`
    : `## Your Opening

Start with: "I'd love to learn about ${childName}. Tell me about them - start wherever feels important to you."`

  return `You are Bloom AI, conducting a discovery interview to understand **${childName}**.

${openingSection}

## Interview Approach

**Follow their lead.** What they share first reveals what matters most. Don't impose structure - let the conversation flow naturally.

**If they mention concerns:** Explore with specifics - what happens before, during, after? Get exact examples.

**If they describe personality:** Ask for specific moments that show those traits.

## Areas to Explore (when natural)

- **Temperament**: Introverted/extroverted? Sensitive or resilient? Cautious or bold?
- **Emotions**: How do they show frustration? Joy? How do they recover from upsets?
- **Relationships**: How do they connect with others? Need warm-up time?
- **Interests**: What captivates them? How do they explore?
- **Strengths**: When do they shine?
- **Edges**: What's slightly challenging? (growth areas, not problems)
- **What works**: What helps when they're struggling?

## Guidelines

- Stay curious and warm - no judgment
- Ask for SPECIFIC examples, not generalizations
- Get their exact words: "What does ${childName} say when...?"
- You are GATHERING information, not interpreting it
- Do NOT diagnose, label, or suggest causes
- One question at a time - don't overwhelm
- Keep it conversational, not like a form

## When to Close the Interview

When you feel you have a good picture of ${childName} (usually after exploring 4-5 areas in depth), you can suggest wrapping up:

"I feel like I'm getting a good picture of ${childName}. Would you like me to summarize what I've learned, or is there anything else important you'd like to share?"

If they're ready, use the **close_interview** tool to:
1. Generate a comprehensive summary
2. Capture key personality traits
3. Note areas for further exploration

After closing, offer to research relevant frameworks or create resources based on what you learned.`
}

// Create or update Moonshot cache
async function createCache(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  tools: OpenAI.Chat.Completions.ChatCompletionTool[],
  sessionName: string
): Promise<{ cacheId: string; expiresAt: Date } | null> {
  try {
    const response = await fetch(MOONSHOT_CACHE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MOONSHOT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'moonshot-v1',
        messages,
        tools,
        name: sessionName,
        ttl: CACHE_TTL
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Failed to create cache:', error)
      return null
    }

    const data = await response.json()
    const expiresAt = new Date(Date.now() + CACHE_TTL * 1000)

    console.log('Cache created:', data.id)
    return { cacheId: data.id, expiresAt }
  } catch (error) {
    console.error('Cache creation error:', error)
    return null
  }
}

// Delete a cache
async function deleteCache(cacheId: string): Promise<void> {
  try {
    await fetch(`${MOONSHOT_CACHE_URL}/${cacheId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${process.env.MOONSHOT_API_KEY}`
      }
    })
  } catch (error) {
    console.error('Cache deletion error:', error)
  }
}

// Type for stored messages (compatible with OpenAI types)
type StoredMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: { name: string; arguments: string }
  }>
  tool_call_id?: string
}

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId, childId, childName, userId } = await request.json()

    if (!childId || !message) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Check for open interview or other documents to determine mode
    const openInterview = await getOpenInterview(childId)

    // Count non-interview documents (case files)
    const { count: caseFileCount } = await supabase
      .from('content_items')
      .select('id', { count: 'exact', head: true })
      .eq('child_id', childId)
      .neq('type', 'interview')

    const hasCaseFiles = (caseFileCount ?? 0) > 0

    // Determine mode:
    // - Has open interview → interview mode (continue)
    // - No documents at all → interview mode (start new)
    // - Has case files but no open interview → case support mode
    let interviewId: string | null = null
    let isInterviewMode = false
    let isResuming = false
    let previousTranscript: string | undefined

    if (openInterview) {
      // Continue existing interview
      isInterviewMode = true
      isResuming = true
      interviewId = openInterview.id
      previousTranscript = openInterview.full_content || undefined
    } else if (!hasCaseFiles) {
      // Start new interview
      isInterviewMode = true
      isResuming = false
      interviewId = await createInterviewDocument(childId, userId)
    }
    // else: case support mode (hasCaseFiles && !openInterview)

    const tools = isInterviewMode ? interviewTools : [...baseTools, webSearchTool]

    // Load or create session
    let session: {
      id: string
      messages: StoredMessage[]
      cache_id: string | null
      cache_expires_at: string | null
    } | null = null

    if (sessionId) {
      const { data } = await supabase
        .from('chat_sessions')
        .select('id, messages, cache_id, cache_expires_at')
        .eq('id', sessionId)
        .single()
      session = data
    }

    // Build system prompt
    const systemPrompt = isInterviewMode
      ? buildInterviewPrompt(childName || 'this child', isResuming, previousTranscript)
      : buildCaseSupportPrompt(childId, childName || 'this child')

    // Determine if we can use cache
    const now = new Date()
    const cacheValid = session?.cache_id &&
      session?.cache_expires_at &&
      new Date(session.cache_expires_at) > now

    // Build messages for this request
    let conversationMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
    let toolsToSend: OpenAI.Chat.Completions.ChatCompletionTool[]

    if (cacheValid && session) {
      // Use cache - send cache reference + new message only
      console.log('Using cache:', session.cache_id)
      // Will send cache event to client in stream
      conversationMessages = [
        {
          // Moonshot cache message format
          role: 'cache' as unknown as 'user', // Cast needed - OpenAI SDK doesn't know about 'cache' role
          content: `cache_id=${session.cache_id};reset_ttl=${CACHE_TTL}`
        },
        { role: 'user' as const, content: message }
      ]
      // Don't send tools - they're in the cache
      toolsToSend = []
    } else {
      // No cache - send full conversation
      const existingMessages = session?.messages || []
      conversationMessages = [
        { role: 'system' as const, content: systemPrompt },
        ...existingMessages.map(m => ({
          role: m.role,
          content: m.content,
          tool_calls: m.tool_calls,
          tool_call_id: m.tool_call_id
        } as OpenAI.Chat.Completions.ChatCompletionMessageParam)),
        { role: 'user' as const, content: message }
      ]
      toolsToSend = tools
    }

    // Track the full conversation for saving (always includes everything)
    let fullConversation: StoredMessage[] = session?.messages || []
    fullConversation.push({ role: 'user', content: message })

    // Create response stream
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        let newSessionId = session?.id
        let continueLoop = true
        let iterations = 0
        const maxIterations = 10
        let finalAssistantContent = ''

        // Send session ID immediately if new
        if (!session) {
          // Create new session
          const { data: newSession } = await supabase
            .from('chat_sessions')
            .insert({
              child_id: childId,
              user_id: userId,
              messages: [{ role: 'user', content: message }]
            })
            .select('id')
            .single()

          if (newSession) {
            newSessionId = newSession.id
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'session',
              sessionId: newSessionId
            })}\n\n`))
          }
        }

        // Send cache status to client
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'cache_status',
          using_cache: cacheValid,
          cache_id: cacheValid ? session?.cache_id : null
        })}\n\n`))

        while (continueLoop && iterations < maxIterations) {
          iterations++
          console.log(`Starting iteration ${iterations}, messages: ${conversationMessages.length}, tools: ${toolsToSend.length}`)

          try {
            const createParams: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming = {
              model: 'kimi-k2-0711-preview',
              messages: conversationMessages,
              temperature: 0.6,
              max_tokens: 4096,
              stream: true
            }
            if (toolsToSend.length > 0) {
              createParams.tools = toolsToSend
            }

            const response = await moonshot.chat.completions.create(createParams)

            let assistantContent = ''
            let toolCalls: Array<{
              id: string
              function: { name: string; arguments: string }
            }> = []
            let currentToolCall: { id: string; function: { name: string; arguments: string } } | null = null

            for await (const chunk of response) {
              const choice = chunk.choices[0]
              if (!choice) continue

              if (choice.delta?.content) {
                assistantContent += choice.delta.content
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: 'content',
                  content: choice.delta.content
                })}\n\n`))
              }

              if (choice.delta?.tool_calls) {
                for (const tc of choice.delta.tool_calls) {
                  if (tc.id) {
                    if (currentToolCall) toolCalls.push(currentToolCall)
                    currentToolCall = {
                      id: tc.id,
                      function: { name: tc.function?.name || '', arguments: '' }
                    }
                  }
                  if (tc.function?.name && currentToolCall) {
                    currentToolCall.function.name = tc.function.name
                  }
                  if (tc.function?.arguments && currentToolCall) {
                    currentToolCall.function.arguments += tc.function.arguments
                  }
                }
              }

              if (choice.finish_reason === 'tool_calls' && currentToolCall) {
                toolCalls.push(currentToolCall)
              }

              if (choice.finish_reason === 'stop') {
                continueLoop = false
                finalAssistantContent = assistantContent
              }
            }

            if (toolCalls.length > 0) {
              // Add assistant message with tool calls to conversation
              const assistantMsg: StoredMessage = {
                role: 'assistant',
                content: assistantContent || null,
                tool_calls: toolCalls.map(tc => ({
                  id: tc.id,
                  type: 'function' as const,
                  function: tc.function
                }))
              }
              conversationMessages.push(assistantMsg as OpenAI.Chat.Completions.ChatCompletionMessageParam)
              fullConversation.push(assistantMsg)

              // Execute tools
              for (const tc of toolCalls) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: 'tool_call',
                  name: tc.function.name,
                  status: 'executing'
                })}\n\n`))

                const args = JSON.parse(tc.function.arguments)
                const result = await executeTool(tc.function.name, args, { interviewId: interviewId || undefined })

                // Extract details for display (e.g., document title)
                let detail: string | undefined
                try {
                  const parsed = JSON.parse(result)
                  if (tc.function.name === 'get_document' && parsed.title) {
                    detail = parsed.title
                  } else if (tc.function.name === 'get_child_overview' && parsed.child?.name) {
                    detail = parsed.child.name
                  } else if (tc.function.name === 'close_interview' && parsed.status === 'Interview closed successfully') {
                    detail = 'Interview closed'
                    // Clear interview mode for rest of conversation
                    interviewId = null
                  }
                } catch { /* ignore parse errors */ }

                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: 'tool_call',
                  name: tc.function.name,
                  status: 'complete',
                  detail
                })}\n\n`))

                const toolMsg: StoredMessage = {
                  role: 'tool',
                  content: result,
                  tool_call_id: tc.id
                }
                conversationMessages.push(toolMsg as OpenAI.Chat.Completions.ChatCompletionMessageParam)
                fullConversation.push(toolMsg)
              }

              // After using cache once, we need to send tools again for subsequent calls
              toolsToSend = tools
              console.log(`Iteration ${iterations} done - executed ${toolCalls.length} tools, continuing loop`)
            } else {
              console.log(`Iteration ${iterations} done - no tool calls, finishing`)
              continueLoop = false
              finalAssistantContent = assistantContent
            }
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            const errorStack = error instanceof Error ? error.stack : ''
            console.error('Chat API error:', errorMessage, errorStack)
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'error',
              error: `${errorMessage} (iteration ${iterations})`
            })}\n\n`))
            continueLoop = false
          }
        }

        // Add final assistant response to conversation
        if (finalAssistantContent) {
          fullConversation.push({ role: 'assistant', content: finalAssistantContent })

          // Update interview transcript if in interview mode
          if (interviewId && isInterviewMode) {
            try {
              await appendToInterview(interviewId, message, finalAssistantContent)
            } catch (err) {
              console.error('Failed to update interview transcript:', err)
            }
          }
        }

        // Send done BEFORE cache operations (so client isn't waiting)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))

        // Save conversation and create cache (don't block client)
        if (newSessionId) {
          try {
            // Build messages for cache (full conversation with system prompt)
            const messagesForCache: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
              { role: 'system', content: systemPrompt },
              ...fullConversation.map(m => ({
                role: m.role,
                content: m.content,
                tool_calls: m.tool_calls,
                tool_call_id: m.tool_call_id
              } as OpenAI.Chat.Completions.ChatCompletionMessageParam))
            ]

            // Delete old cache if exists
            if (session?.cache_id) {
              await deleteCache(session.cache_id)
            }

            // Create new cache (optional - if fails, just save without cache)
            const cacheResult = await createCache(
              messagesForCache,
              tools,
              `bloom-session-${newSessionId}`
            )

            // Update session in database
            await supabase
              .from('chat_sessions')
              .update({
                messages: fullConversation,
                cache_id: cacheResult?.cacheId || null,
                cache_expires_at: cacheResult?.expiresAt?.toISOString() || null,
                updated_at: new Date().toISOString()
              })
              .eq('id', newSessionId)
          } catch (cacheError) {
            console.error('Cache/save error (non-blocking):', cacheError)
            // Still save conversation even if cache fails
            await supabase
              .from('chat_sessions')
              .update({
                messages: fullConversation,
                updated_at: new Date().toISOString()
              })
              .eq('id', newSessionId)
          }
        }

        controller.close()
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
