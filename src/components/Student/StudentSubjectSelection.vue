<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth.store'

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
      fetch(`${API_URL}/api/subjects`, { credentials: 'include' }),
      fetch(`${API_URL}/api/profiles/GetUser?id=${userId}`, { credentials: 'include' }),
      fetch(`${API_URL}/api/control/matriculacion`, { credentials: 'include' }) 
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
    const response = await fetch(`${API_URL}/api/profiles/UpdateUserSubjects/${userProfile.value.id}?userId=${userId}`, {
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
    
    <div v-if="!loading && !isRegistrationOpen" class="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-md">
      <div class="flex">
        <div class="shrink-0">
          <span class="material-symbols-outlined text-amber-500">info</span>
        </div>
        <div class="ml-3">
          <p class="text-sm text-amber-700">
            <strong>El periodo de selección de asignaturas está cerrado.</strong> Puedes ver tus asignaturas actuales, pero no realizar modificaciones.
          </p>
        </div>
      </div>
    </div>

    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
      <div>
        <h1 class="text-3xl font-light text-slate-900 dark:text-slate-900">Mis Asignaturas</h1>
        <p class="text-slate-500 text-sm mt-1">Selecciona las asignaturas que vas a cursar este trimestre.</p>
      </div>
      <button 
        @click="saveChanges" 
        :disabled="saving || !isRegistrationOpen"
        class="flex items-center gap-2 bg-[#262626] hover:bg-black disabled:bg-slate-400 disabled:cursor-not-allowed text-white px-8 py-2.5 rounded shadow-sm transition-all font-medium text-sm"
      >
        <span v-if="saving" class="animate-spin size-4 border-2 border-white border-t-transparent rounded-full"></span>
        <span v-else class="material-symbols-outlined text-sm">save</span>
        {{ saving ? 'Guardando...' : 'Guardar Cambios' }}
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="relative">
        <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">per</span>
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="Buscar por nombre..." 
          class="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-[#e4002b] outline-none transition-all"
        />
      </div>

      <div class="relative">
        <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">rol</span>
        <select 
          v-model="searchCourse"
          class="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-[#e4002b] outline-none transition-all appearance-none"
        >
          <option value='0'>Todos los cursos</option>
          <option value='1'>Primero</option>
          <option value='2'>Segundo</option>
          <option value='3'>Tercero</option>
          <option value='4'>Cuarto</option>
          <option value='5'>Quinto</option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="flex flex-col items-center py-20">
      <div class="animate-spin size-10 border-4 border-[#e4002b] border-t-transparent rounded-full mb-4"></div>
      <p class="text-slate-500 animate-pulse">Obteniendo oferta académica...</p>
    </div>

    <div v-if="filteredSubjects.length === 0 && !loading" class="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
      <span class="material-symbols-outlined text-4xl text-slate-300">search_off</span>
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
            : 'cursor-not-allowed opacity-80' // Cambia la apariencia si está cerrado
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
            <span class="material-symbols-outlined text-sm font-bold">done</span>
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
            <span class="material-symbols-outlined text-xl">check_circle</span>
          </div>
          <div class="flex-1">
            <h3 class="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-tight">¡Éxito!</h3>
            <p class="text-xs text-slate-500 mt-0.5">{{ alert.message }}</p>
          </div>
        </div>
      </div>
    </Transition>

    <Transition enter-active-class="ease-out duration-300" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="ease-in duration-200" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="alert.show && alert.type === 'error'" class="fixed inset-0 z-100 flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px]" @click="alert.show = false"></div>
        <div class="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-lg shadow-2xl p-8 text-center border border-slate-200">
          <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-50 mb-6">
            <span class="material-symbols-outlined text-red-500 text-4xl">error</span>
          </div>
          <h3 class="text-2xl font-light text-slate-800 dark:text-white mb-3">Error</h3>
          <p class="text-slate-500 text-sm mb-6">{{ alert.message }}</p>
          <button @click="alert.show = false" class="w-full bg-[#262626] text-white py-3 rounded font-medium">Cerrar</button>
        </div>
      </div>
    </Transition>
  </div>
</template>