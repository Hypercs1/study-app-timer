/**
 * Generates a unique ID string using timestamp + random suffix.
 * Avoids adding a uuid dependency for this simple use case.
 * @returns {string} Unique ID (e.g. "lxyz1234_a3bf9k")
 */
export const generateId = () =>
  Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
