import { create } from 'zustand';

const MAX_LOG_ENTRIES = 200;

export interface LogEntry {
  id: string;
  timestamp: number;
  action: string;
  result: 'success' | 'rejected';
  payload?: Record<string, unknown>;
  reason?: string;
}

interface LogState {
  sessionId: string;
  entries: LogEntry[];
  append: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  clear: () => void;
}

export const useLogStore = create<LogState>((set) => ({
  sessionId: crypto.randomUUID(),
  entries: [],

  append: (entry) =>
    set((state) => {
      const newEntry: LogEntry = {
        ...entry,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
      };
      const next = [...state.entries, newEntry];
      if (next.length > MAX_LOG_ENTRIES) next.shift();
      return { entries: next };
    }),

  clear: () => set({ entries: [] }),
}));
