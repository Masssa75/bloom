import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import CollaboratorsSection from '@/components/CollaboratorsSection'
import DocumentCategories from '@/components/DocumentCategories'

interface ContentItem {
  id: string
  type: string
  subtype: string | null
  title: string
  one_liner: string | null
  created_at: string
  metadata: {
    priority?: string
    severity?: string
  } | null
}

export default async function ChildProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get child data
  const { data: child, error } = await supabase
    .from('children')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !child) notFound()

  const isOwner = child.created_by === user.id

  // Get all content items for this child
  const { data: contentItems } = await supabase
    .from('content_items')
    .select('id, type, subtype, title, one_liner, created_at, metadata')
    .eq('child_id', id)
    .order('created_at', { ascending: false })

  // Separate and prioritize content
  const quickRefs = contentItems?.filter(
    (item: ContentItem) => item.metadata?.priority === 'high' || item.subtype === 'quick_reference'
  ) || []

  const documents = contentItems?.filter(
    (item: ContentItem) => item.type === 'document' && item.metadata?.priority !== 'high'
  ) || []

  const incidents = contentItems?.filter(
    (item: ContentItem) => item.type === 'incident'
  ) || []

  const sessions = contentItems?.filter(
    (item: ContentItem) => item.type === 'session'
  ) || []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-gray-800">{child.name}</h1>
              {child.age && <p className="text-sm text-gray-500">Age {child.age}</p>}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {/* Quick Actions */}
        <div className="flex gap-3">
          <Link
            href={`/incident/new?child=${id}`}
            className="flex-1 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl p-4 text-center transition-colors"
          >
            <span className="text-orange-700 font-medium">Report Incident</span>
          </Link>
          <div className="flex-1 bg-blue-50 border border-blue-200 rounded-xl p-4 text-center opacity-50">
            <span className="text-blue-700 font-medium">Chat (Coming Soon)</span>
          </div>
        </div>

        {/* Quick Reference Documents */}
        {quickRefs.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
              Quick Reference
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {quickRefs.map((item: ContentItem) => (
                <Link
                  key={item.id}
                  href={`/child/${id}/doc/${item.id}`}
                  className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl p-4 transition-colors"
                >
                  <h3 className="font-medium text-emerald-800">{item.title}</h3>
                  {item.one_liner && (
                    <p className="text-sm text-emerald-600 mt-1 line-clamp-2">{item.one_liner}</p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Recent Incidents */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Recent Incidents</h2>
          {incidents.length > 0 ? (
            <div className="space-y-3">
              {incidents.slice(0, 5).map((item: ContentItem) => (
                <Link
                  key={item.id}
                  href={`/child/${id}/doc/${item.id}`}
                  className="block bg-white hover:bg-gray-50 border border-gray-200 rounded-xl p-4 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          item.metadata?.severity === 'significant'
                            ? 'bg-red-100 text-red-700'
                            : item.metadata?.severity === 'moderate'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {item.metadata?.severity || 'minor'}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {item.one_liner && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.one_liner}</p>
                      )}
                    </div>
                    <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
              <p className="text-gray-500">No incidents recorded yet</p>
            </div>
          )}
        </section>

        {/* Documents - Grouped by Category */}
        <DocumentCategories documents={documents} childId={id} />

        {/* Sessions */}
        {sessions.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Interview Sessions</h2>
            <div className="space-y-2">
              {sessions.map((item: ContentItem) => (
                <Link
                  key={item.id}
                  href={`/child/${id}/doc/${item.id}`}
                  className="block bg-white hover:bg-gray-50 border border-gray-200 rounded-xl p-4 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-800">{item.title}</h3>
                      {item.one_liner && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-1">{item.one_liner}</p>
                      )}
                    </div>
                    <span className="text-sm text-gray-400">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Collaborators Section */}
        <CollaboratorsSection childId={id} isOwner={isOwner} />
      </main>
    </div>
  )
}
