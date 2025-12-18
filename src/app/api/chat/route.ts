import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import OpenAI from 'openai'

// Supabase client for document fetching
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Kimi K2 via GroqCloud (faster + automatic caching)
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
})

// Kimi K2 via Moonshot direct (has web search)
const moonshot = new OpenAI({
  apiKey: process.env.MOONSHOT_API_KEY,
  baseURL: 'https://api.moonshot.ai/v1'
})

type Provider = 'groq' | 'moonshot'

const providerConfig = {
  groq: {
    client: groq,
    model: 'moonshotai/kimi-k2-instruct',
    hasWebSearch: false
  },
  moonshot: {
    client: moonshot,
    model: 'kimi-k2-0711-preview',
    hasWebSearch: true
  }
}

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

// Web search tool (only for Moonshot which has built-in support)
const webSearchTool: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'web_search',
    description: 'Search the web for additional information about child behavioral strategies, research, or techniques not covered in the case files.',
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

function getToolsForProvider(provider: Provider): OpenAI.Chat.Completions.ChatCompletionTool[] {
  if (providerConfig[provider].hasWebSearch) {
    return [...baseTools, webSearchTool]
  }
  return baseTools
}

// Execute tool calls
async function executeTool(name: string, args: Record<string, string>): Promise<string> {
  try {
    if (name === 'get_child_overview') {
      const { data: child } = await supabase
        .from('children')
        .select('id, name, age, date_of_birth, notes, context_index')
        .eq('id', args.child_id)
        .single()

      if (!child) return JSON.stringify({ error: 'Child not found' })

      const { data: documents } = await supabase
        .from('content_items')
        .select('id, type, subtype, title, one_liner, weight')
        .eq('child_id', args.child_id)
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
        documents: documents || []
      })
    }

    if (name === 'get_document') {
      const { data: document } = await supabase
        .from('content_items')
        .select('id, type, subtype, title, one_liner, summary, full_content, weight, metadata')
        .eq('id', args.document_id)
        .eq('child_id', args.child_id)
        .single()

      if (!document) return JSON.stringify({ error: 'Document not found' })

      // Return summary + truncated content to stay within token limits
      // Groq has 10k TPM limit, so we keep documents short
      const content = document.full_content || ''
      const truncatedContent = content.length > 3000
        ? content.substring(0, 3000) + '\n\n[Content truncated - see full document in case files]'
        : content

      return JSON.stringify({
        id: document.id,
        title: document.title,
        one_liner: document.one_liner,
        summary: document.summary,
        content_preview: truncatedContent,
        weight: document.weight
      })
    }

    if (name === 'web_search') {
      // Moonshot handles web search natively - just return confirmation
      return JSON.stringify({
        status: 'Web search initiated',
        query: args.query,
        note: 'Results will be incorporated by Kimi'
      })
    }

    return JSON.stringify({ error: 'Unknown tool: ' + name })
  } catch (error) {
    return JSON.stringify({ error: String(error) })
  }
}

function buildSystemPrompt(childId: string, childName: string, hasWebSearch: boolean): string {
  const webSearchText = hasWebSearch
    ? '\n3. **web_search** - Search the web for additional behavioral research or strategies'
    : ''

  return `You are Bloom AI, a warm and knowledgeable behavioral support assistant for children. You help teachers, parents, and caregivers understand and support children's behavioral development using evidence-based frameworks like Dr. Ross Greene's Collaborative & Proactive Solutions (CPS).

## Current Child
You are supporting **${childName}** (child ID: ${childId})

## How to Access Information

You have tools to access ${childName}'s case files:

1. **get_child_overview** - Call this FIRST to see ${childName}'s profile, context summary, and list of available documents
2. **get_document** - Fetch specific documents relevant to the question (use sparingly - only 1-2 most relevant)${webSearchText}

## Workflow

1. For any question about ${childName}, first call get_child_overview to see available information
2. Review the context_index summary - this often has enough info to answer
3. Only fetch 1-2 specific documents if the summary doesn't cover the question
4. Synthesize your response using the case file information

## Response Style

- Be warm, supportive, and practical
- Give specific, actionable advice grounded in the case files
- Keep responses focused and concise (2-3 paragraphs max)
- If something isn't covered in the case files, use your expertise in child development

## Important

- CRITICAL: Be efficient with document fetches - the context_index and document summaries often have enough info
- The context_index provides a quick summary - check it first before fetching full documents
- Documents with weight 5 are essential references
- Prioritize strategies documented in ${childName}'s case files over generic advice`
}

export async function POST(request: NextRequest) {
  try {
    const { messages, childId, childName, provider = 'groq' } = await request.json()

    if (!childId || !messages) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Get provider configuration
    const config = providerConfig[provider as Provider] || providerConfig.groq
    const tools = getToolsForProvider(provider as Provider)

    // Build conversation with system prompt
    const systemMessage: OpenAI.Chat.Completions.ChatCompletionMessageParam = {
      role: 'system',
      content: buildSystemPrompt(childId, childName || 'this child', config.hasWebSearch)
    }

    let conversationMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      systemMessage,
      ...messages
    ]

    // Create a streaming response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        let continueLoop = true
        let iterations = 0
        const maxIterations = 10 // Prevent infinite loops

        while (continueLoop && iterations < maxIterations) {
          iterations++

          try {
            const response = await config.client.chat.completions.create({
              model: config.model,
              messages: conversationMessages,
              tools,
              temperature: 0.6,
              max_tokens: 4096,
              stream: true
            })

            let assistantContent = ''
            let toolCalls: Array<{
              id: string
              function: { name: string; arguments: string }
            }> = []
            let currentToolCall: { id: string; function: { name: string; arguments: string } } | null = null

            for await (const chunk of response) {
              const choice = chunk.choices[0]
              if (!choice) continue

              // Handle content
              if (choice.delta?.content) {
                assistantContent += choice.delta.content
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: 'content',
                  content: choice.delta.content
                })}\n\n`))
              }

              // Handle tool calls
              if (choice.delta?.tool_calls) {
                for (const tc of choice.delta.tool_calls) {
                  if (tc.id) {
                    // New tool call starting
                    if (currentToolCall) {
                      toolCalls.push(currentToolCall)
                    }
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

              // Check if finished
              if (choice.finish_reason === 'tool_calls') {
                if (currentToolCall) {
                  toolCalls.push(currentToolCall)
                }
              }

              if (choice.finish_reason === 'stop') {
                continueLoop = false
              }
            }

            // If we have tool calls, execute them and continue
            if (toolCalls.length > 0) {
              // Add assistant message with tool calls
              conversationMessages.push({
                role: 'assistant',
                content: assistantContent || null,
                tool_calls: toolCalls.map(tc => ({
                  id: tc.id,
                  type: 'function' as const,
                  function: tc.function
                }))
              })

              // Execute each tool and add results
              for (const tc of toolCalls) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: 'tool_call',
                  name: tc.function.name,
                  status: 'executing'
                })}\n\n`))

                const args = JSON.parse(tc.function.arguments)
                const result = await executeTool(tc.function.name, args)

                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: 'tool_call',
                  name: tc.function.name,
                  status: 'complete'
                })}\n\n`))

                conversationMessages.push({
                  role: 'tool',
                  tool_call_id: tc.id,
                  content: result
                })
              }
              // Continue the loop to get Kimi's response after tool results
            } else {
              continueLoop = false
            }
          } catch (error) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'error',
              error: String(error)
            })}\n\n`))
            continueLoop = false
          }
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
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
