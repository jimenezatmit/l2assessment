import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { triageMessage, isUsingMockMode } from '../utils/llmHelper'

function AnalyzePage() {
  const [message, setMessage] = useState('')
  const [results, setResults] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Check for example message from home page
    const exampleMessage = localStorage.getItem('exampleMessage')
    if (exampleMessage) {
      setMessage(exampleMessage)
      localStorage.removeItem('exampleMessage')
    }
  }, [])

  const validate = (text) => {
    const trimmed = text.trim()
    if (!trimmed) return 'Please enter a message to analyze.'
    if (trimmed.split(/\s+/).length < 2) {
      return 'Please enter a more complete message (at least a few words) so triage can be accurate.'
    }
    return ''
  }

  const handleAnalyze = async () => {
    const validationError = validate(message)
    if (validationError) {
      setError(validationError)
      return
    }
    setError('')
    setIsLoading(true)
    setResults(null)

    try {
      // One structured triage call returns category, urgency, routing and escalation.
      const triage = await triageMessage(message)

      const analysisResult = {
        message,
        ...triage,
        timestamp: new Date().toISOString(),
      }

      setResults(analysisResult)

      // Save to history
      const history = JSON.parse(localStorage.getItem('triageHistory') || '[]')
      history.push(analysisResult)
      localStorage.setItem('triageHistory', JSON.stringify(history))
    } catch (err) {
      console.error('Error analyzing message:', err)
      setError('Something went wrong while analyzing the message. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClear = () => {
    setMessage('')
    setResults(null)
    setError('')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Analyze Customer Message</h1>
          <p className="text-gray-600 mb-6">
            Paste a customer support message below to automatically categorize and prioritize.
          </p>

          {isUsingMockMode() && (
            <div className="mb-4 text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3">
              <span className="font-semibold">Heuristic mode:</span> no Groq API key is
              configured, so results come from local keyword/impact rules. Add{' '}
              <code className="bg-amber-100 px-1 rounded">VITE_GROQ_API_KEY</code> for AI-powered triage.
            </div>
          )}

          {/* Input Section */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Customer Message
            </label>
            <textarea
              value={message}
              onChange={(e) => {
                setMessage(e.target.value)
                if (error) setError('')
              }}
              placeholder="Paste customer message here..."
              className="w-full border border-gray-300 rounded-lg p-3 h-40 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            />
            <div className="flex justify-between text-sm mt-1">
              <span className="text-red-600">{error}</span>
              <span className="text-gray-500">{message.length} characters</span>
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

            {results.escalate && (
              <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-300 text-red-800 rounded-lg p-3">
                <span className="text-lg">🚨</span>
                <span className="font-semibold">Escalate now —</span>
                <span>needs immediate human attention, not the normal queue.</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-semibold text-gray-600 mb-1">Category</div>
                  <div className="inline-block bg-blue-100 text-blue-800 px-4 py-2 rounded-lg font-semibold">
                    {results.category}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-600 mb-1">Urgency Level</div>
                  <div className={`inline-block px-4 py-2 rounded-lg font-semibold ${
                    results.urgency === 'High' ? 'bg-red-200 text-red-900' :
                    results.urgency === 'Medium' ? 'bg-yellow-200 text-yellow-900' :
                    'bg-green-200 text-green-900'
                  }`}>
                    {results.urgency}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-600 mb-1">Route To</div>
                  <div className="inline-block bg-indigo-100 text-indigo-800 px-4 py-2 rounded-lg font-semibold">
                    {results.routedTeam}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-600 mb-1">Confidence</div>
                  <div className="inline-block bg-gray-100 text-gray-800 px-4 py-2 rounded-lg font-semibold">
                    {Math.round((results.confidence ?? 0) * 100)}%
                    <span className="ml-2 text-xs font-normal text-gray-500">
                      ({results.source === 'ai' ? 'AI' : 'heuristic'})
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold text-gray-600 mb-1">Recommended Action</div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <p className="text-gray-800">{results.recommendedAction}</p>
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold text-gray-600 mb-1">AI Reasoning</div>
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
                  const text = `Category: ${results.category}\nUrgency: ${results.urgency}\nRoute to: ${results.routedTeam}\nEscalate: ${results.escalate ? 'Yes' : 'No'}\nRecommendation: ${results.recommendedAction}\n\nReasoning: ${results.reasoning}`
                  navigator.clipboard.writeText(text)
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
