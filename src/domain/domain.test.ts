import { describe, expect, it } from 'vitest'
import { calculate, formatResult } from './calculator'
import { checkPace, formatDuration, paceToSpeed, parseDuration, parseNumber, raceTime, speedToPace, targetPace } from './time'
import { defaults, restoreState } from './state'

describe('calculator regressions and units', () => {
  it.each([
    ['4:59+0:00.6', '5:00'], ['59:59+0:00.6', '1:00:00'], ['5:00÷5:00', '1'],
    ['3:55×10', '39:10'], ['1:45:00÷42.195', '2:29'], ['5:30-4:15', '1:15'],
    ['(4:00+5:00)÷2', '4:30'], ['-1+2', '1'], ['-(4:00-5:00)', '1:00'],
    ['1+2*3', '7'], ['10,8/2', '5,4'], ['0:30*2*3', '3:00'], ['0:01-0:02', '−0:01'],
    ["4'30\"*2", '9:00'], ['0/2', '0'],
  ])('%s = %s', (expression, expected) => expect(formatResult(calculate(expression))).toBe(expected))
  it.each(['(1+2', '1+2)', '1..2+3', '4:30:00:15', '2abc+1', '1 2', '2(3)', '1+', '', '()', '2/0', '5:60', '1:60:00', '1:2.5:00', '5:00+1', '2/5:00', '5:00*5:00', '9'.repeat(100)])('rejects %s', expression => expect(() => calculate(expression)).toThrow())
  it('limits expression complexity', () => expect(() => calculate('('.repeat(300) + '1' + ')'.repeat(300))).toThrow())
  it('retains numeric precision independently of formatting', () => expect(calculate('1/3*3').value).toBe(1))
})

describe('pace and race calculations', () => {
  it('converts the complete range reversibly', () => {
    for (let pace = 120; pace <= 900; pace++) {
      expect(speedToPace(paceToSpeed(pace))).toBeCloseTo(pace, 9)
      expect(formatDuration(pace)).not.toMatch(/:60$/)
    }
  })
  it('parses localized values and long durations', () => {
    expect(parseNumber('10,8')).toBe(10.8)
    expect(parseDuration('1:45:00')).toBe(6300)
    expect(parseDuration('105:00')).toBe(6300)
  })
  it('calculates distances and target pace', () => {
    expect(formatDuration(raceTime(300, 5))).toBe('25:00')
    expect(formatDuration(raceTime(300, 10))).toBe('50:00')
    expect(formatDuration(raceTime(300, 42.195))).toBe('3:30:59')
    expect(targetPace(parseDuration('50:00'), 10)).toBe(300)
    expect(targetPace(parseDuration('1:45:00'), 21.0975)).toBeCloseTo(298.61358)
  })
  it('rejects invalid and out-of-range values', () => {
    for (const value of [0, -1, NaN, Infinity]) {
      expect(() => speedToPace(value)).toThrow()
      expect(() => paceToSpeed(value)).toThrow()
      expect(() => raceTime(300, value)).toThrow()
      expect(() => targetPace(value, 10)).toThrow()
    }
    expect(() => checkPace(119)).toThrow()
    expect(() => checkPace(901)).toThrow()
    expect(() => parseDuration('')).toThrow()
    expect(() => parseNumber('1..2')).toThrow()
  })
})

describe('saved state', () => {
  it('round-trips preferences, pace, calculator and goal', () => {
    const state = { ...defaults, pace: 335, theme: 'dark', expression: '4:30*10', history: ['5:00/5:00'], goalTime: '45:00' }
    expect(restoreState(JSON.stringify(state))).toEqual(state)
  })
  it.each(['{bad', 'null', '[]', '123'])('recovers from corrupt data %s', raw => expect(restoreState(raw)).toEqual(defaults))
  it('validates stored types, limits and scale without crashing', () => {
    const result = restoreState(JSON.stringify({ minPace: 840, maxPace: 130, pace: 200, theme: 'invalid', history: [null, {}, '1+2'], expression: {} }))
    expect(result.minPace).toBe(200)
    expect(result.maxPace).toBe(900)
    expect(result.theme).toBe('auto')
    expect(result.history).toEqual(['1+2'])
    expect(result.expression).toBe('')
  })
})
