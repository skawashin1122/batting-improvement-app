export interface PitchRecord {
  id: string
  recordedAt: string
  pitchType: string
  pitchCourse: string
  judgment: 'strike' | 'ball' | 'foul' | 'in-play'
}
