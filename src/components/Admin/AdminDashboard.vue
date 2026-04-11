<script setup lang="ts">
import { ref, onMounted } from 'vue'

const API_URL = import.meta.env.VITE_API_URL

interface Profile {
  id: string
  email: string
  name: string
  role: string
}

interface Subject {
  id: string
  name: string
}

interface Group {
  id: string
  name: string
}

interface Location {
  id: string
  name: string
  capacity: number
}

interface Schedule {
  id: string
  Grupo: string
}

const profiles = ref<Profile[]>([])
const subjects = ref<Subject[]>([])
const groups = ref<Group[]>([])
const locations = ref<Location[]>([])
const schedules = ref<Schedule[]>([])

const loading = ref(true)

const isRegistrationOpen = ref(false)
const togglingRegistration = ref(false)
const CONTROL_NAME = 'matriculacion' 

const alert = ref({
  show: false,
  message: '',
  type: 'success' as 'success' | 'error'
})

const showAlert = (message: string, type: 'success' | 'error' = 'success') => {
  alert.value = { show: true, message, type }
  if (type === 'success') {
    setTimeout(() => alert.value.show = false, 4000)
  }
}

async function loadData() {
  try {
    const [
      usersRes,
      subjectsRes,
      gruposRes,
      locRes,
      horariosRes,
      controlRes
    ] = await Promise.all([
      fetch(`${API_URL}/api/profiles/GetAll`, { credentials:'include' }),
      fetch(`${API_URL}/api/subjects`, { credentials:'include' }),
      fetch(`${API_URL}/api/groups`, { credentials:'include' }),
      fetch(`${API_URL}/api/locations`, { credentials:'include' }),
      fetch(`${API_URL}/api/schedules`, { credentials:'include' }),
      fetch(`${API_URL}/api/control/matriculacion`, { credentials:'include' })
    ])

    profiles.value = await usersRes.json()
    subjects.value = await subjectsRes.json()
    groups.value = await gruposRes.json()
    locations.value = await locRes.json()
    schedules.value = await horariosRes.json()

    if (controlRes.ok) {
      const status = await controlRes.json()
      isRegistrationOpen.value = typeof status === 'boolean' ? status : status.status
    }

  } catch (error) {
    console.error("Error cargando dashboard:", error)
  } finally {
    loading.value = false
  }
}

async function toggleRegistration() {
  togglingRegistration.value = true
  try {
    const res = await fetch(`${API_URL}/api/control/matriculacion`, {
      method: 'PUT',
      credentials: 'include'
    })

    if (res.ok) {
      const newStatus = await res.json()
      isRegistrationOpen.value = typeof newStatus === 'boolean' ? newStatus : newStatus.status
      
      const statusText = isRegistrationOpen.value ? 'abierta' : 'cerrada'
      showAlert(`Matriculación ${statusText} correctamente.`, 'success')
    } else {
      const errorMsg = await res.text()
      showAlert(errorMsg || 'No se pudo cambiar el estado de la matriculación', 'error')
    }
  } catch (error) {
    showAlert('Error de red al intentar actualizar el estado', 'error')
  } finally {
    togglingRegistration.value = false
  }
}

onMounted(loadData)

const cards = [
  {
    name: 'Usuarios',
    icon: 'group',
    path: '/admin/users',
    color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30',
    get count(){ return profiles.value.length }
  },
  {
    name: 'Asignaturas',
    icon: 'menu_book',
    path: '/admin/subjets',
    color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30',
    get count(){ return subjects.value.length }
  },
  {
    name: 'Grupos',
    icon: 'groups',
    path: '/admin/groups',
    color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30',
    get count(){ return groups.value.length }
  },
  {
    name: 'Localizaciones',
    icon: 'location_on',
    path: '/admin/locations',
    color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30',
    get count(){ return locations.value.length }
  },
  {
    name: 'Horarios',
    icon: 'schedule',
    path: '/admin/schedules',
    color: 'text-pink-600 bg-pink-50 dark:bg-pink-900/30',
    get count(){ return schedules.value.length }
  }
]
</script>

