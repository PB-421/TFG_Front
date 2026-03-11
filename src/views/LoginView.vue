<template>
  <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <h1 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
        Gestor de Prácticas
      </h1>
      <p class="mt-2 text-center text-sm text-gray-600">
        Accede a tu panel de control
      </p>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
        <form class="space-y-6" @submit.prevent="loginLocal">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
            <div class="mt-1">
              <input 
                v-model="email" 
                id="email" 
                type="email" 
                required 
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="usuario@ejemplo.com"
              />
            </div>
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-gray-700">Contraseña</label>
            <div class="mt-1">
              <input 
                v-model="password" 
                id="password" 
                type="password" 
                required 
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div v-if="error" class="text-red-600 text-sm font-medium">
            {{ error }}
          </div>

          <div>
            <button 
              :disabled="auth.loading"
              type="submit" 
              class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {{ auth.loading ? 'Cargando...' : 'Entrar' }}
            </button>
          </div>
        </form>

        <div class="mt-6">
          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-gray-300"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-2 bg-white text-gray-500">O continúa con</span>
            </div>
          </div>

          <div class="mt-6">
            <button
              @click="loginMicrosoft"
              class="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <svg class="w-5 h-5 mr-2" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg">
                <path fill="#f3f3f3" d="M0 0h23v23H0z"/><path fill="#f35325" d="M1 1h10v10H1z"/><path fill="#81bc06" d="M12 1h10v10H12z"/><path fill="#05a6f0" d="M1 12h10v10H1z"/><path fill="#ffba08" d="M12 12h10v10H12z"/>
              </svg>
              <span>Microsoft 365</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/supabase/client'
import { useAuthStore } from '@/stores/auth.store'

const auth = useAuthStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const error = ref('')

async function loginLocal() {
  error.value = '' // Reset error state
  try {
    await auth.loginLocal(email.value, password.value)
    router.push('/dashboard')
  } catch (err) {
    error.value = 'Credenciales incorrectas'
  }
}

function loginMicrosoft() {
  auth.loginMicrosoft()
}

onMounted(() => {
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'INITIAL_SESSION' && session) {
      try {
        await auth.fetchProfileFromOAuth(session)
        router.push('/dashboard')
      } catch {
        error.value = 'Error al cargar el perfil'
      }
    }

    if (event === 'SIGNED_OUT') {
      auth.clearAuth()
    }
  })
})
</script>