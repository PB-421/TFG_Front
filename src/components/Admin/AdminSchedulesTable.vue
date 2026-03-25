<script setup lang="ts">
import { ref, onMounted } from 'vue'
import ModalWindow from '@/components/ModalWindow.vue'

const API_URL = import.meta.env.VITE_API_URL

interface Schedule {
  id?: string
  groupId?: string
  startDate: string
  endDate: string
  locationId?: string
  // El DTO del back trae objetos anidados, los mapeamos aquí
  group?: { id: string, name: string }
  location?: { id: string, name: string }
}

interface SimpleEntity { id: string; name: string }

const schedules = ref<Schedule[]>([])
const groups = ref<SimpleEntity[]>([])
const locations = ref<SimpleEntity[]>([])
const loading = ref(true)

const modalOpen = ref(false)
const modalMode = ref<'create' | 'edit' | 'delete'>('create')
const selectedSchedule = ref<Schedule | null>(null)

// Helpers para visualización
const getGroupName = (id?: string) => groups.value.find(g => g.id === id)?.name || 'Sin grupo'
const getLocationName = (id?: string) => locations.value.find(l => l.id === id)?.name || 'Sin ubicación'
const formatDate = (dateStr?: string) => {
  if (!dateStr) return '---'
  return new Date(dateStr).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
}

async function fetchData() {
  loading.value = true
  try {
    const [resSchedules, resGroups, resLocations] = await Promise.all([
      fetch(`${API_URL}/api/schedules`, { credentials: 'include' }),
      fetch(`${API_URL}/api/groups`, { credentials: 'include' }),
      fetch(`${API_URL}/api/locations`, { credentials: 'include' }) // Ajusta si el endpoint varía
    ])

    if (resSchedules.ok) schedules.value = await resSchedules.json()
    if (resGroups.ok) groups.value = await resGroups.json()
    if (resLocations.ok) locations.value = await resLocations.json()
  } catch (error) {
    console.error("Error cargando horarios:", error)
  } finally {
    loading.value = false
  }
}

function openCreate() {
  modalMode.value = 'create'
  selectedSchedule.value = null
  modalOpen.value = true
}

function openEdit(schedule: Schedule) {
  modalMode.value = 'edit'
  // Mapeamos los IDs si vienen anidados del DTO para que el modal los reconozca
  selectedSchedule.value = { 
    ...schedule,
    groupId: schedule.groupId || schedule.group?.id,
    locationId: schedule.locationId || schedule.location?.id
  }
  modalOpen.value = true
}

function openDelete(schedule: Schedule) {
  modalMode.value = 'delete'
  selectedSchedule.value = schedule
  modalOpen.value = true
}

async function handleSubmit(data: any) {
  const headers = { 'Content-Type': 'application/json' }
  let response;
  
  // Construimos el objeto según tus DTOs de C#
  const payload = {
    Id: modalMode.value === 'edit' ? selectedSchedule.value?.id : undefined,
    StartDate: data.startDate,
    EndDate: data.endDate,
    Group: { Id: data.groupId }, // Enviamos el objeto Group con su ID
    Location: { Id: data.locationId } // Enviamos el objeto Location con su ID
  }

  try {
    if (modalMode.value === 'create') {
      response = await fetch(`${API_URL}/api/schedules`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify([payload]) // Se envía dentro de un array []
      })
    }

    if (modalMode.value === 'edit' && selectedSchedule.value) {
      response = await fetch(`${API_URL}/api/schedules/${selectedSchedule.value.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers,
        body: JSON.stringify(payload)
      })
    }

    if (modalMode.value === 'delete' && selectedSchedule.value) {
      response = await fetch(`${API_URL}/api/schedules/${selectedSchedule.value.id}`, {
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
    console.error("Error en la operación de horario:", error)
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
        <h1 class="text-3xl font-light text-slate-800 dark:text-white">Programación de Horarios</h1>
        <p class="text-slate-500 text-sm mt-1">Calendario de sesiones</p>
      </div>
      <button @click="openCreate" class="flex items-center gap-2 bg-[#262626] hover:bg-black text-white px-6 py-2.5 rounded shadow-sm transition-all font-medium text-sm">
        <span class="material-symbols-outlined text-sm">+</span>
        Programar Sesión
      </button>
    </div>

    <div v-if="loading" class="flex flex-col items-center py-20">
      <div class="animate-spin size-10 border-4 border-[#e4002b] border-t-transparent rounded-full mb-4"></div>
      <p class="text-slate-500 animate-pulse">Cargando horarios...</p>
    </div>

    <div v-else class="space-y-4">
      <div v-for="item in schedules" :key="item.id" 
           class="group relative flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden hover:border-indigo-300 transition-all">
        
        <div class="w-1.5 self-stretch bg-[#e4002b]"></div>

        <div class="flex-1 grid grid-cols-1 md:grid-cols-12 items-center px-6 py-5 gap-4">
          
          <div class="md:col-span-3 flex items-center gap-4 border-r border-slate-100 pr-4">
            <div class="text-center min-w-50px">
              <div class="text-xs font-black text-slate-400 uppercase">{{ new Date(item.startDate).toLocaleString('es', { month: 'short' }) }}</div>
              <div class="text-2xl font-light text-slate-800 dark:text-white leading-none">{{ new Date(item.startDate).getDate() }}</div>
            </div>
            <div class="flex flex-col">
              <span class="text-sm font-bold text-slate-700 dark:text-slate-200">
                {{ new Date(item.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }} - {{ new Date(item.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
              </span>
            </div>
          </div>

          <div class="md:col-span-4 flex flex-col">
            <span class="text-xs text-slate-400 font-bold uppercase tracking-tighter">Grupo</span>
            <span class="text-base font-semibold text-white dark:text-white">
              {{ item.group?.name || getGroupName(item.groupId) }}
            </span>
          </div>

          <div class="md:col-span-3 flex flex-col">
            <span class="text-xs text-slate-400 font-bold uppercase tracking-tighter">Ubicación</span>
            <div class="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
              {{ item.location?.name || getLocationName(item.locationId) }}
            </div>
          </div>

          <div class="md:col-span-2 flex justify-end gap-2">
            <button @click="openEdit(item)" class="p-2 text-slate-400 hover:text-[#0090e4] hover:bg-indigo-50 rounded-full transition-colors">
              <span class="material-symbols-outlined">edit_calendar</span>
            </button>
            <button @click="openDelete(item)" class="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors">
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
      :item="selectedSchedule"
      :groups="groups" 
      :locations="locations"
      type="schedule"
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
            <p class="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
              {{ alert.message }}
            </p>
          </div>

          <div class="px-8 pb-8 flex flex-col">
            <button 
              @click="closeAlert"
              class="w-full bg-[#262626] hover:bg-black text-white px-6 py-3 rounded shadow-sm transition-all font-medium text-sm active:scale-[0.98]"
            >
              Cerrar y Reintentar
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>