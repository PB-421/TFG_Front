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
        body: JSON.stringify(payload) // Para PUT suele ser el objeto directo
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

const alert = ref<{ show: boolean, message: string, type: 'success' | 'error' }>({
  show: false,
  message: '',
  type: 'success'
})

const showAlert = (message: string, type: 'success' | 'error' = 'success') => {
  alert.value = { show: true, message, type }
  setTimeout(() => {
    alert.value.show = false
  }, 4000)
}

onMounted(fetchData)
</script>

<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Gestión de Horarios</h1>
      <button @click="openCreate" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all active:scale-95">
        + Nuevo Horario
      </button>
    </div>

    <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div v-if="loading" class="p-20 text-center">
        <div class="animate-spin inline-block size-8 border-[3px] border-indigo-600 border-t-transparent rounded-full mb-4"></div>
        <p class="text-slate-500 font-medium">Accediendo a la base de datos...</p>
      </div>
      
      <table v-else class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
            <th class="px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider">Grupo</th>
            <th class="px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider">Ubicación</th>
            <th class="px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider">Inicio</th>
            <th class="px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider">Fin</th>
            <th class="px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider text-right">Acciones</th>
          </tr>
        </thead>

        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          <tr v-for="item in schedules" :key="item.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group/row">
            <td class="px-6 py-4">
              <span class="text-sm font-bold text-slate-900 dark:text-white">
                {{ item.group?.name || getGroupName(item.groupId) }}
              </span>
            </td>

            <td class="px-6 py-4">
              <div class="flex items-center gap-2">
                <span class="text-sm font-bold text-slate-900 dark:text-white">
                  {{ item.location?.name || getLocationName(item.locationId) }}
                </span>
              </div>
            </td>

            <td class="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
              {{ formatDate(item.startDate) }}
            </td>

            <td class="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
              {{ formatDate(item.endDate) }}
            </td>

            <td class="px-6 py-4 text-right">
              <div class="relative inline-block group">
                 <button class="p-2 text-slate-400 group-hover:text-indigo-600 transition-colors">
                  <span class="material-symbols-outlined text-lg leading-none">more_vert</span>
                </button>
                <div class="absolute right-0 top-0 mt-0 hidden group-hover:flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg z-10 px-1 py-1">
                  <button @click="openEdit(item)" class="p-2 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-md">
                    <span class="material-symbols-outlined text-sm">edit</span>
                  </button>
                  <button @click="openDelete(item)" class="p-2 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-md">
                    <span class="material-symbols-outlined text-sm">delete</span>
                  </button>
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
      :item="selectedSchedule"
      :groups="groups" 
      :locations="locations"
      type="schedule"
      @close="modalOpen = false"
      @submit="handleSubmit"
    />

    <Transition
      enter-active-class="transform ease-out duration-300 transition"
      enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
      enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
      leave-active-class="transition ease-in duration-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="alert.show" 
          class="fixed bottom-5 right-5 z-100 max-w-sm w-full bg-white dark:bg-slate-800 shadow-2xl rounded-xl border-l-4 p-4 flex items-center gap-3"
          :class="alert.type === 'success' ? 'border-green-500' : 'border-red-500'">
        
        <div :class="alert.type === 'success' ? 'text-green-500' : 'text-red-500'">
          <span class="material-symbols-outlined">
            {{ alert.type === 'success' ? 'check_circle' : 'error' }}
          </span>
        </div>

        <div class="flex-1">
          <p class="text-sm font-bold text-slate-900 dark:text-white">
            {{ alert.type === 'success' ? '¡Éxito!' : 'Ha ocurrido un error' }}
          </p>
          <p class="text-xs text-slate-500 dark:text-slate-400">
            {{ alert.message }}
          </p>
        </div>

        <button @click="alert.show = false" class="text-slate-400 hover:text-slate-600">
          <span class="material-symbols-outlined text-sm">close</span>
        </button>
      </div>
    </Transition>
  </div>
</template>