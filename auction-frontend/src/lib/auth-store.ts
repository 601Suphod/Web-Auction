'use client';

import { create } from 'zustand';
import { apiGet, apiPost } from '@/lib/api';
import { Profile } from '@/lib/types';

type AuthStatus = 'idle' | 'loading' | 'ready';

type AuthStore = {
  profile: Profile | null;
  status: AuthStatus;
  initialized: boolean;
  refreshSession: () => Promise<Profile | null>;
  initializeSession: () => Promise<void>;
  setSession: (profile: Partial<Profile> & Pick<Profile, 'name' | 'email' | 'role'>) => void;
  clearSession: () => void;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthStore>((set, get) => ({
  profile: null,
  status: 'idle',
  initialized: false,
  refreshSession: async () => {
    set({ status: 'loading' });

    try {
      const profile = (await apiGet('/users/me')) as Profile;
      set({ profile, status: 'ready', initialized: true });
      return profile;
    } catch {
      set({ profile: null, status: 'ready', initialized: true });
      return null;
    }
  },
  initializeSession: async () => {
    if (get().initialized || get().status === 'loading') return;
    await get().refreshSession();
  },
  setSession: (profile) => {
    set((state) => ({
      profile: {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        bidHistory: profile.bidHistory ?? state.profile?.bidHistory ?? [],
        wins: profile.wins ?? state.profile?.wins ?? [],
      },
      status: 'ready',
      initialized: true,
    }));
  },
  clearSession: () => {
    set({ profile: null, status: 'ready', initialized: true });
  },
  logout: async () => {
    try {
      await apiPost('/auth/logout', {});
    } finally {
      set({ profile: null, status: 'ready', initialized: true });
    }
  },
}));
