<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { 
  UsersIcon, 
  BookOpenIcon, 
  UserGroupIcon, 
  MapPinIcon, 
  CalendarDaysIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  ArrowsRightLeftIcon,
  XMarkIcon // Añadido para cerrar el modal
} from '@heroicons/vue/24/solid'

const API_URL = import.meta.env.VITE_API_URL
const auth = useAuthStore()


// --- Interfaces ---
interface Profile { id: string; email: string; name: string; role: string }
interface Subject { id: string; name: string }
interface Group { id: string; name: string }
interface Location { id: string; name: string; capacity: number }
interface Schedule { id: string; Grupo: string }

// Nueva interfaz para la respuesta del algoritmo
interface AlgorithmResponse {
  message: string
  details: string[]
}

interface Profile {
  id: string;
  email: string;
  name: string;
}

// --- Estado ---
const profiles = ref<Profile[]>([])
const subjects = ref<Subject[]>([])
const groups = ref<Group[]>([])
const locations = ref<Location[]>([])
const schedules = ref<Schedule[]>([])

const loading = ref(true)
const isRegistrationOpen = ref(false)
const togglingRegistration = ref(false)
const processingAlgorithm = ref(false)
const adminProfile = ref<Profile | null>(null)

// Estado para los modales
const alert = ref({
  show: false,
  message: '',
  type: 'success' as 'success' | 'error'
})

// Nuevo estado para mostrar el resultado detallado del algoritmo
const algorithmResult = ref<AlgorithmResponse | null>(null)

const showAlert = (message: string, type: 'success' | 'error' = 'success') => {
  alert.value = { show: true, message, type }
  if (type === 'success') {
    setTimeout(() => alert.value.show = false, 4000)
  }
}

