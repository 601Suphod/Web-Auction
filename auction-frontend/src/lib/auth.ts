'use client';

import { useAuthStore } from '@/lib/auth-store';

export const saveToken = async (_token?: string) => {
  // HttpOnly cookie is set by backend auth endpoints.
  void _token;
  await useAuthStore.getState().refreshSession();
};

export const clearToken = async () => {
  await useAuthStore.getState().logout();
};