<template>
  <div class="space-y-4">
    <div class="max-w-7xl mx-auto p-6 space-y-6">
      
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 class="text-3xl font-light text-slate-900 dark:text-slate-900">Panel de Control</h1>
          <p class="text-slate-500 text-sm mt-1">Gestión general del sistema</p>
        </div>

        <div v-if="!loading" class="flex items-center gap-4 bg-white dark:bg-slate-900 px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div class="flex flex-col">
            <span class="text-sm font-semibold text-slate-700 dark:text-slate-200">Matriculación de alumnos</span>
            <span class="text-xs text-slate-500" :class="isRegistrationOpen ? 'text-green-600 font-medium' : ''">
              {{ isRegistrationOpen ? 'Actualmente ABIERTA' : 'Actualmente CERRADA' }}
            </span>
          </div>
          
          <button 
            @click="toggleRegistration"
            :disabled="togglingRegistration"
            class="relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            :class="isRegistrationOpen ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-700'"
            role="switch"
            :aria-checked="isRegistrationOpen"
          >
            <span v-if="togglingRegistration" class="absolute inset-0 flex items-center justify-center">
              <span class="animate-spin size-4 border-2 border-white border-t-transparent rounded-full"></span>
            </span>
            <span 
              v-else
              aria-hidden="true" 
              class="pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
              :class="isRegistrationOpen ? 'translate-x-5' : 'translate-x-0'"
            ></span>
          </button>
        </div>
      </div>

      <div v-if="loading" class="flex flex-col items-center py-20">
        <div class="animate-spin size-10 border-4 border-[#e4002b] border-t-transparent rounded-full mb-4"></div>
        <p class="text-slate-500 animate-pulse">Cargando dashboard...</p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <router-link
          v-for="card in cards"
          :key="card.name"
          :to="card.path"
          class="group relative flex items-stretch bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden hover:border-indigo-300 transition-all shadow-sm hover:shadow-md"
        >
          <div class="w-1.5 self-stretch bg-[#e4002b]"></div>

          <div class="flex-1 p-6">
            <div class="flex items-center justify-between mb-4">
              <div 
                class="p-2.5 rounded text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 group-hover:text-[#0090e4] group-hover:bg-indigo-50 transition-colors"
                :class="card.color"
              >
                <span class="material-symbols-outlined text-2xl">
                  {{ card.icon }}
                </span>
              </div>
            </div>

            <div class="space-y-1">
              <p class="text-xs text-slate-400 font-bold uppercase tracking-tight">
                {{ card.name }}
              </p>
              <p class="text-4xl font-light text-slate-800 dark:text-white tracking-tight">
                {{ card.count }}
              </p>
            </div>
            
            <div class="mt-4 flex items-center text-xs font-medium text-[#0090e4] opacity-0 group-hover:opacity-100 transition-opacity">
              Gestionar <span class="material-symbols-outlined text-sm ml-1">arrow_forward</span>
            </div>
          </div>
        </router-link>
      </div>
    </div>

    <Transition enter-active-class="transform ease-out duration-300 transition" enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-4" enter-to-class="translate-y-0 opacity-100 sm:translate-x-0" leave-active-class="transition ease-in duration-200" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="alert.show && alert.type === 'success'" class="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-white dark:bg-slate-900 shadow-xl rounded-lg border border-slate-200 flex items-stretch overflow-hidden">
        <div class="w-1.5 bg-green-500"></div>
        <div class="flex-1 p-4 flex items-center gap-4">
          <div class="flex items-center justify-center h-10 w-10 rounded-full bg-green-50 text-green-600">
            <span class="material-symbols-outlined text-xl">check_circle</span>
          </div>
          <div class="flex-1">
            <h3 class="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-tight">¡Actualizado!</h3>
            <p class="text-xs text-slate-500 mt-0.5">{{ alert.message }}</p>
          </div>
        </div>
      </div>
    </Transition>

    <Transition enter-active-class="ease-out duration-300" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="ease-in duration-200" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="alert.show && alert.type === 'error'" class="fixed inset-0 z-100 flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px]" @click="alert.show = false"></div>
        <div class="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-lg shadow-2xl p-8 text-center border border-slate-200">
          <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-50 mb-6">
            <span class="material-symbols-outlined text-red-500 text-4xl">error</span>
          </div>
          <h3 class="text-2xl font-light text-slate-800 dark:text-white mb-3">Error</h3>
          <p class="text-slate-500 text-sm mb-6">{{ alert.message }}</p>
          <button @click="alert.show = false" class="w-full bg-[#262626] text-white py-3 rounded font-medium">Cerrar</button>
        </div>
      </div>
    </Transition>
  </div>
</template>