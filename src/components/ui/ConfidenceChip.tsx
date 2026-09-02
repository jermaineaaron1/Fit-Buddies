import React from 'react'
import { Chip } from './Chip'

export type ConfidenceLevel = 'high' | 'medium' | 'low'

/**
 * How much to trust one estimated row. "Low" is deliberately labelled CHECK
 * rather than LOW — it is an instruction to the user, not a score, and a photo
 * estimate is only honest if the doubtful rows say so plainly.
 */
export function ConfidenceChip({ level }: { level: ConfidenceLevel }) {
  if (level === 'high') return <Chip label="High" tone="blue" icon="checkmark-circle" />
  if (level === 'medium') return <Chip label="Medium" tone="gold" icon="help-circle" />
  return <Chip label="Check" tone="danger" icon="alert-circle" />
}
