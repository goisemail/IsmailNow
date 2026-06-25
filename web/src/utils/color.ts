export function getReadableTextColor(backgroundColor?: string): '#111827' | '#ffffff' {
  if (!backgroundColor) return '#111827'
  const hex = backgroundColor.replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return '#111827'
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.62 ? '#111827' : '#ffffff'
}
