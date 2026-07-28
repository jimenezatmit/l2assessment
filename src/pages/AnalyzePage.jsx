import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { categorizeMessage } from '../utils/llmHelper'
import { scoreUrgency } from '../utils/urgencyScorer'
import { getRecommendedAction, shouldEscalate } from '../utils/templates'

function AnalyzePage() {
  const [message, setMessage] = useState('')
  const [results, setResults] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Check for example message from home page
    const exampleMessage = localStorage.getItem('exampleMessage')
    if (exampleMessage) {
      setMessage(exampleMessage)
      localStorage.removeItem('exampleMessage')
    }
  }, [])

  const handleAnalyze = async () => {
    if (!message.trim()) {
      alert('Please enter a message to analyze')
      return
    }

    setIsLoading(true)
    setResults(null)
    
    try {
      // Run categorization (LLM call, may resolve degraded on failure)
      const { category, reasoning, confidence, source, degraded } = await categorizeMessage(message)

      // Calculate urgency (rule-based)
      const { level: urgency, score: urgencyScore, signals: urgencySignals } = scoreUrgency(message)

      // Get recommended action (routes on category x urgency)
      const recommendedAction = getRecommendedAction(category, urgency)

      // Decide whether this needs a human instead of the automated routing
      const escalation = shouldEscalate({ category, urgency, urgencySignals, confidence, degraded })

      const analysisResult = {
        message,
        category,
        urgency,
        urgencyScore,
        urgencySignals,
        recommendedAction,
        escalation,
        reasoning,
        confidence,
        source,
        degraded,
        timestamp: new Date().toISOString()
      }

      setResults(analysisResult)

      // Save to history
      const history = JSON.parse(localStorage.getItem('triageHistory') || '[]')
      history.push(analysisResult)
      localStorage.setItem('triageHistory', JSON.stringify(history))
    } catch (error) {
      console.error('Error analyzing message:', error)
      alert('Error analyzing message. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClear = () => {
    setMessage('')
    setResults(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Analyze Customer Message</h1>
          <p className="text-gray-600 mb-6">
            Paste a customer support message below to automatically categorize and prioritize.
          </p>

          {/* Input Section */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Customer Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Paste customer message here..."
              className="w-full border border-gray-300 rounded-lg p-3 h-40 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            />
            <div className="text-sm text-gray-500 mt-1">
              {message.length} characters
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={handleAnalyze}
              disabled={isLoading}
              className={`flex-1 py-3 rounded-lg font-semibold ${
                isLoading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Analyzing...
                </span>
              ) : (
                'Analyze Message'
              )}
            </button>
            <button
              onClick={handleClear}
              disabled={isLoading}
              className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Results Section */}
        {results && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Analysis Results</h2>

            {results.degraded && (
              <div className="mb-4 bg-amber-50 border border-amber-300 rounded-lg p-3 text-amber-900 text-sm font-semibold">
                ⚠ AI categorization is unavailable right now. The category and reasoning below are a keyword-based fallback, not a real AI judgment - this ticket has been routed for human review.
              </div>
            )}

            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold text-gray-600 mb-1">Category</div>
                <div className="flex items-center gap-2">
                  <div className="inline-block bg-blue-100 text-blue-800 px-4 py-2 rounded-lg font-semibold">
                    {results.category}
                  </div>
                  {typeof results.confidence === 'number' && (
                    <span className={`text-sm font-medium ${
                      results.confidence < 0.6 ? 'text-amber-700' : 'text-gray-500'
                    }`}>
                      {results.confidence < 0.6 ? '⚠ ' : ''}
                      {Math.round(results.confidence * 100)}% confidence
                      {results.source === 'fallback' ? ' (fallback)' : ''}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold text-gray-600 mb-1">Urgency Level</div>
                <div className="flex items-center gap-2">
                  <div className={`inline-block px-4 py-2 rounded-lg font-semibold ${
                    results.urgency === 'High' ? 'bg-red-200 text-red-900' :
                    results.urgency === 'Medium' ? 'bg-yellow-200 text-yellow-900' :
                    'bg-green-200 text-green-900'
                  }`}>
                    {results.urgency}
                  </div>
                  {typeof results.urgencyScore === 'number' && (
                    <span className="text-sm text-gray-500">score: {results.urgencyScore}</span>
                  )}
                </div>
                {results.urgencySignals?.length > 0 && (
                  <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="text-xs font-semibold text-gray-500 mb-1">Why:</div>
                    <ul className="text-sm text-gray-700 space-y-0.5">
                      {results.urgencySignals.map((signal, i) => (
                        <li key={i}>
                          <span className="font-medium">{signal.label}</span>
                          {signal.phrase && <span className="text-gray-500"> - "{signal.phrase}"</span>}
                          <span className="text-gray-400"> ({signal.weight >= 0 ? '+' : ''}{signal.weight})</span>
                          {signal.note && <span className="text-gray-400 italic"> - {signal.note}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div>
                <div className="text-sm font-semibold text-gray-600 mb-1">Routing</div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-1">
                  <p className="text-gray-800">
                    <span className="font-semibold">{results.recommendedAction.priority}</span>
                    {' -> '}
                    {results.recommendedAction.team}
                    {' '}
                    <span className="text-gray-500">(SLA: {results.recommendedAction.sla})</span>
                  </p>
                  <p className="text-gray-800">{results.recommendedAction.action}</p>
                </div>
              </div>

              {results.escalation?.escalate && (
                <div>
                  <div className="text-sm font-semibold text-gray-600 mb-1">Escalation</div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-900 font-semibold mb-1">Route to a human</p>
                    <ul className="list-disc list-inside text-red-800 text-sm">
                      {results.escalation.reasons.map((reason, i) => (
                        <li key={i}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <div>
                <div className="text-sm font-semibold text-gray-600 mb-1">
                  {results.source === 'fallback' ? 'Fallback Reasoning (AI unavailable)' : 'AI Reasoning'}
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="prose prose-sm max-w-none text-gray-700">
                    <ReactMarkdown>
                      {results.reasoning}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  const { priority, team, sla, action } = results.recommendedAction
                  const escalationText = results.escalation?.escalate
                    ? `\nEscalate to human: yes (${results.escalation.reasons.join('; ')})`
                    : ''
                  const confidenceText = typeof results.confidence === 'number'
                    ? `\nConfidence: ${Math.round(results.confidence * 100)}%${results.source === 'fallback' ? ' (fallback - AI unavailable)' : ''}`
                    : ''
                  const text = `Category: ${results.category}\nUrgency: ${results.urgency}\nRouting: ${priority} -> ${team} (SLA: ${sla})\nAction: ${action}${escalationText}${confidenceText}\n\nReasoning: ${results.reasoning}`
                  navigator.clipboard.writeText(text)
                  alert('Results copied to clipboard!')
                }}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 font-semibold"
              >
                📋 Copy Results
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AnalyzePage
