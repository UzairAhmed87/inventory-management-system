import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setAuthToken } from '@/services/api';

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  currentUser: string | null;
  companyName: string | null;
  login: (token: string, login_id: string, companyName: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      token: null,
      currentUser: null,
      companyName: null,
      login: (token: string, login_id: string, companyName: string) => {
        setAuthToken(token);
        set({ isAuthenticated: true, token, currentUser: login_id, companyName });
      },
      logout: () => {
        setAuthToken('');
        set({ isAuthenticated: false, token: null, currentUser: null, companyName: null });
      }
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        if (state?.token) setAuthToken(state.token);
      }
    }
  )
);
