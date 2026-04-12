<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import ModalWindow from '@/components/ModalWindow.vue'
import { 
  PlusIcon, MagnifyingGlassIcon, MapPinIcon, CalendarIcon, ClockIcon,
  PencilSquareIcon, TrashIcon, CalendarDaysIcon, CheckCircleIcon,
  ExclamationTriangleIcon, XMarkIcon, NoSymbolIcon, ChevronLeftIcon,
  ChevronRightIcon, ListBulletIcon, InformationCircleIcon, UserGroupIcon
} from '@heroicons/vue/24/solid'

const API_URL = import.meta.env.VITE_API_URL

// --- Interfaces ---
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

// --- Estado General ---
const schedules = ref<Schedule[]>([])
const groups = ref<SimpleEntity[]>([])
const locations = ref<SimpleEntity[]>([])
const loading = ref(true)
const isSubmitting = ref(false)
const viewMode = ref<'list' | 'calendar'>('list')

// --- Filtros ---
const searchQuery = ref('')
const searchDate = ref('')
const searchLocation = ref('')

// --- Estado Calendario ---
const currentDate = ref(new Date())
const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]

// --- Modales ---
const modalOpen = ref(false)
const modalMode = ref<'create' | 'edit' | 'delete'>('create')
const selectedSchedule = ref<Schedule | null>(null)

const alert = ref({
  show: false,
  message: '',
  type: 'success' as 'success' | 'error'
})

// --- Lógica de Calendario ---
const daysInMonth = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const days = new Date(year, month + 1, 0).getDate()
  const padding = firstDay === 0 ? 6 : firstDay - 1 
  return { padding, days, month, year }
})

const changeMonth = (offset: number) => {
  currentDate.value = new Date(currentDate.value.setMonth(currentDate.value.getMonth() + offset))
}

const getSessionsForDay = (day: number) => {
  return filteredSchedules.value.filter(s => {
    const d = new Date(s.startDate)
    return d.getDate() === day && 
           d.getMonth() === currentDate.value.getMonth() && 
           d.getFullYear() === currentDate.value.getFullYear()
  }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
}

// --- Helpers ---
const getGroupName = (id?: string) => groups.value.find(g => g.id === id)?.name || 'Sin grupo'
const getLocationName = (id?: string) => locations.value.find(l => l.id === id)?.name || 'Sin ubicación'
const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

// --- Acciones de API ---
async function fetchData() {
  loading.value = true
  try {
    const [resSchedules, resGroups, resLocations] = await Promise.all([
      fetch(`${API_URL}/api/schedules`, { credentials: 'include' }),
      fetch(`${API_URL}/api/groups`, { credentials: 'include' }),
      fetch(`${API_URL}/api/locations`, { credentials: 'include' })
    ])
    if (resSchedules.ok) schedules.value = await resSchedules.json()
    if (resGroups.ok) groups.value = await resGroups.json()
    if (resLocations.ok) locations.value = await resLocations.json()
  } catch (error) { console.error("Error cargando datos:", error) }
  finally { loading.value = false }
}

function openCreate() {
  modalMode.value = 'create'; selectedSchedule.value = null; modalOpen.value = true
}

function openEdit(schedule: Schedule) {
  modalMode.value = 'edit'
  selectedSchedule.value = { 
    ...schedule,
    groupId: schedule.groupId || schedule.group?.id,
    locationId: schedule.locationId || schedule.location?.id
  }
  modalOpen.value = true
}

function openDelete(schedule: Schedule) {
  modalMode.value = 'delete'; selectedSchedule.value = schedule; modalOpen.value = true
}

async function handleSubmit(data: any) {
  const headers = { 'Content-Type': 'application/json' }
  let response;
  const payload = {
    Id: modalMode.value === 'edit' ? selectedSchedule.value?.id : undefined,
    StartDate: data.startDate,
    EndDate: data.endDate,
    Group: { Id: data.groupId },
    Location: { Id: data.locationId }
  }
  isSubmitting.value = true;
  try {
    if (modalMode.value === 'create') {
      response = await fetch(`${API_URL}/api/schedules`, {
        method: 'POST', credentials: 'include', headers, body: JSON.stringify([payload])
      })
    } else if (modalMode.value === 'edit' && selectedSchedule.value) {
      response = await fetch(`${API_URL}/api/schedules/${selectedSchedule.value.id}`, {
        method: 'PUT', credentials: 'include', headers, body: JSON.stringify(payload)
      })
    } else if (modalMode.value === 'delete' && selectedSchedule.value) {
      response = await fetch(`${API_URL}/api/schedules/${selectedSchedule.value.id}`, {
        method: 'DELETE', credentials: 'include'
      })
    }
    
    if (response?.ok) {
      showAlert('Operación realizada con éxito', 'success')
      modalOpen.value = false
      fetchData()
    } else {
      const msg = await response?.text()
      showAlert(msg || 'Error en el servidor', 'error')
    }
  } catch (error) { console.error(error) }
  finally { isSubmitting.value = false }
}

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
  if (type === 'success') setTimeout(() => alert.value.show = false, 4000)
}

