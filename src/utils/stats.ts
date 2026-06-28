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

export type CourseMetricStats = {
  successes: number
  attempts: number
  rate: number | null
}

export type CourseHeatmapStats = Record<
  PitchRecord['pitchCourse'],
  {
    avg: CourseMetricStats
    whiff: CourseMetricStats
  }
>

const SWING_JUDGMENTS = new Set(['swinging-strike', 'foul', 'in-play'])
const HIT_RESULTS = new Set<PlateAppearanceResult>(['single', 'double', 'triple', 'home-run'])
const AT_BAT_RESULTS = new Set<PlateAppearanceResult>(['single', 'double', 'triple', 'home-run', 'strikeout', 'out'])
const PITCH_COURSES: PitchRecord['pitchCourse'][] = [
  'zone-top-left',
  'zone-top-center',
  'zone-top-right',
  'zone-middle-left',
  'zone-center',
  'zone-middle-right',
  'zone-bottom-left',
  'zone-bottom-center',
  'zone-bottom-right',
  'ball-up',
  'ball-down',
  'ball-left',
  'ball-right',
  'ball-up-left',
  'ball-up-right',
  'ball-down-left',
  'ball-down-right',
]

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

export function calculateCourseHeatmapStats(records: PitchRecord[]): CourseHeatmapStats {
  const totals = PITCH_COURSES.reduce((accumulator, course) => {
    accumulator[course] = {
      avgHits: 0,
      avgAtBats: 0,
      whiffCount: 0,
      swingCount: 0,
    }
    return accumulator
  }, {} as Record<PitchRecord['pitchCourse'], { avgHits: number; avgAtBats: number; whiffCount: number; swingCount: number }>)

  for (const record of records) {
    const bucket = totals[record.pitchCourse]
    const result = record.plateAppearanceResult

    if (result && AT_BAT_RESULTS.has(result)) {
      bucket.avgAtBats += 1
      if (HIT_RESULTS.has(result)) {
        bucket.avgHits += 1
      }
    }

    if (SWING_JUDGMENTS.has(record.judgment)) {
      bucket.swingCount += 1
      if (record.judgment === 'swinging-strike') {
        bucket.whiffCount += 1
      }
    }
  }

  return PITCH_COURSES.reduce((accumulator, course) => {
    const total = totals[course]
    accumulator[course] = {
      avg: {
        successes: total.avgHits,
        attempts: total.avgAtBats,
        rate: total.avgAtBats === 0 ? null : safeDivide(total.avgHits, total.avgAtBats),
      },
      whiff: {
        successes: total.whiffCount,
        attempts: total.swingCount,
        rate: total.swingCount === 0 ? null : safeDivide(total.whiffCount, total.swingCount),
      },
    }
    return accumulator
  }, {} as CourseHeatmapStats)
}
