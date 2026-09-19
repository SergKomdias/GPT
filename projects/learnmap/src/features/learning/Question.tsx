import { useMemo } from 'react';
import { useApp } from '../../hooks/useApp';
import { PhysicsGraph } from '../../components/PhysicsGraph';
import { PhysicsCircuit } from '../../components/PhysicsCircuit';
export function Question({
  question,
  value,
  onChange,
  disabled = false,
  allowUnknown = false,
}: {
  question: any;
  value: number | null;
  onChange: (n: number) => void;
  disabled?: boolean;
  allowUnknown?: boolean;
}) {
  const { lang, t } = useApp();
  const order = useMemo(() => {
    const indices = question.options.map((_: string, i: number) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  }, [question.id, question.options.length]);
  return (
    <fieldset className="question">
      <legend>{question.prompt[lang]}</legend>
      {question.presentation?.graph && <PhysicsGraph graph={question.presentation.graph} />}
      {question.presentation?.circuit && <PhysicsCircuit labels={question.presentation.circuit} />}
      <div className="answer-options">
        {order.map((i: number, position: number) => (
          <label key={i} className={value === i ? 'selected' : ''}>
            <input
              type="radio"
              name="answer"
              checked={value === i}
              onChange={() => onChange(i)}
              disabled={disabled}
            />
            <span className="answer-letter">{String.fromCharCode(65 + position)}</span>
            <span>{question.options[i]}</span>
          </label>
        ))}
        {allowUnknown ? (
          <label className={'unknown-answer ' + (value === -1 ? 'selected' : '')}>
            <input
              type="radio"
              name="answer"
              checked={value === -1}
              onChange={() => onChange(-1)}
              disabled={disabled}
            />
            <span className="answer-letter">?</span>
            <span>{t("I don't know", 'Не знаю')}</span>
          </label>
        ) : null}
      </div>
    </fieldset>
  );
}
