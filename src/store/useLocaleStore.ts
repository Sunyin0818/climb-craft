import { create } from 'zustand';
import { dict, type Language } from '@/core/i18n/dict';

interface LocaleState {
  lang: Language;
  setLang: (l: Language) => void;
  t: typeof dict[Language];
}

export const useLocaleStore = create<LocaleState>((set) => ({
  lang: 'zh',
  setLang: (lang) => set({ lang, t: dict[lang] }),
  t: dict['zh']
}));
