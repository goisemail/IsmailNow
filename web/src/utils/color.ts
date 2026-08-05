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

export function getContrastingAccentColor(color?: string): string {
  if (!color) return '#6c757d'
  const hex = color.replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return '#6c757d'

  const red = parseInt(hex.slice(0, 2), 16) / 255
  const green = parseInt(hex.slice(2, 4), 16) / 255
  const blue = parseInt(hex.slice(4, 6), 16) / 255
  const maximum = Math.max(red, green, blue)
  const minimum = Math.min(red, green, blue)
  const difference = maximum - minimum
  if (difference === 0) return '#6c757d'

  let hue = 0
  if (maximum === red) hue = ((green - blue) / difference) % 6
  else if (maximum === green) hue = (blue - red) / difference + 2
  else hue = (red - green) / difference + 4

  return `hsl(${Math.round((hue * 60 + 360) % 360)} 72% 46%)`
}
