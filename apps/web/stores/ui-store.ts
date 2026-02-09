import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  montosOcultos: boolean;
  toggleMontos: () => void;
  ocultarMontos: () => void;
  mostrarMontos: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      montosOcultos: false,

      toggleMontos: () => set((state) => ({ montosOcultos: !state.montosOcultos })),

      ocultarMontos: () => set({ montosOcultos: true }),

      mostrarMontos: () => set({ montosOcultos: false }),
    }),
    {
      name: 'ui-storage',
    }
  )
);
