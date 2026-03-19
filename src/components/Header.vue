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
  <header class="flex items-center justify-between border-b border-gray-200 bg-white px-8 py-3 sticky top-0 z-50 shadow-sm">

    <div class="flex items-center gap-3">
      <div class="flex flex-col border-l-4 border-[#e4002b] pl-3"> <h2 class="text-[#002d56] text-lg font-black tracking-tight leading-tight uppercase">
          Nebrija <span class="font-light">Universidad</span>
        </h2>
        <p class="text-gray-500 text-[9px] uppercase tracking-[0.2em] font-semibold">Campus Virtual</p>
      </div>
    </div>

    <div class="flex flex-1 justify-end gap-6">
      <HeaderNavLinks />

      <div class="flex items-center gap-4 border-l border-gray-100 pl-6">

        <div class="relative" ref="menuRef">
          <button 
            @click="toggleMenu"
            class="flex items-center gap-3 p-1.5 rounded-lg hover:bg-gray-50 transition-colors group"
          >
            <div class="size-9 rounded-full overflow-hidden border-2 border-transparent group-hover:border-[#002d56] transition-all">
              <img :src="avatarUrl" alt="User" class="w-full h-full object-cover" />
            </div>

            <div class="hidden md:flex flex-col text-left leading-tight">
              <span class="text-xs font-bold text-[#002d56]">{{ auth.name }}</span>
              <span class="text-[10px] uppercase text-gray-400 font-bold tracking-wider">{{ auth.role }}</span>
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
              class="absolute right-0 mt-2 w-56 origin-top-right rounded-lg bg-white border border-gray-200 shadow-xl ring-1 ring-black/5 overflow-hidden"
            >
              <div class="bg-gray-50 px-4 py-3 border-b border-gray-100">
                <p class="text-[10px] uppercase text-gray-400 font-bold">Sesión iniciada como</p>
                <p class="text-xs font-bold text-[#002d56] truncate">{{ auth.name }}</p>
              </div>
              <div class="py-1">
                <button
                  @click="handleLogout"
                  class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-[#f0f0f0] hover:text-[#e4002b] transition-colors"
                >
                  <span class="material-symbols-outlined text-lg">logout</span>
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