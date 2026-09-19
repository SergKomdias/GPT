import { useEffect, useRef, useState, type ReactNode } from 'react';
import { api } from '../services/api';

type Bubble = { word: string; translation: string; x: number; y: number } | null;

export function SelectionTranslation({ children }: { children: ReactNode }) {
  const host = useRef<HTMLDivElement>(null);
  const [bubble, setBubble] = useState<Bubble>(null);
  const request = useRef(0);

  useEffect(() => {
    const root = host.current;
    if (!root) return;
    const select = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount !== 1 || selection.isCollapsed) return;
      const range = selection.getRangeAt(0);
      if (!root.contains(range.commonAncestorContainer)) return;
      const parent =
        range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
          ? (range.commonAncestorContainer as Element)
          : range.commonAncestorContainer.parentElement;
      if (parent?.closest('input,textarea,button,select')) return;
      const word = selection.toString().trim();
      if (!/^[A-Za-z][A-Za-z'-]{0,39}$/.test(word)) return;
      const rect = range.getBoundingClientRect();
      const ticket = ++request.current;
      setBubble({ word, translation: '…', x: rect.left + rect.width / 2, y: rect.top - 8 });
      void api<{ translation: string }>('/english-diagnostic/translate', 'POST', { word })
        .then((result) => {
          if (request.current === ticket)
            setBubble({
              word,
              translation: result.translation,
              x: rect.left + rect.width / 2,
              y: rect.top - 8,
            });
        })
        .catch(() => {
          if (request.current === ticket)
            setBubble({
              word,
              translation: 'Переклад недоступний',
              x: rect.left + rect.width / 2,
              y: rect.top - 8,
            });
        });
    };
    root.addEventListener('mouseup', select);
    root.addEventListener('touchend', select);
    return () => {
      root.removeEventListener('mouseup', select);
      root.removeEventListener('touchend', select);
    };
  }, []);

  return (
    <div ref={host} className="selection-translation-host" onPointerDown={() => setBubble(null)}>
      {children}
      {bubble ? (
        <div
          className="selection-translation-bubble"
          style={{ left: bubble.x, top: bubble.y }}
          role="status"
        >
          <strong>{bubble.word}</strong>
          <span>{bubble.translation}</span>
        </div>
      ) : null}
    </div>
  );
}
