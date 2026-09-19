import { PilotMetrics } from '../components/Pilot';
import { EnglishContentReview } from '../components/EnglishContentReview';
import { useEffect, useState } from 'react';
import { useApp } from '../hooks/useApp';
import { api } from '../services/api';
import { Heading, Notice, Loading } from '../components/UI';
export function Admin() {
  const { t, lang } = useApp();
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState('skills');
  const [selected, setSelected] = useState('');
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const load = () =>
    api('/admin')
      .then(setData)
      .catch((e) => setError(e.message));
  useEffect(() => {
    void load();
  }, []);
  const edit = (item: any) => {
    setSelected(item.id);
    setMessage('');
    if (tab === 'prompts') setDraft(item.content);
    else if (tab === 'skills') {
      const { id, title, explanation, subject_id, topic_id, sort_order, prerequisites } = item;
      setDraft(
        JSON.stringify(
          { id, title, explanation, subject_id, topic_id, sort_order, prerequisites },
          null,
          2,
        ),
      );
    } else if (tab === 'users')
      setDraft(JSON.stringify({ id: item.id, name: item.name, role: item.role }, null, 2));
    else setDraft(JSON.stringify(item, null, 2));
  };
  const create = () => {
    const empty = { en: 'New content', uk: 'Новий матеріал' };
    const templates: Record<string, unknown> = {
      skills: {
        id: 'new-skill',
        subject_id: 'math',
        topic_id: 'algebra',
        title: empty,
        explanation: empty,
        sort_order: 100,
        prerequisites: [],
      },
      questions: {
        id: 'new-question',
        skill_id: 'linear',
        difficulty: 1,
        prompt: empty,
        options: ['1', '2', '3', '4'],
        answer: 0,
        reasoning: empty,
        hints: Array.from({ length: 5 }, () => empty),
      },
      subjects: { id: 'new-subject', title: empty },
      topics: { id: 'new-topic', curriculum_id: 'math-sample', title: empty },
      curricula: {
        id: 'new-curriculum',
        subject_id: 'math',
        title: 'Sample',
        grade: 10,
        cefr: null,
      },
    };
    setSelected('new');
    setDraft(JSON.stringify(templates[tab], null, 2));
  };
  const save = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const d = tab === 'prompts' ? { content: draft } : JSON.parse(draft);
      const endpoint =
        tab === 'skills'
          ? 'skill'
          : tab === 'questions'
            ? 'question'
            : tab === 'prompts'
              ? 'prompt'
              : tab === 'users'
                ? 'user'
                : 'content';
      if (endpoint === 'content')
        d.kind = tab === 'curricula' ? 'curriculum' : tab === 'subjects' ? 'subject' : 'topic';
      await api('/admin/' + endpoint, 'PUT', d);
      await load();
      setMessage(t('Saved to the database.', 'Збережено в базі даних.'));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Heading
        title={t('Build better learning paths.', 'Створюй кращі навчальні шляхи.')}
        description={t(
          'Curriculum, evidence and tutor behaviour — in one place.',
          'Програми, завдання й поведінка викладача — в одному місці.',
        )}
      />
      <PilotMetrics />
      <EnglishContentReview
        items={data?.english_assessment_items || []}
        onSaved={() => void load()}
      />
      <Notice error>{error}</Notice>
      {!data ? (
        <Loading />
      ) : (
        <>
          <div className="stat-strip">
            <div>
              <small>{t('Users', 'Користувачі')}</small>
              <strong>{data.stats.users}</strong>
            </div>
            <div>
              <small>{t('Completed lessons', 'Завершені заняття')}</small>
              <strong>{data.stats.lessons}</strong>
            </div>
            <div>
              <small>{t('Speaking turns', 'Репліки Speaking')}</small>
              <strong>{data.stats.turns}</strong>
            </div>
            <div>
              <small>{t('Skills', 'Навички')}</small>
              <strong>{data.skills.length}</strong>
            </div>
          </div>
          <div className="tabs admin-tabs">
            {['skills', 'questions', 'subjects', 'curricula', 'topics', 'prompts', 'users'].map(
              (key, i) => (
                <button
                  className={tab === key ? 'active' : ''}
                  key={key}
                  onClick={() => {
                    setTab(key);
                    setSelected('');
                    setDraft('');
                  }}
                >
                  {t(
                    key,
                    [
                      'Навички',
                      'Запитання',
                      'Предмети',
                      'Програми / класи',
                      'Теми',
                      'AI prompts',
                      'Користувачі',
                    ][i],
                  )}
                </button>
              ),
            )}
          </div>
          <div className="admin-layout">
            <section className="panel admin-list">
              {!['prompts', 'users'].includes(tab) ? (
                <button className="button secondary full" onClick={create}>
                  {t('Add content', 'Додати матеріал')}
                </button>
              ) : null}
              {data[tab]?.map((item: any) => (
                <button
                  key={item.id}
                  className={selected === item.id ? 'selected' : ''}
                  onClick={() => edit(item)}
                >
                  <strong>
                    {item.title?.[lang] ||
                      item.title ||
                      item.name ||
                      item.prompt?.[lang] ||
                      item.id}
                  </strong>
                  <small>
                    {item.id} {item.review_status ? '· ' + item.review_status : ''}
                  </small>
                </button>
              ))}
            </section>
            <section className="panel admin-editor">
              <h2>{t('Content editor', 'Редактор матеріалів')}</h2>
              {selected && selected !== 'new' && ['skills', 'questions'].includes(tab) && (
                <label>
                  Review status
                  <select
                    aria-label="Review status"
                    value={data[tab].find((i: any) => i.id === selected)?.review_status || 'draft'}
                    onChange={(e) =>
                      void api('/admin/review', 'PUT', {
                        kind: tab,
                        id: selected,
                        status: e.target.value,
                      })
                        .then(load)
                        .catch((e) => setError(e.message))
                    }
                  >
                    {['draft', 'reviewed', 'approved'].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
              )}
              <p>
                {t(
                  'Edit the structured content below. Both language versions are required. Skill dependencies are validated for cycles. Question answers use positions 0–3.',
                  'Редагуй структуровані дані. Потрібні обидві мовні версії. Залежності перевіряються на цикли. Правильні відповіді мають індекси 0–3.',
                )}
              </p>
              {selected ? (
                <>
                  <label>
                    {t('Content', 'Вміст')}
                    <textarea
                      className="code-editor"
                      spellCheck={false}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                    />
                  </label>
                  <Notice>{message}</Notice>
                  <button className="button" disabled={busy} onClick={() => void save()}>
                    {t('Save changes', 'Зберегти зміни')}
                  </button>
                </>
              ) : (
                <p>
                  {t('Select an item or create new content.', 'Обери елемент або створи новий.')}
                </p>
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}
