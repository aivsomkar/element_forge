import { create } from 'zustand';

export type Stage = 'Globe' | 'Energy Core' | 'New Element';

function stageFor(e: number): Stage {
  if (e < 0.35) return 'Globe';
  if (e < 0.6) return 'Energy Core';
  return 'New Element';
}

interface ElementState {
  expansion: number;
  stage: Stage;
  started: boolean;
  /** Called from the render loop; only writes when the rounded value actually changes. */
  report: (expansion: number) => void;
  start: () => void;
}

export const useElementStore = create<ElementState>((set, get) => ({
  expansion: 0,
  stage: 'Globe',
  started: false,
  report: (expansion) => {
    const rounded = Math.round(expansion * 50) / 50;
    if (rounded === get().expansion) return;
    set({ expansion: rounded, stage: stageFor(expansion) });
  },
  start: () => set({ started: true }),
}));
