import { useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { formatDuration, paceToSpeed } from '../domain/time'

const point = (radius: number, angle: number) => ({ x: 200 + radius * Math.cos(angle * Math.PI / 180), y: 200 - radius * Math.sin(angle * Math.PI / 180) })
const arc = (radius: number, start: number, end: number) => {
  const a = point(radius, start), b = point(radius, end)
  return `M ${a.x} ${a.y} A ${radius} ${radius} 0 ${Math.abs(end - start) > 180 ? 1 : 0} 1 ${b.x} ${b.y}`
}

export function Nomogram({ pace, min, max, onChange }: { pace: number; min: number; max: number; onChange: (value: number) => void }) {
  const svg = useRef<SVGSVGElement>(null)
  const dragging = useRef(false)
  const angle = (seconds: number) => 225 - (seconds - min) / (max - min) * 270
  const bounded = (value: number) => onChange(Math.round(Math.max(min, Math.min(max, value))))
  function updateFromPointer(event: PointerEvent<SVGSVGElement>, start = false) {
    const matrix = svg.current?.getScreenCTM()
    if (!matrix) return
    const local = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
    const x = local.x - 200, y = 200 - local.y
    if (start && (Math.hypot(x, y) < 65 || Math.hypot(x, y) > 190)) return
    if (start) {
      dragging.current = true
      event.currentTarget.setPointerCapture(event.pointerId)
      event.currentTarget.focus()
    }
    const degrees = Math.atan2(y, x) * 180 / Math.PI
    const rotation = (225 - degrees + 360) % 360
    const progress = rotation <= 270 ? rotation / 270 : rotation < 315 ? 1 : 0
    bounded(min + progress * (max - min))
  }
  function onKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    const step = event.shiftKey ? 10 : 1
    const values: Record<string, number> = {
      ArrowRight: pace + step, ArrowUp: pace + step, ArrowLeft: pace - step, ArrowDown: pace - step,
      PageUp: pace + 60, PageDown: pace - 60, Home: min, End: max,
    }
    if (event.key in values) { event.preventDefault(); bounded(values[event.key]) }
  }
  const low = Math.max(min, Math.min(max - 20, pace - 10))
  const delta = paceToSpeed(low) - paceToSpeed(low + 20)
  const needleStart = point(98, angle(pace)), needleEnd = point(150, angle(pace))
  const firstTick = Math.ceil(min / 10) * 10
  const ticks = Array.from({ length: Math.floor((max - firstTick) / 10) + 1 }, (_, i) => firstTick + i * 10)
  const speedTicks = Array.from({ length: 61 }, (_, i) => i / 2).filter(speed => speed > 0 && 3600 / speed >= min && 3600 / speed <= max)
  const speedLabels = new Set<number>()
  let previousLabelAngle = -Infinity
  for (const speed of speedTicks.filter(Number.isInteger)) {
    const currentAngle = angle(3600 / speed)
    if ((currentAngle - previousLabelAngle) * Math.PI / 180 * 81 >= 19) {
      speedLabels.add(speed)
      previousLabelAngle = currentAngle
    }
  }
  const tickLabelStep = max - min > 480 ? 120 : 60
  return <>
    <svg ref={svg} className="dial" viewBox="0 0 400 375" role="slider" tabIndex={0}
      aria-label="Pace no nomograma" aria-valuemin={min} aria-valuemax={max} aria-valuenow={pace}
      aria-valuetext={`${formatDuration(pace)} minutos por quilômetro; ${paceToSpeed(pace).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} quilômetros por hora`}
      aria-describedby="dial-help" onKeyDown={onKeyDown}
      onPointerDown={event => updateFromPointer(event, true)} onPointerMove={event => { if (dragging.current) updateFromPointer(event) }}
      onPointerUp={() => { dragging.current = false }} onPointerCancel={() => { dragging.current = false }} onLostPointerCapture={() => { dragging.current = false }}>
      <g aria-hidden="true">
        <path d={arc(148, 225, -45)} className="dial-track" strokeWidth="20" />
        <path d={arc(100, 225, -45)} className="dial-track" strokeWidth="16" />
        {Array.from({ length: 100 }, (_, index) => {
          const progress = index / 99
          const seconds = min + progress * (max - min)
          const sensitivity = (1 / seconds ** 2 - 1 / max ** 2) / (1 / min ** 2 - 1 / max ** 2)
          return <path key={index} d={arc(124, 225 - index / 100 * 270, 225 - (index + 1) / 100 * 270)} fill="none"
            stroke={`hsl(${25 + (1 - sensitivity) * 135} 48% 48%)`} strokeWidth={4 + sensitivity * 12} opacity={0.45 + sensitivity * 0.4} />
        })}
        {ticks.map(seconds => {
          const major = seconds % 60 === 0
          const a = point(major ? 132 : seconds % 30 === 0 ? 138 : 144, angle(seconds)), b = point(148, angle(seconds))
          const label = point(174, angle(seconds))
          return <g key={seconds}><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={major ? 'tick-major' : 'tick-minor'} />
            {seconds % tickLabelStep === 0 && <text x={label.x} y={label.y} className="pace-tick">{formatDuration(seconds)}</text>}</g>
        })}
        {speedTicks.map(speed => {
          const major = Number.isInteger(speed)
          const a = point(100, angle(3600 / speed)), b = point(major ? 112 : 104, angle(3600 / speed)), label = point(81, angle(3600 / speed))
          return <g key={speed}><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={major ? 'tick-major' : 'tick-minor'} />
            {speedLabels.has(speed) && <text x={label.x} y={label.y} className="speed-tick">{speed}</text>}</g>
        })}
        <line x1={needleStart.x} y1={needleStart.y} x2={needleEnd.x} y2={needleEnd.y} className="needle" />
        <circle cx={needleEnd.x} cy={needleEnd.y} r="4" className="needle-dot" />
        <circle cx="200" cy="200" r="4" className="needle-dot" />
        <text x="200" y="155" className="dial-pace">{formatDuration(pace)}</text>
        <text x="200" y="182" className="dial-unit">MIN/KM</text>
        <text x="200" y="229" className="dial-speed">{paceToSpeed(pace).toLocaleString('pt-BR', { maximumFractionDigits: 2, minimumFractionDigits: 1 })}</text>
        <text x="200" y="256" className="dial-unit">KM/H</text>
        <text x="200" y="325" className="sensitivity-value">{delta.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} km/h a cada 20 s/km</text>
        <text x="200" y="346" className="sensitivity-label">Variação entre {formatDuration(low)} e {formatDuration(low + 20)}</text>
      </g>
    </svg>
    <p id="dial-help" className="hint dial-help">Arraste a agulha ou use as setas do teclado.<br />Shift + seta ajusta 10 segundos.</p>
    <div className="pace-steps" aria-label="Ajustar pace">
      {[-60, -10, -1, 1, 10, 60].map(delta => <button type="button" key={delta} onClick={() => bounded(pace + delta)}
        aria-label={`${delta < 0 ? 'Diminuir' : 'Aumentar'} pace em ${Math.abs(delta)} ${Math.abs(delta) === 1 ? 'segundo' : 'segundos'}`}
        disabled={delta < 0 ? pace === min : pace === max}>
        {delta < 0 ? '−' : '+'}{Math.abs(delta) === 60 ? '1 min' : `${Math.abs(delta)} s`}
      </button>)}
    </div>
  </>
}
