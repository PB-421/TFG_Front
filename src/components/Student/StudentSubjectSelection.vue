<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { 
  CheckCircleIcon, 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  ArrowPathIcon, 
  NoSymbolIcon, 
  InformationCircleIcon,
  CloudArrowUpIcon,
  ExclamationCircleIcon,
  XMarkIcon,
  CheckIcon,
  AcademicCapIcon
} from '@heroicons/vue/24/solid'

const API_URL = import.meta.env.VITE_API_URL
const auth = useAuthStore()

interface Subject {
  id: string
  name: string
  course: number
}

interface ProfileDto {
  id: string
  email: string
  name: string
  role: string
  subjects: Subject[]
}

const allSubjects = ref<Subject[]>([])
const userProfile = ref<ProfileDto | null>(null)
const selectedSubjectIds = ref<string[]>([])
const loading = ref(true)
const saving = ref(false)
const searchQuery = ref('')
const searchCourse = ref(0)
const isRegistrationOpen = ref(false)

const alert = ref({
  show: false,
  message: '',
  type: 'success' as 'success' | 'error'
})

async function fetchData() {
  loading.value = true
  try {
    const userId = await auth.isMicrosoftUser(); 
    
    const [resAllSubjects, resUser, resControl] = await Promise.all([
      fetch(`${API_URL}/api/subjects`, { credentials: 'include',headers: { 'Authorization': `${userId}` } }),
      fetch(`${API_URL}/api/profiles/GetUser?id=${userId}`, { credentials: 'include' }),
      fetch(`${API_URL}/api/control/matriculacion`, { credentials: 'include',headers: { 'Authorization': `${userId}` } }) 
    ])

    if (resAllSubjects.ok) allSubjects.value = await resAllSubjects.json()
    if (resUser.ok) {
      userProfile.value = await resUser.json()
      selectedSubjectIds.value = userProfile.value?.subjects.map(s => s.id) || []
    }
    
    if (resControl.ok) {
      const status = await resControl.json()
      isRegistrationOpen.value = typeof status === 'boolean' ? status : status.status
    }

  } catch (error) {
    console.error("Error cargando datos:", error)
    showAlert('Error al conectar con el servidor', 'error')
  } finally {
    loading.value = false
  }
}

const toggleSubject = (subjectId: string) => {
  if (!isRegistrationOpen.value) return 

  const index = selectedSubjectIds.value.indexOf(subjectId)
  if (index > -1) {
    selectedSubjectIds.value.splice(index, 1)
  } else {
    selectedSubjectIds.value.push(subjectId)
  }
}

const filteredSubjects = computed(() => {
  return allSubjects.value.filter(item => {
    const matchesName = item.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesCourse = searchCourse.value == 0 || item.course == searchCourse.value
    return matchesName && matchesCourse
  })
})

