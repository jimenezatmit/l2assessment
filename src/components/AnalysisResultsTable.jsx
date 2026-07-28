import { Fragment, useState } from 'react'
import ReactMarkdown from 'react-markdown'

const PAGE_SIZE = 10

function AnalysisResultsTable({ results }) {
  const [prevResults, setPrevResults] = useState(results)
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState(null)

  // Reset pagination/expansion when a new set of results comes in, without
  // the extra render + lint hit of doing this in a useEffect.
  if (results !== prevResults) {
    setPrevResults(results)
    setPage(1)
    setExpandedId(null)
  }

  const ordered = [...results].reverse()
  const totalPages = Math.max(1, Math.ceil(ordered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageItems = ordered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const handleCopy = (item) => {
    const text = `Category: ${item.category}\nUrgency: ${item.urgency}\nRecommendation: ${item.recommendedAction}\n\nReasoning: ${item.reasoning}`
    navigator.clipboard.writeText(text)
    alert('Results copied to clipboard!')
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Message</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Category</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Urgency</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Recommended Action</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map(item => (
              <Fragment key={item.id}>
                <tr
                  className="cursor-pointer hover:bg-gray-50 border-t border-gray-200"
                  onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                >
                  <td className="px-3 py-1.5 text-gray-800">
                    "{item.message.substring(0, 50)}{item.message.length > 50 ? '...' : ''}"
                  </td>
                  <td className="px-3 py-1.5">
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-semibold">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-3 py-1.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      item.urgency === 'High' ? 'bg-red-200 text-red-900' :
                      item.urgency === 'Medium' ? 'bg-yellow-200 text-yellow-900' :
                      'bg-green-200 text-green-900'
                    }`}>
                      {item.urgency}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-gray-600">
                    {item.recommendedAction.substring(0, 40)}{item.recommendedAction.length > 40 ? '...' : ''}
                  </td>
                </tr>
                {expandedId === item.id && (
                  <tr className="bg-gray-50 border-t border-gray-200">
                    <td colSpan={4} className="px-4 py-4">
                      <div className="space-y-3">
                        <div>
                          <div className="text-xs font-semibold text-gray-600 mb-1">Full Message</div>
                          <div className="text-sm text-gray-800 bg-white p-3 rounded border border-gray-200">
                            {item.message}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-gray-600 mb-1">Recommended Action</div>
                          <div className="text-sm text-gray-800 bg-purple-50 p-3 rounded border border-purple-200">
                            {item.recommendedAction}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-gray-600 mb-1">AI Reasoning</div>
                          <div className="bg-white p-3 rounded border border-gray-200">
                            <div className="prose prose-sm max-w-none text-gray-700">
                              <ReactMarkdown>
                                {item.reasoning}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCopy(item) }}
                          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 font-semibold text-sm"
                        >
                          📋 Copy Result
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 text-sm font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages} ({ordered.length} results)
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 text-sm font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

export default AnalysisResultsTable
