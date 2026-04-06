import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import thimbleImg from './assets/thimble-new-cutout.png'
import sceneBg from './assets/street-scene-vertical.jpg'
import ballImg from './assets/ball-cutout.png'
import './App.css'

type Phase = 'idle' | 'preview' | 'shuffling' | 'guess' | 'result'
type Tab = 'game' | 'stats'

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
  const [activeTab, setActiveTab] = useState<Tab>('game')
  const isStatsTab = activeTab === 'stats'
  const [round, setRound] = useState(1)
  const [selectedCupId, setSelectedCupId] = useState<number | null>(null)
  const [score, setScore] = useState<Score>({
    wins: 0,
    losses: 0,
  })
  const [, setStatus] = useState('Нажми старт, я покажу шарик, а потом начну мешать напёрстки.')
  const [showIntro, setShowIntro] = useState(true)
  const resultWon = phase === 'result' && selectedCupId === ballCupId

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
      tg.setHeaderColor('#171513')
      tg.setBackgroundColor('#111311')
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
    setShowIntro(false)
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
    <main className="app-shell full-screen-app">
      <div className="scene-background" style={{ backgroundImage: `url(${sceneBg})` }} />
      <div className="scene-overlay" />

      <section className="top-tabs-card compact-top-card">
        <div className="top-strip">
          <div className="round-badge">Раунд {round}</div>
        </div>
      </section>

      {!isStatsTab ? (
        <section className="game-panel">
          {showIntro && (
            <div className="status-card mobile-status-card floating-panel">
              <div className={`status-dot ${phase}`} />
              <div>
                <p>Нажми старт, я покажу шарик, а потом начну мешать напёрстки.</p>
                <small>Инструкция показывается только один раз.</small>
              </div>
            </div>
          )}

          <div className="game-scene-block">
            <div className={`phase-banner ${phase} ${phase === 'result' ? (resultWon ? 'win' : 'lose') : ''}`}>
              {phase === 'idle' && 'Нажми «Старт», чтобы начать раунд'}
              {phase === 'preview' && `Смотри: шарик под напёрстком «${cupHintLabel[previewCupPosition]}»`}
              {phase === 'shuffling' && 'Напёрстки перемешиваются... следи внимательно'}
              {phase === 'guess' && 'Выбирай напёрсток, где шарик'}
              {phase === 'result' && (resultWon ? '✅ Ты выиграл, шарик угадан' : '❌ Мимо, шарик был в другом напёрстке')}
            </div>
            {(phase === 'idle' || phase === 'preview') && (
              <div className="preview-banner mobile-preview-banner">
                Шарик у напёрстка: <strong>{cupHintLabel[previewCupPosition]}</strong>
              </div>
            )}

            {(phase === 'idle' || phase === 'preview') && (
              <img className="ball ball-image" src={ballImg} alt="" aria-hidden="true" style={{ ['--slot' as string]: ballPosition } as CSSProperties} />
            )}

            <div className="cups-stage mobile-cups-stage">
              {cups.map((cup) => {
                const revealed = phase === 'result' && cup.id === ballCupId
                const wrongPick = phase === 'result' && selectedCupId === cup.id && selectedCupId !== ballCupId

                return (
                  <button
                    key={cup.id}
                    className={`cup mobile-cup ${revealed ? 'revealed' : ''} ${wrongPick ? 'wrong' : ''} ${phase === 'shuffling' ? 'is-shuffling' : ''}`}
                    style={{ ['--x' as string]: cup.x } as CSSProperties}
                    onClick={() => handleGuess(cup.id)}
                    disabled={phase !== 'guess'}
                  >
                    <span className="cup-shadow" />
                    <img className="thimble-image mobile-thimble-image" src={thimbleImg} alt="" aria-hidden="true" />
                    {phase === 'result' && cup.id === ballCupId && (
                      <img className="ball revealed-ball ball-image" src={ballImg} alt="" aria-hidden="true" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="game-bottom-spacer" />
        </section>
      ) : (
        <section className="stats-panel floating-panel">
          <div className="stats-grid-single">
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
          </div>
        </section>
      )}
      <div className="persistent-tabs floating-panel unified-bottom-dock">
        {!isStatsTab && (
          <>
            <button className="primary mobile-primary" onClick={phase === 'result' ? nextRound : startShuffleFlow}>
              {phase === 'idle' && 'Старт'}
              {phase === 'preview' && 'Смотри'}
              {phase === 'shuffling' && 'Мешаю...'}
              {phase === 'guess' && 'Выбирай напёрсток'}
              {phase === 'result' && 'Следующий раунд'}
            </button>

            <div className="hint-block mobile-hint-block dock-hint-block">
              <span>Сейчас режим</span>
              <strong>{phaseLabel[phase]}</strong>
            </div>
          </>
        )}

        <div className="telegram-tabs bottom-tabs dock-tabs">
          <button
            type="button"
            className={`telegram-tab ${!isStatsTab ? 'active' : ''}`}
            onClick={() => setActiveTab('game' as Tab)}
          >
            Игра
          </button>
          <button
            type="button"
            className={`telegram-tab ${isStatsTab ? 'active' : ''}`}
            onClick={() => setActiveTab('stats' as Tab)}
          >
            Статистика
          </button>
        </div>
      </div>
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
