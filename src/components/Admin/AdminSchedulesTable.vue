<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import ModalWindow from '@/components/ModalWindow.vue'
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  MapPinIcon, 
  CalendarIcon, 
  ClockIcon,
  PencilSquareIcon,
  TrashIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  NoSymbolIcon
} from '@heroicons/vue/24/solid'

const API_URL = import.meta.env.VITE_API_URL

interface Schedule {
  id?: string
  groupId?: string
  startDate: string
  endDate: string
  locationId?: string
  group?: { id: string, name: string }
  location?: { id: string, name: string }
}

interface SimpleEntity { id: string; name: string }

const schedules = ref<Schedule[]>([])
const groups = ref<SimpleEntity[]>([])
const locations = ref<SimpleEntity[]>([])
const loading = ref(true)
const isSubmitting = ref(false)
const searchQuery = ref('')
const searchDate = ref('')
const searchLocation = ref('')

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

  isSubmitting.value = true;

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
  } finally {
    isSubmitting.value = false;
  }
}

const alert = ref({
  show: false,
  message: '',
  type: 'success' as 'success' | 'error'
})

const filteredSchedules = computed(() => {
  return schedules.value.filter(item => {

    const groupName = item.group?.name || getGroupName(item.groupId)
    const matchesName = groupName.toLowerCase().includes(searchQuery.value.toLowerCase())

    const locationName = item.location?.name || getLocationName(item.locationId)
    const matchesLocation = locationName.toLowerCase().includes(searchLocation.value.toLowerCase())

    let matchesDate = true
    if (searchDate.value) {
      const itemDate = new Date(item.startDate).toISOString().split('T')[0]
      matchesDate = itemDate === searchDate.value
    }

    return matchesName && matchesDate && matchesLocation
  })
})

