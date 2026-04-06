import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import thimbleImg from './assets/thimble-cutout.png'
import sceneBg from './assets/street-scene.png'
import './App.css'

type Phase = 'idle' | 'preview' | 'shuffling' | 'guess' | 'result'

type CupState = {
  id: number
  x: number
}

type Score = {
  wins: number
  losses: number
}

const SHUFFLE_MOVES = 7
const SHUFFLE_STEP_MS = 420
const PREVIEW_MS = 1500

const initialCups = (): CupState[] => [
  { id: 0, x: 0 },
  { id: 1, x: 1 },
  { id: 2, x: 2 },
]

const randomInt = (max: number) => Math.floor(Math.random() * max)

const phaseLabel: Record<Phase, string> = {
  idle: 'Старт',
  preview: 'Показ',
  shuffling: 'Шафл',
  guess: 'Выбор',
  result: 'Итог',
}

const cupHintLabel = ['Левый', 'Центральный', 'Правый']

function App() {
  const [cups, setCups] = useState<CupState[]>(initialCups)
  const [ballCupId, setBallCupId] = useState<number>(1)
  const [phase, setPhase] = useState<Phase>('idle')
  const [round, setRound] = useState(1)
  const [selectedCupId, setSelectedCupId] = useState<number | null>(null)
  const [score, setScore] = useState<Score>({
    wins: 0,
    losses: 0,
  })
  const [status, setStatus] = useState('Нажми старт, я покажу шарик, а потом начну мешать напёрстки.')

  const timeoutRef = useRef<number | null>(null)

  const ballPosition = useMemo(
    () => cups.find((cup) => cup.id === ballCupId)?.x ?? 1,
    [ballCupId, cups],
  )

  const previewCupPosition = useMemo(() => {
    const cup = cups.find((item) => item.id === ballCupId)
    return cup?.x ?? 1
  }, [ballCupId, cups])

  const accuracy = useMemo(() => {
    const total = score.wins + score.losses
    if (!total) return '0%'
    return `${Math.round((score.wins / total) * 100)}%`
  }, [score])

  useEffect(() => {
    const tg = window.Telegram?.WebApp

    if (tg) {
      tg.ready()
      tg.expand()
      tg.setHeaderColor('#120f1f')
      tg.setBackgroundColor('#090613')
    }

    prepareRound()

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const clearTimer = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  const prepareRound = () => {
    clearTimer()
    setCups(initialCups())
    setBallCupId(randomInt(3))
    setSelectedCupId(null)
    setPhase('idle')
    setStatus('Нажми старт, я покажу шарик, а потом начну мешать напёрстки.')
  }

  const startShuffleFlow = () => {
    if (phase === 'preview' || phase === 'shuffling') return

    clearTimer()
    setSelectedCupId(null)
    setCups(initialCups())
    setPhase('preview')
    setStatus(`Смотри внимательно: шарик у напёрстка «${cupHintLabel[previewCupPosition]}».`)

    timeoutRef.current = window.setTimeout(() => {
      shuffleSequence()
    }, PREVIEW_MS)
  }

  const shuffleSequence = () => {
    let movesLeft = SHUFFLE_MOVES
    setPhase('shuffling')
    setStatus('Пошло перемешивание. Следи за движением напёрстков.')

    const step = () => {
      setCups((current) => {
        const next = [...current]
        const first = randomInt(3)
        let second = randomInt(3)

        while (second === first) {
          second = randomInt(3)
        }

        const firstIndex = next.findIndex((cup) => cup.x === first)
        const secondIndex = next.findIndex((cup) => cup.x === second)

        ;[next[firstIndex].x, next[secondIndex].x] = [next[secondIndex].x, next[firstIndex].x]
        return next
      })

      movesLeft -= 1

      if (movesLeft > 0) {
        timeoutRef.current = window.setTimeout(step, SHUFFLE_STEP_MS)
      } else {
        setPhase('guess')
        setStatus('Теперь выбирай. Где шарик?')
      }
    }

    timeoutRef.current = window.setTimeout(step, SHUFFLE_STEP_MS)
  }

  const handleGuess = (cupId: number) => {
    if (phase !== 'guess') return

    const won = cupId === ballCupId
    setSelectedCupId(cupId)
    setPhase('result')
    setStatus(won ? 'Есть попадание. Красиво.' : 'Мимо. Шарик был в другом напёрстке.')
    setScore((current) => ({
      wins: current.wins + (won ? 1 : 0),
      losses: current.losses + (won ? 0 : 1),
    }))
  }

  const nextRound = () => {
    setRound((value) => value + 1)
    prepareRound()
  }

  return (
    <main className="app-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />

      <section className="hero-card">
        <div className="hero-copy">
          <p className="eyebrow">Rocky Balboa Mini App</p>
          <h1>Напёрстки</h1>
          <p className="subtitle">
            Сначала я честно покажу, где лежит шарик. Потом напёрстки начнут двигаться, а ты попробуешь его не потерять.
          </p>

          <div className="hero-badges">
            <span className="hero-badge">Раунд {round}</span>
            <span className={`hero-badge phase-${phase}`}>{phaseLabel[phase]}</span>
            <span className="hero-badge accent">Точность {accuracy}</span>
          </div>
        </div>

        <div className="hero-side">
          <div className="hero-orb" />
          <div className="hero-panel">
            <span>Точность</span>
            <strong>{accuracy}</strong>
            <small>держи темп</small>
          </div>
        </div>
      </section>

      <section className="scoreboard scoreboard-triple">
        <article className="stat-card">
          <span>Побед</span>
          <strong>{score.wins}</strong>
        </article>
        <article className="stat-card">
          <span>Поражений</span>
          <strong>{score.losses}</strong>
        </article>
        <article className="stat-card premium">
          <span>Точность</span>
          <strong>{accuracy}</strong>
        </article>
      </section>

      <section className="table-wrap">
        <div className="status-card">
          <div className={`status-dot ${phase}`} />
          <div>
            <p>{status}</p>
            <small>
              {phase === 'idle'
                ? 'Жми старт, чтобы увидеть шарик перед шафлом.'
                : phase === 'guess'
                  ? 'Тапни по напёрстку.'
                  : 'Смотри внимательно на позицию шарика.'}
            </small>
          </div>
        </div>

        <div className="table-frame">
          <div className="table-lights" />
          <div className="table" style={{ backgroundImage: `linear-gradient(180deg, rgba(14, 15, 14, 0.22), rgba(10, 11, 10, 0.38)), url(${sceneBg})` }}>
            <div className="table-glow" />

            {(phase === 'idle' || phase === 'preview') && (
              <div className="preview-banner">
                Шарик у напёрстка: <strong>{cupHintLabel[previewCupPosition]}</strong>
              </div>
            )}

            {(phase === 'idle' || phase === 'preview' || phase === 'result') && (
              <div className="ball" aria-hidden="true" style={{ ['--slot' as string]: ballPosition } as CSSProperties}>⚪</div>
            )}

            <div className="cups-stage">
              {cups.map((cup) => {
                const revealed = phase === 'result' && cup.id === ballCupId
                const wrongPick = phase === 'result' && selectedCupId === cup.id && selectedCupId !== ballCupId

                return (
                  <button
                    key={cup.id}
                    className={`cup ${revealed ? 'revealed' : ''} ${wrongPick ? 'wrong' : ''} ${phase === 'shuffling' ? 'is-shuffling' : ''}`}
                    style={{ ['--x' as string]: cup.x } as CSSProperties}
                    onClick={() => handleGuess(cup.id)}
                    disabled={phase !== 'guess'}
                  >
                    <span className="cup-shadow" />
                    <img className="thimble-image" src={thimbleImg} alt="" aria-hidden="true" />
                    {phase === 'result' && cup.id === ballCupId && <span className="ball revealed-ball" aria-hidden="true">⚪</span>}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="controls">
        <button className="primary" onClick={phase === 'result' ? nextRound : startShuffleFlow}>
          {phase === 'idle' && 'Старт'}
          {phase === 'preview' && 'Смотри'}
          {phase === 'shuffling' && 'Мешаю...'}
          {phase === 'guess' && 'Выбирай напёрсток'}
          {phase === 'result' && 'Следующий раунд'}
        </button>
        <div className="hint-block">
          <span>Сейчас режим</span>
          <strong>{phaseLabel[phase]}</strong>
        </div>
      </section>
    </main>
  )
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void
        expand: () => void
        setHeaderColor: (color: string) => void
        setBackgroundColor: (color: string) => void
      }
    }
  }
}

export default App
