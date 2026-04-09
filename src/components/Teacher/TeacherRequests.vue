<script setup lang="ts">
import { ref, onMounted } from 'vue'
import TeacherRequestWindow from './TeacherRequestWindow.vue'
import { useAuthStore } from '@/stores/auth.store'

const API_URL = import.meta.env.VITE_API_URL
const auth = useAuthStore()

// --- Interfaces ---
interface RequestDto {
  id: string;
  studentId: string;
  originGroupId: string;
  destinationGroupId: string;
  weight: number;
  studentComment: string;
  teacherComment?: string;
  status: number;
  pdfPath?: string;
}

interface Profile {
  id: string;
  email: string;
  name: string;
}

interface Group { id: string; name: string; subjectId: string; }
interface Subject { id: string; name: string; }

// --- Estado ---
const teacherProfile = ref<Profile | null>(null)
const requests = ref<RequestDto[]>([])
const subjects = ref<Subject[]>([])
const allGroups = ref<Group[]>([])
const loading = ref(true)
const isSubmitting = ref(false)
const modalOpen = ref(false)
const selectedRequest = ref<RequestDto | null>(null)
const studentNames = ref<Record<string, string>>({})


// --- Estado de Alertas ---
const alert = ref({ show: false, message: '', type: 'success' as 'success' | 'error' })

const closeAlert = () => {
  alert.value.show = false
}

// --- Carga de Datos ---
async function loadData() {
  loading.value = true
  try {
    const userId = await auth.isMicrosoftUser()

    const resProfile = await fetch(`${API_URL}/api/profiles/GetUser?id=${userId}`, { credentials: 'include' })
      if (!resProfile.ok) throw new Error('Usuario no encontrado')
      const profile: Profile = await resProfile.json()
      teacherProfile.value = profile
    
    const [resRequests, resGroups, resSubjects] = await Promise.all([
      fetch(`${API_URL}/api/requests/teacher/${profile.id}`, { credentials: 'include' }),
      fetch(`${API_URL}/api/groups`, { credentials: 'include' }),
      fetch(`${API_URL}/api/subjects`, { credentials: 'include' })
    ])

    if (resRequests.ok)
    { 
        requests.value = await resRequests.json()

        const uniqueStudentIds = [...new Set(requests.value.map(r => r.studentId))]
      
        await Promise.all(uniqueStudentIds.map(async (id) => {
            if (!studentNames.value[id]) {
            studentNames.value[id] = await getName(id)
            }
        }))
    }
    if (resGroups.ok) allGroups.value = await resGroups.json()
    if (resSubjects.ok) subjects.value = await resSubjects.json()
  } catch (error) {
    console.error("Error cargando datos:", error)
  } finally {
    loading.value = false
  }
}

async function getName(id: string): Promise<string> {
    try {
      const resProfile = await fetch(`${API_URL}/api/profiles/${id}`)
      if(!resProfile.ok) return "Estudiante Desconocido"
      const profile: Profile = await resProfile.json()
      return profile.name
    } catch (error) {
      return "Estudiante Desconocido"
    }
}

// --- Helpers de UI ---
function getSubjectByGroupId(groupId: string): string {
  const group = allGroups.value.find(g => g.id === groupId)
  if (!group) return '...'
  const subject = subjects.value.find(s => s.id === group.subjectId)
  return subject ? subject.name : 'Asignatura'
}

function getGroupName(groupId: string): string {
  return allGroups.value.find(g => g.id === groupId)?.name || '...'
}

function getStatusInfo(status: number) {
  switch(status) {
    case 0: return { label: 'Pendiente', color: 'bg-amber-500', icon: 'schedule' }
    case 1: return { label: 'Rechazada', color: 'bg-red-500', icon: 'cancel' }
    case 2: return { label: 'Aceptada', color: 'bg-green-500', icon: 'check_circle' }
    default: return { label: 'Desconocido', color: 'bg-slate-400', icon: 'help' }
  }
}

const openReview = (req: RequestDto) => {
  selectedRequest.value = req
  modalOpen.value = true
}

