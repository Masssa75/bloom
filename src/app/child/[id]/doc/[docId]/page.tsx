import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'

export default async function DocumentViewPage({
  params,
}: {
  params: Promise<{ id: string; docId: string }>
}) {
  const { id, docId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get child data
  const { data: child } = await supabase
    .from('children')
    .select('name')
    .eq('id', id)
    .single()

  if (!child) notFound()

  // Get document
  const { data: doc, error } = await supabase
    .from('content_items')
    .select('*')
    .eq('id', docId)
    .eq('child_id', id)
    .single()

  if (error || !doc) notFound()

  // Determine how to render content
  const isHtml = doc.full_content?.trim().startsWith('<!DOCTYPE') ||
                 doc.full_content?.trim().startsWith('<html') ||
                 doc.full_content?.trim().startsWith('<')

  const isMarkdown = doc.subtype === 'case_log' || doc.full_content?.includes('# ')

  const isIncident = doc.type === 'incident'

  // Parse incident content if applicable
  let incidentData: {
    description?: string
    context?: string
    response?: string
    severity?: string
    other_children?: string[]
  } | null = null

  if (isIncident && doc.full_content) {
    try {
      incidentData = JSON.parse(doc.full_content)
    } catch {
      // Not JSON, use summary instead
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href={`/child/${id}`} className="text-gray-500 hover:text-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold text-gray-800 truncate">{doc.title}</h1>
              <p className="text-sm text-gray-500">{child.name}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Document metadata */}
        <div className="mb-6 flex flex-wrap gap-2">
          <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
            {doc.type}
          </span>
          {doc.subtype && (
            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
              {doc.subtype.replace(/_/g, ' ')}
            </span>
          )}
          <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
            {new Date(doc.created_at).toLocaleDateString()}
          </span>
        </div>

        {/* One-liner summary */}
        {doc.one_liner && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <p className="text-emerald-800">{doc.one_liner}</p>
          </div>
        )}

        {/* Content */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {isIncident && incidentData ? (
            // Structured incident display
            <div className="p-6 space-y-6">
              {incidentData.severity && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Severity:</span>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                    incidentData.severity === 'significant'
                      ? 'bg-red-100 text-red-700'
                      : incidentData.severity === 'moderate'
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {incidentData.severity}
                  </span>
                </div>
              )}

              {incidentData.other_children && incidentData.other_children.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Other Children Involved</h3>
                  <div className="flex flex-wrap gap-2">
                    {incidentData.other_children.map((name, i) => (
                      <span key={i} className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">What Happened</h3>
                <p className="text-gray-800 whitespace-pre-wrap">{incidentData.description}</p>
              </div>

              {incidentData.context && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Context</h3>
                  <p className="text-gray-800 whitespace-pre-wrap">{incidentData.context}</p>
                </div>
              )}

              {incidentData.response && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Response</h3>
                  <p className="text-gray-800 whitespace-pre-wrap">{incidentData.response}</p>
                </div>
              )}
            </div>
          ) : isHtml ? (
            // Render HTML content in iframe for safety
            <iframe
              srcDoc={doc.full_content}
              className="w-full min-h-[80vh] border-0"
              title={doc.title}
            />
          ) : isMarkdown ? (
            // Markdown-ish content (simple rendering)
            <div className="p-6 prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-gray-800">
                {doc.full_content || doc.summary}
              </pre>
            </div>
          ) : (
            // Plain text
            <div className="p-6">
              <p className="text-gray-800 whitespace-pre-wrap">
                {doc.summary || doc.full_content}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
