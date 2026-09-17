import { useSnapshot } from '../hooks/useSnapshot';
import { useApp } from '../hooks/useApp';
import { Heading, Notice, Loading } from '../components/UI';
import { Analytics } from '../features/progress/Analytics';
export function Progress() {
  const { t } = useApp();
  const { data, error } = useSnapshot();
  return (
    <>
      <Heading
        title={t('Look how far you’re going.', 'Поглянь, як ти зростаєш.')}
        description={t(
          'Knowledge grows through practice. Every attempt matters.',
          'Знання зростають із практикою. Кожна спроба важлива.',
        )}
      />
      {error ? <Notice error>{error}</Notice> : data ? <Analytics data={data} /> : <Loading />}
    </>
  );
}
