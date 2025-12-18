'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { getComponentTags } from '@/lib/chat/components'

interface Child {
  id: string
  name: string
  age?: number | null
}

interface ToolCall {
  name: string
  status: 'executing' | 'complete'
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  toolCalls?: ToolCall[]
}

interface ChatPageProps {
  children: Child[]
}

interface ParsedComponent {
  type: 'urgent' | 'script' | 'later' | 'insight' | 'note' | 'text'
  content: string
  title?: string // for 'later' type
}

// Simple markdown renderer for text content
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let currentList: string[] = []
  let listIndex = 0

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`list-${listIndex++}`} className="list-disc ml-5 space-y-1 my-2">
          {currentList.map((item, i) => (
            <li key={i}>{renderInlineMarkdown(item)}</li>
          ))}
        </ul>
      )
      currentList = []
    }
  }

  lines.forEach((line, i) => {
    const trimmed = line.trim()
    // Check for list items (-, *, •)
    const listMatch = trimmed.match(/^[-*•]\s+(.+)$/)
    if (listMatch) {
      currentList.push(listMatch[1])
    } else {
      flushList()
      if (trimmed) {
        elements.push(
          <p key={`p-${i}`} className="my-1">
            {renderInlineMarkdown(trimmed)}
          </p>
        )
      }
    }
  })
  flushList()

  return elements
}

