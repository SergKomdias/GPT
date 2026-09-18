import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api } from '../services/api';
import type { User, Language } from '../types';
interface Context {
  user: User | null;
  loading: boolean;
  lang: Language;
  setLang: (l: Language) => void;
  refresh: () => Promise<void>;
  t: (en: string, uk: string) => string;
  config: { ai: string; demo: boolean; pilot?: boolean; invite_required?: boolean };
  logout: () => Promise<void>;
}
const AppContext = createContext<Context>(null!);
export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLanguage] = useState<Language>(() =>
    localStorage.getItem('learnmap-language') === 'en' ? 'en' : 'uk',
  );
  const [config, setConfig] = useState({ ai: 'mock', demo: false });
  useEffect(() => {
    document.documentElement.lang = lang;
    document.title =
      lang === 'uk'
        ? 'LearnMap — Твоя персональна карта знань'
        : 'LearnMap — Your personal map of knowledge';
  }, [lang]);
  const refresh = useCallback(async () => {
    try {
      const u = await api<User>('/me');
      setUser(u);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    void api('/config')
      .then(setConfig)
      .catch(() => {});
  }, [refresh]);
  const setLang = (l: Language) => {
    setLanguage(l);
    localStorage.setItem('learnmap-language', l);
    document.documentElement.lang = l;
  };
  return (
    <AppContext.Provider
      value={{
        user,
        loading,
        lang,
        setLang,
        refresh,
        t: (en, uk) => (lang === 'uk' ? uk : en),
        config,
        logout: async () => {
          await api('/logout', 'POST');
          setUser(null);
        },
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
export const useApp = () => useContext(AppContext);
