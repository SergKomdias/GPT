const labels: Record<string, string> = {
  task_completion: 'Виконання завдання',
  relevance: 'Відповідність темі',
  grammar: 'Граматика',
  vocabulary: 'Лексика',
  coherence: 'Зв’язність',
  sentence_complexity: 'Складність речень',
  interaction: 'Реакція на репліку співрозмовника',
};
export function ProductionFeedback({ assessment }: { assessment: any }) {
  if (!assessment) return null;
  return (
    <details className="production-feedback">
      <summary>{assessment.summary || assessment.reason || 'Мовне оцінювання'}</summary>
      {assessment.dimensions && (
        <>
          <p>Попередні мовні показники, шкала 0–5. Для письма взаємодія не застосовується.</p>
          <dl>
            {Object.entries(assessment.dimensions).map(([key, value]: [string, any]) => (
              <div key={key}>
                <dt>
                  <strong>
                    {labels[key] || key}: {value.score}/5
                  </strong>
                </dt>
                <dd>{value.comment}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </details>
  );
}
