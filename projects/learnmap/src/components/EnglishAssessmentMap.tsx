const titles: Record<string, string> = {
  grammar: 'Grammar · Граматика',
  vocabulary: 'Vocabulary · Словниковий запас',
  reading: 'Reading · Читання',
  writing: 'Writing · Письмо',
  listening: 'Listening · Аудіювання',
  speaking: 'Speaking · Говоріння',
};
const confidence: Record<string, string> = {
  low: 'низька',
  medium: 'середня',
  insufficient: 'недостатньо даних',
  provisional: 'попередня',
};
const subskills: Record<string, string> = {
  'tense-context': 'Час у контексті',
  'tense-contrast': 'Зіставлення часів',
  articles: 'Артиклі',
  prepositions: 'Прийменники',
  modals: 'Модальні дієслова',
  conditionals: 'Умовні речення',
  'gerund-infinitive': 'Герундій та інфінітив',
  passive: 'Пасивний стан',
  'reported-speech': 'Непряма мова',
  'relative-clauses': 'Означальні речення',
  'complex-structures': 'Складні конструкції',
  transformations: 'Перефразування',
  'basic-meaning': 'Базове значення',
  'context-choice': 'Вибір за контекстом',
  collocations: 'Сполучуваність слів',
  'meaning-context': 'Значення в контексті',
  register: 'Стиль і регістр',
  'word-formation': 'Словотвір',
  'phrasal-verbs': 'Фразові дієслова',
  'near-synonyms': 'Близькі за значенням слова',
  gist: 'Головна думка',
  detail: 'Деталі',
  inference: 'Неявні висновки',
  'author-intention': 'Намір автора',
  'productive-writing': 'Самостійне письмо',
  'audio-comprehension': 'Розуміння аудіо',
  'spoken-production': 'Усне висловлювання',
  'spoken-interaction': 'Реакція на співрозмовника',
};
const display = (value: string) => value.replace(/^([^ (]+)/, (key) => subskills[key] || key);
export function EnglishAssessmentMap({ map }: { map: any }) {
  if (!map) return null;
  return (
    <section className="panel english-assessment-map" aria-label="Карта CEFR">
      <h2>English · Оцінка CEFR</h2>
      <p>
        <strong>
          {map.estimated_cefr
            ? `Орієнтовний загальний рівень: ${map.estimated_cefr}`
            : `Попередній placement: ${map.placement_cefr || 'недостатньо даних'}`}
        </strong>
      </p>
      <p>
        Впевненість: {confidence[map.confidence]} · Покриття доказами: {map.coverage}%
      </p>
      <p className="muted">
        Впевненість описує кількість зібраних доказів, а не ймовірність точного CEFR. Покриття
        враховує піднавички та окремі продуктивні й аудіопроби.
      </p>
      {!map.estimated_cefr && (
        <p className="muted">
          Placement описує перевірені мовні знання та читання. Загальний CEFR потребує окремих
          доказів письма, аудіювання й говоріння.
        </p>
      )}
      <div className="assessment-strands">
        {Object.entries(map.strands).map(([key, value]: [string, any]) => (
          <div key={key} className="assessment-strand">
            <h3>{titles[key]}</h3>
            <p>
              {value.estimated_cefr || 'Недостатньо оцінено'} · {confidence[value.confidence]}
            </p>
            <p className="muted">Покриття: {Math.round(value.coverage * 100)}%</p>
            {value.strengths.length > 0 && (
              <p>Сильні сторони: {value.strengths.map(display).join(', ')}</p>
            )}
            {value.gaps.length > 0 && <p>Прогалини: {value.gaps.map(display).join(', ')}</p>}
          </div>
        ))}
      </div>
      <p className="muted">
        Вимова й акустична плавність мовлення не оцінені. Результат пілотний, не сертифікат CEFR.
      </p>
    </section>
  );
}
