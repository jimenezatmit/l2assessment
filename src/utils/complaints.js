const STORAGE_KEY = 'triageHistory'

// Ensures every record has a stable id and a notes field, backfilling
// legacy records and persisting the migration back to localStorage.
export function loadComplaints() {
  const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  let didMigrate = false

  const migrated = raw.map(item => {
    if (item.id && item.notes !== undefined && item.actionTaken !== undefined &&
        item.cleared !== undefined) return item
    didMigrate = true
    return {
      ...item,
      id: item.id || crypto.randomUUID(),
      notes: item.notes ?? '',
      actionTaken: item.actionTaken ?? '',
      cleared: item.cleared ?? false
    }
  })

  if (didMigrate) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated))
  }
  return migrated
}

export function saveComplaints(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

// Marks a complaint as cleared instead of deleting it, so it drops off the
// table view while the underlying record is kept.
export function clearComplaint(id) {
  return updateComplaintField(id, 'cleared', true)
}

export function updateComplaintField(id, field, value) {
  const list = loadComplaints().map(item =>
    item.id === id ? { ...item, [field]: value } : item
  )
  saveComplaints(list)
  return list
}

export const URGENCY_RANK = { High: 3, Medium: 2, Low: 1 }

export function urgencyBadgeClass(urgency) {
  if (urgency === 'High') return 'bg-red-200 text-red-900'
  if (urgency === 'Medium') return 'bg-yellow-200 text-yellow-900'
  return 'bg-green-200 text-green-900'
}
