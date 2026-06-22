export const formatDate = (date: Date | string): string => {
  if (typeof date === 'string') {
    return date
  }
  return date.toISOString().split('T')[0]
}

export const getDateRange = (days: number = 20) => {
  const today = new Date()
  const dates = []
  
  for (let i = -Math.floor(days / 2); i < Math.ceil(days / 2); i++) {
    const date = new Date(today)
    date.setDate(date.getDate() + i)
    dates.push(formatDate(date))
  }
  
  return dates
}

export const formatDateDisplay = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (dateStr === formatDate(today)) {
    return 'Today'
  }

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (dateStr === formatDate(yesterday)) {
    return 'Yesterday'
  }

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (dateStr === formatDate(tomorrow)) {
    return 'Tomorrow'
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export const isToday = (dateStr: string): boolean => {
  return dateStr === formatDate(new Date())
}

export const getWeekStart = (date: Date = new Date()): Date => {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day
  return new Date(d.setDate(diff))
}
