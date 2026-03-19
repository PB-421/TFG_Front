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

async function loadData() {

  try {

    const [
      usersRes,
      subjectsRes,
      gruposRes,
      locRes,
      horariosRes
    ] = await Promise.all([
      fetch(`${API_URL}/api/profiles/GetAll`, { credentials:'include' }),
      fetch(`${API_URL}/api/subjects`, { credentials:'include' }),
      fetch(`${API_URL}/api/groups`, { credentials:'include' }),
      fetch(`${API_URL}/api/locations`, { credentials:'include' }),
      fetch(`${API_URL}/api/schedules`, { credentials:'include' })
    ])

    profiles.value = await usersRes.json()
    subjects.value = await subjectsRes.json()
    groups.value = await gruposRes.json()
    locations.value = await locRes.json()
    schedules.value = await horariosRes.json()

  } finally {
    loading.value = false
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
    path: '/admin/grupos',
    color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30',
    get count(){ return groups.value.length }
  },
  {
    name: 'Localizaciones',
    icon: 'location_on',
    path: '/admin/localizaciones',
    color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30',
    get count(){ return locations.value.length }
  },
  {
    name: 'Horarios',
    icon: 'schedule',
    path: '/admin/horarios',
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
          <h1 class="text-3xl font-light text-slate-800 dark:text-white">Panel de Control</h1>
          <p class="text-slate-500 text-sm mt-1">Gestión general del sistema</p>
        </div>
      </div>

      <div v-if="loading" class="flex flex-col items-center py-20">
        <div class="animate-spin size-10 border-4 border-[#0090e4] border-t-transparent rounded-full mb-4"></div>
        <p class="text-slate-500 animate-pulse">Cargando estadísticas...</p>
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
  </div>
</template>