// Handle inline markdown (bold, italic)
function renderInlineMarkdown(text: string): React.ReactNode {
  // Replace **bold** with <strong>
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

function parseComponentResponse(content: string): ParsedComponent[] {
  const components: ParsedComponent[] = []

  // Build regex from component tags config
  const tags = getComponentTags().join('|')
  const componentRegex = new RegExp(`<(${tags})(?:\\s+title="([^"]*)")?>([\s\S]*?)<\\/\\1>`, 'g')

  let lastIndex = 0
  let match

  while ((match = componentRegex.exec(content)) !== null) {
    // Add any text before this component
    const textBefore = content.slice(lastIndex, match.index).trim()
    if (textBefore) {
      components.push({ type: 'text', content: textBefore })
    }

    const [, type, title, innerContent] = match
    components.push({
      type: type as ParsedComponent['type'],
      content: innerContent.trim(),
      title: title || undefined
    })

    lastIndex = match.index + match[0].length
  }

  // Add any remaining text after last component
  const textAfter = content.slice(lastIndex).trim()
  if (textAfter) {
    components.push({ type: 'text', content: textAfter })
  }

  // If no components found, treat entire content as text
  if (components.length === 0) {
    components.push({ type: 'text', content: content })
  }

  return components
}

function ToolCallBadges({ toolCalls }: { toolCalls?: ToolCall[] }) {
  if (!toolCalls || toolCalls.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5 mb-2 pb-2 border-b border-gray-100">
      {toolCalls.map((tc, i) => (
        <span
          key={i}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
            tc.status === 'complete'
              ? 'bg-green-50 text-green-700'
              : 'bg-blue-50 text-blue-700'
          }`}
        >
          <span className="opacity-60">&lt;/&gt;</span>
          {tc.name.replace(/_/g, ' ').replace(/get /i, '')}
          {tc.status === 'complete' ? (
            <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          )}
        </span>
      ))}
    </div>
  )
}

function ComponentRenderer({ component, laterExpanded, setLaterExpanded }: {
  component: ParsedComponent
  laterExpanded: boolean
  setLaterExpanded: (v: boolean) => void
}) {
  switch (component.type) {
    case 'urgent':
      const urgentItems = component.content
        .split('\n')
        .map(line => line.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, '').trim())
        .filter(line => line.length > 0)
      return (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-r-lg p-3">
          <div className="flex items-center gap-2 text-red-700 font-semibold text-sm mb-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Right Now
          </div>
          <ol className="text-sm space-y-1 text-gray-700 ml-6 list-decimal">
            {urgentItems.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ol>
        </div>
      )

    case 'script':
      const scriptText = component.content.replace(/^[""]|[""]$/g, '').replace(/^"|"$/g, '')
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-blue-700 font-semibold text-sm mb-2 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Say This
          </div>
          <p className="text-sm text-gray-700 italic">&ldquo;{scriptText}&rdquo;</p>
        </div>
      )

    case 'later':
      return (
        <div className="bg-gray-50 rounded-lg overflow-hidden">
          <button
            onClick={() => setLaterExpanded(!laterExpanded)}
            className="w-full px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 flex items-center gap-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="flex-1 text-left">Later: {component.title || 'Follow-up'}</span>
            <svg
              className={`w-4 h-4 transition-transform ${laterExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {laterExpanded && (
            <div className="px-3 pb-3 text-sm text-gray-600 whitespace-pre-wrap">
              {component.content}
            </div>
          )}
        </div>
      )

    case 'insight':
      return (
        <div className="bg-green-50 border-l-4 border-green-500 rounded-r-lg p-3">
          <div className="flex items-center gap-2 text-green-700 font-semibold text-sm mb-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Key Insight
          </div>
          <p className="text-sm text-gray-700">{component.content}</p>
        </div>
      )

    case 'note':
      return (
        <div className="bg-gray-100 border-l-2 border-gray-400 rounded-r px-3 py-2">
          <p className="text-sm text-gray-600">{component.content}</p>
        </div>
      )

    case 'text':
    default:
      return (
        <div className="text-sm leading-relaxed">
          {renderMarkdown(component.content)}
        </div>
      )
  }
}

function StructuredResponse({ content, toolCalls }: { content: string; toolCalls?: ToolCall[] }) {
  const [laterExpanded, setLaterExpanded] = useState(false)
  const components = parseComponentResponse(content)

  return (
    <div className="space-y-3">
      <ToolCallBadges toolCalls={toolCalls} />
      {components.map((component, i) => (
        <ComponentRenderer
          key={i}
          component={component}
          laterExpanded={laterExpanded}
          setLaterExpanded={setLaterExpanded}
        />
      ))}
    </div>
  )
}

export default function ChatPage({ children }: ChatPageProps) {
  const [selectedChild, setSelectedChild] = useState<Child | null>(
    children.length > 0 ? children[0] : null
  )
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentToolCalls, setCurrentToolCalls] = useState<ToolCall[]>([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [childSelectorOpen, setChildSelectorOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Reset chat when child changes
  useEffect(() => {
    setMessages([])
  }, [selectedChild?.id])

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = inputRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      const newHeight = Math.min(textarea.scrollHeight, 200)
      textarea.style.height = `${newHeight}px`
    }
  }, [])

  useEffect(() => {
    adjustTextareaHeight()
  }, [input, adjustTextareaHeight])

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !selectedChild) return

    const userMessage = input.trim()
    setInput('')
    setIsLoading(true)
    setCurrentToolCalls([])

    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
    }

    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }]
    setMessages(newMessages)
    setMessages([...newMessages, { role: 'assistant', content: '', toolCalls: [] }])

    let toolCallsForMessage: ToolCall[] = []

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId: selectedChild.id,
          childName: selectedChild.name,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          provider: 'moonshot'
        })
      })

      if (!response.ok) throw new Error('Failed to send message')

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let assistantContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'content') {
                assistantContent += data.content
                setMessages(prev => {
                  const updated = [...prev]
                  updated[updated.length - 1] = {
                    role: 'assistant',
                    content: assistantContent,
                    toolCalls: toolCallsForMessage
                  }
                  return updated
                })
              }

              if (data.type === 'tool_call') {
                const toolName = data.name
                if (data.status === 'executing') {
                  const newToolCall = { name: toolName, status: 'executing' as const }
                  toolCallsForMessage = [...toolCallsForMessage, newToolCall]
                  setCurrentToolCalls(toolCallsForMessage)
                } else if (data.status === 'complete') {
                  toolCallsForMessage = toolCallsForMessage.map(tc =>
                    tc.name === toolName ? { ...tc, status: 'complete' as const } : tc
                  )
                  setCurrentToolCalls(toolCallsForMessage)
                }
                setMessages(prev => {
                  const updated = [...prev]
                  updated[updated.length - 1] = {
                    role: 'assistant',
                    content: assistantContent,
                    toolCalls: toolCallsForMessage
                  }
                  return updated
                })
              }

              if (data.type === 'error') {
                console.error('Chat error:', data.error)
                setMessages(prev => {
                  const updated = [...prev]
                  updated[updated.length - 1] = {
                    role: 'assistant',
                    content: `Sorry, something went wrong: ${data.error}`,
                    toolCalls: toolCallsForMessage
                  }
                  return updated
                })
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => {
        const updated = [...prev]
        if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
          updated[updated.length - 1] = {
            role: 'assistant',
            content: 'Sorry, I encountered an error. Please try again.',
            toolCalls: toolCallsForMessage
          }
        }
        return updated
      })
    } finally {
      setIsLoading(false)
      setCurrentToolCalls([])
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatToolName = (name: string) => {
    return name.replace(/_/g, ' ').replace(/get /i, '')
  }

  // No children state
  if (children.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-semibold text-blue-600">Bloom</span>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Welcome to Bloom</h2>
            <p className="text-gray-600 mb-6">Add a child to get started with AI-powered behavioral support.</p>
            <Link
              href="/child/new"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Child
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMenuOpen(true)}
            className="p-2 -ml-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="relative">
            <button
              onClick={() => setChildSelectorOpen(!childSelectorOpen)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <span className="font-medium text-gray-800">{selectedChild?.name}</span>
              <svg className={`w-4 h-4 text-gray-500 transition-transform ${childSelectorOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {childSelectorOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setChildSelectorOpen(false)}
                />
                <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-20">
                  {children.map(child => (
                    <button
                      key={child.id}
                      onClick={() => {
                        setSelectedChild(child)
                        setChildSelectorOpen(false)
                      }}
                      className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${
                        selectedChild?.id === child.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                      }`}
                    >
                      <span className="font-medium">{child.name}</span>
                      {child.age && <span className="text-sm text-gray-500 ml-2">({child.age})</span>}
                    </button>
                  ))}
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <Link
                      href="/child/new"
                      className="flex items-center gap-2 w-full text-left px-4 py-2 text-blue-600 hover:bg-blue-50 transition-colors"
                      onClick={() => setChildSelectorOpen(false)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add Child
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <span className="text-xl font-semibold text-blue-600">Bloom</span>
      </header>

      {/* Side Menu */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-72 bg-white shadow-xl z-50 flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <span className="text-xl font-semibold text-blue-600">Bloom</span>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="flex-1 p-4 space-y-1">
              <Link
                href="/chat"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 bg-blue-50 text-blue-700 rounded-xl font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Chat
              </Link>

              <Link
                href="/dashboard"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Dashboard
              </Link>

              {selectedChild && (
                <Link
                  href={`/child/${selectedChild.id}`}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {selectedChild.name}&apos;s Files
                </Link>
              )}

              <Link
                href="/child/new"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Add Child
              </Link>
            </nav>

            <div className="p-4 border-t border-gray-200">
              <form action="/api/auth/signout" method="post">
                <button
                  type="submit"
                  className="flex items-center gap-3 w-full px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && selectedChild && (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">
              How can I help with {selectedChild.name}?
            </h3>
            <p className="text-gray-500 text-center mb-6 max-w-sm">
              Ask me anything about behavioral strategies, report an incident, or get guidance based on {selectedChild.name}&apos;s case files.
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
              {[
                `${selectedChild.name} pushed a classmate`,
                'Help with a meltdown',
                'Transition strategies',
              ].map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInput(suggestion)
                    inputRef.current?.focus()
                  }}
                  className="text-sm bg-white border border-gray-200 rounded-full px-4 py-2 hover:bg-gray-50 text-gray-700 transition-colors shadow-sm"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[90%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-800 shadow-sm'
              }`}
            >
              {message.role === 'assistant' ? (
                message.content ? (
                  <StructuredResponse content={message.content} toolCalls={message.toolCalls} />
                ) : (
                  <div className="flex items-center gap-2 text-gray-400">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    <span className="text-sm">
                      {currentToolCalls.length > 0
                        ? `Fetching ${formatToolName(currentToolCalls[currentToolCalls.length - 1].name)}...`
                        : 'Thinking...'}
                    </span>
                  </div>
                )
              ) : (
                <p className="text-sm">{message.content}</p>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-200 flex-shrink-0">
        <div className="flex gap-3 max-w-3xl mx-auto items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={selectedChild ? `Message about ${selectedChild.name}...` : 'Select a child first...'}
            className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[48px] max-h-[200px]"
            rows={1}
            disabled={isLoading || !selectedChild}
            style={{ height: 'auto' }}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim() || !selectedChild}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-xl px-5 py-3 transition-colors flex-shrink-0 h-[48px]"
            aria-label="Send message"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
