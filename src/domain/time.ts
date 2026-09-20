/** Durations and pace use seconds; distances use km; speed uses km/h. */
export const MIN_PACE = 120
export const MAX_PACE = 900

export function parseNumber(text: string): number {
  const normalized = text.trim().replace(',', '.')
  if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(normalized)) throw new Error('Digite um número válido.')
  const value = Number(normalized)
  if (!Number.isFinite(value)) throw new Error('O número é grande demais.')
  return value
}

export function parseDuration(text: string): number {
  const parts = text.trim().replace(/'/g, ':').replace(/"$/, '').split(':')
  if (parts.length < 2 || parts.length > 3 || parts.slice(0, -1).some(p => !/^\d+$/.test(p))) {
    throw new Error('Use m:ss ou h:mm:ss, por exemplo 5:30 ou 1:45:00.')
  }
  const values = parts.map(parseNumber)
  if (values.at(-1)! >= 60 || (values.length === 3 && values[1] >= 60)) {
    throw new Error('Minutos e segundos após : devem ser menores que 60.')
  }
  const seconds = values.length === 3 ? values[0] * 3600 + values[1] * 60 + values[2] : values[0] * 60 + values[1]
  if (!Number.isFinite(seconds) || seconds > Number.MAX_SAFE_INTEGER) throw new Error('O tempo é grande demais.')
  return seconds
}

export function formatDuration(seconds: number, hours = true): string {
  if (!Number.isFinite(seconds)) throw new Error('Tempo inválido.')
  const total = Math.round(Math.abs(seconds))
  const sign = seconds < 0 && total > 0 ? '−' : ''
  const sec = String(total % 60).padStart(2, '0')
  const min = Math.floor(total / 60)
  if (hours && min >= 60) return `${sign}${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}:${sec}`
  return `${sign}${min}:${sec}`
}

export function paceToSpeed(pace: number): number {
  if (!Number.isFinite(pace) || pace <= 0) throw new Error('O pace deve ser maior que zero.')
  return 3600 / pace
}

export function speedToPace(speed: number): number {
  if (!Number.isFinite(speed) || speed <= 0) throw new Error('A velocidade deve ser maior que zero.')
  return 3600 / speed
}

export function checkPace(pace: number): number {
  if (!Number.isFinite(pace) || pace < MIN_PACE || pace > MAX_PACE) {
    throw new Error('Use um pace entre 2:00 e 15:00 min/km (4 a 30 km/h).')
  }
  return Math.round(pace)
}

export function raceTime(pace: number, distance: number): number {
  if (!Number.isFinite(distance) || distance <= 0) throw new Error('A distância deve ser maior que zero.')
  paceToSpeed(pace)
  const result = pace * distance
  if (!Number.isFinite(result) || result > Number.MAX_SAFE_INTEGER) throw new Error('O tempo é grande demais.')
  return result
}

export function targetPace(seconds: number, distance: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error('O tempo deve ser maior que zero.')
  if (!Number.isFinite(distance) || distance <= 0) throw new Error('A distância deve ser maior que zero.')
  const result = seconds / distance
  if (!Number.isFinite(result) || result <= 0) throw new Error('Meta fora do intervalo de cálculo.')
  return result
}
