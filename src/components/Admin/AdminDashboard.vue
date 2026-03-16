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

interface Horario {
  id: string
  idGrupo: string
}

const profiles = ref<Profile[]>([])
const subjects = ref<Subject[]>([])
const groups = ref<Group[]>([])
const locations = ref<Location[]>([])
const horarios = ref<Horario[]>([])

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
      fetch(`${API_URL}/api/horarios/GetAll`, { credentials:'include' })
    ])

    profiles.value = await usersRes.json()
    subjects.value = await subjectsRes.json()
    groups.value = await gruposRes.json()
    locations.value = await locRes.json()
    horarios.value = await horariosRes.json()

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
    get count(){ return horarios.value.length }
  }
]

</script>

<template>

<div class="p-8 max-w-7xl mx-auto space-y-8">

  <div>
    <p class="text-slate-500">
      Gestión general del sistema
    </p>
  </div>

  <div v-if="loading" class="text-center py-20">
    <div class="animate-spin inline-block size-8 border-[3px] border-blue-600 border-t-transparent rounded-full"></div>
  </div>

  <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

    <router-link
      v-for="card in cards"
      :key="card.name"
      :to="card.path"
      class="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group"
    >

      <div class="flex items-center justify-between mb-4">

        <div
          class="p-3 rounded-lg"
          :class="card.color"
        >
          <span class="material-symbols-outlined">
            {{ card.icon }}
          </span>
        </div>

        <span class="text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
          registros
        </span>

      </div>

      <p class="text-slate-500 text-sm font-medium">
        {{ card.name }}
      </p>

      <p class="text-3xl font-bold text-slate-900 dark:text-white mt-1">
        {{ card.count }}
      </p>

    </router-link>

  </div>

</div>

</template>