<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import RequestWindow from './StudentRequestWindow.vue'
  import CommentWindow from '../CommentWindow.vue'
  import { useAuthStore } from '@/stores/auth.store'

  const API_URL = import.meta.env.VITE_API_URL
  const auth = useAuthStore()

  // --- Interfaces ---
  interface Subject {
    id: string;
    name: string;
  }

  interface Group {
    id: string;
    name: string;
    subjectId: string; 
  }

  interface RequestDto {
    id?: string;
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

  // --- Estado ---
  const requests = ref<RequestDto[]>([])
  const subjects = ref<Subject[]>([])
  const loading = ref(true)
  const modalOpen = ref(false)
  const modalMode = ref<'create' | 'delete'>('create')
  const selectedRequest = ref<RequestDto | null>(null)
  const commentModalOpen = ref(false)
  const selectedTeacherComment = ref('')

  const studentProfile = ref<Profile | null>(null)
  const studentGroups = ref<Group[]>([]) 
  const availableGroups = ref<Group[]>([])
  const allGroups = ref<Group[]>([])

  // --- Estado de Alertas ---
  const alert = ref({
    show: false,
    message: '',
    type: 'success' as 'success' | 'error'
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

  const openCommentModal = (comment: string) => {
  selectedTeacherComment.value = comment
  commentModalOpen.value = true
  }

  // --- Lógica de Carga ---
  async function loadData() {
    loading.value = true
    try {
      const userId = await auth.isMicrosoftUser()
      
      const resProfile = await fetch(`${API_URL}/api/profiles/GetUser?id=${userId}`, { credentials: 'include' })
      if (!resProfile.ok) throw new Error('Usuario no encontrado')
      const profile: Profile = await resProfile.json()
      studentProfile.value = profile

      const [resRequests, resGroups, resAllGroups, resSubjects] = await Promise.all([
        fetch(`${API_URL}/api/requests/student/${profile.id}`, { credentials: 'include' }),
        fetch(`${API_URL}/api/groups/student/${profile.id}`, { credentials: 'include' }),
        fetch(`${API_URL}/api/groups`, { credentials: 'include' }),
        fetch(`${API_URL}/api/subjects`, { credentials: 'include' })
      ])

      if (resRequests.ok) requests.value = await resRequests.json()
      if (resGroups.ok) studentGroups.value = await resGroups.json()
      if (resSubjects.ok) subjects.value = await resSubjects.json()
      
      if (resAllGroups.ok) {
        const groupsData: Group[] = await resAllGroups.json()
        allGroups.value = groupsData
        
        const myGroupIds = studentGroups.value.map(g => g.id)
        availableGroups.value = groupsData.filter(g => !myGroupIds.includes(g.id))
      }

    } catch (error) {
      console.error("Error cargando datos:", error)
    } finally {
      loading.value = false
    }
  }
  
  function getSubjectByGroupId(groupId: string): string {
    const group = allGroups.value.find(g => g.id === groupId)
    if (!group) return '...'
    const subject = subjects.value.find(s => s.id === group.subjectId)
    return subject ? subject.name : 'Asignatura no encontrada'
  }

  function getGroupName(groupId: string): string {
    const group = allGroups.value.find(g => g.id === groupId)
    return group ? group.name : 'Cargando...'
  }

  function getStatusInfo(status: number) {
    switch(status) {
      case 0: return { label: 'Pendiente', color: 'bg-amber-500', icon: 'schedule' }
      case 1: return { label: 'Rechazada', color: 'bg-red-500', icon: 'cancel' } 
      case 2: return { label: 'Aceptada', color: 'bg-green-500', icon: 'check_circle' }
      default: return { label: 'Desconocido', color: 'bg-slate-400', icon: 'help' }
    }
  }

  function openDelete(req: RequestDto) {
    modalMode.value = 'delete'
    selectedRequest.value = req
    modalOpen.value = true
  }

  async function handleRequestSubmit(payload: any) {
    if (!studentProfile.value) return;
    try {
      const isDelete = modalMode.value === 'delete'
      const isCreate = modalMode.value === 'create'
      
      let url = `${API_URL}/api/requests`
      if (!isCreate) url += `/${selectedRequest.value?.id}`
      
      // Configuración del método
      let method = 'POST'
      if (modalMode.value === 'delete') method = 'DELETE'

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: isDelete ? null : JSON.stringify({
          ...payload,
          studentId: studentProfile.value.id,
          id: isCreate ? undefined : selectedRequest.value?.id 
        }),
        credentials: 'include'
      })

      if (res.ok) {
        const msg = isDelete ? 'Petición eliminada' : 'Operación realizada'
        showAlert(msg, 'success')
        modalOpen.value = false
        selectedRequest.value = null
        await loadData()
      } else {
        const errorText = await res.text()
        showAlert(errorText || 'Error en la operación', 'error')
      }
    } catch (error) {
      showAlert('Error de conexión', 'error')
    }
  }

  onMounted(loadData)
</script>

<template>
  <div class="max-w-6xl mx-auto p-6 space-y-6">
    <div class="flex justify-between items-center border-b border-slate-200 pb-6">
      <div>
        <h1 class="text-3xl font-light text-slate-900 dark:text-slate-900">Peticiones de Cambio</h1>
        <p class="text-slate-400 text-sm">Gestiona tus solicitudes de cambio de grupo</p>
      </div>
      <button @click="modalMode = 'create'; modalOpen = true" class="bg-[#262626] hover:bg-black text-white px-6 py-2.5 rounded font-medium text-sm flex items-center gap-2 transition-all">
        <span class="material-symbols-outlined text-sm">add</span> Nueva Petición
      </button>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <div class="animate-spin size-8 border-4 border-[#e4002b] border-t-transparent rounded-full"></div>
    </div>

    <div v-else class="space-y-4">
      <div v-for="req in requests" :key="req.id" class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex overflow-hidden group">
        <div :class="getStatusInfo(req.status).color" class="w-1.5"></div>
        
        <div class="flex-1 grid grid-cols-1 md:grid-cols-12 items-center px-6 py-4 gap-4">
          <div class="md:col-span-4">
            <div class="flex flex-col">
              <span class="text-[10px] text-[#e4002b] font-black uppercase tracking-widest mb-1">
                {{ getSubjectByGroupId(req.originGroupId) }}
              </span>
              <span class="text-[10px] text-slate-400 font-bold uppercase">Trayecto de Cambio</span>
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
            <span class="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Prioridad</span>
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium" :class="req.weight > 10 ? 'text-red-500' : 'text-blue-500'">
                {{ req.weight > 10 ? 'Alta (Justificada)' : 'Normal' }}
              </span>
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

            <button 
              v-if="req.teacherComment" 
              @click="openCommentModal(req.teacherComment)"
              class="p-2 text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-full transition-all"
              title="Ver comentario del profesor"
            >
              <span class="material-symbols-outlined">comm</span>
            </button>

            <button v-if="req.status === 0" @click="openDelete(req)" class="p-2 text-slate-300 hover:text-red-500 transition-colors">
              <span class="material-symbols-outlined">del</span>
            </button>
            <a v-if="req.pdfPath" :href="req.pdfPath" target="_blank" class="p-2 text-slate-400 hover:text-red-500 transition-colors">
              <span class="material-symbols-outlined">pdf</span>
            </a>
          </div>
        </div>
      </div>

      <div v-if="requests.length === 0" class="text-center py-20 border-2 border-dashed border-slate-200 rounded-xl">
          <p class="text-slate-400 italic">No has realizado ninguna petición todavía.</p>
      </div>
    </div>

    <RequestWindow 
      v-if="studentProfile" 
      :show="modalOpen" 
      :mode="modalMode" 
      :item="selectedRequest"
      :student-id="studentProfile.id" 
      :available-groups="availableGroups"
      :student-groups="studentGroups"
      :subjects="subjects"  @close="modalOpen = false"
      @submit="handleRequestSubmit"
    />

    <CommentWindow 
      :show="commentModalOpen" 
      :comment="selectedTeacherComment" 
      @close="commentModalOpen = false" 
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