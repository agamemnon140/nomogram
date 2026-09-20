import { useEffect, useState } from 'react'
import { checkPace, formatDuration, paceToSpeed, parseDuration, parseNumber, speedToPace } from '../domain/time'

export function Converter({ pace, onChange }: { pace: number; onChange: (pace: number) => void }) {
  const [paceInput, setPaceInput] = useState(formatDuration(pace))
  const [speedInput, setSpeedInput] = useState(paceToSpeed(pace).toLocaleString('pt-BR', { maximumFractionDigits: 3 }))
  const [error, setError] = useState<{ field: 'pace' | 'speed'; text: string } | null>(null)
  useEffect(() => {
    setPaceInput(formatDuration(pace))
    setSpeedInput(paceToSpeed(pace).toLocaleString('pt-BR', { maximumFractionDigits: 3 }))
    setError(null)
  }, [pace])
  function apply(field: 'pace' | 'speed') {
    try {
      const next = checkPace(field === 'pace' ? parseDuration(paceInput) : speedToPace(parseNumber(speedInput)))
      onChange(next)
      setPaceInput(formatDuration(next))
      setSpeedInput(paceToSpeed(next).toLocaleString('pt-BR', { maximumFractionDigits: 3 }))
      setError(null)
    } catch (reason) { setError({ field, text: (reason as Error).message }) }
  }
  return <section className="direct-entry" aria-labelledby="direct-title">
    <h2 id="direct-title">Ou digite um valor</h2>
    <div className="field-grid">
      <form onSubmit={event => { event.preventDefault(); apply('pace') }}>
        <label htmlFor="pace-input">Pace <span>min/km</span></label>
        <input id="pace-input" value={paceInput} inputMode="text" autoComplete="off" spellCheck={false} maxLength={16}
          aria-invalid={error?.field === 'pace'} aria-describedby={error?.field === 'pace' ? 'converter-error' : 'converter-help'}
          onChange={event => { setPaceInput(event.target.value); setError(null) }} />
        <button type="submit" className="secondary">Aplicar pace</button>
      </form>
      <form onSubmit={event => { event.preventDefault(); apply('speed') }}>
        <label htmlFor="speed-input">Velocidade <span>km/h</span></label>
        <input id="speed-input" value={speedInput} inputMode="decimal" autoComplete="off" maxLength={16}
          aria-invalid={error?.field === 'speed'} aria-describedby={error?.field === 'speed' ? 'converter-error' : 'converter-help'}
          onChange={event => { setSpeedInput(event.target.value); setError(null) }} />
        <button type="submit" className="secondary">Aplicar velocidade</button>
      </form>
    </div>
    <p id="converter-help" className="hint">Confirme com Enter ou Aplicar. Pace ajustado ao segundo mais próximo; velocidade aproximada.</p>
    {error && <p id="converter-error" className="error" role="alert">{error.text}</p>}
  </section>
}
