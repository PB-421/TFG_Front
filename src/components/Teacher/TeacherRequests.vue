<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import TeacherRequestWindow from './TeacherRequestWindow.vue'
import { useAuthStore } from '@/stores/auth.store'
import { 
  ArrowPathIcon, 
  ArrowRightIcon, 
  CheckCircleIcon, 
  ClockIcon, 
  XCircleIcon, 
  QuestionMarkCircleIcon,
  PencilSquareIcon,
  XMarkIcon,
  ExclamationCircleIcon
} from '@heroicons/vue/24/solid'

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
  ManagedBy?: string;
}

interface Profile {
  id: string;
  email: string;
  name: string;
}

interface Group { id: string; name: string; subjectId: string; teacherId: string;}
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
    case 0: return { label: 'Pendiente', color: 'bg-amber-500', textColor: 'text-amber-500', icon: ClockIcon }
    case 1: return { label: 'Rechazada', color: 'bg-red-500', textColor: 'text-red-500', icon: XCircleIcon } 
    case 2: return { label: 'Aceptada', color: 'bg-green-500', textColor: 'text-green-600', icon: CheckCircleIcon }
    case 3: return { label: 'Aprobación Parcial', color: 'bg-amber-500', textColor: 'text-amber-500', icon: ArrowPathIcon }
    default: return { label: 'Desconocido', color: 'bg-slate-400', textColor: 'text-slate-400', icon: QuestionMarkCircleIcon }
  }
}

const filteredRequests = computed(() => {
  if (!teacherProfile.value) return []
  
  return requests.value.filter(req => {
    const originGroup = allGroups.value.find(g => g.id === req.originGroupId)
    const destGroup = allGroups.value.find(g => g.id === req.destinationGroupId)
    
    return originGroup?.teacherId === teacherProfile.value?.id || 
           destGroup?.teacherId === teacherProfile.value?.id
  })
})

const openReview = (req: RequestDto) => {
  selectedRequest.value = req
  modalOpen.value = true
}

function getPriorityInfo(weight: number) {
  if (weight >= 60) {
    return { label: 'Muy Alta', subLabel: 'Externo', color: 'text-red-600', bgColor: 'bg-red-50', dot: 'bg-red-600' }
  }
  if (weight >= 40) {
    return { label: 'Alta', subLabel: 'Colisión (PDF)', color: 'text-orange-600', bgColor: 'bg-orange-50', dot: 'bg-orange-600' }
  }
  if (weight >= 25) {
    return { label: 'Media', subLabel: 'Colisión', color: 'text-amber-600', bgColor: 'bg-amber-50', dot: 'bg-amber-600' }
  }
  return { label: 'Baja', subLabel: 'Preferencia', color: 'text-blue-600', bgColor: 'bg-blue-50', dot: 'bg-blue-600' }
}

const sortedRequests = computed(() => {
  // Creamos una copia para no mutar el original con .sort()
  return [...requests.value].sort((a, b) => {
    
    // 1. Ordenar por PESO (Descendente: de mayor a menor)
    if (b.weight !== a.weight) {
      return b.weight - a.weight
    }

    // 2. Ordenar por ASIGNATURA
    const subjectA = getSubjectByGroupId(a.originGroupId)
    const subjectB = getSubjectByGroupId(b.originGroupId)
    
    return subjectA.localeCompare(subjectB)
  })
})