async function loadData() {
  try {

    const userId = await auth.isMicrosoftUser()

    const resProfile = await fetch(`${API_URL}/api/profiles/GetUser?id=${userId}`, { credentials: 'include' })
    if (!resProfile.ok) throw new Error('Usuario no encontrado')
    const profile: Profile = await resProfile.json()
    adminProfile.value = profile

    const [usersRes, subjectsRes, gruposRes, locRes, horariosRes, controlRes] = await Promise.all([
      fetch(`${API_URL}/api/profiles/GetAll?adminId=${adminProfile.value.id}`, { credentials:'include' }),
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

async function runDistributionAlgorithm() {
  if (isRegistrationOpen.value) return 

  processingAlgorithm.value = true
  try {
    const res = await fetch(`${API_URL}/api/algorithms/FillGroups`, { 
      method: 'GET',
      credentials: 'include' 
    })

    if (res.ok) {
      const data: AlgorithmResponse = await res.json()
      // Guardamos la respuesta para mostrarla en la ventana de éxito
      algorithmResult.value = data
      await loadData() // Recargar contadores de grupos
    } else {
      const errorText = await res.text()
      showAlert(errorText || 'Error en el proceso de distribución de grupos.', 'error')
    }
  } catch (error) {
    showAlert('Error de conexión al ejecutar el algoritmo.', 'error')
  } finally {
    processingAlgorithm.value = false
  }
}

onMounted(loadData)

const cards = [
  { name: 'Usuarios', icon: UsersIcon, path: '/admin/users', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30', get count(){ return profiles.value.length } },
  { name: 'Asignaturas', icon: BookOpenIcon, path: '/admin/subjets', color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30', get count(){ return subjects.value.length } },
  { name: 'Grupos', icon: UserGroupIcon, path: '/admin/groups', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30', get count(){ return groups.value.length } },
  { name: 'Localizaciones', icon: MapPinIcon, path: '/admin/locations', color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30', get count(){ return locations.value.length } },
  { name: 'Horarios', icon: CalendarDaysIcon, path: '/admin/schedules', color: 'text-pink-600 bg-pink-50 dark:bg-pink-900/30', get count(){ return schedules.value.length } }
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
          
          <div class="flex items-center pr-6 border-r border-slate-100 dark:border-slate-800">
            <button 
              @click="runDistributionAlgorithm"
              :disabled="isRegistrationOpen || processingAlgorithm"
              class="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all
                     disabled:opacity-30 disabled:cursor-not-allowed"
              :class="!isRegistrationOpen 
                ? 'bg-slate-900 text-[#e4002b] border border-[#e4002b] hover:bg-[#e4002b] hover:text-white' 
                : 'bg-slate-200 text-slate-400 border border-slate-200'"
            >
              <span v-if="processingAlgorithm" class="animate-spin size-3 border-2 border-current border-t-transparent rounded-full"></span>
              <ArrowsRightLeftIcon v-else class="size-4" />
              {{ processingAlgorithm ? 'Procesando...' : 'Repartir Alumnos' }}
            </button>
          </div>
          
          <div class="flex flex-col">
            <span class="text-sm font-semibold text-slate-700 dark:text-slate-200">Matriculación de alumnos</span>
            <span class="text-xs text-slate-500" :class="isRegistrationOpen ? 'text-green-600 font-medium' : ''">
              {{ isRegistrationOpen ? 'Actualmente ABIERTA' : 'Actualmente CERRADA' }}
            </span>
          </div>
          
          <button 
            @click="toggleRegistration"
            :disabled="togglingRegistration"
            class="relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50"
            :class="isRegistrationOpen ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-700'"
          >
            <span v-if="togglingRegistration" class="absolute inset-0 flex items-center justify-center">
              <span class="animate-spin size-4 border-2 border-white border-t-transparent rounded-full"></span>
            </span>
            <span 
              v-else
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
        <router-link v-for="card in cards" :key="card.name" :to="card.path"
          class="group relative flex items-stretch bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden hover:border-indigo-300 transition-all shadow-sm hover:shadow-md"
        >
          <div class="w-1.5 self-stretch bg-[#e4002b]"></div>
          <div class="flex-1 p-6">
            <div class="flex items-center justify-between mb-4">
              <div class="p-2.5 rounded transition-colors" :class="card.color">
                <component :is="card.icon" class="size-6 stroke-[1.5px]" />
              </div>
            </div>
            <div class="space-y-1">
              <p class="text-xs text-slate-400 font-bold uppercase tracking-tight">{{ card.name }}</p>
              <p class="text-4xl font-light text-slate-800 dark:text-white tracking-tight">{{ card.count }}</p>
            </div>
            <div class="mt-4 flex items-center text-xs font-medium text-[#0090e4] opacity-0 group-hover:opacity-100 transition-opacity">
              Gestionar <ArrowRightIcon class="size-4 ml-1" />
            </div>
          </div>
        </router-link>
      </div>
    </div>

    <Transition
      enter-active-class="ease-out duration-300" enter-from-class="opacity-0" enter-to-class="opacity-100"
      leave-active-class="ease-in duration-200" leave-from-class="opacity-100" leave-to-class="opacity-0"
    >
      <div v-if="algorithmResult" class="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]">
        <div class="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
          
          <div class="p-8 text-center border-b border-slate-100 dark:border-slate-800">
            <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-50 dark:bg-green-900/10 mb-6">
              <CheckCircleIcon class="size-10 text-green-500" />
            </div>
            <h3 class="text-2xl font-light text-slate-800 dark:text-white mb-2">{{ algorithmResult.message }}</h3>
            <p class="text-slate-500 text-sm">Resumen de la ejecución por asignatura:</p>
          </div>

          <div class="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-950/20">
            <div class="space-y-2">
              <div v-for="(detail, index) in algorithmResult.details" :key="index" 
                   class="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-sm">
                <div class="size-2 mt-1.5 rounded-full bg-green-500 shrink-0"></div>
                <span class="text-slate-700 dark:text-slate-300">{{ detail }}</span>
              </div>
            </div>
          </div>

          <div class="p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
            <button @click="algorithmResult = null" class="w-full bg-[#262626] hover:bg-black text-white py-3 rounded-lg font-medium transition-colors">
              Entendido
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <Transition  enter-active-class="ease-out duration-300" enter-from-class="opacity-0" enter-to-class="opacity-100"
      leave-active-class="ease-in duration-200" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="alert.show && alert.type === 'success'" class="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-white dark:bg-slate-900 shadow-xl rounded-lg border border-slate-200 flex items-stretch overflow-hidden">
        <div class="w-1.5 bg-green-500"></div>
        <div class="flex-1 p-4 flex items-center gap-4">
          <CheckCircleIcon class="size-8 text-green-500" />
          <div class="flex-1">
            <h3 class="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-tight">¡Actualizado!</h3>
            <p class="text-xs text-slate-500 mt-0.5">{{ alert.message }}</p>
          </div>
        </div>
      </div>
    </Transition>

    <Transition
      enter-active-class="ease-out duration-300" enter-from-class="opacity-0" enter-to-class="opacity-100"
      leave-active-class="ease-in duration-200" leave-from-class="opacity-100" leave-to-class="opacity-0"
    >
      <div v-if="alert.show && alert.type === 'error'" class="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]">
        <div class="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-lg shadow-2xl p-8 text-center border border-slate-200">
          <ExclamationTriangleIcon class="size-16 text-red-500 mx-auto mb-6" />
          <h3 class="text-2xl font-light text-slate-800 dark:text-white mb-3">Error</h3>
          <p class="text-slate-500 text-sm mb-6">{{ alert.message }}</p>
          <button @click="alert.show = false" class="w-full bg-[#262626] text-white py-3 rounded font-medium hover:bg-black transition-colors">Cerrar</button>
        </div>
      </div>
    </Transition>
  </div>
</template>