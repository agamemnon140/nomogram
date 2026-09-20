import { useRef, useState } from 'react'
import { calculate, formatResult, type Quantity } from '../domain/calculator'

const examples = [
  { expression: '3:55×10', label: 'Pace × distância' },
  { expression: '1:45:00÷42.195', label: 'Tempo ÷ distância' },
  { expression: '5:30−4:15', label: 'Diferença de tempos' },
  { expression: '(4:00+5:00)÷2', label: 'Média de tempos' },
]
const keys = ['C', '⌫', '(', ')', '7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '0', ':', ',', '+']

export function Calculator({ expression, history, onExpression, onHistory }: {
  expression: string; history: string[]; onExpression: (value: string) => void; onHistory: (value: string[]) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [submitted, setSubmitted] = useState(false)
  const [saved, setSaved] = useState(false)
  let result: Quantity | null = null, error = ''
  try { result = calculate(expression) } catch (reason) { error = (reason as Error).message }
  const change = (value: string) => { onExpression(value.slice(0, 512)); setSubmitted(false); setSaved(false) }
  function key(value: string) {
    if (value === 'C') { change(''); return }
    const start = input.current?.selectionStart ?? expression.length
    const end = input.current?.selectionEnd ?? expression.length
    const before = value === '⌫' && start === end ? Math.max(0, start - 1) : start
    const inserted = value === '⌫' ? '' : value
    change(expression.slice(0, before) + inserted + expression.slice(end))
    requestAnimationFrame(() => { input.current?.setSelectionRange(before + inserted.length, before + inserted.length) })
  }
  function submit() {
    setSubmitted(true)
    if (!result) return
    onHistory([expression, ...history.filter(entry => entry !== expression)].slice(0, 12))
    setSaved(true)
  }
  return <section className="card calculator" aria-labelledby="calculator-title">
    <p className="eyebrow">TEMPOS E NÚMEROS</p><h1 id="calculator-title">Calculadora</h1>
    <form onSubmit={event => { event.preventDefault(); submit() }}>
      <label htmlFor="expression">Expressão</label>
      <input ref={input} id="expression" className="expression-input" value={expression} onChange={event => change(event.target.value)}
        maxLength={512} autoComplete="off" spellCheck={false} placeholder="4:30 × 10" aria-describedby="calculator-help"
        aria-invalid={submitted && !!error} />
      <div className="calculation-result" aria-live="polite">
        <output htmlFor="expression" data-testid="calculation-result">{result ? formatResult(result) : '—'}</output>
        {result && <span>{result.kind === 'time' ? 'tempo · m:ss ou h:mm:ss' : 'resultado numérico'}</span>}
      </div>
      {error && expression && <p className="error" id="calculation-error" role={submitted ? 'alert' : undefined}>{error}</p>}
      {submitted && !expression && <p className="error" role="alert">Digite uma expressão.</p>}
      <div className="keypad">
        {keys.map(value => <button key={value} type="button" className={['÷', '×', '−', '+'].includes(value) ? 'operator' : ''}
          onMouseDown={event => event.preventDefault()} onClick={() => key(value)}
          aria-label={value === 'C' ? 'Limpar expressão' : value === '⌫' ? 'Apagar último caractere' : value === '÷' ? 'Dividir' : value === '×' ? 'Multiplicar' : value === '−' ? 'Subtrair' : value === '+' ? 'Somar' : value}>{value}</button>)}
      </div>
      <button className="primary calculate-button" type="submit">= <span>Calcular e guardar</span></button>
      {saved && <p className="hint" role="status">Cálculo salvo no histórico.</p>}
      <p className="hint" id="calculator-help">Use : para tempos (4:30 = 4 min 30 s) e vírgula ou ponto para decimais. Tempo ÷ tempo resulta em um número. A expressão é mantida para preservar a precisão.</p>
    </form>
    <h2 className="small-heading">Experimente</h2>
    <div className="examples">{examples.map(example => <button type="button" key={example.expression} onClick={() => change(example.expression)}>
      <strong>{example.expression}</strong><span>{example.label}</span>
    </button>)}</div>
    {history.length > 0 && <section aria-labelledby="history-title">
      <div className="section-heading history-heading"><h2 id="history-title">Histórico</h2><button type="button" className="text-button" onClick={() => { onHistory([]); setSaved(false) }}>Limpar histórico</button></div>
      <ul className="history">{history.map((entry, index) => {
        let formatted: string
        try { formatted = formatResult(calculate(entry)) } catch { return null }
        return <li key={`${index}:${entry}`}><button type="button" onClick={() => change(entry)} aria-label={`Reutilizar ${entry}, resultado ${formatted}`}><span>{entry}</span><strong>{formatted}</strong></button></li>
      })}</ul>
    </section>}
  </section>
}
