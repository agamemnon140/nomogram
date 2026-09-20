import { useEffect, useState, type KeyboardEvent } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { defaults, restoreState, STORAGE_KEY, type AppState, type Theme } from './domain/state'
import { checkPace, formatDuration } from './domain/time'
import { Calculator } from './components/Calculator'
import { Converter } from './components/Converter'
import { Nomogram } from './components/Nomogram'
import { RacePlanner } from './components/RacePlanner'

function Settings({ state, patch }: { state: AppState; patch: (values: Partial<AppState>) => void }) {
  function scale(minPace: number, maxPace: number) {
    patch({ minPace, maxPace, pace: Math.max(minPace, Math.min(maxPace, state.pace)) })
  }
  return <details className="settings">
    <summary><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 7h16M4 17h16" /><circle cx="9" cy="7" r="3" className="settings-knob" /><circle cx="15" cy="17" r="3" className="settings-knob" /></svg> Configurações</summary>
    <div className="settings-content">
      <fieldset><legend>Aparência</legend><div className="theme-options">
        {([{ value: 'auto', label: 'Automático' }, { value: 'light', label: 'Claro' }, { value: 'dark', label: 'Escuro' }] as { value: Theme; label: string }[]).map(({ value, label }) => <label key={value}>
          <input type="radio" name="theme" value={value} checked={state.theme === value} onChange={() => patch({ theme: value })} /><span>{label}</span>
        </label>)}
      </div></fieldset>
      <fieldset><legend>Escala do nomograma</legend>
        <label htmlFor="min-pace" className="range-label">Pace mais rápido <strong>{formatDuration(state.minPace)}</strong></label>
        <input id="min-pace" type="range" min={120} max={state.maxPace - 60} step={1} value={state.minPace}
          aria-valuetext={`${formatDuration(state.minPace)} minutos por quilômetro`} onChange={event => scale(Number(event.target.value), state.maxPace)} />
        <label htmlFor="max-pace" className="range-label">Pace mais lento <strong>{formatDuration(state.maxPace)}</strong></label>
        <input id="max-pace" type="range" min={state.minPace + 60} max={900} step={1} value={state.maxPace}
          aria-valuetext={`${formatDuration(state.maxPace)} minutos por quilômetro`} onChange={event => scale(state.minPace, Number(event.target.value))} />
        <div className="scale-presets">
          {[{ label: 'Sprint', min: 150, max: 300 }, { label: 'Corrida', min: 180, max: 480 }, { label: 'Completo', min: 120, max: 900 }].map(preset => <button key={preset.label} type="button"
            aria-pressed={state.minPace === preset.min && state.maxPace === preset.max} onClick={() => scale(preset.min, preset.max)}>{preset.label}<span>{formatDuration(preset.min)}–{formatDuration(preset.max)}</span></button>)}
        </div>
        <p className="hint">Ao reduzir a escala, um pace fora dela é ajustado ao limite mais próximo.</p>
      </fieldset>
    </div>
  </details>
}

