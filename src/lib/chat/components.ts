/**
 * AI Response Component Toolkit
 *
 * These components are available to the AI for formatting responses.
 * The AI decides which components to use based on context.
 *
 * To add a new component:
 * 1. Add it to COMPONENTS below with tag, description, and usage
 * 2. Add a renderer in ChatPage.tsx ComponentRenderer switch
 * 3. Update the regex in parseComponentResponse if needed
 */

export interface ComponentDefinition {
  tag: string
  description: string
  usage: string
  hasTitle?: boolean  // e.g., <later title="...">
}

export const COMPONENTS: ComponentDefinition[] = [
  {
    tag: 'urgent',
    description: 'Red card: immediate actions (max 3-4 bullets)',
    usage: 'Use for urgent situations requiring immediate action'
  },
  {
    tag: 'script',
    description: 'Blue card: exact words to say to the child verbatim',
    usage: 'Use when the caregiver needs specific words to say'
  },
  {
    tag: 'later',
    description: 'Collapsible: follow-up steps when calm',
    usage: 'Use for actions to take after the immediate situation',
    hasTitle: true
  },
  {
    tag: 'insight',
    description: 'Green highlight: key takeaway or important finding',
    usage: 'Use to highlight the most important insight in informational responses'
  },
  {
    tag: 'note',
    description: 'Gray aside: brief context or explanation',
    usage: 'Use for additional context that supports the main response'
  }
]

/**
 * Generate the component toolkit section for the system prompt
 */
export function generateComponentPrompt(): string {
  const componentLines = COMPONENTS.map(c => {
    const titleAttr = c.hasTitle ? ' title="Title"' : ''
    return `<${c.tag}${titleAttr}>...</${c.tag}>  → ${c.description}`
  }).join('\n')

  return `## Response Components

Format responses using these HTML components:

${componentLines}

**Guidelines:**
- Urgent situations: use <urgent> + <script>, optionally <later>
- Informational questions: use <insight> for the key takeaway, <note> for supporting context
- Use markdown lists (- item) for bullet points
- Keep responses concise - teachers are busy and stressed
- <script> must be words they can read aloud exactly`
}

/**
 * Get list of valid component tags for parsing
 */
export function getComponentTags(): string[] {
  return COMPONENTS.map(c => c.tag)
}
