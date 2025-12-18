'use client'

import { useState } from 'react'
import Link from 'next/link'

interface ContentItem {
  id: string
  type: string
  subtype: string | null
  title: string
  one_liner: string | null
  created_at: string
  metadata: {
    priority?: string
  } | null
}

interface CategoryConfig {
  key: string
  label: string
  icon: string
  color: string
}

const CATEGORY_CONFIG: CategoryConfig[] = [
  { key: 'framework_analysis', label: 'Framework Analysis', icon: '📊', color: 'blue' },
  { key: 'intervention_guide', label: 'Intervention Guides', icon: '🎯', color: 'purple' },
  { key: 'interview_guide', label: 'Interview Guides', icon: '💬', color: 'cyan' },
  { key: 'session_transcript', label: 'Session Transcripts', icon: '📝', color: 'gray' },
  { key: 'parent_communication', label: 'Parent Materials', icon: '👨‍👩‍👧', color: 'pink' },
  { key: 'observation_tool', label: 'Observation Tools', icon: '👁️', color: 'amber' },
  { key: 'case_overview', label: 'Case Overview', icon: '📋', color: 'green' },
  { key: 'case_log', label: 'Case Log', icon: '📅', color: 'slate' },
]

const colorClasses: Record<string, { bg: string, border: string, text: string, hover: string }> = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', hover: 'hover:bg-blue-100' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', hover: 'hover:bg-purple-100' },
  cyan: { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', hover: 'hover:bg-cyan-100' },
  gray: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', hover: 'hover:bg-gray-100' },
  pink: { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700', hover: 'hover:bg-pink-100' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', hover: 'hover:bg-amber-100' },
  green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', hover: 'hover:bg-green-100' },
  slate: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', hover: 'hover:bg-slate-100' },
}

export default function DocumentCategories({
  documents,
  childId
}: {
  documents: ContentItem[]
  childId: string
}) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['framework_analysis']))

  // Group documents by subtype
  const groupedDocs = documents.reduce((acc, doc) => {
    const subtype = doc.subtype || 'other'
    if (!acc[subtype]) acc[subtype] = []
    acc[subtype].push(doc)
    return acc
  }, {} as Record<string, ContentItem[]>)

  const toggleCategory = (key: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  // Get categories that have documents
  const activeCategories = CATEGORY_CONFIG.filter(cat => groupedDocs[cat.key]?.length > 0)

  // Get uncategorized docs
  const categorizedSubtypes = new Set(CATEGORY_CONFIG.map(c => c.key))
  const uncategorizedDocs = documents.filter(d => !categorizedSubtypes.has(d.subtype || ''))

  if (documents.length === 0) return null

  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Documents & Analysis</h2>
      <div className="space-y-3">
        {activeCategories.map(category => {
          const docs = groupedDocs[category.key] || []
          const isExpanded = expandedCategories.has(category.key)
          const colors = colorClasses[category.color]

          return (
            <div key={category.key} className={`rounded-xl border ${colors.border} overflow-hidden`}>
              <button
                onClick={() => toggleCategory(category.key)}
                className={`w-full px-4 py-3 flex items-center justify-between ${colors.bg} ${colors.hover} transition-colors`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{category.icon}</span>
                  <span className={`font-medium ${colors.text}`}>{category.label}</span>
                  <span className="text-xs text-gray-500 bg-white/50 px-2 py-0.5 rounded-full">
                    {docs.length}
                  </span>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isExpanded && (
                <div className="bg-white divide-y divide-gray-100">
                  {docs.map(doc => (
                    <Link
                      key={doc.id}
                      href={`/child/${childId}/doc/${doc.id}`}
                      className="block px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <h4 className="font-medium text-gray-800 text-sm">{doc.title}</h4>
                      {doc.one_liner && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{doc.one_liner}</p>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {/* Uncategorized docs */}
        {uncategorizedDocs.length > 0 && (
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => toggleCategory('other')}
              className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">📄</span>
                <span className="font-medium text-gray-700">Other Documents</span>
                <span className="text-xs text-gray-500 bg-white/50 px-2 py-0.5 rounded-full">
                  {uncategorizedDocs.length}
                </span>
              </div>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${expandedCategories.has('other') ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {expandedCategories.has('other') && (
              <div className="bg-white divide-y divide-gray-100">
                {uncategorizedDocs.map(doc => (
                  <Link
                    key={doc.id}
                    href={`/child/${childId}/doc/${doc.id}`}
                    className="block px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <h4 className="font-medium text-gray-800 text-sm">{doc.title}</h4>
                    {doc.one_liner && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{doc.one_liner}</p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