export function App() {
  const [state, setState] = useState<AppState>(() => {
    try { return restoreState(localStorage.getItem(STORAGE_KEY)) } catch { return { ...defaults } }
  })
  const [storageFailed, setStorageFailed] = useState(false)
  const [systemDark, setSystemDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches)
  const [online, setOnline] = useState(navigator.onLine)
  const [offlineAvailable, setOfflineAvailable] = useState(false)
  const [pwaFailed, setPwaFailed] = useState(false)
  const { needRefresh: [needRefresh, setNeedRefresh], offlineReady: [offlineReady], updateServiceWorker } = useRegisterSW({
    immediate: true,
    onRegisterError() { setPwaFailed(true) },
  })
  const dark = state.theme === 'dark' || (state.theme === 'auto' && systemDark)
  const patch = (values: Partial<AppState>) => setState(previous => ({ ...previous, ...values }))
  function setPace(value: number) {
    const pace = checkPace(value)
    setState(previous => ({ ...previous, pace, minPace: Math.min(previous.minPace, pace), maxPace: Math.max(previous.maxPace, pace) }))
  }
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); setStorageFailed(false) }
    catch { setStorageFailed(true) }
  }, [state])
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)')
    const change = () => setSystemDark(media.matches)
    media.addEventListener('change', change)
    return () => media.removeEventListener('change', change)
  }, [])
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  }, [dark])
  useEffect(() => {
    const change = () => setOnline(navigator.onLine)
    window.addEventListener('online', change)
    window.addEventListener('offline', change)
    let active = true
    if ('serviceWorker' in navigator) navigator.serviceWorker.ready.then(() => { if (active) setOfflineAvailable(true) }).catch(() => {})
    return () => { active = false; window.removeEventListener('online', change); window.removeEventListener('offline', change) }
  }, [])
  function tabKeys(event: KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const tab = event.key === 'Home' ? 'nomogram' : event.key === 'End' ? 'calculator' : state.tab === 'nomogram' ? 'calculator' : 'nomogram'
    patch({ tab })
    document.getElementById(`tab-${tab}`)?.focus()
  }
  return <div className="app">
    <a className="skip-link" href="#main">Ir para o conteúdo</a>
    <header className="app-header"><a className="brand" href="#main" aria-label="Pace, conversor de corrida"><span className="brand-mark" aria-hidden="true">↗</span><span>Pace<small>Seu ritmo, em números.</small></span></a></header>
    <div className="tabs" role="tablist" aria-label="Ferramentas" onKeyDown={tabKeys}>
      {([{ value: 'nomogram', label: 'Nomograma' }, { value: 'calculator', label: 'Calculadora' }] as const).map(({ value, label }) => <button key={value} type="button"
        id={`tab-${value}`} role="tab" aria-controls={`panel-${value}`} aria-selected={state.tab === value} tabIndex={state.tab === value ? 0 : -1} onClick={() => patch({ tab: value })}>{label}</button>)}
    </div>
    {needRefresh && <aside className="notice" aria-label="Atualização disponível"><p>Uma nova versão está pronta. Seus valores serão mantidos.</p><div className="notice-actions"><button type="button" className="primary" onClick={() => { void updateServiceWorker(true).catch(() => setPwaFailed(true)) }}>Atualizar agora</button><button type="button" className="secondary" onClick={() => setNeedRefresh(false)}>Depois</button></div></aside>}
    {storageFailed && <p role="status" className="notice">O navegador não permitiu salvar os dados. Você pode continuar usando, mas os valores serão perdidos ao fechar.</p>}
    <main id="main" tabIndex={-1}>
      <div id="panel-nomogram" role="tabpanel" aria-labelledby="tab-nomogram" hidden={state.tab !== 'nomogram'}>
        <div className="nomogram-layout">
          <section className="card converter" aria-labelledby="nomogram-title">
            <div className="converter-heading"><p className="eyebrow">ENCONTRE SEU RITMO</p><h1 id="nomogram-title">Pace <span aria-hidden="true">↔</span><span className="sr-only">e</span> velocidade</h1></div>
            <Settings state={state} patch={patch} />
            <Nomogram pace={state.pace} min={state.minPace} max={state.maxPace} onChange={setPace} />
            <Converter pace={state.pace} onChange={setPace} />
          </section>
          <div className="planning-column"><RacePlanner state={state} patch={patch} onPace={setPace} /></div>
        </div>
      </div>
      <div id="panel-calculator" role="tabpanel" aria-labelledby="tab-calculator" hidden={state.tab !== 'calculator'}>
        <Calculator expression={state.expression} history={state.history} onExpression={expression => patch({ expression })} onHistory={history => patch({ history })} />
      </div>
    </main>
    <footer className="app-footer">
      <p role="status">{!online ? 'Você está offline.' : offlineReady || offlineAvailable ? 'Pronto para usar offline.' : 'Conversões no seu navegador.'}</p>
      {pwaFailed && <p>A preparação offline falhou. Reabra quando tiver conexão para tentar novamente.</p>}
      <p>Preferências e histórico ficam neste dispositivo.</p>
    </footer>
  </div>
}