const closeAlert = () => {
  alert.value.show = false
}

onMounted(fetchData)
</script>

<template>
  <div class="max-w-6xl mx-auto p-6 space-y-6">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
      <div>
        <h1 class="text-3xl font-light text-slate-900 dark:text-slate-900">Gestión de Horarios</h1>
        <p class="text-slate-500 text-sm mt-1">
          <span v-if="viewMode === 'list'">Vista de listado detallado</span>
          <span v-else>Vista de calendario mensual</span>
        </p>
      </div>
      
      <div class="flex items-center gap-3">
        <div class="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          <button @click="viewMode = 'list'" 
            :class="[viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-[#e4002b]' : 'text-slate-500']" 
            class="p-2 rounded-md transition-all">
            <ListBulletIcon class="size-5" />
          </button>
          <button @click="viewMode = 'calendar'" 
            :class="[viewMode === 'calendar' ? 'bg-white dark:bg-slate-700 shadow-sm text-[#e4002b]' : 'text-slate-500']" 
            class="p-2 rounded-md transition-all">
            <CalendarDaysIcon class="size-5" />
          </button>
        </div>

        <button @click="openCreate" class="flex items-center gap-2 bg-[#262626] hover:bg-black text-white px-6 py-2.5 rounded shadow-sm transition-all font-medium text-sm">
          <PlusIcon class="size-4 stroke-[3px]" />
          Programar Sesión
        </button>
      </div>
    </div>

    <div class="flex flex-col md:flex-row gap-4 items-center">
      <div v-if="viewMode === 'list'" class="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
        <div class="relative">
          <MagnifyingGlassIcon class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-5" />
          <input v-model="searchQuery" type="text" placeholder="Buscar por grupo..." class="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#e4002b] outline-none" />
        </div>
        <div class="relative">
          <MapPinIcon class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-5" />
          <input v-model="searchLocation" type="text" placeholder="Buscar por ubicación..." class="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#e4002b] outline-none" />
        </div>
        <div class="relative">
          <CalendarIcon class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-5 pointer-events-none" />
          <input v-model="searchDate" type="date" class="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#e4002b] outline-none" />
          <button v-if="searchDate" @click="searchDate = ''" class="absolute right-12 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500" placeholder="Limpiar filtro">
          <XMarkIcon class="size-5" />
        </button>
        </div>
      </div>

      <div v-else class="flex items-center justify-between w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2 shadow-sm">
        <div class="flex items-center gap-4 ml-4">
          <CalendarDaysIcon class="size-5 text-[#e4002b]" />
          <span class="text-lg font-medium text-slate-700 dark:text-slate-200 uppercase tracking-tight">
            {{ monthNames[currentDate.getMonth()] }} {{ currentDate.getFullYear() }}
          </span>
        </div>
        <div class="flex items-center bg-slate-50 dark:bg-slate-800 rounded-lg p-1">
          <button @click="changeMonth(-1)" class="p-2 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm rounded-md transition-all text-slate-600 dark:text-slate-400">
            <ChevronLeftIcon class="size-5" />
          </button>
          <div class="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mes</div>
          <button @click="changeMonth(1)" class="p-2 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm rounded-md transition-all text-slate-600 dark:text-slate-400">
            <ChevronRightIcon class="size-5" />
          </button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="flex flex-col items-center py-20">
      <div class="animate-spin size-10 border-4 border-[#e4002b] border-t-transparent rounded-full mb-4"></div>
      <p class="text-slate-500 dark:text-slate-400 animate-pulse">Cargando horarios...</p>
    </div>

    <template v-else>
      <div v-if="viewMode === 'list'" class="space-y-4">
        <div v-if="filteredSchedules.length === 0" class="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
          <NoSymbolIcon class="size-12 text-slate-300 dark:text-slate-700 mx-auto" />
          <p class="text-slate-500 dark:text-slate-400 mt-2">No se encontraron horarios.</p>
        </div>
        <div v-for="item in filteredSchedules" :key="item.id" class="group relative flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden hover:border-[#e4002b]/30 transition-all">
          <div class="w-1.5 self-stretch bg-[#e4002b]"></div>
          <div class="flex-1 grid grid-cols-1 md:grid-cols-12 items-center px-6 py-5 gap-4">
            <div class="md:col-span-3 flex items-center gap-4 border-r border-slate-100 dark:border-slate-800 pr-4">
              <div class="text-center min-w-50px">
                <div class="text-xs font-black text-slate-400 uppercase">{{ new Date(item.startDate).toLocaleString('es', { month: 'short' }) }}</div>
                <div class="text-2xl font-light text-slate-800 dark:text-white leading-none">{{ new Date(item.startDate).getDate() }}</div>
              </div>
              <div class="flex flex-col text-slate-700 dark:text-slate-200 font-bold">
                <div class="flex items-center gap-1.5 text-sm">
                  <ClockIcon class="size-4 text-slate-400" />
                  <span>{{ formatTime(item.startDate) }} - {{ formatTime(item.endDate) }}</span>
                </div>
              </div>
            </div>
            <div class="md:col-span-4 flex flex-col">
              <span class="text-xs text-slate-400 font-bold uppercase tracking-tighter">Grupo</span>
              <div class="flex items-center gap-2 mt-0.5 font-semibold text-slate-800 dark:text-white">
                <UserGroupIcon class="size-5 text-slate-400" />
                {{ item.group?.name || getGroupName(item.groupId) }}
              </div>
            </div>
            <div class="md:col-span-3 flex flex-col">
              <span class="text-xs text-slate-400 font-bold uppercase tracking-tighter">Ubicación</span>
              <div class="flex items-center gap-1.5 mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">
                <MapPinIcon class="size-4 text-[#e4002b]" />
                {{ item.location?.name || getLocationName(item.locationId) }}
              </div>
            </div>
            <div class="md:col-span-2 flex justify-end gap-2">
              <button @click="openEdit(item)" class="p-2 text-slate-400 hover:text-[#0090e4] hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"><PencilSquareIcon class="size-5" /></button>
              <button @click="openDelete(item)" class="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"><TrashIcon class="size-5" /></button>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="bg-white dark:bg-slate-900 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div class="grid grid-cols-7 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200">
          <div v-for="d in ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']" :key="d" class="py-3 text-center text-[10px] font-bold text-slate-400 uppercase">{{ d }}</div>
        </div>
        <div class="grid grid-cols-7">
          <div v-for="p in daysInMonth.padding" :key="'p'+p" class="h-32 border-b border-r border-slate-100 bg-slate-50/30"></div>
          <div v-for="day in daysInMonth.days" :key="day" class="h-32 border-b border-r border-slate-100 relative group transition-colors hover:bg-slate-50/50">
            <span class="absolute top-3 left-4 text-sm font-medium text-slate-400">{{ day }}</span>
            
            <div v-if="getSessionsForDay(day).length > 0" class="mt-10 px-2">
              <div v-for="session in getSessionsForDay(day).slice(0, 2)" :key="session.id" class="bg-[#e4002b]/10 dark:bg-[#e4002b]/20 border-l-2 border-[#e4002b] px-2 py-0.5 mb-1">
                <p class="text-[9px] font-bold text-[#e4002b] truncate uppercase">{{ session.group?.name || getGroupName(session.groupId) }}</p>
              </div>
              <p v-if="getSessionsForDay(day).length > 2" class="text-[8px] text-slate-400 font-bold ml-1">+ {{ getSessionsForDay(day).length - 2 }} más</p>
            </div>

            <div v-if="getSessionsForDay(day).length > 0" class="custom-tooltip absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-4 rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
              <div class="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
                <div class="flex items-center gap-2">
                  <InformationCircleIcon class="size-4 text-[#e4002b]" />
                  <span class="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Programación Día {{ day }}</span>
                </div>
              </div>
              <div class="space-y-4 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                <div v-for="session in getSessionsForDay(day)" :key="session.id" class="relative pl-3 border-l-2 border-slate-200 dark:border-slate-700 hover:border-[#e4002b] transition-colors">
                  <div class="flex justify-between items-start">
                    <h4 class="text-xs font-black text-slate-800 dark:text-white uppercase truncate w-40">{{ session.group?.name || getGroupName(session.groupId) }}</h4>
                    <div class="flex gap-1">
                      <button @click="openEdit(session)" class="text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-1 rounded transition-colors"><PencilSquareIcon class="size-3.5" /></button>
                      <button @click="openDelete(session)" class="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-1 rounded transition-colors"><TrashIcon class="size-3.5" /></button>
                    </div>
                  </div>
                  <div class="text-[10px] text-slate-500 dark:text-slate-400 space-y-1 mt-1 font-medium">
                    <div class="flex items-center gap-1.5"><ClockIcon class="size-3 text-slate-400" /> {{ formatTime(session.startDate) }} - {{ formatTime(session.endDate) }}</div>
                    <div class="flex items-center gap-1.5"><MapPinIcon class="size-3 text-[#e4002b]" /> {{ session.location?.name || getLocationName(session.locationId) }}</div>
                  </div>
                </div>
              </div>
              <div class="tooltip-arrow"></div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <ModalWindow :show="modalOpen" :mode="modalMode" :item="selectedSchedule" :groups="groups" :locations="locations" :loading="isSubmitting" type="schedule" @close="modalOpen = false" @submit="handleSubmit" />
    
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

<style scoped>
.custom-tooltip {
  transition: opacity 0.2s ease, visibility 0.2s;
  transition-delay: 0.1s; 
  pointer-events: auto;
}
.group:hover .custom-tooltip { transition-delay: 0s; }

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
:deep(.dark) .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; }

.tooltip-arrow {
  position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
  width: 0; height: 0;
  border-left: 8px solid transparent; border-right: 8px solid transparent;
  border-top: 8px solid white;
}
:deep(.dark) .tooltip-arrow { border-top-color: #334155; } /* slate-700 aprox */
</style>