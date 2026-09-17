import type { Subject } from '../types';
import { useApp } from '../hooks/useApp';
export function Coverage({ subject: s }: { subject: Subject }) {
  const { t } = useApp();
  return (
    <div className="coverage">
      <small>
        {s.assessed}/{s.total} {t('skills assessed', 'навичок оцінено')} ·{' '}
        {t('Coverage', 'Покриття')} {Math.round(s.coverage * 100)}% ·{' '}
        {t('Confidence', 'Впевненість')} {Math.round(s.confidence * 100)}%
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
    </div>
  );
}
