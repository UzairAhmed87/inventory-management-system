
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  isAuthenticated: boolean;
  currentUser: string | null;
  login: (userId: string, password: string) => boolean;
  logout: () => void;
}

// Mock user database - in real app this would be in a backend database
const mockUsers = [
  { userId: 'admin', password: 'admin123' },
  { userId: 'manager', password: 'manager123' },
  { userId: 'user1', password: 'password123' }
];

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      currentUser: null,
      
      login: (userId: string, password: string) => {
        const user = mockUsers.find(u => u.userId === userId && u.password === password);
        if (user) {
          set({ isAuthenticated: true, currentUser: userId });
          return true;
        }
        return false;
      },
      
      logout: () => {
        set({ isAuthenticated: false, currentUser: null });
      }
    }),
    {
      name: 'auth-storage',
    }
  )
);
