import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { childId, email, role = 'member' } = await request.json()

  if (!childId || !email) {
    return NextResponse.json({ error: 'Missing childId or email' }, { status: 400 })
  }

  // Verify the user owns this child
  const { data: child, error: childError } = await supabase
    .from('children')
    .select('id, name')
    .eq('id', childId)
    .eq('created_by', user.id)
    .single()

  if (childError || !child) {
    return NextResponse.json({ error: 'Not authorized to invite to this child' }, { status: 403 })
  }

  // Check if user is trying to invite themselves
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', user.id)
    .single()

  if (profile?.email === email.toLowerCase()) {
    return NextResponse.json({ error: 'You cannot invite yourself' }, { status: 400 })
  }

  // Check if this email is already a collaborator
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email.toLowerCase())
    .single()

  if (existingProfile) {
    const { data: existingCollab } = await supabase
      .from('collaborators')
      .select('id')
      .eq('child_id', childId)
      .eq('user_id', existingProfile.id)
      .single()

    if (existingCollab) {
      return NextResponse.json({ error: 'This user is already a collaborator' }, { status: 400 })
    }
  }

  // Create the invitation
  const { data: invitation, error: inviteError } = await supabase
    .from('invitations')
    .insert({
      child_id: childId,
      email: email.toLowerCase(),
      role,
      invited_by: user.id
    })
    .select()
    .single()

  if (inviteError) {
    if (inviteError.code === '23505') { // Unique constraint violation
      return NextResponse.json({ error: 'An invitation already exists for this email' }, { status: 400 })
    }
    return NextResponse.json({ error: inviteError.message }, { status: 500 })
  }

  // If the user already exists, auto-add them as collaborator
  if (existingProfile) {
    await supabase
      .from('collaborators')
      .insert({
        child_id: childId,
        user_id: existingProfile.id,
        role,
        invited_by: user.id
      })

    await supabase
      .from('invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id)
  }

  return NextResponse.json({
    success: true,
    invitation,
    autoAccepted: !!existingProfile
  })
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const childId = request.nextUrl.searchParams.get('childId')

  if (childId) {
    // Get invitations for a specific child (owner only)
    const { data: child } = await supabase
      .from('children')
      .select('id')
      .eq('id', childId)
      .eq('created_by', user.id)
      .single()

    if (!child) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { data: invitations } = await supabase
      .from('invitations')
      .select('*')
      .eq('child_id', childId)
      .is('accepted_at', null)
      .order('created_at', { ascending: false })

    const { data: collaborators } = await supabase
      .from('collaborators')
      .select(`
        id,
        role,
        created_at,
        profiles:user_id (
          id,
          email,
          full_name
        )
      `)
      .eq('child_id', childId)

    return NextResponse.json({ invitations, collaborators })
  }

  // Get pending invitations for the current user
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', user.id)
    .single()

  const { data: pendingInvitations } = await supabase
    .from('invitations')
    .select(`
      id,
      role,
      created_at,
      children:child_id (
        id,
        name
      ),
      profiles:invited_by (
        full_name,
        email
      )
    `)
    .eq('email', profile?.email)
    .is('accepted_at', null)

  return NextResponse.json({ pendingInvitations })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { invitationId, collaboratorId, childId } = await request.json()

  if (invitationId) {
    // Delete invitation
    const { error } = await supabase
      .from('invitations')
      .delete()
      .eq('id', invitationId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  } else if (collaboratorId && childId) {
    // Remove collaborator (verify owner first)
    const { data: child } = await supabase
      .from('children')
      .select('id')
      .eq('id', childId)
      .eq('created_by', user.id)
      .single()

    if (!child) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { error } = await supabase
      .from('collaborators')
      .delete()
      .eq('id', collaboratorId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
