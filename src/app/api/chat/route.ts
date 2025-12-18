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

// Tool definitions for Kimi
const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
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

      // Return summary + truncated content if too long
      const content = document.full_content || ''
      const truncatedContent = content.length > 8000
        ? content.substring(0, 8000) + '\n\n[Content truncated - showing first 8000 characters]'
        : content

      return JSON.stringify({
        id: document.id,
        title: document.title,
        one_liner: document.one_liner,
        summary: document.summary,
        full_content: truncatedContent,
        weight: document.weight
      })
    }

    return JSON.stringify({ error: 'Unknown tool: ' + name })
  } catch (error) {
    return JSON.stringify({ error: String(error) })
  }
}

function buildSystemPrompt(childId: string, childName: string): string {
  return `You are Bloom AI, a warm and knowledgeable behavioral support assistant for children. You help teachers, parents, and caregivers understand and support children's behavioral development using evidence-based frameworks like Dr. Ross Greene's Collaborative & Proactive Solutions (CPS).

## Current Child
You are supporting **${childName}** (child ID: ${childId})

## How to Access Information

You have tools to access ${childName}'s case files:

1. **get_child_overview** - Call this FIRST to see ${childName}'s profile, context summary, and list of available documents
2. **get_document** - Fetch specific documents that are relevant to the question

## Workflow

1. For any question about ${childName}, first call get_child_overview to see available information
2. Review the document list - look at titles, one-liners, and weights (5=essential, 1=archival)
3. Fetch specific documents that would help answer the question
4. Synthesize your response using the case file information

## Response Style

- Be warm, supportive, and practical
- Give specific, actionable advice grounded in the case files
- Reference which documents you're using when applicable
- Keep responses focused and not too long
- If something isn't covered in the case files, use your expertise in child development

## Important

- Always prioritize strategies documented in ${childName}'s case files over generic advice
- The context_index provides a quick summary - check it first
- Documents with weight 5 are essential references`
}

export async function POST(request: NextRequest) {
  try {
    const { messages, childId, childName } = await request.json()

    if (!childId || !messages) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Build conversation with system prompt
    const systemMessage: OpenAI.Chat.Completions.ChatCompletionMessageParam = {
      role: 'system',
      content: buildSystemPrompt(childId, childName || 'this child')
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
            const response = await groq.chat.completions.create({
              model: 'moonshotai/kimi-k2-instruct',
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
