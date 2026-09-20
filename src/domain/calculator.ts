import { formatDuration, parseDuration } from './time'

export type Quantity = { value: number; kind: 'number' | 'time' }
type Token = { type: 'value'; quantity: Quantity } | { type: 'op'; op: string }

function tokenize(expression: string): Token[] {
  if (expression.length > 512) throw new Error('A expressão é longa demais.')
  const tokens: Token[] = []
  let remaining = expression.replace(/×/g, '*').replace(/[÷]/g, '/').replace(/−/g, '-').replace(/'/g, ':').trim()
  while (remaining) {
    const operator = /^[+\-*/()]/.exec(remaining)
    const value = /^(?:\d+(?:[.,]\d+)?|[.,]\d+)(?::\d+(?:[.,]\d+)?){0,2}"?/.exec(remaining)
    if (operator) {
      tokens.push({ type: 'op', op: operator[0] })
      remaining = remaining.slice(1).trimStart()
    } else if (value) {
      const raw = value[0]
      if (raw.includes(':')) tokens.push({ type: 'value', quantity: { value: parseDuration(raw), kind: 'time' } })
      else {
        if (raw.endsWith('"')) throw new Error('Use : para separar minutos e segundos.')
        tokens.push({ type: 'value', quantity: { value: Number(raw.replace(',', '.')), kind: 'number' } })
      }
      remaining = remaining.slice(raw.length).trimStart()
    } else throw new Error(`Símbolo inválido: ${remaining[0]}.`)
    if (tokens.length > 256) throw new Error('A expressão é longa demais.')
  }
  return tokens
}

/** Recursive descent with complete consumption and explicit duration/scalar units. */
export function calculate(expression: string): Quantity {
  const tokens = tokenize(expression)
  if (!tokens.length) throw new Error('Digite uma expressão.')
  let position = 0
  const at = (op: string) => tokens[position]?.type === 'op' && (tokens[position] as { op: string }).op === op
  function primary(): Quantity {
    if (at('+') || at('-')) {
      const negative = at('-')
      position++
      const result = primary()
      return { ...result, value: result.value * (negative ? -1 : 1) }
    }
    if (at('(')) {
      position++
      const result = sum()
      if (!at(')')) throw new Error('Feche todos os parênteses.')
      position++
      return result
    }
    const token = tokens[position++]
    if (!token || token.type !== 'value') throw new Error('Falta um número ou tempo na expressão.')
    return token.quantity
  }
  function product(): Quantity {
    let left = primary()
    while (at('*') || at('/')) {
      const divide = at('/')
      position++
      const right = primary()
      if (divide && right.value === 0) throw new Error('Não é possível dividir por zero.')
      if (!divide && left.kind === 'time' && right.kind === 'time') throw new Error('Multiplique um tempo por um número, não por outro tempo.')
      if (divide && left.kind === 'number' && right.kind === 'time') throw new Error('Não é possível dividir um número por um tempo nesta calculadora.')
      const kind = divide
        ? left.kind === right.kind ? 'number' : left.kind
        : left.kind === 'time' || right.kind === 'time' ? 'time' : 'number'
      left = { value: divide ? left.value / right.value : left.value * right.value, kind }
      ensureFinite(left)
    }
    return left
  }
  function sum(): Quantity {
    let left = product()
    while (at('+') || at('-')) {
      const subtract = at('-')
      position++
      const right = product()
      if (left.kind !== right.kind) throw new Error('Para somar tempos, use : em ambos (ex.: 5:00 + 1:00).')
      left = { value: subtract ? left.value - right.value : left.value + right.value, kind: left.kind }
      ensureFinite(left)
    }
    return left
  }
  const result = sum()
  if (position !== tokens.length) throw new Error('Confira os operadores e parênteses da expressão.')
  ensureFinite(result)
  return result
}

function ensureFinite(quantity: Quantity) {
  if (!Number.isFinite(quantity.value) || Math.abs(quantity.value) > Number.MAX_SAFE_INTEGER) throw new Error('O resultado é grande demais.')
}

export function formatResult(result: Quantity): string {
  return result.kind === 'time' ? formatDuration(result.value) : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 8 }).format(result.value)
}
