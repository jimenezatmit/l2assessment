import { Fragment, useState } from 'react'
import { URGENCY_RANK, clearComplaint, updateComplaintField, urgencyBadgeClass } from '../utils/complaints'
import { getAvailableCategories } from '../utils/templates'

const URGENCIES = ['High', 'Medium', 'Low']
const ALL_CATEGORIES = getAvailableCategories()

function ComplaintsTable({ complaints, onUpdate }) {
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [urgencyFilter, setUrgencyFilter] = useState('all')
  const [sortField, setSortField] = useState('timestamp')
  const [sortDir, setSortDir] = useState('desc')
  const [expandedId, setExpandedId] = useState(null)

  const visibleComplaints = complaints.filter(c => !c.cleared)
  const categories = [...new Set(visibleComplaints.map(c => c.category))]

  const filtered = visibleComplaints.filter(c =>
    (categoryFilter === 'all' || c.category === categoryFilter) &&
    (urgencyFilter === 'all' || c.urgency === urgencyFilter)
  )

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0
    if (sortField === 'timestamp') {
      cmp = new Date(a.timestamp) - new Date(b.timestamp)
    } else if (sortField === 'category') {
      cmp = a.category.localeCompare(b.category)
    } else if (sortField === 'urgency') {
      cmp = URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency]
    }
    return sortDir === 'asc' ? cmp : -cmp
  })

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const handleClear = (id) => {
    if (!window.confirm('Clear this complaint? It will no longer show up in the table.')) return
    clearComplaint(id)
    if (expandedId === id) setExpandedId(null)
    onUpdate()
  }

  const handleFieldBlur = (id, field, value) => {
    const current = complaints.find(c => c.id === id)
    if (current && current[field] === value) return
    updateComplaintField(id, field, value)
    onUpdate()
  }

  const handleFieldChange = (id, field, value) => {
    updateComplaintField(id, field, value)
    onUpdate()
  }

  const sortIndicator = (field) => (sortField === field ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '')

  const pillClass = (active) =>
    `px-4 py-2 rounded-lg font-semibold text-sm ${
      active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    }`

  return (
    <div>
      {visibleComplaints.length > 0 && (
        <div className="space-y-2 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-gray-600 mr-1">Category:</span>
            <button className={pillClass(categoryFilter === 'all')} onClick={() => setCategoryFilter('all')}>
              All ({visibleComplaints.length})
            </button>
            {categories.map(category => (
              <button
                key={category}
                className={pillClass(categoryFilter === category)}
                onClick={() => setCategoryFilter(category)}
              >
                {category} ({visibleComplaints.filter(c => c.category === category).length})
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-gray-600 mr-1">Urgency:</span>
            <button className={pillClass(urgencyFilter === 'all')} onClick={() => setUrgencyFilter('all')}>
              All ({visibleComplaints.length})
            </button>
            {URGENCIES.map(urgency => (
              <button
                key={urgency}
                className={pillClass(urgencyFilter === urgency)}
                onClick={() => setUrgencyFilter(urgency)}
              >
                {urgency} ({visibleComplaints.filter(c => c.urgency === urgency).length})
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th
                className="px-4 py-2 text-left text-xs font-semibold text-gray-600 cursor-pointer select-none hover:text-gray-900"
                onClick={() => handleSort('timestamp')}
              >
                Date/Time{sortIndicator('timestamp')}
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Message</th>
              <th
                className="px-4 py-2 text-left text-xs font-semibold text-gray-600 cursor-pointer select-none hover:text-gray-900"
                onClick={() => handleSort('category')}
              >
                Category{sortIndicator('category')}
              </th>
              <th
                className="px-4 py-2 text-left text-xs font-semibold text-gray-600 cursor-pointer select-none hover:text-gray-900"
                onClick={() => handleSort('urgency')}
              >
                Urgency{sortIndicator('urgency')}
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Recommended Action</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Action Taken</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Notes</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-gray-500 py-8">
                  {visibleComplaints.length === 0 ? 'No complaints yet' : 'No complaints match the selected filters'}
                </td>
              </tr>
            )}
            {sorted.map(item => (
              <Fragment key={item.id}>
                <tr
                  className="cursor-pointer hover:bg-gray-50 border-t border-gray-200"
                  onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                >
                  <td className="px-4 py-2 whitespace-nowrap text-gray-600">
                    {new Date(item.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-gray-800">
                    "{item.message.substring(0, 80)}{item.message.length > 80 ? '...' : ''}"
                  </td>
                  <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={item.category}
                      onChange={(e) => handleFieldChange(item.id, 'category', e.target.value)}
                      className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-semibold border-0 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      {[...new Set([item.category, ...ALL_CATEGORIES])].map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={item.urgency}
                      onChange={(e) => handleFieldChange(item.id, 'urgency', e.target.value)}
                      className={`text-xs px-2 py-1 rounded-full font-semibold border-0 focus:ring-2 focus:ring-blue-500 cursor-pointer ${urgencyBadgeClass(item.urgency)}`}
                    >
                      {URGENCIES.map(urgency => (
                        <option key={urgency} value={urgency}>{urgency}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    {item.recommendedAction.substring(0, 60)}{item.recommendedAction.length > 60 ? '...' : ''}
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    {item.actionTaken && item.actionTaken.trim() !== '' ? '✅' : '—'}
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    {item.notes && item.notes.trim() !== '' ? '📝' : '—'}
                  </td>
                  <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleClear(item.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-semibold"
                    >
                      Clear
                    </button>
                  </td>
                </tr>
                {expandedId === item.id && (
                  <tr className="bg-gray-50 border-t border-gray-200">
                    <td colSpan={8} className="px-4 py-4">
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
                        <div onClick={(e) => e.stopPropagation()}>
                          <div className="text-xs font-semibold text-gray-600 mb-1">Action Taken</div>
                          <textarea
                            defaultValue={item.actionTaken}
                            onBlur={(e) => handleFieldBlur(item.id, 'actionTaken', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            rows={3}
                            placeholder="Describe what was done to resolve this..."
                          />
                        </div>
                        <div onClick={(e) => e.stopPropagation()}>
                          <div className="text-xs font-semibold text-gray-600 mb-1">Notes</div>
                          <textarea
                            defaultValue={item.notes}
                            onBlur={(e) => handleFieldBlur(item.id, 'notes', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            rows={3}
                            placeholder="Add internal notes..."
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ComplaintsTable
