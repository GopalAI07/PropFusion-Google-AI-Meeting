/**
 * Get initials from a name string
 * @param {string} name
 * @returns {string}
 */
export function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

/**
 * Generate a consistent color from a string (e.g., email)
 * @param {string} str
 * @returns {string}
 */
export function stringToColor(str) {
  if (!str) return '#6366f1';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
    '#f43f5e', '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#14b8a6', '#06b6d4', '#3b82f6',
  ];
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Format a date string to a readable format
 * @param {string|Date} date
 * @param {object} options
 * @returns {string}
 */
export function formatDate(date, options = {}) {
  if (!date) return 'N/A';
  const d = new Date(date);
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  };
  return d.toLocaleDateString('en-US', defaultOptions);
}

/**
 * Format time duration in minutes to human-readable string
 * @param {number} minutes
 * @returns {string}
 */
export function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return '0 min';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins} min`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

/**
 * Truncate text with ellipsis
 * @param {string} text
 * @param {number} maxLength
 * @returns {string}
 */
export function truncateText(text, maxLength = 100) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Get status color class for meeting status
 * @param {string} status
 * @returns {string}
 */
/**
 * Format a status value (e.g. "in_progress") into a readable label (e.g. "In Progress")
 * @param {string} status
 * @returns {string}
 */
export function formatStatusLabel(status) {
  if (!status) return '';
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function getStatusColor(status) {
  const statusMap = {
    scheduled: 'bg-blue-500/15 text-blue-300 border border-blue-400/30',
    in_progress: 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/30',
    paused: 'bg-amber-500/15 text-amber-300 border border-amber-400/30',
    completed: 'bg-white/10 text-gray-300 border border-white/15',
    cancelled: 'bg-red-500/15 text-red-300 border border-red-400/30',
  };
  return statusMap[status] || 'bg-white/10 text-gray-300 border border-white/15';
}

/**
 * Class name merge utility (simplified version of clsx + tailwind-merge)
 * @param  {...any} classes
 * @returns {string}
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}