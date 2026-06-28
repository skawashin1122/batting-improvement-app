import { BarChart3, NotebookPen } from 'lucide-react'
import confetti from 'canvas-confetti'
import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  Judgment,
  PitchCourse,
  PitchRecord,
  PitchType,
  HitDirection,
  HitType,
  HitQuality,
  PlateAppearanceResult,
} from './types/pitch'
import { calculateBattingStats, calculateCourseHeatmapStats } from './utils/stats'

type TabKey = 'record' | 'analytics'
type HeatmapMetricKey = 'avg' | 'whiff'

type CourseCell = {
  value: PitchCourse
  label: string
  zone: 'strike' | 'ball'
}

const courseGrid: Array<CourseCell | null> = [
  { value: 'ball-up-left', label: '左上', zone: 'ball' },
  null,
  { value: 'ball-up', label: '上', zone: 'ball' },
  null,
  { value: 'ball-up-right', label: '右上', zone: 'ball' },
  null,
  { value: 'zone-top-left', label: '高内', zone: 'strike' },
  { value: 'zone-top-center', label: '高中', zone: 'strike' },
  { value: 'zone-top-right', label: '高外', zone: 'strike' },
  null,
  { value: 'ball-left', label: '左', zone: 'ball' },
  { value: 'zone-middle-left', label: '内角', zone: 'strike' },
  { value: 'zone-center', label: '真中', zone: 'strike' },
  { value: 'zone-middle-right', label: '外角', zone: 'strike' },
  { value: 'ball-right', label: '右', zone: 'ball' },
  null,
  { value: 'zone-bottom-left', label: '低内', zone: 'strike' },
  { value: 'zone-bottom-center', label: '低中', zone: 'strike' },
  { value: 'zone-bottom-right', label: '低外', zone: 'strike' },
  null,
  { value: 'ball-down-left', label: '左下', zone: 'ball' },
  null,
  { value: 'ball-down', label: '下', zone: 'ball' },
  null,
  { value: 'ball-down-right', label: '右下', zone: 'ball' },
]

const pitchTypeOptions: Array<{ value: PitchType; label: string }> = [
  { value: 'straight', label: 'ストレート' },
  { value: 'slider', label: 'スライダー' },
  { value: 'curve', label: 'カーブ' },
  { value: 'fork', label: 'フォーク' },
  { value: 'changeup', label: 'チェンジアップ' },
]

const judgmentOptions: Array<{ value: Judgment; label: string }> = [
  { value: 'ball', label: 'ボール' },
  { value: 'called-strike', label: '見逃し' },
  { value: 'swinging-strike', label: '空振り' },
  { value: 'foul', label: 'ファウル' },
  { value: 'in-play', label: 'インプレー' },
]

const plateAppearanceResultOptions: Array<{ value: PlateAppearanceResult; label: string }> = [
  { value: 'single', label: '単打' },
  { value: 'double', label: '二塁打' },
  { value: 'triple', label: '三塁打' },
  { value: 'home-run', label: '本塁打' },
  { value: 'walk', label: '四球' },
  { value: 'strikeout', label: '三振' },
  { value: 'out', label: 'アウト' },
]

const STORAGE_KEY = 'at-bat-analytica-pitch-records-v1'

