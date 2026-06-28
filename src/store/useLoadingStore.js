import { create } from 'zustand';

export const useLoadingStore = create((set) => ({
  isLoading: false,
  activeRequests: 0,
  startLoading: () => set((state) => {
    const activeRequests = state.activeRequests + 1;
    return {
      activeRequests,
      isLoading: activeRequests > 0
    };
  }),
  stopLoading: () => set((state) => {
    const activeRequests = Math.max(0, state.activeRequests - 1);
    return {
      activeRequests,
      isLoading: activeRequests > 0
    };
  })
}));
