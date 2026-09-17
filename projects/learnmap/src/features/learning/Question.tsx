import { useApp } from '../../hooks/useApp';
export function Question({
  question,
  value,
  onChange,
  disabled = false,
}: {
  question: any;
  value: number | null;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  const { lang } = useApp();
  return (
    <fieldset className="question">
      <legend>{question.prompt[lang]}</legend>
      <div className="answer-options">
        {question.options.map((option: string, i: number) => (
          <label key={i} className={value === i ? 'selected' : ''}>
            <input
              type="radio"
              name="answer"
              checked={value === i}
              onChange={() => onChange(i)}
              disabled={disabled}
            />
            <span className="answer-letter">{String.fromCharCode(65 + i)}</span>
            <span>{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
