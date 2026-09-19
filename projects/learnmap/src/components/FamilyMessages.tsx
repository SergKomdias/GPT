import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import { useApp } from '../hooks/useApp';
import { Notice } from './UI';

export function FamilyMessages({ student }: { student?: string }) {
  const { user, t } = useApp();
  const [messages, setMessages] = useState<any[]>([]);
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const query = student ? '?student=' + encodeURIComponent(student) : '';
      setMessages(await api('/family/messages' + query));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [student]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 10000);
    return () => clearInterval(timer);
  }, [load]);

  return (
    <section className="panel family-messages">
      <div className="section-heading">
        <div>
          <h2>{t('Family messages', 'Повідомлення родині')}</h2>
          <p className="muted">
            {t(
              'A private thread between the linked student and parent.',
              'Приватна переписка між прив’язаною дитиною та батьками.',
            )}
          </p>
        </div>
      </div>
      <div className="family-message-list" aria-live="polite">
        {messages.length ? (
          messages.map((message) => {
            const mine = message.sender_id === user?.id;
            return (
              <article key={message.id} className={'family-message ' + (mine ? 'mine' : '')}>
                <small>
                  {mine ? t('You', 'Ви') : message.sender_name} ·{' '}
                  {new Date(message.created_at).toLocaleString()}
                </small>
                <p>{message.body}</p>
              </article>
            );
          })
        ) : (
          <p className="muted">
            {t(
              'No messages yet. You can start with a short note.',
              'Повідомлень ще немає. Можна почати з короткої нотатки.',
            )}
          </p>
        )}
      </div>
      <form
        className="family-message-compose"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!body.trim()) return;
          setSending(true);
          setError('');
          try {
            const message = await api('/family/messages', 'POST', {
              ...(student ? { student } : {}),
              body: body.trim(),
            });
            setMessages((rows) => [...rows, message]);
            setBody('');
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setSending(false);
          }
        }}
      >
        <textarea
          rows={3}
          maxLength={1000}
          value={body}
          disabled={sending}
          onChange={(event) => setBody(event.target.value)}
          placeholder={t('Write a message…', 'Напишіть повідомлення…')}
        />
        <button className="button" disabled={sending || !body.trim()}>
          {sending ? t('Sending…', 'Надсилаємо…') : t('Send', 'Надіслати')}
        </button>
      </form>
      <Notice error>{error}</Notice>
    </section>
  );
}
