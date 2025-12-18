/**
 * Migration script: Import Michael's case files into Bloom database
 * Run with: npx ts-node scripts/migrate-michael.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabase = createClient(
  env['NEXT_PUBLIC_SUPABASE_URL'],
  env['SUPABASE_SERVICE_ROLE_KEY']
);

const ASSESSMENTS_PATH = '/Users/marcschwyn/Desktop/projects/BambooValley/behavioral-assessments';

// Extract text content from HTML (simple approach - strip tags)
function extractTextFromHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

// Michael's documents to migrate
const michaelDocuments = [
  {
    filename: 'michael-case-log.md',
    type: 'document',
    subtype: 'case_log',
    title: 'Case Log - Chronological History',
    one_liner: 'Full chronological history of all updates, incidents, and insights since November 2025',
    priority: 'normal'
  },
  {
    filename: 'michael-one-page.html',
    type: 'document',
    subtype: 'quick_reference',
    title: 'One Page Action Plan',
    one_liner: 'Quick reference action plan with core pattern, interventions, and current solutions',
    priority: 'high'
  },
  {
    filename: 'michael-quick-reference.html',
    type: 'document',
    subtype: 'quick_reference',
    title: 'Quick Reference Card',
    one_liner: 'What to do/not do - simplified version for teachers to reference quickly',
    priority: 'high'
  },
  {
    filename: 'michael-case-overview.html',
    type: 'document',
    subtype: 'case_overview',
    title: 'Case Overview Dashboard',
    one_liner: 'Status dashboard with all document links and timeline',
    priority: 'normal'
  },
  {
    filename: 'michael-alsup-assessment.html',
    type: 'document',
    subtype: 'alsup',
    title: 'ALSUP Assessment',
    one_liner: 'Lagging skills and unsolved problems assessment (completed Dec 2)',
    priority: 'normal'
  },
  {
    filename: 'michael-framework-analysis-v2.html',
    type: 'document',
    subtype: 'framework_analysis',
    title: '6-Framework Analysis',
    one_liner: 'Multi-framework analysis: Coercive trap + Adlerian power goal + Attachment insecurity',
    priority: 'normal'
  },
  {
    filename: 'michael-daily-one-on-one-guide.html',
    type: 'document',
    subtype: 'intervention_guide',
    title: 'Daily 1-on-1 Session Guide',
    one_liner: 'Scripts and structure for daily one-on-one sessions with Michael',
    priority: 'high'
  },
  {
    filename: 'michael-plan-b-conversation-guide.html',
    type: 'document',
    subtype: 'intervention_guide',
    title: 'Plan B Conversation Guide',
    one_liner: 'How to have collaborative problem-solving conversations (CPS method)',
    priority: 'normal'
  },
  {
    filename: 'michael-plan-b-explosive-reactions.html',
    type: 'document',
    subtype: 'intervention_guide',
    title: 'Plan B: Explosive Reactions',
    one_liner: 'Specific Plan B guide for handling peer harm and explosive reactions',
    priority: 'normal'
  },
  {
    filename: 'michael-consequence-refusal-understanding.html',
    type: 'document',
    subtype: 'analysis',
    title: 'Consequence Refusal Understanding',
    one_liner: 'Analysis of why Michael refuses consequences and how to respond',
    priority: 'normal'
  },
  {
    filename: 'michael-repair-without-reward.html',
    type: 'document',
    subtype: 'intervention_guide',
    title: 'Repair Without Reward Teaching Guide',
    one_liner: 'Teaching guide for unconditional repair - making amends without expecting reward',
    priority: 'normal'
  },
  {
    filename: 'michael-enza-boundary-script.html',
    type: 'document',
    subtype: 'intervention_guide',
    title: 'Enza Protection Boundary Script',
    one_liner: 'Teacher script for Enza protection boundary (no teasing/touching)',
    priority: 'high'
  },
  {
    filename: 'michael-rough-play-assessment.html',
    type: 'document',
    subtype: 'assessment',
    title: 'Rough Play Assessment',
    one_liner: 'Assessment tool for distinguishing skill deficit vs intentional aggression',
    priority: 'normal'
  },
  {
    filename: 'michael-gifted-cognitive-profile.html',
    type: 'document',
    subtype: 'analysis',
    title: 'Gifted Cognitive Profile',
    one_liner: 'Analysis of asynchronous development and rapid eye movement during problem-solving',
    priority: 'normal'
  },
  {
    filename: 'michael-interview-transcript.html',
    type: 'session',
    subtype: 'teacher_interview',
    title: 'Initial Teacher Interview',
    one_liner: 'Full transcript of initial interview with primary teacher (Nov 2025)',
    priority: 'normal'
  },
  {
    filename: 'michael-behavior-contract.html',
    type: 'document',
    subtype: 'intervention_guide',
    title: 'Behavior Contract',
    one_liner: 'Agreed behavior expectations and consequences',
    priority: 'normal'
  }
];

// Michael's context index (like CLAUDE.md for the child)
const michaelContextIndex = `# Michael - Context Index

**Age:** 8 years old
**Status:** Active - Interventions in progress
**Primary Framework:** Dr. Ross Greene's Collaborative & Proactive Solutions (CPS)
**Case Started:** November 2025
**Last Updated:** December 12, 2025

## Overview

Michael is an 8-year-old with gifted cognitive abilities (5th grade math level) and asynchronous development. Father lives in Russia (visits 2x/year), mother works long hours. Russian is L1, English vocabulary gaps drive frustration.

**Core Pattern (90% confidence):** Coercive trap + Adlerian power goal + Attachment insecurity

**Key Insights:**
- Language barrier driving frustration cycle: Doesn't understand → frustration → "too much energy" → acts out
- Targets reactive peers (Enza, Axel) - not random
- Rule tolerance is a practiced skill - can regulate when adults present
- Rapid eye movement during problem-solving indicates parallel processing/high intelligence
- Ice pack incident revealed repair pattern: wants connection FROM repair, not just TO repair

## Quick Reference Documents (Priority: High)
- One Page Action Plan: Complete intervention summary with core pattern and solutions
- Quick Reference Card: What to do/not do - simplified version for teachers
- Daily 1-on-1 Session Guide: Scripts for daily sessions
- Enza Protection Boundary Script: Clear boundary for Enza protection

## Assessments & Analysis
- ALSUP Assessment: 13 lagging skills identified (completed Dec 2)
- 6-Framework Analysis: Multi-framework behavioral analysis
- Rough Play Assessment: Skill deficit vs intentional aggression tool
- Gifted Cognitive Profile: Asynchronous development analysis

## Intervention Guides
- Plan B Conversation Guide: CPS method for collaborative problem-solving
- Plan B: Explosive Reactions: Handling peer harm situations
- Repair Without Reward: Teaching unconditional repair
- Consequence Refusal Understanding: Why he refuses and how to respond
- Behavior Contract: Agreed expectations

## Session History
- Initial Teacher Interview (Nov 2025): Assessment foundation
- Plan B Conversation (Dec 2): Discovered language barrier, created Energy Challenge

## Current Solutions
1. **Super Duper Energy Challenge:** 8-station circuit when overwhelmed
2. **Enza Protection Boundary:** No teasing/touching Enza (clear consequences)
3. **Daily 1-on-1:** Predictable attention, teach replacement behaviors

## Recent Incidents (Dec 2025)
- Dec 12: Parent communication revealed shared transactional worldview with mother
- Dec 11: Ice pack incident - repair attempt turned conflict
- Dec 10: Door slam on child's hand, peer avoidance increasing
`;

async function migrate() {
  console.log('Starting Michael migration...\n');

  // 1. Create Michael as a child
  console.log('1. Creating child record for Michael...');

  const { data: child, error: childError } = await supabase
    .from('children')
    .insert({
      name: 'Michael',
      age: 8,
      context_index: michaelContextIndex,
      notes: 'Father in Russia (2x/year visits), mother works long hours. Russian L1. Gifted (5th grade math).',
    })
    .select()
    .single();

  if (childError) {
    console.error('Error creating child:', childError);
    return;
  }
  console.log(`   Created child: ${child.id}\n`);

  // 2. Migrate documents
  console.log('2. Migrating documents...');

  for (const doc of michaelDocuments) {
    const filePath = path.join(ASSESSMENTS_PATH, doc.filename);

    if (!fs.existsSync(filePath)) {
      console.log(`   SKIP: ${doc.filename} (not found)`);
      continue;
    }

    const rawContent = fs.readFileSync(filePath, 'utf-8');
    const isHtml = doc.filename.endsWith('.html');

    // For HTML files, extract text for the summary but keep raw for full_content
    const textContent = isHtml ? extractTextFromHtml(rawContent) : rawContent;

    // Create a summary (first ~500 chars of text content)
    const summary = textContent.length > 500
      ? textContent.substring(0, 500) + '...'
      : textContent;

    const { error: docError } = await supabase
      .from('content_items')
      .insert({
        child_id: child.id,
        type: doc.type,
        subtype: doc.subtype,
        title: doc.title,
        one_liner: doc.one_liner,
        summary: summary,
        full_content: rawContent,
        metadata: {
          priority: doc.priority,
          source_file: doc.filename,
          migrated_at: new Date().toISOString()
        }
      });

    if (docError) {
      console.log(`   ERROR: ${doc.filename} - ${docError.message}`);
    } else {
      console.log(`   OK: ${doc.title}`);
    }
  }

  console.log('\nMigration complete!');
  console.log(`Child ID: ${child.id}`);
}

migrate().catch(console.error);
