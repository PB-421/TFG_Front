<script setup lang="ts">
import { ref, onMounted } from 'vue'
import ModalWindow from '@/components/ModalWindow.vue'
import { useAuthStore } from '@/stores/auth.store'

const API_URL = import.meta.env.VITE_API_URL
const auth = useAuthStore()

// Adaptado al LocationDto/Modelo de BBDD
interface Location {
  id?: string
  name: string
  capacity: number
}

const locations = ref<Location[]>([])
const loading = ref(true)

const modalOpen = ref(false)
const modalMode = ref<'create' | 'edit' | 'delete'>('create')
const selectedLocation = ref<Location | null>(null)

async function loadLocations() {
  loading.value = true
  try {
    // URL actualizada a /api/locations
    const res = await fetch(`${API_URL}/api/locations`, { credentials: 'include' })
    if (res.ok) {
      locations.value = await res.json()
    }
  } catch (error) {
    console.error("Error cargando ubicaciones:", error)
  } finally {
    loading.value = false
  }
}

function openCreate() {
  modalMode.value = 'create'
  selectedLocation.value = null
  modalOpen.value = true
}

function openEdit(location: Location) {
  modalMode.value = 'edit'
  selectedLocation.value = { ...location }
  modalOpen.value = true
}

function openDelete(location: Location) {
  modalMode.value = 'delete'
  selectedLocation.value = location
  modalOpen.value = true
}

async function handleSubmit(data: Location) {
  const headers = { 'Content-Type': 'application/json' }
  // El controlador ahora espera Guid id y LocationDto en el cuerpo
  
  try {
    if (modalMode.value === 'create') {
      await fetch(`${API_URL}/api/locations`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ Name: data.name, Capacity: data.capacity })
      })
    }

    if (modalMode.value === 'edit' && selectedLocation.value) {
      await fetch(`${API_URL}/api/locations/${selectedLocation.value.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers,
        body: JSON.stringify({ Id: selectedLocation.value.id, Name: data.name, Capacity: data.capacity })
      })
    }

    if (modalMode.value === 'delete' && selectedLocation.value) {
      await fetch(`${API_URL}/api/locations/${selectedLocation.value.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })
    }
  } catch (error) {
    console.error("Error en la operación:", error)
  }

  modalOpen.value = false
  loadLocations()
}

onMounted(loadLocations)
</script>

<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-bold text-slate-900 dark:text-white">
        Gestión de Ubicaciones
      </h1>

      <button
        @click="openCreate"
        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all active:scale-95"
      >
        + Nueva Ubicación
      </button>
    </div>

    <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      
      <div v-if="loading" class="p-20 text-center">
        <div class="animate-spin inline-block size-8 border-[3px] border-blue-600 border-t-transparent rounded-full mb-4"></div>
        <p class="text-slate-500 font-medium">Accediendo a la base de datos...</p>
      </div>
      
      <table v-else class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
            <th class="px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider">Nombre</th>
            <th class="px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider">Aforo</th>
            <th class="px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider text-right">Acciones</th>
          </tr>
        </thead>

        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          <tr v-for="loc in locations" :key="loc.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
            <td class="px-6 py-4 font-bold text-slate-900 dark:text-white">{{ loc.name }}</td>
            <td class="px-6 py-4 text-slate-600 dark:text-slate-400">{{ loc.capacity }} personas</td>
            <td class="px-6 py-4 text-right">
              <div class="relative inline-block group">
                <button class="p-2 text-slate-400 group-hover:text-blue-600">
                  <span class="material-symbols-outlined text-lg">more_vert</span>
                </button>
                <div class="absolute right-0 top-0 hidden group-hover:flex bg-white dark:bg-slate-800 border rounded-lg shadow-xl z-10 p-1">
                  <button @click="openEdit(loc)" class="p-2 hover:text-blue-600"><span class="material-symbols-outlined text-sm">edit</span></button>
                  <button @click="openDelete(loc)" class="p-2 hover:text-red-600"><span class="material-symbols-outlined text-sm">delete</span></button>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <ModalWindow
      :show="modalOpen"
      :mode="modalMode"
      :item="selectedLocation"
      type="location"
      @close="modalOpen = false"
      @submit="handleSubmit"
    />
  </div>
</template>