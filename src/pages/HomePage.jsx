import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'

const sampleMessages = [
  'Our payment failed and we can\'t access our account.',
  'The dashboard is loading very slowly and showing 500 errors.',
  'Can you add an export to CSV feature for our monthly reports?',
  'I think our account was hacked and I am receiving unauthorized access notices.'
]

function HomePage() {
  const [stats, setStats] = useState({ total: 0, today: 0 })
  const [recentActivity, setRecentActivity] = useState([])

  useEffect(() => {
    // Load stats from localStorage
    const history = JSON.parse(localStorage.getItem('triageHistory') || '[]')
    const today = new Date().toDateString()
    const todayCount = history.filter(item => 
      new Date(item.timestamp).toDateString() === today
    ).length

    setStats({
      total: history.length,
      today: todayCount
    })

    // Get recent 3 items
    setRecentActivity(history.slice(-3).reverse())
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid gap-6 lg:grid-cols-[1.8fr_1fr] mb-8">
          <div className="bg-white rounded-[2rem] shadow-2xl p-10">
            <div className="inline-flex items-center rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700 mb-6">
              Built for support operations
            </div>
            <h1 className="text-5xl font-bold text-slate-900 leading-tight mb-5">
              Smart support triage that surfaces urgent tickets first.
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mb-8">
              Analyze incoming support messages, detect critical outage and security signals, and route priority tickets to your team instantly.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                to="/analyze"
                className="inline-flex items-center justify-center rounded-full bg-blue-600 px-8 py-4 text-base font-semibold text-white shadow-lg transition hover:bg-blue-700"
              >
                Analyze a Message
              </Link>
              <button
                onClick={() => {
                  const random = sampleMessages[Math.floor(Math.random() * sampleMessages.length)]
                  localStorage.setItem('exampleMessage', random)
                  window.location.href = '/analyze'
                }}
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-8 py-4 text-base font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100"
              >
                Try a Sample
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-950 to-blue-950 rounded-[2rem] p-8 text-white shadow-2xl">
            <div className="text-sm uppercase tracking-[0.4em] text-sky-300 mb-4">How it works</div>
            <div className="space-y-5 text-slate-100 text-base leading-8">
              <div className="rounded-3xl bg-white/5 p-5">
                <div className="font-semibold text-white mb-1">Step 1</div>
                Paste the customer support message into the analyzer.
              </div>
              <div className="rounded-3xl bg-white/5 p-5">
                <div className="font-semibold text-white mb-1">Step 2</div>
                The assistant flags critical and high urgency signals automatically.
              </div>
              <div className="rounded-3xl bg-white/5 p-5">
                <div className="font-semibold text-white mb-1">Step 3</div>
                Review recommended actions and save results to history.
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 mb-8">
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm uppercase tracking-[0.25em] text-slate-500 mb-3">Total</div>
            <div className="text-4xl font-semibold text-slate-900">{stats.total}</div>
            <div className="text-sm text-slate-500 mt-2">Messages analyzed so far</div>
          </div>
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm uppercase tracking-[0.25em] text-slate-500 mb-3">Today</div>
            <div className="text-4xl font-semibold text-slate-900">{stats.today}</div>
            <div className="text-sm text-slate-500 mt-2">Processed today</div>
          </div>
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm uppercase tracking-[0.25em] text-slate-500 mb-3">Focus</div>
            <div className="text-4xl font-semibold text-rose-600">{stats.total > 0 ? stats.today : 0}</div>
            <div className="text-sm text-slate-500 mt-2">Urgent signals captured</div>
          </div>
        </div>

        {recentActivity.length > 0 ? (
          <div className="bg-white rounded-[2rem] p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Recent Activity</h2>
                <p className="text-sm text-slate-500">Quick access to the latest triaged messages.</p>
              </div>
              <Link
                to="/history"
                className="text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                View full history →
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {recentActivity.map((item, index) => (
                <div key={index} className="rounded-3xl border border-slate-200 p-6">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                      <div className="text-sm text-slate-500">
                        {new Date(item.timestamp).toLocaleString()}
                      </div>
                      <div className="font-semibold text-slate-900 mt-1">{item.category}</div>
                    </div>
                    <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                      item.urgency === 'CRITICAL' ? 'bg-red-700 text-white' :
                      item.urgency === 'High' ? 'bg-red-100 text-red-900' :
                      item.urgency === 'Medium' ? 'bg-amber-100 text-amber-900' :
                      'bg-emerald-100 text-emerald-900'
                    }`}>
                      {item.urgency}
                    </span>
                  </div>
                  <div className="text-slate-700 mb-3 truncate">
                    {item.message}
                  </div>
                  <div className="text-sm text-slate-500">{item.recommendedAction}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-[2rem] p-10 shadow-2xl text-center">
            <div className="text-6xl mb-4">📭</div>
            <div className="text-2xl font-bold text-slate-900 mb-2">No messages analyzed yet</div>
            <p className="text-slate-500 mb-6">Start by analyzing a support message to see priority signals and recommended actions.</p>
            <Link
              to="/analyze"
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-8 py-4 text-base font-semibold text-white shadow-lg transition hover:bg-blue-700"
            >
              Analyze Your First Message
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default HomePage
