import type { PitchRecord, PlateAppearanceResult } from '../types/pitch'

export type BattingStats = {
  avg: number
  obp: number
  slg: number
  ops: number
  oSwingRate: number
  bbPerK: number | null
  atBats: number
  hits: number
  walks: number
  strikeouts: number
}

const SWING_JUDGMENTS = new Set(['swinging-strike', 'foul', 'in-play'])
const HIT_RESULTS = new Set<PlateAppearanceResult>(['single', 'double', 'triple', 'home-run'])
const AT_BAT_RESULTS = new Set<PlateAppearanceResult>(['single', 'double', 'triple', 'home-run', 'strikeout', 'out'])

function safeDivide(numerator: number, denominator: number): number {
  if (denominator === 0) {
    return 0
  }

  return numerator / denominator
}

function totalBasesFromResult(result: PlateAppearanceResult): number {
  switch (result) {
    case 'single':
      return 1
    case 'double':
      return 2
    case 'triple':
      return 3
    case 'home-run':
      return 4
    default:
      return 0
  }
}

export function calculateBattingStats(records: PitchRecord[]): BattingStats {
  let atBats = 0
  let hits = 0
  let totalBases = 0
  let walks = 0
  let strikeouts = 0
  let ballZonePitches = 0
  let ballZoneSwings = 0

  for (const record of records) {
    const isBallZone = record.pitchCourse.startsWith('ball-')
    if (isBallZone) {
      ballZonePitches += 1
      if (SWING_JUDGMENTS.has(record.judgment)) {
        ballZoneSwings += 1
      }
    }

    const result = record.plateAppearanceResult
    if (!result) {
      continue
    }

    if (AT_BAT_RESULTS.has(result)) {
      atBats += 1
    }

    if (HIT_RESULTS.has(result)) {
      hits += 1
      totalBases += totalBasesFromResult(result)
    }

    if (result === 'walk') {
      walks += 1
    }

    if (result === 'strikeout') {
      strikeouts += 1
    }
  }

  const avg = safeDivide(hits, atBats)
  const obp = safeDivide(hits + walks, atBats + walks)
  const slg = safeDivide(totalBases, atBats)
  const ops = obp + slg
  const oSwingRate = safeDivide(ballZoneSwings, ballZonePitches)
  const bbPerK = strikeouts === 0 ? null : walks / strikeouts

  return {
    avg,
    obp,
    slg,
    ops,
    oSwingRate,
    bbPerK,
    atBats,
    hits,
    walks,
    strikeouts,
  }
}