const showAlert = (message: string, type: 'success' | 'error' = 'success') => {
  alert.value = { show: true, message, type }
  
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
        <h1 class="text-3xl font-light text-slate-900 dark:text-slate-900">Programación de Horarios</h1>
        <p class="text-slate-500 text-sm mt-1">Calendario de sesiones</p>
      </div>
      <button @click="openCreate" class="flex items-center gap-2 bg-[#262626] hover:bg-black text-white px-6 py-2.5 rounded shadow-sm transition-all font-medium text-sm">
        <PlusIcon class="size-4 stroke-[3px]" />
        Programar Sesión
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="relative">
        <MagnifyingGlassIcon class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-5" />
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="Buscar por grupo..." 
          class="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-[#e4002b] outline-none transition-all"
        />
      </div>

      <div class="relative">
        <MapPinIcon class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-5" />
        <input 
          v-model="searchLocation"
          type="text" 
          placeholder="Buscar por ubicación..." 
          class="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-[#e4002b] outline-none transition-all"
        />
      </div>
      
      <div class="relative">
        <CalendarIcon class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-5 pointer-events-none" />
        <input 
          v-model="searchDate"
          type="date" 
          class="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-[#e4002b] outline-none transition-all"
        />
        <button v-if="searchDate" @click="searchDate = ''" class="absolute right-12 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500" placeholder="Limpiar filtro">
          <XMarkIcon class="size-5" />
        </button>
      </div>
    </div>

    <div v-if="loading" class="flex flex-col items-center py-20">
      <div class="animate-spin size-10 border-4 border-[#e4002b] border-t-transparent rounded-full mb-4"></div>
      <p class="text-slate-500 animate-pulse">Cargando horarios...</p>
    </div>

    <div v-if="filteredSchedules.length === 0 && !loading" class="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
      <NoSymbolIcon class="size-12 text-slate-300 mx-auto" />
      <p class="text-slate-500 mt-2">No se encontraron horarios con esos filtros.</p>
      <button @click="searchQuery = ''; searchDate = ''; searchLocation= ''" class="text-[#0090e4] text-sm font-medium mt-1 hover:underline">Limpiar filtros</button>
    </div>

    <div v-else class="space-y-4">
      <div v-for="item in filteredSchedules" :key="item.id" 
           class="group relative flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden hover:border-indigo-300 transition-all">
        
        <div class="w-1.5 self-stretch bg-[#e4002b]"></div>

        <div class="flex-1 grid grid-cols-1 md:grid-cols-12 items-center px-6 py-5 gap-4">
          
          <div class="md:col-span-3 flex items-center gap-4 border-r border-slate-100 pr-4">
            <div class="text-center min-w-50px">
              <div class="text-xs font-black text-slate-400 uppercase">{{ new Date(item.startDate).toLocaleString('es', { month: 'short' }) }}</div>
              <div class="text-2xl font-light text-slate-800 dark:text-white leading-none">{{ new Date(item.startDate).getDate() }}</div>
            </div>
            <div class="flex flex-col">
              <div class="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 font-bold">
                  <ClockIcon class="size-4 text-slate-400" />
                  <span>
                    {{ new Date(item.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }} - 
                    {{ new Date(item.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
                  </span>
                </div>
            </div>
          </div>

          <div class="md:col-span-4 flex flex-col">
            <span class="text-xs text-slate-400 font-bold uppercase tracking-tighter">Grupo</span>
            <div class="flex items-center gap-2 mt-0.5">
              <CalendarDaysIcon class="size-5 text-slate-400" />
              <span class="text-base font-semibold text-slate-800 dark:text-white truncate">
                {{ item.group?.name || getGroupName(item.groupId) }}
              </span>
            </div>
          </div>

          <div class="md:col-span-3 flex flex-col">
            <span class="text-xs text-slate-400 font-bold uppercase tracking-tighter">Ubicación</span>
            <div class="flex items-center gap-1.5 mt-1 text-sm text-slate-600 dark:text-slate-400">
              <MapPinIcon class="size-4 text-[#e4002b]" />
              <span class="font-medium">
                {{ item.location?.name || getLocationName(item.locationId) }}
              </span>
            </div>
          </div>

          <div class="md:col-span-2 flex justify-end gap-2">
            <button @click="openEdit(item)" class="p-2 text-slate-400 hover:text-[#0090e4] hover:bg-indigo-50 rounded-full transition-colors">
              <PencilSquareIcon class="size-5" />
            </button>
            <button @click="openDelete(item)" class="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors">
              <TrashIcon class="size-5" />
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
      :loading="isSubmitting"
      type="schedule"
      @close="modalOpen = false"
      @submit="handleSubmit"
    />

    <Transition name="fade-up">
      <div v-if="alert.show && alert.type === 'success'" class="fixed bottom-6 right-6 z-100 max-w-sm w-full bg-white dark:bg-slate-900 shadow-xl rounded-lg border border-slate-200 dark:border-slate-800 flex items-stretch overflow-hidden">
        <div class="w-1.5 bg-green-500"></div>
        <div class="flex-1 p-4 flex items-center gap-4">
          <CheckCircleIcon class="size-8 text-green-500" />
          <div class="flex-1">
            <h3 class="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-tight">¡Programación Actualizada!</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{{ alert.message }}</p>
          </div>
          <button @click="closeAlert" class="p-1 text-slate-300 hover:text-slate-500 transition-colors">
            <XMarkIcon class="size-5" />
          </button>
        </div>
      </div>
    </Transition>

    <Transition name="fade">
      <div v-if="alert.show && alert.type === 'error'" class="fixed inset-0 z-200 flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px]" @click="closeAlert"></div>
        <div class="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all">
          <div class="p-8 text-center">
            <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-50 dark:bg-red-900/10 mb-6">
              <ExclamationTriangleIcon class="size-10 text-red-500" />
            </div>
            <h3 class="text-2xl font-light text-slate-800 dark:text-white mb-3">Error de Programación</h3>
            <p class="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{{ alert.message }}</p>
          </div>
          <div class="px-8 pb-8 flex flex-col">
            <button @click="closeAlert" class="w-full bg-[#262626] hover:bg-black text-white px-6 py-3 rounded shadow-sm transition-all font-medium text-sm">Cerrar</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>