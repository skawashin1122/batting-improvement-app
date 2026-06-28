export interface PitchRecord {
  id: string
  recordedAt: string
  pitchType: PitchType
  pitchCourse: PitchCourse
  judgment: Judgment
}

export type PitchType = 'straight' | 'slider' | 'curve' | 'fork' | 'changeup'

export type PitchCourse =
  | 'zone-top-left'
  | 'zone-top-center'
  | 'zone-top-right'
  | 'zone-middle-left'
  | 'zone-center'
  | 'zone-middle-right'
  | 'zone-bottom-left'
  | 'zone-bottom-center'
  | 'zone-bottom-right'
  | 'ball-up'
  | 'ball-down'
  | 'ball-left'
  | 'ball-right'
  | 'ball-up-left'
  | 'ball-up-right'
  | 'ball-down-left'
  | 'ball-down-right'

export type Judgment = 'ball' | 'called-strike' | 'swinging-strike' | 'foul' | 'in-play'