const pitchTypeValues: PitchType[] = ['straight', 'slider', 'curve', 'fork', 'changeup']
const pitchCourseValues: PitchCourse[] = [
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
const judgmentValues: Judgment[] = ['ball', 'called-strike', 'swinging-strike', 'foul', 'in-play']
const hitDirectionValues: HitDirection[] = ['left', 'center', 'right']
const hitTypeValues: HitType[] = ['ground-ball', 'line-drive', 'fly-ball']
const hitQualityValues: HitQuality[] = ['clean', 'normal', 'jammed']
const plateAppearanceResultValues: PlateAppearanceResult[] = ['single', 'double', 'triple', 'home-run', 'walk', 'strikeout', 'out']

function isPitchRecordArray(value: unknown): value is PitchRecord[] {
  if (!Array.isArray(value)) {
    return false
  }

  return value.every((item) => {
    if (typeof item !== 'object' || item === null) {
      return false
    }

    const record = item as Record<string, unknown>
    if (
      typeof record.id !== 'string' ||
      typeof record.recordedAt !== 'string' ||
      !pitchTypeValues.includes(record.pitchType as PitchType) ||
      !pitchCourseValues.includes(record.pitchCourse as PitchCourse) ||
      !judgmentValues.includes(record.judgment as Judgment)
    ) {
      return false
    }

    if (record.hitDirection !== undefined && !hitDirectionValues.includes(record.hitDirection as HitDirection)) {
      return false
    }
    if (record.hitType !== undefined && !hitTypeValues.includes(record.hitType as HitType)) {
      return false
    }
    if (record.hitQuality !== undefined && !hitQualityValues.includes(record.hitQuality as HitQuality)) {
      return false
    }
    if (
      record.plateAppearanceResult !== undefined &&
      !plateAppearanceResultValues.includes(record.plateAppearanceResult as PlateAppearanceResult)
    ) {
      return false
    }

    return true
  })
}

function persistPitchRecords(records: PitchRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch (error) {
    if (error instanceof DOMException) {
      alert('保存に失敗しました。ブラウザの保存容量や設定を確認してください。')
      return
    }
    throw error
  }
}

function formatDecimal(value: number): string {
  return value.toFixed(3)
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function formatHeatmapRate(value: number | null): string {
  if (value === null) {
    return '--'
  }

  return formatPercent(value)
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min
  }
  if (value > max) {
    return max
  }
  return value
}

function getHeatmapCellStyle(metric: HeatmapMetricKey, rate: number | null): { backgroundColor: string; color: string } {
  if (rate === null) {
    return {
      backgroundColor: 'rgba(148, 163, 184, 0.18)',
      color: '#334155',
    }
  }

  const alpha = (0.18 + clamp(rate, 0, 1) * 0.72).toFixed(3)
  const color = metric === 'avg' ? `rgba(16, 185, 129, ${alpha})` : `rgba(239, 68, 68, ${alpha})`

  return {
    backgroundColor: color,
    color: rate >= 0.55 ? '#ffffff' : '#0f172a',
  }
}

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('record')
  const [pitchRecords, setPitchRecords] = useState<PitchRecord[]>([])
  const [selectedCourse, setSelectedCourse] = useState<PitchCourse | null>(null)
  const [selectedPitchType, setSelectedPitchType] = useState<PitchType | null>(null)
  const [selectedJudgment, setSelectedJudgment] = useState<Judgment | null>(null)
  const [selectedPlateAppearanceResult, setSelectedPlateAppearanceResult] = useState<PlateAppearanceResult | null>(null)
  const [selectedHitDirection, setSelectedHitDirection] = useState<HitDirection | null>(null)
  const [selectedHitType, setSelectedHitType] = useState<HitType | null>(null)
  const [selectedHitQuality, setSelectedHitQuality] = useState<HitQuality | null>(null)
  const [heatmapMetric, setHeatmapMetric] = useState<HeatmapMetricKey>('avg')
  const hasTriggeredHotStreakConfetti = useRef(false)

  const hitDirectionOptions: Array<{ value: HitDirection; label: string }> = [
    { value: 'left', label: 'レフト' },
    { value: 'center', label: 'センター' },
    { value: 'right', label: 'ライト' },
  ]

  const hitTypeOptions: Array<{ value: HitType; label: string }> = [
    { value: 'ground-ball', label: 'ゴロ' },
    { value: 'line-drive', label: 'ライナー' },
    { value: 'fly-ball', label: 'フライ' },
  ]

  const hitQualityOptions: Array<{ value: HitQuality; label: string }> = [
    { value: 'clean', label: '芯/クリーン' },
    { value: 'normal', label: '普通' },
    { value: 'jammed', label: '詰まり/泳ぎ' },
  ]

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return
    }

    try {
      const parsed = JSON.parse(raw) as unknown
      if (!isPitchRecordArray(parsed)) {
        alert('保存データ形式が不正なため、保存データを初期化しました。')
        localStorage.removeItem(STORAGE_KEY)
        return
      }
      setPitchRecords(parsed)
    } catch (error) {
      if (error instanceof SyntaxError) {
        alert('保存データの読み込みに失敗したため、保存データを初期化しました。')
        localStorage.removeItem(STORAGE_KEY)
        return
      }
      throw error
    }
  }, [])

  const battingStats = useMemo(() => calculateBattingStats(pitchRecords), [pitchRecords])
  const courseHeatmapStats = useMemo(() => calculateCourseHeatmapStats(pitchRecords), [pitchRecords])

  useEffect(() => {
    const shouldCelebrate = activeTab === 'analytics' && battingStats.atBats >= 10 && battingStats.ops > 1
    if (!shouldCelebrate || hasTriggeredHotStreakConfetti.current) {
      return
    }

    confetti({
      particleCount: 140,
      spread: 90,
      origin: { y: 0.62 },
    })
    hasTriggeredHotStreakConfetti.current = true
  }, [activeTab, battingStats.atBats, battingStats.ops])

  const handleRecordPitch = () => {
    if (!selectedCourse || !selectedPitchType || !selectedJudgment) {
      alert('コース、球種、判定をすべて選択してください。')
      return
    }

    const newRecord: PitchRecord = {
      id: `${Date.now()}`,
      recordedAt: new Date().toISOString(),
      pitchType: selectedPitchType,
      pitchCourse: selectedCourse,
      judgment: selectedJudgment,
      plateAppearanceResult: selectedPlateAppearanceResult || undefined,
    }

    if (selectedJudgment === 'in-play') {
      newRecord.hitDirection = selectedHitDirection || undefined
      newRecord.hitType = selectedHitType || undefined
      newRecord.hitQuality = selectedHitQuality || undefined
    }

    setPitchRecords((previous) => {
      const next = [...previous, newRecord]
      persistPitchRecords(next)
      return next
    })

    setSelectedCourse(null)
    setSelectedPitchType(null)
    setSelectedJudgment(null)
    setSelectedPlateAppearanceResult(null)
    setSelectedHitDirection(null)
    setSelectedHitType(null)
    setSelectedHitQuality(null)
  }

  const InPlayForm = () => (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">打球方向</h3>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {hitDirectionOptions.map((option) => {
          const isSelected = selectedHitDirection === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setSelectedHitDirection(option.value)}
              className={`rounded-xl border px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
              }`}
              aria-pressed={isSelected}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      <h3 className="mt-4 text-sm font-semibold text-slate-900">打球の種類</h3>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {hitTypeOptions.map((option) => {
          const isSelected = selectedHitType === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setSelectedHitType(option.value)}
              className={`rounded-xl border px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
              }`}
              aria-pressed={isSelected}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      <h3 className="mt-4 text-sm font-semibold text-slate-900">打撃の質</h3>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {hitQualityOptions.map((option) => {
          const isSelected = selectedHitQuality === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setSelectedHitQuality(option.value)}
              className={`rounded-xl border px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
              }`}
              aria-pressed={isSelected}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )

  const recordContent = (
    <section className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">1球入力 (Record)</h2>
        <p className="mt-2 text-sm text-slate-600">コース・球種・判定をタップして選択します。</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">投球コース</h3>
        <p className="mt-1 text-xs text-slate-500">
          濃い青: 選択中 / 薄い青: ストライクゾーン / グレー: ボールゾーン
        </p>
        <div className="mx-auto mt-4 grid w-full max-w-xs grid-cols-5 gap-2">
          {courseGrid.map((cell, index) => {
            if (!cell) {
              return <div key={`empty-${index}`} className="h-12" aria-hidden />
            }

            const isSelected = selectedCourse === cell.value
            const baseStyle =
              'h-12 rounded-xl border text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1'
            const zoneStyle =
              cell.zone === 'strike'
                ? 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
            const selectedStyle = isSelected ? 'border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-600' : zoneStyle

            return (
              <button
                key={cell.value}
                type="button"
                onClick={() => setSelectedCourse(cell.value)}
                className={`${baseStyle} ${selectedStyle}`}
                aria-pressed={isSelected}
              >
                {cell.label}
              </button>
            )
          })}
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">球種</h3>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {pitchTypeOptions.map((option) => {
            const isSelected = selectedPitchType === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setSelectedPitchType(option.value)}
                className={`rounded-xl border px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                }`}
                aria-pressed={isSelected}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">判定</h3>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {judgmentOptions.map((option) => {
            const isSelected = selectedJudgment === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setSelectedJudgment(option.value)}
                className={`rounded-xl border px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                }`}
                aria-pressed={isSelected}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">打席結果（任意）</h3>
        <p className="mt-1 text-xs text-slate-500">AVG/OBP/SLG/OPS・BB/Kの計算対象になります。</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {plateAppearanceResultOptions.map((option) => {
            const isSelected = selectedPlateAppearanceResult === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setSelectedPlateAppearanceResult(option.value)}
                className={`rounded-xl border px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                }`}
                aria-pressed={isSelected}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>
      {selectedJudgment === 'in-play' && <InPlayForm />}
      <button
        type="button"
        onClick={handleRecordPitch}
        className="w-full rounded-xl border border-indigo-600 bg-indigo-600 px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
      >
        この1球を記録する
      </button>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-slate-700">現在の入力件数</p>
        <p className="mt-2 text-3xl font-bold text-slate-900">{pitchRecords.length}</p>
        <dl className="mt-4 space-y-1 text-sm text-slate-700">
          <div className="flex items-center justify-between gap-2">
            <dt className="font-medium">選択中コース</dt>
            <dd>{courseGrid.find((cell) => cell?.value === selectedCourse)?.label ?? '未選択'}</dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="font-medium">選択中球種</dt>
            <dd>{pitchTypeOptions.find((option) => option.value === selectedPitchType)?.label ?? '未選択'}</dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="font-medium">選択中判定</dt>
            <dd>{judgmentOptions.find((option) => option.value === selectedJudgment)?.label ?? '未選択'}</dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="font-medium">選択中打席結果</dt>
            <dd>{plateAppearanceResultOptions.find((option) => option.value === selectedPlateAppearanceResult)?.label ?? '未選択'}</dd>
          </div>
        </dl>
      </div>
    </section>
  )

  const analyticsContent = (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">打撃分析 (Analytics)</h2>
        <p className="mt-2 text-sm text-slate-600">記録データから主要スタッツを自動計算して表示します。</p>
      </div>
      {pitchRecords.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-700">分析対象データはまだありません。まずは「1球入力」から記録してください。</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">打率 (AVG)</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{formatDecimal(battingStats.avg)}</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">出塁率 (OBP)</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{formatDecimal(battingStats.obp)}</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">長打率 (SLG)</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{formatDecimal(battingStats.slg)}</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">OPS</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{formatDecimal(battingStats.ops)}</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">O-Swing%</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{formatPercent(battingStats.oSwingRate)}</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">BB/K</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {battingStats.bbPerK === null ? '-' : formatDecimal(battingStats.bbPerK)}
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">打数 (AB)</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{battingStats.atBats}</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">安打 / 四球 / 三振</p>
              <p className="mt-2 text-xl font-bold text-slate-900">
                {battingStats.hits} / {battingStats.walks} / {battingStats.strikeouts}
              </p>
            </article>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">コース別ヒートマップ</h3>
                <p className="mt-1 text-xs text-slate-500">全17コース（ボールゾーン含む）を色分け表示します。</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setHeatmapMetric('avg')}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                    heatmapMetric === 'avg' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  打率
                </button>
                <button
                  type="button"
                  onClick={() => setHeatmapMetric('whiff')}
                  className={`ml-1 rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                    heatmapMetric === 'whiff' ? 'bg-rose-600 text-white' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  空振り率
                </button>
              </div>
            </div>

            <div className="mx-auto mt-4 grid w-full max-w-xs grid-cols-5 gap-2">
              {courseGrid.map((cell, index) => {
                if (!cell) {
                  return <div key={`heatmap-empty-${index}`} className="h-16" aria-hidden />
                }

                const metric = courseHeatmapStats[cell.value][heatmapMetric]
                const style = getHeatmapCellStyle(heatmapMetric, metric.rate)

                return (
                  <article
                    key={`heatmap-${cell.value}`}
                    className="flex h-16 flex-col items-center justify-center rounded-xl border border-white/40 p-1 text-center shadow-sm"
                    style={style}
                  >
                    <p className="text-[10px] font-semibold leading-none">{cell.label}</p>
                    <p className="mt-1 text-xs font-bold leading-none">{formatHeatmapRate(metric.rate)}</p>
                    <p className="mt-1 text-[10px] leading-none">
                      {metric.successes}/{metric.attempts}
                    </p>
                  </article>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  )

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-4 py-4">
        <h1 className="text-lg font-bold">At-Bat Analytica</h1>
        <p className="mt-1 text-sm text-slate-600">感覚をデータに変える打撃分析アプリ</p>
      </header>

      <main className="flex-1 px-4 py-5 pb-24">
        {activeTab === 'record' ? recordContent : analyticsContent}
      </main>

      <nav className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-md border-t border-slate-200 bg-white">
        <ul className="grid grid-cols-2">
          <li>
            <button
              type="button"
              onClick={() => setActiveTab('record')}
              className={`flex w-full flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                activeTab === 'record' ? 'text-indigo-600' : 'text-slate-500'
              }`}
              aria-current={activeTab === 'record' ? 'page' : undefined}
            >
              <NotebookPen size={20} />
              1球入力
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className={`flex w-full flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                activeTab === 'analytics' ? 'text-indigo-600' : 'text-slate-500'
              }`}
              aria-current={activeTab === 'analytics' ? 'page' : undefined}
            >
              <BarChart3 size={20} />
              打撃分析
            </button>
          </li>
        </ul>
      </nav>
    </div>
  )
}

export default App
