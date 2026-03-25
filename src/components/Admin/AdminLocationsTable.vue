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

async function fetchData() {
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
  let response;
  
  try {
    if (modalMode.value === 'create') {
      response = await fetch(`${API_URL}/api/locations`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ Name: data.name, Capacity: data.capacity })
      })
    }

    if (modalMode.value === 'edit' && selectedLocation.value) {
      response = await fetch(`${API_URL}/api/locations/${selectedLocation.value.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers,
        body: JSON.stringify({ Id: selectedLocation.value.id, Name: data.name, Capacity: data.capacity })
      })
    }

    if (modalMode.value === 'delete' && selectedLocation.value) {
      response = await fetch(`${API_URL}/api/locations/${selectedLocation.value.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })
    }

    if (response) {
      const message = await response.text(); 
      
      if (response.ok) {
        showAlert(message || 'Operación realizada con éxito', 'success');
        modalOpen.value = false;
        fetchData(); 
      } else {
        showAlert(message || 'Hubo un error en el servidor', 'error');
      }
    }
  } catch (error) {
    console.error("Error en la operación:", error)
  }
}

const alert = ref({
  show: false,
  message: '',
  type: 'success' as 'success' | 'error'
})

const showAlert = (message: string, type: 'success' | 'error' = 'success') => {
  alert.value = { show: true, message, type }
  
  // Solo cerramos automáticamente si es éxito
  if (type === 'success') {
    setTimeout(() => {
      alert.value.show = false
    }, 4000)
  }
}

const closeAlert = () => {
  alert.value.show = false
}

onMounted(fetchData)
</script>

<template>
  <div class="space-y-4">
    <div class="max-w-6xl mx-auto p-6 space-y-6">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 class="text-3xl font-light text-slate-800 dark:text-white">Gestión de Ubicaciones</h1>
        </div>
        <button @click="openCreate" class="flex items-center gap-2 bg-[#262626] hover:bg-black text-white px-6 py-2.5 rounded shadow-sm transition-all font-medium text-sm">
          <span class="material-symbols-outlined text-sm">+</span>
          Nueva Ubicación
        </button>
      </div>

      <div v-if="loading" class="flex flex-col items-center py-20">
        <div class="animate-spin size-10 border-4 border-[#e4002b] border-t-transparent rounded-full mb-4"></div>
        <p class="text-slate-500 animate-pulse">Cargando ubicaciones...</p>
      </div>

      <div v-else class="space-y-4">
        <div v-for="loc in locations" :key="loc.id" 
             class="group relative flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden hover:border-indigo-300 transition-all">
          
          <div class="w-1.5 self-stretch bg-[#e4002b]"></div>

          <div class="flex-1 grid grid-cols-1 md:grid-cols-12 items-center px-6 py-5 gap-4">
            
            <div class="md:col-span-5 flex items-center gap-4 border-r border-slate-100 pr-4">
              <div class="flex flex-col">
                <span class="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight">
                  {{ loc.name }}
                </span>
                <span class="text-[10px] text-slate-400 font-bold uppercase">Nombre de la Clase</span>
              </div>
            </div>

            <div class="md:col-span-5 flex flex-col">
              <span class="text-xs text-slate-400 font-bold uppercase tracking-tighter">Capacidad Máxima</span>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="text-base font-semibold text-white dark:text-white">
                  {{ loc.capacity }} Personas
                </span>
              </div>
            </div>

            <div class="md:col-span-2 flex justify-end gap-2">
              <button @click="openEdit(loc)" class="p-2 text-slate-400 hover:text-[#0090e4] hover:bg-indigo-50 rounded-full transition-colors">
                <span class="material-symbols-outlined">edit_note</span>
              </button>
              <button @click="openDelete(loc)" class="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors">
                <span class="material-symbols-outlined">delete_sweep</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <ModalWindow
      :show="modalOpen"
      :mode="modalMode"
      :item="selectedLocation"
      type="location"
      @close="modalOpen = false"
      @submit="handleSubmit"
    />

    <Transition
      enter-active-class="transform ease-out duration-300 transition"
      enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-4"
      enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="alert.show && alert.type === 'success'" 
          class="fixed bottom-6 right-6 z-100 max-w-sm w-full bg-white dark:bg-slate-900 shadow-xl rounded-lg border border-slate-200 dark:border-slate-800 flex items-stretch overflow-hidden">
        <div class="w-1.5 bg-green-500"></div>
        <div class="flex-1 p-4 flex items-center gap-4">
          <div class="flex items-center justify-center h-10 w-10 rounded-full bg-green-50 dark:bg-green-900/20 text-green-600">
            <span class="material-symbols-outlined text-xl">check_circle</span>
          </div>
          <div class="flex-1">
            <h3 class="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-tight">¡Operación Exitosa!</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{{ alert.message }}</p>
          </div>
          <button @click="closeAlert" class="p-1 text-slate-300 hover:text-slate-500 transition-colors">
            <span class="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      </div>
    </Transition>

    <Transition
      enter-active-class="ease-out duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="ease-in duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="alert.show && alert.type === 'error'" class="fixed inset-0 z-200 flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px]" @click="closeAlert"></div>
        <div class="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all">
          <div class="p-8 text-center">
            <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-50 dark:bg-red-900/10 mb-6">
              <span class="material-symbols-outlined text-red-500 text-4xl font-light">error</span>
            </div>
            <h3 class="text-2xl font-light text-slate-800 dark:text-white mb-3">Algo salió mal</h3>
            <p class="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{{ alert.message }}</p>
          </div>
          <div class="px-8 pb-8 flex flex-col">
            <button @click="closeAlert" class="w-full bg-[#262626] hover:bg-black text-white px-6 py-3 rounded shadow-sm transition-all font-medium text-sm active:scale-[0.98]">
              Cerrar y Reintentar
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>