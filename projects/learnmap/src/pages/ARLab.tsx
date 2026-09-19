import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BatteryMedium, Camera, CheckCircle2, Play, RotateCcw, XCircle } from 'lucide-react';
import { useApp } from '../hooks/useApp';
import { api } from '../services/api';
import {
  AR_MISSIONS,
  BONUS_MISSIONS,
  type ARMission,
  isCorrect,
  requiredTime,
  simulatedTravelRatio,
  speedInMetersPerSecond,
} from '../features/ar-lab/missions';

type Stage = 'intro' | 'question' | 'running' | 'result' | 'complete';

function makeSessionId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'ar-' + Date.now();
}

function DroneMark() {
  return (
    <svg viewBox="0 0 120 64" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round">
        <path d="M42 32h36M60 21v22M36 24 20 13M84 24l16-11M36 40 20 51M84 40l16 11" />
        <circle cx="17" cy="11" r="8" />
        <circle cx="103" cy="11" r="8" />
        <circle cx="17" cy="53" r="8" />
        <circle cx="103" cy="53" r="8" />
      </g>
      <rect x="48" y="24" width="24" height="16" rx="6" fill="currentColor" />
    </svg>
  );
}

export function ARLab() {
  const { t, lang, user } = useApp();
  const [stage, setStage] = useState<Stage>('intro');
  const [index, setIndex] = useState(0);
  const [bonus, setBonus] = useState(false);
  const [choice, setChoice] = useState('');
  const [progress, setProgress] = useState(0);
  const [cameraState, setCameraState] = useState<'idle' | 'on' | 'fallback'>('idle');
  const [cameraError, setCameraError] = useState('');
  const [score, setScore] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAt = useRef(Date.now());
  const sid = useRef(makeSessionId());
  const missions = bonus ? BONUS_MISSIONS : AR_MISSIONS;
  const mission: ARMission = missions[index];

  const trackEvent = (event: string, dedupe: string, seconds = 0) =>
    api('/telemetry/ar', 'POST', {
      event,
      session: sid.current,
      dedupe: sid.current + ':' + dedupe,
      seconds,
    }).catch(() => undefined);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((item) => item.stop());
    streamRef.current = null;
  };

  useEffect(() => stopCamera, []);

  async function enableCamera() {
    setCameraError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraState('on');
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
    } catch {
      setCameraState('fallback');
      setCameraError(
        t(
          'Camera is unavailable, so LearnMap switched to simulation mode. The mission still works.',
          'Камера недоступна, тому LearnMap перейшов у режим симуляції. Місія все одно працює.',
        ),
      );
    }
  }

  async function acceptMission() {
    if (user?.privacy?.pilot && !user.privacy.granted) return;
    await enableCamera();
    setStage('question');
    startedAt.current = Date.now();
    void trackEvent('ar_mission_started', mission.id + ':started');
  }

  function choose(id: string) {
    if (stage !== 'question') return;
    setChoice(id);
    void trackEvent('prediction_submitted', mission.id + ':prediction');
    if (isCorrect(mission, id)) void trackEvent('prediction_correct', mission.id + ':correct');
  }

  function launch() {
    if (!choice || stage !== 'question') return;
    setStage('running');
    setProgress(0);
    const target = simulatedTravelRatio(mission);
    const duration = 2200;
    const start = performance.now();
    const tick = (now: number) => {
      const part = Math.min(1, (now - start) / duration);
      setProgress(target * part);
      if (part < 1) {
        requestAnimationFrame(tick);
      } else {
        if (isCorrect(mission, choice)) setScore((current) => current + 1);
        setStage('result');
        void trackEvent(
          'mission_completed',
          mission.id + ':completed',
          Math.round((Date.now() - startedAt.current) / 1000),
        );
      }
    };
    requestAnimationFrame(tick);
  }

  function nextMission() {
    void trackEvent('next_mission_clicked', mission.id + ':next');
    if (index + 1 >= missions.length) {
      setStage('complete');
      return;
    }
    const next = missions[index + 1];
    setIndex((current) => current + 1);
    setChoice('');
    setProgress(0);
    setStage('question');
    startedAt.current = Date.now();
    void trackEvent('ar_mission_started', next.id + ':started');
  }

  function continueVoluntarily() {
    void trackEvent('voluntary_continue', 'main:continue');
    setBonus(true);
    setIndex(0);
    setChoice('');
    setProgress(0);
    setStage('question');
    startedAt.current = Date.now();
    void trackEvent('ar_mission_started', BONUS_MISSIONS[0].id + ':started');
  }

  function restart() {
    sid.current = makeSessionId();
    setBonus(false);
    setIndex(0);
    setChoice('');
    setProgress(0);
    setScore(0);
    setStage('intro');
    stopCamera();
    setCameraState('idle');
    setCameraError('');
  }

  const correct = choice ? isCorrect(mission, choice) : false;
  const actualTime = useMemo(() => requiredTime(mission), [mission]);
  const effectiveSpeed = useMemo(() => speedInMetersPerSecond(mission), [mission]);

  return (
    <div className="ar-lab-page">
      <header className="ar-lab-heading">
        <div>
          <span className="ar-kicker">LearnMap AR Lab · Physics</span>
          <h1>{t('Land the drone', 'Посади дрон')}</h1>
          <p>
            {t(
              'Kinematics hidden inside a short mission. Predict first — then watch the experiment.',
              'Кінематика всередині короткої місії. Спочатку прогноз — потім експеримент.',
            )}
          </p>
        </div>
        <Link className="text-link" to="/today">
          {t('Back to today', 'Назад до плану')}
        </Link>
      </header>

      {user?.privacy?.pilot && !user.privacy.granted ? (
        <section className="panel ar-consent-gate">
          <h2>{t('Parent consent is required', 'Потрібна згода батьків')}</h2>
          <p>
            {t(
              'AR Lab uses the camera only on this device. LearnMap does not upload the camera video in this prototype.',
              'AR Lab використовує камеру лише на цьому пристрої. У цьому прототипі LearnMap не завантажує відео з камери.',
            )}
          </p>
          <Link className="button" to="/settings">
            {t('Open settings', 'Відкрити налаштування')}
          </Link>
        </section>
      ) : (
        <section className="ar-stage">
          <div className={'ar-viewport ' + (cameraState === 'fallback' ? 'simulation' : '')}>
            {cameraState === 'on' ? (
              <video ref={videoRef} autoPlay muted playsInline aria-label="AR camera preview" />
            ) : (
              <div className="ar-fallback-grid" aria-hidden="true" />
            )}

            <div className="ar-top-hud">
              <span>
                MISSION {bonus ? 'B' : ''}
                {index + 1}/{missions.length}
              </span>
              <span className="ar-battery">
                <BatteryMedium size={18} />
                {mission.availableTime}s
              </span>
            </div>

            <div className="ar-world" aria-label="Drone mission simulation">
              <div className="ar-distance-label">
                {mission.distance} m · {mission.speed} {mission.speedUnit || 'm/s'}
              </div>
              <div className="ar-flight-line">
                <span
                  className="ar-drone"
                  style={{ left: 'calc(' + Math.max(0.02, progress) * 82 + '% - 34px)' }}
                >
                  <DroneMark />
                </span>
                <span className="ar-pad">
                  <i />
                  <b>H</b>
                </span>
              </div>
              <div className="ar-scale">
                <span>0 m</span>
                <span>{mission.distance} m</span>
              </div>
            </div>

            {stage === 'intro' && (
              <div className="ar-modal-card">
                <Camera size={28} />
                <h2>{t('Emergency landing', 'Аварійна посадка')}</h2>
                <p>
                  {t(
                    'Use your phone camera and solve five short flight decisions. No object recognition yet — this MVP tests the learning mechanic first.',
                    'Використай камеру телефона й прийми п’ять коротких льотних рішень. Розпізнавання предметів поки немає — цей MVP спочатку перевіряє саму навчальну механіку.',
                  )}
                </p>
                <button className="button" onClick={() => void acceptMission()}>
                  {t('ACCEPT MISSION', 'ПРИЙНЯТИ МІСІЮ')}
                </button>
              </div>
            )}

            {(stage === 'question' || stage === 'running' || stage === 'result') && (
              <div className="ar-question-card">
                <p className="ar-question">{mission.prompt[lang]}</p>
                {stage === 'question' && (
                  <>
                    <div className="ar-choices">
                      {mission.choices.map((option) => (
                        <button
                          key={option.id}
                          className={choice === option.id ? 'selected' : ''}
                          onClick={() => choose(option.id)}
                        >
                          {option[lang]}
                        </button>
                      ))}
                    </div>
                    <button className="button ar-launch" disabled={!choice} onClick={launch}>
                      <Play size={17} />
                      {t('LAUNCH', 'ЗАПУСК')}
                    </button>
                  </>
                )}
                {stage === 'running' && (
                  <div className="ar-running">
                    <span>{t('Flight in progress…', 'Політ триває…')}</span>
                    <b>{Math.round(progress * mission.distance)} m</b>
                  </div>
                )}
                {stage === 'result' && (
                  <div className={'ar-result ' + (correct ? 'ok' : 'miss')}>
                    <div>
                      {correct ? <CheckCircle2 /> : <XCircle />}
                      <strong>
                        {correct
                          ? t('Correct prediction', 'Правильний прогноз')
                          : t('Use the physics, not the guess', 'Спробуй через фізику, не навмання')}
                      </strong>
                    </div>
                    <p>{mission.explanation[lang]}</p>
                    <small>
                      {t('Calculated flight time', 'Розрахунковий час польоту')}: {actualTime.toFixed(1)} s ·{' '}
                      {t('speed used', 'швидкість у розрахунку')}: {effectiveSpeed.toFixed(1)} m/s
                    </small>
                    <button className="button" onClick={nextMission}>
                      {index + 1 >= missions.length
                        ? t('FINISH MISSION', 'ЗАВЕРШИТИ МІСІЮ')
                        : t('NEXT MISSION', 'НАСТУПНА МІСІЯ')}
                    </button>
                  </div>
                )}
              </div>
            )}

            {stage === 'complete' && (
              <div className="ar-modal-card ar-complete">
                <CheckCircle2 size={34} />
                <span className="ar-kicker">KINEMATICS PILOT</span>
                <h2>
                  {score}/{missions.length} {t('correct', 'правильно')}
                </h2>
                <p>
                  {t(
                    'The important question for LearnMap is not the score. Do you want one more mission without anyone making you do it?',
                    'Для LearnMap зараз важливіший не бал. Ти хочеш ще одну місію без нагадування?',
                  )}
                </p>
                <div className="ar-complete-actions">
                  {!bonus ? (
                    <button className="button" onClick={continueVoluntarily}>
                      {t('YES — ONE MORE', 'ТАК — ЩЕ ОДНУ')}
                    </button>
                  ) : null}
                  <Link className="button secondary" to="/today">
                    {t('ENOUGH FOR NOW', 'НА СЬОГОДНІ ДОСИТЬ')}
                  </Link>
                </div>
                {bonus ? (
                  <button className="text-link" onClick={restart}>
                    <RotateCcw size={15} /> {t('Restart main mission', 'Повторити основну місію')}
                  </button>
                ) : null}
              </div>
            )}
          </div>

          <aside className="ar-info panel">
            <h3>{t('What this prototype tests', 'Що перевіряє цей прототип')}</h3>
            <ul>
              <li>{t('Prediction before explanation', 'Прогноз до пояснення')}</li>
              <li>{t('Motion as immediate feedback', 'Рух як миттєвий зворотний зв’язок')}</li>
              <li>{t('S = v × t and inverse formulas', 'S = v × t та обернені формули')}</li>
              <li>{t('km/h → m/s conversion', 'переведення км/год → м/с')}</li>
              <li>{t('Voluntary “one more mission”', 'добровільне «ще одну місію»')}</li>
            </ul>
            {cameraError ? <p className="notice">{cameraError}</p> : null}
            <p className="muted">
              {t(
                'Camera video stays in the browser in this MVP; telemetry contains only fixed event names, subject/session IDs and bounded time.',
                'Відео з камери в цьому MVP залишається у браузері; telemetry містить лише фіксовані назви подій, ID предмета/сесії та обмежений час.',
              )}
            </p>
          </aside>
        </section>
      )}
    </div>
  );
}