async function handleStatusUpdate(payload: { id: string, status: number, teacherComment: string}) {
  isSubmitting.value = true;
  try {
    const req = requests.value.find(r => r.id === payload.id)
    if (!req) return

    const originGroup = allGroups.value.find(g => g.id === req.originGroupId)
    const destGroup = allGroups.value.find(g => g.id === req.destinationGroupId)
    
    let finalStatus = payload.status

    if (payload.status === 2) {
      if (originGroup?.teacherId !== destGroup?.teacherId) {
        if (req.status === 0) {
          if(payload.teacherComment.length > 0) payload.teacherComment = "Comentario del profesor del Grupo '"+getGroupName(originGroup!.id)+"': "+payload.teacherComment
          finalStatus = 3
        } 
        else if (req.status === 3) {
          finalStatus = 2
        }
      } 
    }

    const res = await fetch(`${API_URL}/api/requests/teacherUpdate/${payload.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: finalStatus,
        teacherComment: payload.teacherComment,
        managedBy: teacherProfile.value?.id
      }),
      credentials: 'include'
    })

    if (res.ok) {
      const msg = finalStatus === 3 ? 'Aprobación parcial registrada' : 'Solicitud actualizada'
      alert.value = { show: true, message: msg, type: 'success' }
      modalOpen.value = false
      await loadData()
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
        <ArrowPathIcon class="w-5 h-5" /> Actualizar
      </button>
    </div>

    <div v-if="loading" class="flex flex-col items-center py-20">
      <div class="animate-spin size-8 border-4 border-[#e4002b] border-t-transparent rounded-full"></div>
      <p class="text-slate-500 animate-pulse">Cargando peticiones...</p>
    </div>

    <div v-else class="space-y-4">
      <div v-for="req in filteredRequests" :key="req.id" 
        class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-all">
        
        <div :class="getStatusInfo(req.status).color" class="w-1.5"></div>
        
        <div class="flex-1 grid grid-cols-1 md:grid-cols-13 items-center px-6 py-4 gap-4">
          
          <div class="md:col-span-3">
            <div class="flex flex-col">
              <span class="text-[10px] text-[#e4002b] font-black uppercase tracking-widest mb-1">
                {{ getSubjectByGroupId(req.originGroupId) }}
              </span>
              <span class="text-[10px] text-slate-400 font-bold uppercase">Estudiante</span>
              <h3 class="text-sm font-bold text-slate-700 dark:text-white mt-0.5 truncate">
                {{ studentNames[req.studentId] || 'Cargando...' }}
              </h3>
            </div>
          </div>

          <div class="md:col-span-4">
            <div class="flex flex-col border-l border-slate-100 dark:border-slate-800 md:pl-4">
              <span class="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Trayecto de Cambio</span>
              <div class="flex items-center gap-2 mt-1">
                <span class="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                  {{ getGroupName(req.originGroupId) }}
                </span>
                <ArrowRightIcon class="w-4 h-4 text-slate-400" />
                <span class="text-xs font-bold text-white bg-[#262626] px-2 py-0.5 rounded">
                  {{ getGroupName(req.destinationGroupId) }}
                </span>
              </div>
            </div>
          </div>

          <div class="md:col-span-2">
            <span class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 block">Prioridad</span>
            <div class="flex flex-col">
              <div class="flex items-center gap-1.5">
                <span class="size-2 rounded-full" :class="getPriorityInfo(req.weight).dot"></span>
                <span class="text-sm font-bold" :class="getPriorityInfo(req.weight).color">
                  {{ getPriorityInfo(req.weight).label }}
                </span>
              </div>
              <span class="text-[10px] text-slate-400 font-medium italic">
                {{ getPriorityInfo(req.weight).subLabel }}
              </span>
            </div>
          </div>

          <div class="md:col-span-2">
            <div class="flex items-center gap-2">
              <component 
                :is="getStatusInfo(req.status).icon" 
                class="w-5 h-5" 
                :class="getStatusInfo(req.status).textColor" 
              />
              <span class="text-sm font-bold dark:text-white">{{ getStatusInfo(req.status).label }}</span>
            </div>
          </div>

          <div class="md:col-span-2 flex justify-end">
            <button 
              @click="openReview(req)"
              class="flex items-center gap-2 bg-slate-900 hover:bg-black text-white px-4 py-2 rounded text-[11px] font-bold uppercase tracking-tight transition-all active:scale-95 shadow-sm"
            >
            <PencilSquareIcon class="size-5" /> Gestionar
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
      :teacher-id="teacherProfile?.id"
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
            <CheckCircleIcon class="w-6 h-6" />
          </div>
          <div class="flex-1">
            <h3 class="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-tight">¡Éxito!</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{{ alert.message }}</p>
          </div>
          <button @click="closeAlert" class="p-1 text-slate-300 hover:text-slate-500 transition-colors">
            <XMarkIcon class="w-5 h-5" />
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
              <ExclamationCircleIcon class="text-red-500 w-12 h-12 stroke-1" />
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