async function handleStatusUpdate(payload: { id: string, status: number, teacherComment: string }) {
  isSubmitting.value = true;
  try {
    const res = await fetch(`${API_URL}/api/requests/teacherUpdate/${payload.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: payload.status,
        teacherComment: payload.teacherComment
      }),
      credentials: 'include'
    })

    if (res.ok) {
      alert.value = { show: true, message: 'Solicitud actualizada con éxito', type: 'success' }
      modalOpen.value = false
      await loadData()
      setTimeout(() => alert.value.show = false, 4000)
    } else {
      throw new Error()
    }
  } catch (error) {
    alert.value = { show: true, message: 'Error al actualizar', type: 'error' }
  } finally {
    isSubmitting.value = false;
  }
}

onMounted(loadData)
</script>

<template>
  <div class="max-w-6xl mx-auto p-6 space-y-6">
    <div class="flex justify-between items-center border-b border-slate-200 pb-6">
      <div>
        <h1 class="text-3xl font-light text-slate-900 dark:text-slate-900">Gestión de Cambios</h1>
        <p class="text-slate-400 text-sm">Revisa y resuelve las peticiones de tus alumnos</p>
      </div>
      <button @click="loadData" class="bg-[#262626] hover:bg-black text-white px-6 py-2.5 rounded font-medium text-sm flex items-center gap-2 transition-all">
        <span class="material-symbols-outlined text-sm">refresh</span> Actualizar
      </button>
    </div>

    <div v-if="loading" class="flex flex-col items-center py-20">
      <div class="animate-spin size-8 border-4 border-[#e4002b] border-t-transparent rounded-full"></div>
      <p class="text-slate-500 animate-pulse">Cargando peticiones...</p>
    </div>

    <div v-else class="space-y-4">
      <div v-for="req in requests" :key="req.id" 
        class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-all">
        <div :class="getStatusInfo(req.status).color" class="w-1.5"></div>
        
        <div class="flex-1 grid grid-cols-1 md:grid-cols-12 items-center px-6 py-4 gap-4">
          
          <div class="md:col-span-4">
            <div class="flex flex-col">
              <span class="text-[10px] text-[#e4002b] font-black uppercase tracking-widest mb-1">
                {{ getSubjectByGroupId(req.originGroupId) }}
              </span>
              <span class="text-[10px] text-slate-400 font-bold uppercase">Estudiante</span>
              <h3 class="text-sm font-bold text-slate-700 dark:text-white mt-1">
                {{ studentNames[req.studentId] || 'Cargando...' }}
              </h3>
            </div>
          </div>

          <div class="md:col-span-3">
            <div class="flex flex-col">
              <span class="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Trayecto de Cambio</span>
              <div class="flex items-center gap-2 mt-1">
                <span class="text-sm font-bold text-slate-700 dark:text-white">
                  {{ getGroupName(req.originGroupId) }}
                </span>
                <span class="material-symbols-outlined text-xs text-slate-400">arrow_forward</span>
                <span class="text-sm font-bold text-slate-700 dark:text-white">
                  {{ getGroupName(req.destinationGroupId) }}
                </span>
              </div>
            </div>
          </div>

          <div class="md:col-span-3">
             <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-lg" :class="getStatusInfo(req.status).color.replace('bg-', 'text-')">
                {{ getStatusInfo(req.status).icon }}
              </span>
              <span class="text-sm font-bold dark:text-white">{{ getStatusInfo(req.status).label }}</span>
            </div>
          </div>

          <div class="md:col-span-2 flex justify-end gap-2">
            <a v-if="req.pdfPath" :href="req.pdfPath" target="_blank" @click.stop class="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Ver documento adjunto">
              <span class="material-symbols-outlined">pdf</span>
            </a>
            <button class="p-2 text-slate-300 hover:text-slate-500 transition-colors " title="Revisar solicitud" @click="openReview(req)">
              <span class="material-symbols-outlined">revisar</span>
            </button>
          </div>
        </div>
      </div>

      <div v-if="requests.length === 0" class="text-center py-20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
        <p class="text-slate-400 italic">No hay peticiones pendientes de revisión.</p>
      </div>
    </div>

    <TeacherRequestWindow 
      :show="modalOpen" 
      :request="selectedRequest" 
      :subject-name="selectedRequest ? getSubjectByGroupId(selectedRequest.originGroupId) : ''"
      :origin-name="selectedRequest ? getGroupName(selectedRequest.originGroupId) : ''"
      :dest-name="selectedRequest ? getGroupName(selectedRequest.destinationGroupId) : ''"
      :student-name="selectedRequest ? studentNames[selectedRequest.studentId] : ''"
      :loading="isSubmitting"
      @close="modalOpen = false"
      @submit="handleStatusUpdate"
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
          class="fixed bottom-6 right-6 z-200 max-w-sm w-full bg-white dark:bg-slate-900 shadow-xl rounded-lg border border-slate-200 dark:border-slate-800 flex items-stretch overflow-hidden">
        <div class="w-1.5 bg-green-500"></div>
        <div class="flex-1 p-4 flex items-center gap-4">
          <div class="flex items-center justify-center h-10 w-10 rounded-full bg-green-50 dark:bg-green-900/20 text-green-600">
            <span class="material-symbols-outlined text-xl">check_circle</span>
          </div>
          <div class="flex-1">
            <h3 class="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-tight">¡Éxito!</h3>
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
      <div v-if="alert.show && alert.type === 'error'" class="fixed inset-0 z-300 flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px]" @click="closeAlert"></div>
        <div class="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all">
          <div class="p-8 text-center">
            <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-50 dark:bg-red-900/10 mb-6">
              <span class="material-symbols-outlined text-red-500 text-4xl font-light">error</span>
            </div>
            <h3 class="text-2xl font-light text-slate-800 dark:text-white mb-3">Algo salió mal</h3>
            <p class="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{{ alert.message }}</p>
          </div>
          <div class="px-8 pb-8">
            <button @click="closeAlert" class="w-full bg-[#262626] hover:bg-black text-white px-6 py-3 rounded shadow-sm transition-all font-medium text-sm active:scale-[0.98]">
              Cerrar y Reintentar
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>