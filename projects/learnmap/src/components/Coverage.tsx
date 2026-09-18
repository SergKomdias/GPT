import type { Subject } from '../types';
import { useApp } from '../hooks/useApp';
export function Coverage({ subject: s }: { subject: Subject }) {
  const { t } = useApp();
  return (
    <div className="coverage">
      <small>
        {s.assessed}/{s.total} {t('skills assessed', 'навичок оцінено')} ·{' '}
        {t('Coverage', 'Покриття')} {Math.round(s.coverage * 100)}% ·{' '}
        {t('Evidence strength', 'Надійність оцінки')} {Math.round(s.confidence * 100)}%
      </small>
      {s.provisional ? (
        <small>
          {t(
            'Insufficient evidence for a subject estimate',
            'Недостатньо даних для оцінки предмета',
          )}
        </small>
      ) : (
        <small>
          {t('Mastery estimate · sample curriculum', 'Оцінка знань · тестова програма')}
        </small>
      )}
      <small>
        {t(
          'Coverage shows how many skills we have checked. Evidence strength reflects the amount and variety of independent answers — it is not your knowledge score.',
          'Покриття показує, скільки навичок уже перевірено. Надійність оцінки залежить від кількості й різноманітності самостійних відповідей — це не ваш рівень знань.',
        )}
      </small>
      {s.provisional && (
        <small>
          {t(
            'To show a subject estimate we need at least',
            'Для оцінки предмета потрібно щонайменше',
          )}{' '}
          {Math.ceil(s.total * 0.6)}/{s.total}{' '}
          {t(
            'skills checked and 35% evidence strength.',
            'перевірених навичок і 35% надійності оцінки.',
          )}{' '}
          {s.coverage >= 0.6
            ? t(
                'Coverage is sufficient. Next: practise with new questions without hints, then return on another day. One more test may not be enough.',
                'Покриття вже достатнє. Далі: попрактикуйтеся на нових запитаннях без підказок і поверніться іншого дня. Одного додаткового тесту може бути недостатньо.',
              )
            : t(
                'Next: complete a diagnostic to check more skills.',
                'Далі: пройдіть діагностику, щоб перевірити більше навичок.',
              )}
        </small>
      )}
    </div>
  );
}
