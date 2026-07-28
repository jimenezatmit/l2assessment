import { useState, useEffect } from 'react'
import { categorizeMessage } from '../utils/llmHelper'
import { calculateUrgency } from '../utils/urgencyScorer'
import { getRecommendedAction } from '../utils/templates'
import AnalysisResultsTable from '../components/AnalysisResultsTable'

function parseBatchMessages(text) {
  try {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(m => typeof m === 'string' && m.trim() !== '')) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

function AnalyzePage() {
  const [inputMode, setInputMode] = useState('single')
  const [message, setMessage] = useState('')
  const [results, setResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  useEffect(() => {
    // Check for example message from home page
    const exampleMessage = localStorage.getItem('exampleMessage')
    if (exampleMessage) {
      setMessage(exampleMessage)
      localStorage.removeItem('exampleMessage')
    }
  }, [])

  const batchMessages = inputMode === 'batch' ? parseBatchMessages(message) : null

  const handleModeChange = (mode) => {
    setInputMode(mode)
    setMessage('')
    setResults([])
  }

  const handleAnalyze = async () => {
    const messagesToAnalyze = inputMode === 'single' ? [message] : batchMessages
    if (!messagesToAnalyze || messagesToAnalyze.length === 0) {
      alert('Please enter a message to analyze')
      return
    }

    setIsLoading(true)
    setResults([])
    setProgress({ current: 0, total: messagesToAnalyze.length })

    try {
      const analysisResults = []

      for (let i = 0; i < messagesToAnalyze.length; i++) {
        const currentMessage = messagesToAnalyze[i]
        setProgress({ current: i + 1, total: messagesToAnalyze.length })

        // Run categorization (LLM call)
        const { category, requiresAction, reasoning } = await categorizeMessage(currentMessage)

        // Calculate urgency (rule-based)
        const urgency = calculateUrgency(currentMessage)

        // Messages that don't need action get their own category, which maps
        // to a "None" recommended action via the templates.
        const finalCategory = requiresAction ? category : "No Action Needed"

        // Get recommended action (template-based)
        const recommendedAction = getRecommendedAction(finalCategory)

        analysisResults.push({
          id: crypto.randomUUID(),
          message: currentMessage,
          category: finalCategory,
          urgency,
          recommendedAction,
          reasoning,
          timestamp: new Date().toISOString(),
          notes: '',
          actionTaken: '',
          cleared: false
        })
      }

      setResults(analysisResults)

      // Save to history
      const history = JSON.parse(localStorage.getItem('triageHistory') || '[]')
      history.push(...analysisResults)
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
    setResults([])
  }

  const analyzeDisabled = isLoading || (inputMode === 'single' ? !message.trim() : !batchMessages)

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Analyze Customer Message</h1>
          <p className="text-gray-600 mb-6">
            Paste a customer support message below to automatically categorize and prioritize.
          </p>

          {/* Mode Toggle */}
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => handleModeChange('single')}
              disabled={isLoading}
              className={`px-4 py-2 rounded-lg font-semibold text-sm ${
                inputMode === 'single' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Single Message
            </button>
            <button
              onClick={() => handleModeChange('batch')}
              disabled={isLoading}
              className={`px-4 py-2 rounded-lg font-semibold text-sm ${
                inputMode === 'batch' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Batch (JSON)
            </button>
          </div>

          {/* Input Section */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {inputMode === 'single' ? 'Customer Message' : 'Customer Messages (JSON array of strings)'}
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={inputMode === 'single'
                ? 'Paste customer message here...'
                : '["First customer message", "Second customer message"]'}
              className="w-full border border-gray-300 rounded-lg p-3 h-40 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              disabled={isLoading}
            />
            {inputMode === 'single' ? (
              <div className="text-sm text-gray-500 mt-1">
                {message.length} characters
              </div>
            ) : (
              <div className={`text-sm mt-1 ${
                !message.trim() ? 'text-gray-500' : batchMessages ? 'text-green-600' : 'text-red-600'
              }`}>
                {!message.trim()
                  ? 'Enter a JSON array of message strings'
                  : batchMessages
                    ? `✓ ${batchMessages.length} message${batchMessages.length === 1 ? '' : 's'} ready to analyze`
                    : 'Invalid JSON — must be a non-empty array of strings'}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={handleAnalyze}
              disabled={analyzeDisabled}
              className={`flex-1 py-3 rounded-lg font-semibold ${
                analyzeDisabled
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
                  {progress.total > 1 ? `Analyzing ${progress.current} of ${progress.total}...` : 'Analyzing...'}
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
        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Analysis Results</h2>
            <AnalysisResultsTable results={results} />
          </div>
        )}
      </div>
    </div>
  )
}

export default AnalyzePage
