<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import HeaderNavLinks from './HeaderNavLinks.vue'

const auth = useAuthStore()
const router = useRouter()

// Control del estado del menú desplegable
const isMenuOpen = ref(false)
const menuRef = ref<HTMLElement | null>(null)

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}

// Función de Logout
const handleLogout = async () => {
  try {
    await auth.logout()
    isMenuOpen.value = false
    router.push('/login') // Redirigir al login tras cerrar sesión
  } catch (error) {
    console.error('Error al cerrar sesión:', error)
  }
}

// Cerrar el menú si se hace click fuera
const handleClickOutside = (event: MouseEvent) => {
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    isMenuOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))

const avatarUrl = computed(() => {
  const name = auth.name ?? 'User'
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=135bec&color=fff`
})
</script>

<template>
  <header class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-10 py-4 sticky top-0 z-50">

    <div class="flex items-center gap-3 text-primary">
      <div class="flex flex-col">
        <h2 class="text-slate-900 dark:text-white text-lg font-bold leading-tight">Universidad Nebrija</h2>
        <p class="text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider">Panel de Administración</p>
      </div>
    </div>

    <div class="flex flex-1 justify-end gap-8">
      <HeaderNavLinks />

      <div class="flex items-center gap-3 border-l border-slate-200 dark:border-slate-800 pl-6">

        <div class="relative" ref="menuRef">
          <button 
            @click="toggleMenu"
            class="flex items-center gap-3 p-1 pr-3 rounded-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <div class="size-8 rounded-full overflow-hidden">
              <img :src="avatarUrl" alt="User" class="w-full h-full object-cover" />
            </div>

            <div class="flex flex-col text-left leading-tight">
              <span class="text-xs font-bold text-slate-700 dark:text-slate-200">{{ auth.name }}</span>
              <span class="text-[10px] uppercase text-slate-500">{{ auth.role }}</span>
            </div>
          </button>

          <Transition
            enter-active-class="transition duration-100 ease-out"
            enter-from-class="transform scale-95 opacity-0"
            enter-to-class="transform scale-100 opacity-100"
            leave-active-class="transition duration-75 ease-in"
            leave-from-class="transform scale-100 opacity-100"
            leave-to-class="transform scale-95 opacity-0"
          >
            <div 
              v-if="isMenuOpen" 
              class="absolute right-0 mt-2 w-48 origin-top-right rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none overflow-hidden"
            >
              <div class="py-1">
                <button
                  @click="handleLogout"
                  class="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <span class="material-symbols-outlined text-lg">(Icono)</span>
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>
  </header>
</template>