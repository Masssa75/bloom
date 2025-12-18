'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Child {
  id: string
  name: string
  age: number | null
}

export default function NewIncidentPage() {
  const [children, setChildren] = useState<Child[]>([])
  const [selectedChildren, setSelectedChildren] = useState<string[]>([])
  const [description, setDescription] = useState('')
  const [context, setContext] = useState('')
  const [response, setResponse] = useState('')
  const [severity, setSeverity] = useState<'minor' | 'moderate' | 'significant'>('minor')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadChildren()
  }, [])

  const loadChildren = async () => {
    const { data } = await supabase
      .from('children')
      .select('id, name, age')
      .order('name')

    if (data) setChildren(data)
  }

  const toggleChild = (childId: string) => {
    setSelectedChildren(prev =>
      prev.includes(childId)
        ? prev.filter(id => id !== childId)
        : [...prev, childId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (selectedChildren.length === 0) {
      alert('Please select at least one child')
      return
    }

    if (!description.trim()) {
      alert('Please describe what happened')
      return
    }

    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    // Create an incident for the primary child
    const primaryChildId = selectedChildren[0]
    const otherChildIds = selectedChildren.slice(1)

    const primaryChild = children.find(c => c.id === primaryChildId)
    const otherChildNames = otherChildIds.map(id =>
      children.find(c => c.id === id)?.name
    ).filter(Boolean)

    const oneLiner = `${severity} incident: ${description.substring(0, 50)}${description.length > 50 ? '...' : ''}`

    const { error } = await supabase
      .from('content_items')
      .insert({
        child_id: primaryChildId,
        created_by: user?.id,
        type: 'incident',
        subtype: 'behavioral_incident',
        title: `Incident - ${new Date().toLocaleDateString()}`,
        one_liner: oneLiner,
        summary: `${description}${context ? `\n\nContext: ${context}` : ''}${response ? `\n\nResponse: ${response}` : ''}`,
        full_content: JSON.stringify({
          description,
          context,
          response,
          severity,
          other_children: otherChildNames,
        }),
        incident_date: new Date().toISOString(),
        other_children: otherChildIds,
        metadata: {
          severity,
          other_children_names: otherChildNames,
        },
      })

    setLoading(false)

    if (error) {
      alert('Failed to save incident. Please try again.')
      console.error(error)
      return
    }

    setSuccess(true)
    setTimeout(() => {
      router.push('/dashboard')
    }, 1500)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-8 shadow-lg text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Incident Reported</h2>
          <p className="text-gray-500">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-gray-500 hover:text-gray-700 p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-800">Report Incident</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Child Selection */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Child(ren) Involved
            </label>
            <div className="flex flex-wrap gap-2">
              {children.map(child => (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => toggleChild(child.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedChildren.includes(child.id)
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {child.name}
                </button>
              ))}
            </div>
            {selectedChildren.length === 0 && (
              <p className="text-sm text-gray-500 mt-2">Select at least one child</p>
            )}
          </div>

          {/* Severity */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Severity
            </label>
            <div className="flex gap-2">
              {(['minor', 'moderate', 'significant'] as const).map(level => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setSeverity(level)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors capitalize ${
                    severity === level
                      ? level === 'minor'
                        ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-400'
                        : level === 'moderate'
                        ? 'bg-orange-100 text-orange-800 border-2 border-orange-400'
                        : 'bg-red-100 text-red-800 border-2 border-red-400'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* What Happened */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What Happened? *
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the incident..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Tip: Use your keyboard microphone for voice input
            </p>
          </div>

          {/* Context */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Context (what led to this?)
            </label>
            <textarea
              value={context}
              onChange={e => setContext(e.target.value)}
              placeholder="What was happening before? Any triggers?"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Response */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              How Did You Respond?
            </label>
            <textarea
              value={response}
              onChange={e => setResponse(e.target.value)}
              placeholder="What did you do? What was the outcome?"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || selectedChildren.length === 0 || !description.trim()}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
          >
            {loading ? 'Saving...' : 'Submit Report'}
          </button>
        </form>
      </main>
    </div>
  )
}
