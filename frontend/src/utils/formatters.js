/**
 * Formats a timestamp into a human-readable string.
 * Supports ISO strings, Date objects, Unix timestamps (seconds & milliseconds).
 */
export function formatDateTime(value) {
  if (!value) return '—';

  let date;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'number') {
    // If it's a 10-digit unix timestamp in seconds
    date = value < 1e11 ? new Date(value * 1000) : new Date(value);
  } else if (typeof value === 'string') {
    const num = Number(value);
    if (!isNaN(num) && value.trim().length >= 10 && !value.includes('-')) {
      date = num < 1e11 ? new Date(num * 1000) : new Date(num);
    } else {
      date = new Date(value);
    }
  } else {
    return String(value);
  }

  if (isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * Truncates an ID to a specific length.
 */
export function truncateId(id, length = 8) {
  if (!id) return '—';
  const str = String(id);
  if (str.length <= length) return str;
  return `${str.substring(0, length)}...`;
}
