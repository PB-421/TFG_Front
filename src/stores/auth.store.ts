import { defineStore } from 'pinia'
import { supabase } from '@/supabase/client' 

const API_URL = import.meta.env.VITE_API_URL as string

interface AuthState {
  name: string | null
  role: string | null
  loading: boolean
  initialized: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    name: null,
    role: null,
    loading: false,
    initialized: false
  }),

  getters: {
    isAuthenticated: (state): boolean => !!state.role
  },

  actions: {
    async isMicrosoftUser():Promise<string> {
      // Sacar si hay session con Microsoft (OAuth)
      const { data: identities, error: identitiesError } = await supabase.auth.getUserIdentities()

      if (!identitiesError) {
        const azureIdentity = identities.identities.find((identity) => identity.provider === 'azure')

        if (azureIdentity) {
          return azureIdentity.user_id;
        }
        return "00000000-0000-0000-0000-000000000000";
      }
      return "00000000-0000-0000-0000-000000000000";
    },
    // ---------------- LOGIN LOCAL ----------------
    async loginLocal(email: string, password: string): Promise<void> {
      this.loading = true

      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      })

      this.loading = false

      if (!res.ok) {
        throw new Error('Credenciales incorrectas')
      }

      const data = await res.json()
      this.name = data.name
      this.role = data.role
    },

    // ---------------- MICROSOFT OAUTH ----------------
    async loginMicrosoft(): Promise<void> {
      await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          scopes: 'email',
          redirectTo: `${window.location.origin}/login`
        }
      })
    },

    // ---------------- PERFIL TRAS OAUTH ----------------
    // Se llama DESPUÉS de que Supabase restaure la sesión OAuth
    async fetchProfileFromOAuth(session: any): Promise<void> {
      const body = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.user_metadata?.full_name ?? ''
      }

      const res = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        credentials: 'include',
        body: JSON.stringify(body)
      })

      if (!res.ok) throw new Error('Error en perfil backend')

      const data = await res.json()
      this.name = data.name
      this.role = data.role
    },

    async autoLogin(): Promise<void> {
      if (this.initialized) return;

      try {
        // 1. Escuchar cambios de sesión (OAuth redirect)
        supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_IN' && session) {
            await this.fetchProfileFromOAuth(session);
          }
        });

        // 2. Comprobar si Supabase YA tiene una sesión activa
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          // Ya hay sesión OAuth restaurada por Supabase
          await this.fetchProfileFromOAuth(data.session);
          this.initialized = true;
          return;
        }

        // 3. Si no hay sesión Supabase, comprobar sesión del backend (cookies)
        const res = await fetch(`${API_URL}/api/auth/auto-login`, {
          credentials: 'include'
        });

        if (res.ok) {
          const data = await res.json();
          this.name = data.name;
          this.role = data.role;
        }
      } catch (e) {
        await supabase.auth.signOut();
        this.clearAuth();
      } finally {
        this.initialized = true;
      }
    },

    // ---------------- LOGOUT ----------------
    async logout(): Promise<void> {
      // Backend limpia cookies + sesión Supabase
      await fetch(`${API_URL}/api/auth/logout`, {
        credentials: 'include'
      })

      // Frontend limpia sesión OAuth (solo afecta a Microsoft)
      await supabase.auth.signOut()

      this.clearAuth()
    },

    // ---------------- LOCAL CLEAR ----------------
    clearAuth(): void {
      this.name = null
      this.role = null
    }
  }
})