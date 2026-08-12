/**
 * Formats seconds into MM:SS display string.
 * @param {number} secs - Total seconds remaining
 * @returns {string} Formatted time string (e.g. "05:30")
 */
export const formatTime = (secs) => {
  const m = Math.floor(secs / 60)
    .toString()
    .padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};