async function saveChanges() {
  if (!userProfile.value || !isRegistrationOpen.value) return
  
  saving.value = true
  try {
    const userId = await auth.isMicrosoftUser()
    const response = await fetch(`${API_URL}/api/profiles/UpdateUserSubjects?userId=${userId}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selectedSubjectIds.value)
    })

    const message = await response.text()
    if (response.ok) {
      showAlert(message || 'Inscripción actualizada correctamente', 'success')
    } else {
      showAlert(message || 'No se pudieron guardar los cambios', 'error')
    }
  } catch (error) {
    showAlert('Error de red al intentar guardar', 'error')
  } finally {
    saving.value = false
  }
}

const showAlert = (message: string, type: 'success' | 'error' = 'success') => {
  alert.value = { show: true, message, type }
  if (type === 'success') {
    setTimeout(() => alert.value.show = false, 4000)
  }
}

onMounted(fetchData)
</script>

<template>
  <div class="max-w-6xl mx-auto p-6 space-y-6">
    
    <Transition name="fade">
      <div v-if="!loading && !isRegistrationOpen" 
           class="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center gap-4 shadow-sm">
        <div class="bg-amber-500 p-2 rounded-lg">
          <NoSymbolIcon class="size-5 text-white" />
        </div>
        <div>
          <h4 class="text-sm font-black text-amber-800 uppercase tracking-tight">Periodo de Matrícula Cerrado</h4>
          <p class="text-xs text-amber-700 font-medium">Puedes consultar tus asignaturas, pero la edición de Matrícula no está disponible actualmente.</p>
        </div>
      </div>
    </Transition>

    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 pb-8">
      <div class="flex items-center gap-4">
        <div class="bg-slate-900 p-3 rounded-xl shadow-lg">
          <AcademicCapIcon class="size-7 text-white" />
        </div>
        <div>
          <h1 class="text-3xl font-light text-slate-900 dark:text-slate-900 tracking-tight">Mis Asignaturas</h1>
        </div>
      </div>
      
      <button 
        @click="saveChanges" 
        :disabled="saving || !isRegistrationOpen"
        class="flex items-center justify-center gap-3 bg-[#262626] hover:bg-black disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-10 py-3 rounded-xl shadow-xl shadow-slate-200 transition-all active:scale-95 font-black text-[10px] uppercase tracking-widest"
      >
        <ArrowPathIcon v-if="saving" class="animate-spin size-4" />
        <CloudArrowUpIcon v-else class="size-4" />
        {{ saving ? 'Sincronizando...' : 'Guardar Inscripción' }}
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="relative">
        <MagnifyingGlassIcon class="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 group-focus-within:text-[#e4002b] transition-colors" />
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="Buscar por nombre..." 
          class="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-[#e4002b] outline-none transition-all"
        />
      </div>

      <div class="relative">
        <FunnelIcon class="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 group-focus-within:text-[#e4002b] transition-colors" />
        <select 
          v-model="searchCourse"
          class="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-[#e4002b] outline-none transition-all appearance-none uppercase tracking-tighter"
        >
          <option :value='0'>Todos los Cursos Académicos</option>
          <option v-for="n in 5" :key="n" :value="n">{{ n }}º Curso</option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="flex flex-col items-center py-20">
      <div class="animate-spin size-10 border-4 border-[#e4002b] border-t-transparent rounded-full mb-4"></div>
      <p class="text-slate-500 animate-pulse">Obteniendo oferta académica...</p>
    </div>

    <div v-if="filteredSubjects.length === 0 && !loading" class="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
      <div class="bg-white size-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
        <MagnifyingGlassIcon class="size-8 text-slate-300" />
      </div>
      <p class="text-slate-500 mt-2">No se encontraron asignaturas con esos filtros.</p>
      <button @click="searchQuery = ''" class="text-[#0090e4] text-sm font-medium mt-1 hover:underline">Limpiar filtros</button>
    </div>

    <div v-else class="grid grid-cols-1 gap-4">
      <div 
        v-for="subject in filteredSubjects" 
        :key="subject.id"
        @click="toggleSubject(subject.id)"
        class="group relative flex items-center bg-white dark:bg-slate-900 border rounded-lg overflow-hidden transition-all duration-200"
        :class="[
          selectedSubjectIds.includes(subject.id) 
            ? 'border-green-600 ring-1 ring-green-600' 
            : 'border-slate-200 dark:border-slate-800',
          isRegistrationOpen 
            ? 'cursor-pointer hover:border-slate-400' 
            : 'cursor-not-allowed opacity-80'
        ]"
      >
        <div 
          class="w-1.5 self-stretch transition-colors"
          :class="selectedSubjectIds.includes(subject.id) ? 'bg-[#e4002b]' : 'bg-slate-300'"
        ></div>

        <div class="flex-1 flex items-center justify-between px-6 py-5">
          <div class="flex flex-col">
            <span class="text-xs text-slate-400 font-bold uppercase tracking-tighter">Asignatura</span>
            <span class="text-lg font-semibold text-slate-800 dark:text-slate-200">
              {{ subject.name }}
            </span>
          </div>

          <div 
            class="h-7 w-7 rounded-full border-2 flex items-center justify-center transition-all"
            :class="selectedSubjectIds.includes(subject.id) 
              ? 'bg-[#0090e4] border-[#0090e4] text-white' 
              : 'border-slate-200 text-transparent'"
          >
            <CheckIcon class="size-6 stroke-[3px]" />
          </div>
        </div>
      </div>

      <div v-if="allSubjects.length === 0" class="text-center py-20 border-2 border-dashed border-slate-200 rounded-xl">
        <p class="text-slate-400 italic">No hay asignaturas disponibles para inscripción.</p>
      </div>
    </div>

    <Transition enter-active-class="transform ease-out duration-300 transition" enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-4" enter-to-class="translate-y-0 opacity-100 sm:translate-x-0" leave-active-class="transition ease-in duration-200" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="alert.show && alert.type === 'success'" class="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-white dark:bg-slate-900 shadow-xl rounded-lg border border-slate-200 flex items-stretch overflow-hidden">
        <div class="w-1.5 bg-green-500"></div>
        <div class="flex-1 p-4 flex items-center gap-4">
          <div class="flex items-center justify-center h-10 w-10 rounded-full bg-green-50 text-green-600">
            <CheckCircleIcon class="size-6" />
          </div>
          <div class="flex-1">
            <h3 class="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-tight">¡Éxito!</h3>
            <p class="text-xs text-slate-500 mt-0.5">{{ alert.message }}</p>
          </div>
          <button @click="alert.show = false" class="text-slate-500 hover:text-white transition-colors">
            <XMarkIcon class="size-5" />
          </button>
        </div>
      </div>
    </Transition>

    <Transition enter-active-class="ease-out duration-300" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="ease-in duration-200" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="alert.show && alert.type === 'error'" class="fixed inset-0 z-100 flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px]" @click="alert.show = false"></div>
        <div class="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-lg shadow-2xl p-8 text-center border border-slate-200">
          <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-50 mb-6">
            <ExclamationCircleIcon class="size-10" />
          </div>
          <h3 class="text-2xl font-light text-slate-800 dark:text-white mb-3">Error</h3>
          <p class="text-slate-500 text-sm mb-6">{{ alert.message }}</p>
          <button @click="alert.show = false" class="w-full bg-[#262626] text-white py-3 rounded font-medium">Cerrar</button>
        </div>
      </div>
    </Transition>
  </div>
</template>