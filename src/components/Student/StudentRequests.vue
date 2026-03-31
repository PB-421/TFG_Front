<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import RequestWindow from './StudentRequestWindow.vue'
  import { useAuthStore } from '@/stores/auth.store'

  const API_URL = import.meta.env.VITE_API_URL
  const auth = useAuthStore()

  // Interfaces
  interface RequestDto {
    id?: string; // Opcional para creación
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

  interface Group {
    id: string;
    name: string;
  }

  // Estado
  const requests = ref<RequestDto[]>([])
  const loading = ref(true)
  const modalOpen = ref(false)
  const modalMode = ref<'create' | 'edit' | 'delete'>('create')
  const selectedRequest = ref<RequestDto | null>(null)

  // Datos del perfil y grupos
  const studentProfile = ref<Profile | null>(null)
  const studentGroups = ref<Group[]>([]) 
  const availableGroups = ref<Group[]>([])
  const allGroups = ref<Group[]>([])

  /**
   * Lógica de carga similar al calendario
   */
  async function loadData() {
    loading.value = true
    try {
      const userId = await auth.isMicrosoftUser()
      
      const resProfile = await fetch(`${API_URL}/api/profiles/GetUser?id=${userId}`, { credentials: 'include' })
      if (!resProfile.ok) throw new Error('Usuario no encontrado')
      const profile: Profile = await resProfile.json()
      studentProfile.value = profile

      const [resRequests, resGroups, resAllGroups] = await Promise.all([
        fetch(`${API_URL}/api/requests/student/${profile.id}`, { credentials: 'include' }),
        fetch(`${API_URL}/api/groups/student/${profile.id}`, { credentials: 'include' }),
        fetch(`${API_URL}/api/groups`, { credentials: 'include' })
      ])

      if (resRequests.ok) requests.value = await resRequests.json()
      if (resGroups.ok) studentGroups.value = await resGroups.json()
      
      if (resAllGroups.ok) {
        const groupsData: Group[] = await resAllGroups.json()
        allGroups.value = groupsData // Guardamos la lista completa
        
        const myGroupIds = studentGroups.value.map(g => g.id)
        availableGroups.value = groupsData.filter(g => !myGroupIds.includes(g.id))
      }

    } catch (error) {
      console.error("Error cargando datos:", error)
    } finally {
      loading.value = false
    }
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

  async function handleRequestSubmit(payload: any) {
    if (!studentProfile.value) return;

    try {
      const isCreate = modalMode.value === 'create'
      const url = isCreate 
        ? `${API_URL}/api/requests` 
        : `${API_URL}/api/requests/${selectedRequest.value?.id}`
      
      // Preparar el DTO para el backend
      const requestData = {
        ...payload,
        studentId: studentProfile.value.id,
        // Si es edición, el ID debe ir en el cuerpo si el RequestDto lo requiere
        id: isCreate ? undefined : selectedRequest.value?.id 
      }

      const res = await fetch(url, {
        method: isCreate ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
        credentials: 'include'
      })

      if (res.ok) {
        modalOpen.value = false
        selectedRequest.value = null // Limpiar selección
        await loadData()
      } else {
        const errorText = await res.text()
        alert(`Error: ${errorText}`)
      }
    } catch (error) {
      console.error("Error al guardar:", error)
    }
  }

  onMounted(loadData)
</script>

<template>
  <div class="max-w-6xl mx-auto p-6 space-y-6">
    <div class="flex justify-between items-center border-b border-slate-200 pb-6">
      <div>
        <h1 class="text-3xl font-light text-slate-800 dark:text-white">Mis Peticiones de Cambio</h1>
        <p class="text-slate-400 text-sm">Gestiona tus solicitudes de cambio de grupo</p>
      </div>
      <button @click="modalMode = 'create'; modalOpen = true" class="bg-[#262626] text-white px-6 py-2.5 rounded font-medium text-sm flex items-center gap-2">
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

          <div class="md:col-span-2 flex justify-end">
            <a v-if="req.pdfPath" :href="req.pdfPath" target="_blank" class="p-2 text-slate-400 hover:text-red-500 transition-colors">
              <span class="material-symbols-outlined">picture_as_pdf</span>
            </a>
          </div>
        </div>
      </div>
    </div>

    <RequestWindow 
      v-if="studentProfile" 
      :show="modalOpen" 
      :mode="modalMode" 
      :item="selectedRequest"
      :student-id="studentProfile.id" 
      :available-groups="availableGroups"
      :student-groups="studentGroups"  @close="modalOpen = false"
      @submit="handleRequestSubmit"
    />
  </div>
</template>