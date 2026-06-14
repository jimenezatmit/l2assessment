import { useState, useEffect } from 'react'
import { categorizeMessage } from '../utils/llmHelper'
import { getRecommendedAction, getRoutingEmail, shouldEscalate } from '../utils/templates'

const priorityStyles = {
  Critical: 'bg-red-100 text-red-800 border border-red-300',
  High: 'bg-orange-100 text-orange-800 border border-orange-300',
  Medium: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
  Low: 'bg-green-100 text-green-800 border border-green-300',
}

const toneStyles = {
  Frustrated: 'bg-red-50 text-red-700',
  Urgent: 'bg-orange-50 text-orange-700',
  Neutral: 'bg-gray-50 text-gray-700',
  Positive: 'bg-green-50 text-green-700',
}

function Badge({ label, className }) {
  return <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${className}`}>{label}</span>
}

function AnalyzePage() {
  const [message, setMessage] = useState('')
  const [results, setResults] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const exampleMessage = localStorage.getItem('exampleMessage')
    if (exampleMessage) {
      setMessage(exampleMessage)
      localStorage.removeItem('exampleMessage')
    }
  }, [])

  const handleAnalyze = async () => {
    if (!message.trim()) return alert('Please enter a message to analyze')
    setIsLoading(true)
    setResults(null)
    try {
      const result = await categorizeMessage(message)
      const recommendedAction = getRecommendedAction(result.category)
      const routingEmail = getRoutingEmail(result.routing)
      const escalate = shouldEscalate(result.category, result.priority, result.urgencyFlag)
      const analysisResult = { message, ...result, recommendedAction, routingEmail, escalate, timestamp: new Date().toISOString() }
      setResults(analysisResult)
      const history = JSON.parse(localStorage.getItem('triageHistory') || '[]')
      history.unshift(analysisResult)
      localStorage.setItem('triageHistory', JSON.stringify(history.slice(0, 100)))
    } catch (error) {
      console.error('Error analyzing message:', error)
      alert('Error analyzing message. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Analyze Customer Message</h1>
          <p className="text-gray-500 mb-6 text-sm">Paste a customer message to categorize, prioritize, and route it automatically.</p>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Customer Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Paste customer message here..."
            className="w-full border border-gray-300 rounded-lg p-3 h-40 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          />
          <div className="text-xs text-gray-400 mt-1 mb-4">{message.length} characters</div>
          <div className="flex space-x-3">
            <button onClick={handleAnalyze} disabled={isLoading} className={`flex-1 py-3 rounded-lg font-semibold ${isLoading ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Analyzing...
                </span>
              ) : 'Analyze Message'}
            </button>
            <button onClick={() => { setMessage(''); setResults(null) }} disabled={isLoading} className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50">Clear</button>
          </div>
        </div>

        {results && (
          <div className="bg-white rounded-lg shadow-md p-6 space-y-5">
            <h2 className="text-xl font-bold text-gray-900">Triage Results</h2>

            {results.escalate && (
              <div className="bg-red-50 border border-red-300 rounded-lg p-4 flex items-center gap-3">
                <span className="text-2xl">🚨</span>
                <div>
                  <div className="font-bold text-red-800">Escalation Required</div>
                  <div className="text-red-700 text-sm">This message needs immediate human attention.</div>
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">AI Summary</div>
              <p className="text-gray-800 font-medium">{results.summary}</p>
            </div>

            <div className="flex flex-wrap gap-4">
              <div>
                <div className="text-xs text-gray-500 mb-1 font-semibold uppercase tracking-wide">Category</div>
                <Badge label={results.category} className="bg-blue-100 text-blue-800 border border-blue-200" />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1 font-semibold uppercase tracking-wide">Priority</div>
                <Badge label={results.priority} className={priorityStyles[results.priority] || priorityStyles.Medium} />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1 font-semibold uppercase tracking-wide">Tone</div>
                <Badge label={results.tone} className={toneStyles[results.tone] || toneStyles.Neutral} />
              </div>
              {results.urgencyFlag && (
                <div>
                  <div className="text-xs text-gray-500 mb-1 font-semibold uppercase tracking-wide">Flag</div>
                  <Badge label="⚠️ Urgent" className="bg-red-100 text-red-800 border border-red-200" />
                </div>
              )}
            </div>

            <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
              <div className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-2">Routing</div>
              <div className="font-semibold text-gray-800">{results.routing}</div>
              <div className="text-sm text-gray-500">{results.routingEmail}</div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recommended Action</div>
              <p className="text-gray-800 text-sm">{results.recommendedAction}</p>
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">AI Reasoning</div>
              <p className="text-gray-600 text-sm italic">{results.reasoning}</p>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <button
                onClick={() => {
                  const text = `TRIAGE REPORT\n\nSummary: ${results.summary}\nCategory: ${results.category}\nPriority: ${results.priority}\nTone: ${results.tone}\nRoute to: ${results.routing} (${results.routingEmail})\nEscalate: ${results.escalate ? 'YES' : 'No'}\n\nRecommended Action:\n${results.recommendedAction}\n\nAI Reasoning:\n${results.reasoning}`
                  navigator.clipboard.writeText(text)
                  alert('Results copied!')
                }}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 font-semibold text-sm"
              >
                📋 Copy Full Report
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AnalyzePage
