import { BarChart3, NotebookPen } from 'lucide-react'
import { useState } from 'react'
import type { PitchRecord } from './types/pitch'

type TabKey = 'record' | 'analytics'

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('record')
  const [pitchRecords] = useState<PitchRecord[]>([])

  const recordContent = (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">1球入力 (Record)</h2>
        <p className="mt-2 text-sm text-slate-600">
          次の Issue で投球コース・球種・判定を1タップ入力できる UI を追加します。
        </p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-slate-700">現在の入力件数</p>
        <p className="mt-2 text-3xl font-bold text-slate-900">{pitchRecords.length}</p>
      </div>
    </section>
  )

  const analyticsContent = (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">打撃分析 (Analytics)</h2>
        <p className="mt-2 text-sm text-slate-600">
          入力データが蓄積されると、ここに打率やゾーン別傾向などを表示します。
        </p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-700">分析対象データはまだありません。</p>
      </div>
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
