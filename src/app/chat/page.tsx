import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ChatPage from '@/components/ChatPage'

export default async function ChatRoute() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get all children this user has access to
  const { data: ownedChildren } = await supabase
    .from('children')
    .select('id, name, age')
    .eq('created_by', user.id)
    .order('name')

  const { data: collaborations } = await supabase
    .from('collaborators')
    .select(`
      children:child_id (
        id,
        name,
        age
      )
    `)
    .eq('user_id', user.id)

  // Combine and dedupe children
  interface ChildData {
    id: string
    name: string
    age?: number | null
  }

  const collabChildren: ChildData[] = collaborations
    ?.map(c => {
      const child = c.children
      if (!child || Array.isArray(child)) return null
      return child as ChildData
    })
    .filter((c): c is ChildData => c !== null) || []

  const owned: ChildData[] = (ownedChildren || []).map(c => ({
    id: c.id,
    name: c.name,
    age: c.age
  }))

  const allChildren: ChildData[] = [...owned, ...collabChildren]
  const uniqueChildren = allChildren.filter((child, index, self) =>
    index === self.findIndex(c => c.id === child.id)
  )

  return <ChatPage children={uniqueChildren} />
}
