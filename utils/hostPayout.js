export const normalizeHostSplit = (value, fallback = 90) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return fallback;
  }

  const clamped = Math.min(Math.max(numericValue, 1), 100);
  return Number(clamped.toFixed(2));
};
