const CRITICAL_SIGNALS = ['outage', 'down', 'locked out', 'data loss', 'breach', 'emergency', 'urgent', 'asap'];
const HIGH_SIGNALS = ['not working', 'broken', 'error', 'crash', 'failed', 'cancel', 'refund', 'charged twice'];
const LOW_SIGNALS = ['suggestion', 'feature', 'would love', 'how do i', 'thank', 'thanks'];

export function calculateUrgency(message) {
  const m = message.toLowerCase();
  if (CRITICAL_SIGNALS.some(s => m.includes(s))) return "Critical";
  if (HIGH_SIGNALS.some(s => m.includes(s))) return "High";
  if (LOW_SIGNALS.some(s => m.includes(s))) return "Low";
  return "Medium";
}
