import { MAX_PACE, MIN_PACE } from './time'

export const STORAGE_KEY = 'pace-nomogram:v1'
export type Theme = 'auto' | 'light' | 'dark'
export interface AppState {
  pace: number
  minPace: number
  maxPace: number
  theme: Theme
  tab: 'nomogram' | 'calculator'
  expression: string
  history: string[]
  customDistance: string
  goalDistance: string
  goalTime: string
}

export const defaults: AppState = {
  pace: 300, minPace: 180, maxPace: 480, theme: 'auto', tab: 'nomogram',
  expression: '', history: [], customDistance: '7,5', goalDistance: '10', goalTime: '50:00',
}

export function restoreState(raw: string | null): AppState {
  if (!raw) return { ...defaults, history: [] }
  try {
    const value = JSON.parse(raw)
    if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...defaults, history: [] }
    const result = { ...defaults, history: [] as string[] }
    if (Number.isInteger(value.minPace) && value.minPace >= MIN_PACE && value.minPace <= MAX_PACE - 60) result.minPace = value.minPace
    if (Number.isInteger(value.maxPace) && value.maxPace <= MAX_PACE && value.maxPace >= result.minPace + 60) result.maxPace = value.maxPace
    if (result.maxPace < result.minPace + 60) result.maxPace = result.minPace + 60
    if (Number.isInteger(value.pace) && value.pace >= MIN_PACE && value.pace <= MAX_PACE) result.pace = value.pace
    result.minPace = Math.min(result.minPace, result.pace)
    result.maxPace = Math.max(result.maxPace, result.pace)
    if (['auto', 'light', 'dark'].includes(value.theme)) result.theme = value.theme
    if (value.tab === 'calculator') result.tab = 'calculator'
    for (const key of ['expression', 'customDistance', 'goalDistance', 'goalTime'] as const) {
      if (typeof value[key] === 'string' && value[key].length <= 512) result[key] = value[key]
    }
    if (Array.isArray(value.history)) result.history = value.history.filter((entry: unknown) => typeof entry === 'string' && entry.length <= 512).slice(0, 12)
    return result
  } catch { return { ...defaults, history: [] } }
}
