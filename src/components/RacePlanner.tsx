import { useState } from 'react'
import { checkPace, formatDuration, paceToSpeed, parseDuration, parseNumber, raceTime, targetPace } from '../domain/time'
import type { AppState } from '../domain/state'

export function RacePlanner({ state, patch, onPace }: { state: AppState; patch: (values: Partial<AppState>) => void; onPace: (pace: number) => void }) {
  const [applied, setApplied] = useState(false)
  let custom: string | null = null, customError = ''
  try { custom = formatDuration(raceTime(state.pace, parseNumber(state.customDistance))) }
  catch (reason) { customError = (reason as Error).message }
  let goal: number | null = null, goalError = '', applicable = true
  try {
    goal = targetPace(parseDuration(state.goalTime), parseNumber(state.goalDistance))
    try { checkPace(goal) } catch { applicable = false }
  } catch (reason) { goalError = (reason as Error).message }
  const changeGoal = (values: Partial<AppState>) => { setApplied(false); patch(values) }
  return <>
    <section className="card planner" aria-labelledby="times-title">
      <div className="section-heading"><div><p className="eyebrow">NO SEU RITMO</p><h2 id="times-title">Quanto tempo leva?</h2></div><span className="badge">{formatDuration(state.pace)}/km</span></div>
      <dl className="race-grid">
        {[{ label: '5 km', distance: 5 }, { label: '10 km', distance: 10 }, { label: 'Meia maratona', distance: 21.0975 }, { label: 'Maratona', distance: 42.195 }].map(({ label, distance }) => <div key={label}>
          <dt>{label}</dt><dd data-distance={distance}>{formatDuration(raceTime(state.pace, distance))}</dd>
        </div>)}
      </dl>
      <div className="custom-distance">
        <div><label htmlFor="custom-distance">Outra distância <span>km</span></label><input id="custom-distance" inputMode="decimal" value={state.customDistance} maxLength={16}
          onChange={event => patch({ customDistance: event.target.value })} aria-invalid={!!customError} aria-describedby={customError ? 'distance-error' : undefined} /></div>
        <output htmlFor="custom-distance" aria-live="polite" aria-label="Tempo na distância personalizada">{custom ?? '—'}</output>
      </div>
      {customError && <p className="error" id="distance-error">{customError}</p>}
      <p className="hint">Tempos para pace constante, sem paradas. Meia: 21,0975 km; maratona: 42,195 km.</p>
    </section>
    <section className="card planner" aria-labelledby="goal-title">
      <p className="eyebrow">PLANEJE SUA META</p><h2 id="goal-title">Qual pace preciso?</h2>
      <form onSubmit={event => { event.preventDefault(); if (goal !== null && applicable) { onPace(checkPace(goal)); setApplied(true) } }}>
        <div className="field-grid">
          <div><label htmlFor="goal-distance">Distância <span>km</span></label><input id="goal-distance" inputMode="decimal" value={state.goalDistance} maxLength={16}
            onChange={event => changeGoal({ goalDistance: event.target.value })} aria-describedby={goalError ? 'goal-error' : undefined} /></div>
          <div><label htmlFor="goal-time">Tempo desejado</label><input id="goal-time" value={state.goalTime} placeholder="50:00" maxLength={24}
            onChange={event => changeGoal({ goalTime: event.target.value })} aria-describedby={goalError ? 'goal-error' : 'goal-help'} /></div>
        </div>
        <p className="hint" id="goal-help">Use m:ss ou h:mm:ss. Exemplo: 1:45:00.</p>
        <output className="goal-result" htmlFor="goal-distance goal-time" aria-live="polite">
          {goal === null ? '—' : <><strong>{formatDuration(goal, false)}</strong> min/km <span>≈ {paceToSpeed(goal).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} km/h</span></>}
        </output>
        {goalError && <p className="error" id="goal-error">{goalError}</p>}
        {goal !== null && !applicable && <p className="hint">A meta está fora da escala de 2:00 a 15:00 min/km do mostrador.</p>}
        <button type="submit" className="primary" disabled={goal === null || !applicable}>Usar este pace no nomograma</button>
        {applied && <p role="status" className="hint">Pace aplicado ao mostrador, arredondado ao segundo mais próximo.</p>}
      </form>
    </section>
  </>
}
