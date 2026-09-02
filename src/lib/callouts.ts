export type CalloutFormat = '1v1' | 'triple_threat' | 'fatal_4way' | 'fatal_5way' | 'elimination' | 'open'

export interface CalloutFormatInfo {
  format: CalloutFormat
  label: string
  description: string
  poolSize: number // how many top-ranked members (including issuer) are eligible, 0 = issuer picks freely
}

const TIERS: CalloutFormatInfo[] = [
  { format: '1v1', label: '1v1 Championship', description: 'Open title defense — challenge the champion directly.', poolSize: 2 },
  { format: 'triple_threat', label: 'Triple Threat', description: 'The champion and the top 2 contenders.', poolSize: 3 },
  { format: 'fatal_4way', label: 'Fatal 4-Way', description: 'The champion and the top 3 contenders.', poolSize: 4 },
  { format: 'fatal_5way', label: 'Fatal 5-Way', description: 'The champion and the top 4 contenders.', poolSize: 5 },
  { format: 'elimination', label: 'Championship Elimination', description: 'The champion and the top 5 contenders, last one standing.', poolSize: 6 },
]

const OPEN_TIER: CalloutFormatInfo = {
  format: 'open',
  label: 'Open Callout',
  description: 'Pick any 1-4 fellow contenders for a head-to-head challenge.',
  poolSize: 0,
}

/**
 * Format is determined by the issuer's own standing. The further down the
 * ladder you are, the more people have to be beaten in one match to take the
 * belt — which is what stops a rank-6 contender from getting the same shot as
 * the number one.
 */
export function getCalloutFormatForRank(rank: number): CalloutFormatInfo {
  if (rank >= 1 && rank <= TIERS.length) return TIERS[rank - 1]
  return OPEN_TIER
}

export function getAllFormats(): CalloutFormatInfo[] {
  return [...TIERS, OPEN_TIER]
}

export function getFormatInfo(format: CalloutFormat): CalloutFormatInfo {
  return getAllFormats().find((tier) => tier.format === format) ?? OPEN_TIER
}

export interface LadderRung {
  rank: number
  format: CalloutFormat
  label: string
  /** Who else is in the match, described from the challenger's point of view. */
  field: string
}

/**
 * The published qualification ladder, shown on The Belt so everyone can see
 * what their current standing actually entitles them to.
 */
export const ELIGIBILITY_LADDER: readonly LadderRung[] = [
  { rank: 1, format: '1v1', label: '1v1 Championship', field: 'You and the champion' },
  { rank: 2, format: 'triple_threat', label: 'Triple Threat', field: 'You, the champion and No. 1' },
  { rank: 3, format: 'fatal_4way', label: 'Fatal 4-Way', field: 'You, the champion and Nos. 1–2' },
  { rank: 4, format: 'fatal_5way', label: 'Fatal 5-Way', field: 'You, the champion and Nos. 1–3' },
  { rank: 5, format: 'elimination', label: 'Championship Elimination', field: 'You, the champion and Nos. 1–4' },
] as const
