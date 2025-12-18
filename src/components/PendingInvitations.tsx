'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Child {
  id: string
  name: string
}

interface Inviter {
  full_name: string | null
  email: string
}

interface Invitation {
  id: string
  role: string
  created_at: string
  children: Child
  profiles: Inviter
}

export default function PendingInvitations() {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadInvitations()
  }, [])

  const loadInvitations = async () => {
    const res = await fetch('/api/invite')
    const data = await res.json()
    setInvitations(data.pendingInvitations || [])
    setLoading(false)
  }

  const handleAccept = async (invitationId: string) => {
    // Accept is automatic via database trigger, just navigate to the child
    const invitation = invitations.find(inv => inv.id === invitationId)
    if (invitation?.children?.id) {
      router.push(`/child/${invitation.children.id}`)
    }
    router.refresh()
  }

  const handleDecline = async (invitationId: string) => {
    await fetch('/api/invite', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invitationId })
    })
    loadInvitations()
  }

  if (loading || invitations.length === 0) return null

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Pending Invitations</h3>
      <div className="bg-white rounded-xl border border-yellow-200 divide-y divide-yellow-100">
        {invitations.map(inv => (
          <div key={inv.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800">
                {inv.profiles?.full_name || inv.profiles?.email} invited you to collaborate on{' '}
                <span className="text-emerald-600">{inv.children?.name}</span>
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Role: <span className="capitalize">{inv.role}</span> • {new Date(inv.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleAccept(inv.id)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg"
              >
                Accept
              </button>
              <button
                onClick={() => handleDecline(inv.id)}
                className="px-4 py-2 text-gray-600 hover:text-red-600 text-sm"
              >
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
