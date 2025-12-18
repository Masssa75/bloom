'use client'

import { useState, useEffect } from 'react'

interface Profile {
  id: string
  email: string
  full_name: string | null
}

interface Collaborator {
  id: string
  role: string
  created_at: string
  profiles: Profile
}

interface Invitation {
  id: string
  email: string
  role: string
  created_at: string
}

export default function CollaboratorsSection({
  childId,
  isOwner
}: {
  childId: string
  isOwner: boolean
}) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('member')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    if (isOwner) {
      loadCollaborators()
    }
  }, [childId, isOwner])

  const loadCollaborators = async () => {
    const res = await fetch(`/api/invite?childId=${childId}`)
    const data = await res.json()
    if (data.collaborators) setCollaborators(data.collaborators)
    if (data.invitations) setInvitations(data.invitations)
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId, email, role })
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error)
      return
    }

    setSuccess(data.autoAccepted
      ? `${email} has been added as a ${role}`
      : `Invitation sent to ${email}`)
    setEmail('')
    setShowForm(false)
    loadCollaborators()
  }

  const handleRemove = async (type: 'invitation' | 'collaborator', id: string) => {
    const body = type === 'invitation'
      ? { invitationId: id }
      : { collaboratorId: id, childId }

    await fetch('/api/invite', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    loadCollaborators()
  }

  if (!isOwner) return null

  return (
    <section className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Collaborators</h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            + Invite
          </button>
        )}
      </div>

      {/* Invite Form */}
      {showForm && (
        <form onSubmit={handleInvite} className="mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Role</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
              >
                <option value="viewer">Viewer (can view only)</option>
                <option value="member">Member (can add content)</option>
                <option value="admin">Admin (full access)</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg"
              >
                {loading ? 'Sending...' : 'Send Invite'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setError(null)
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Messages */}
      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
        </div>
      )}

      {/* Current Collaborators */}
      {collaborators.length > 0 && (
        <div className="space-y-2 mb-4">
          {collaborators.map(collab => (
            <div key={collab.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div>
                <span className="text-sm font-medium text-gray-800">
                  {collab.profiles?.full_name || collab.profiles?.email}
                </span>
                <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                  {collab.role}
                </span>
              </div>
              <button
                onClick={() => handleRemove('collaborator', collab.id)}
                className="text-xs text-red-600 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Pending Invitations</h3>
          <div className="space-y-2">
            {invitations.map(inv => (
              <div key={inv.id} className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm text-gray-600">{inv.email}</span>
                  <span className="ml-2 text-xs text-orange-500 bg-orange-50 px-2 py-0.5 rounded">
                    pending
                  </span>
                </div>
                <button
                  onClick={() => handleRemove('invitation', inv.id)}
                  className="text-xs text-gray-500 hover:text-red-600"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {collaborators.length === 0 && invitations.length === 0 && !showForm && (
        <p className="text-sm text-gray-500">No collaborators yet. Invite teachers or family members to share access.</p>
      )}
    </section>
  )
}
