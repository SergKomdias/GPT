import type { ReactNode } from 'react';
import { Calculator, Atom, BookOpen, ArrowRight, Share2 as Network } from 'lucide-react';
import { useApp } from '../hooks/useApp';
export function Logo() {
  return (
    <span className="brand">
      <Network size={31} strokeWidth={2.5} />
      <span>LearnMap</span>
    </span>
  );
}
export function SubjectIcon({ subject }: { subject: string }) {
  const Icon = subject === 'math' ? Calculator : subject === 'physics' ? Atom : BookOpen;
  return (
    <span className={'subject-icon ' + subject}>
      <Icon size={24} strokeWidth={1.7} />
    </span>
  );
}
export function Arrow() {
  return <ArrowRight size={19} />;
}
export function Heading({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {children}
    </div>
  );
}
export function Notice({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return children ? (
    <div className={error ? 'notice error' : 'notice'} role={error ? 'alert' : 'status'}>
      {children}
    </div>
  ) : null;
}
export function Loading() {
  const { t } = useApp();
  return (
    <div className="loading" role="status">
      <span className="loader" />
      {t('Mapping your next step…', 'Визначаємо наступний крок…')}
    </div>
  );
}
export function MasteryBar({ value }: { value: number | null }) {
  return (
    <div className="mastery-bar">
      <span>
        <i style={{ width: `${value || 0}%` }} />
      </span>
      <b>{value === null ? '—' : `${Math.round(value)}%`}</b>
    </div>
  );
}
export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <Network size={36} />
      <h3>{title}</h3>
      {children}
    </div>
  );
}
