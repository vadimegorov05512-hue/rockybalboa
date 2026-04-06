import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

type Phase = 'preview' | 'shuffling' | 'guess' | 'result'

type CupState = {
  id: number
  x: number
}

type Score = {
  wins: number
  losses: number
  streak: number
  bestStreak: number
}

const SHUFFLE_MOVES = 7
const SHUFFLE_STEP_MS = 420
const PREVIEW_MS = 1400

const initialCups = (): CupState[] => [
  { id: 0, x: 0 },
  { id: 1, x: 1 },
  { id: 2, x: 2 },
]

const randomInt = (max: number) => Math.floor(Math.random() * max)

const phaseLabel: Record<Phase, string> = {
  preview: 'Показ',
  shuffling: 'Шафл',
  guess: 'Выбор',
  result: 'Итог',
}

function App() {
  const [cups, setCups] = useState<CupState[]>(initialCups)
  const [ballCupId, setBallCupId] = useState<number>(1)
  const [phase, setPhase] = useState<Phase>('preview')
  const [round, setRound] = useState(1)
  const [selectedCupId, setSelectedCupId] = useState<number | null>(null)
  const [score, setScore] = useState<Score>({
    wins: 0,
    losses: 0,
    streak: 0,
    bestStreak: 0,
  })
  const [status, setStatus] = useState('Следи за шариком. Сейчас начнется перемешивание.')

  const timeoutRef = useRef<number | null>(null)

  const ballPosition = useMemo(
    () => cups.find((cup) => cup.id === ballCupId)?.x ?? 1,
    [ballCupId, cups],
  )

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
  }, [])

  useEffect(() => {
    startRound()

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

  const schedule = (callback: () => void, delay: number) => {
    clearTimer()
    timeoutRef.current = window.setTimeout(callback, delay)
  }

  const startRound = () => {
    clearTimer()
    setCups(initialCups())
    setBallCupId(randomInt(3))
    setSelectedCupId(null)
    setPhase('preview')
    setStatus('Следи за шариком. Сейчас начнется перемешивание.')

    schedule(() => {
      shuffleSequence()
    }, PREVIEW_MS)
  }

  const shuffleSequence = () => {
    let movesLeft = SHUFFLE_MOVES
    setPhase('shuffling')
    setStatus('Перемешиваю... не теряй шарик из виду.')

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
        setStatus('Выбирай наперсток. Где шарик?')
      }
    }

    timeoutRef.current = window.setTimeout(step, SHUFFLE_STEP_MS)
  }

  const handleGuess = (cupId: number) => {
    if (phase !== 'guess') return

    const won = cupId === ballCupId
    setSelectedCupId(cupId)
    setPhase('result')
    setStatus(won ? 'Есть попадание. Красиво.' : 'Мимо. Шарик был в другом наперстке.')
    setScore((current) => {
      const streak = won ? current.streak + 1 : 0
      return {
        wins: current.wins + (won ? 1 : 0),
        losses: current.losses + (won ? 0 : 1),
        streak,
        bestStreak: Math.max(current.bestStreak, streak),
      }
    })
  }

  const nextRound = () => {
    setRound((value) => value + 1)
    startRound()
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
            Не про деньги. Про внимание, нервы и чувство ритма. Следи за шариком и не дай себя обмануть.
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
            <span>Лучшая серия</span>
            <strong>{score.bestStreak}</strong>
            <small>держи темп</small>
          </div>
        </div>
      </section>

      <section className="scoreboard">
        <article className="stat-card">
          <span>Побед</span>
          <strong>{score.wins}</strong>
        </article>
        <article className="stat-card">
          <span>Поражений</span>
          <strong>{score.losses}</strong>
        </article>
        <article className="stat-card">
          <span>Серия</span>
          <strong>{score.streak}</strong>
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
            <small>Тапни по напёрстку, когда начнется фаза выбора.</small>
          </div>
        </div>

        <div className="table-frame">
          <div className="table-lights" />
          <div className="table">
            <div className="table-glow" />
            {phase === 'preview' && <div className="ball" style={{ ['--slot' as string]: ballPosition }} />}

            <div className="cups-row">
              {cups
                .slice()
                .sort((a, b) => a.x - b.x)
                .map((cup, index) => {
                  const revealed = phase === 'result' && cup.id === ballCupId
                  const wrongPick = phase === 'result' && selectedCupId === cup.id && selectedCupId !== ballCupId

                  return (
                    <button
                      key={cup.id}
                      className={`cup slot-${index} ${revealed ? 'revealed' : ''} ${wrongPick ? 'wrong' : ''} ${phase === 'shuffling' ? 'is-shuffling' : ''}`}
                      onClick={() => handleGuess(cup.id)}
                      disabled={phase !== 'guess'}
                    >
                      <span className="cup-shadow" />
                      <span className="cup-handle" />
                      <span className="cup-body" />
                      <span className="cup-rim" />
                      {phase === 'result' && cup.id === ballCupId && <span className="ball revealed-ball" />}
                    </button>
                  )
                })}
            </div>
          </div>
        </div>
      </section>

      <section className="controls">
        <button className="primary" onClick={nextRound}>
          {phase === 'result' ? 'Следующий раунд' : 'Начать заново'}
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
