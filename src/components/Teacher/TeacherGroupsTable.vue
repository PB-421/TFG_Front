<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import StudentTransferWindow from '@/components/Teacher/StudentTransferWindow.vue'

const API_URL = import.meta.env.VITE_API_URL
const auth = useAuthStore()

// Interfaces basadas en tu GroupsDto y ProfileDto
interface Profile {
  id: string
  name: string
  email?: string
  role?: string
}

interface Group {
  id: string
  subjectId: string
  name: string
  teacherId: string
  students: Profile[]
}

interface SimpleEntity { id: string; name: string }

// Estado
const groups = ref<Group[]>([])
const subjects = ref<SimpleEntity[]>([])
const loading = ref(true)
const currentTeacherId = ref<string | null>(null)

// Modal
const transferModalOpen = ref(false)
const selectedGroup = ref<Group | null>(null)

// --- Lógica de Filtros 

const myGroups = computed(() => {
  return groups.value.filter(g => g.teacherId === currentTeacherId.value)
})

const getCompatibleGroups = (source: Group) => {
  return groups.value.filter(g => 
    g.teacherId === currentTeacherId.value && 
    g.subjectId === source.subjectId && 
    g.id !== source.id
  )
}

const getSubjectName = (id?: string) => subjects.value.find(s => s.id === id)?.name || 'Sin asignar'

// --- Lógica Principal de Carga (Siguiendo tu patrón solicitado) ---
async function fetchData() {
  loading.value = true
  try {
    // Obtener ID de Microsoft y luego el perfil del backend
    const userId = await auth.isMicrosoftUser()
    
    const [resProfile, resGroups, resSubjects] = await Promise.all([
      fetch(`${API_URL}/api/profiles/GetUser?id=${userId}`, { credentials: 'include' }),
      fetch(`${API_URL}/api/groups`, { credentials: 'include' }),
      fetch(`${API_URL}/api/subjects`, { credentials: 'include' })
    ])

    if (resSubjects.ok) subjects.value = await resSubjects.json()
    if (resGroups.ok) groups.value = await resGroups.json()
    
    if (resProfile.ok) {
      const profileData: Profile = await resProfile.json()
      currentTeacherId.value = profileData.id // Este es el ID que usamos para filtrar
    }

  } catch (error) {
    console.error("Error cargando datos del profesor:", error)
    showAlert('Error al conectar con el servidor', 'error')
  } finally {
    loading.value = false
  }
}

function openTransfer(group: Group) {
  selectedGroup.value = group
  transferModalOpen.value = true
}

async function handleTransfer(data: { studentId: string, fromGroupId: string, toGroupId: string }) {
  try {
    const fromGroup = groups.value.find(g => g.id === data.fromGroupId)
    const toGroup = groups.value.find(g => g.id === data.toGroupId)

    if (!fromGroup || !toGroup) return

    const student = fromGroup.students.find(s => s.id === data.studentId)
    
    // Filtramos para quitar al alumno del grupo origen y lo añadimos al destino
    const updatedFromStudents = fromGroup.students.filter(s => s.id !== data.studentId)
    const updatedToStudents = [...(toGroup.students || []), student]

    // Realizamos las actualizaciones en paralelo
    const [resFrom, resTo] = await Promise.all([
      fetch(`${API_URL}/api/groups/${fromGroup.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fromGroup, Students: updatedFromStudents })
      }),
      fetch(`${API_URL}/api/groups/${toGroup.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...toGroup, Students: updatedToStudents })
      })
    ])

    if (resFrom.ok && resTo.ok) {
      showAlert('Alumno transferido con éxito', 'success')
      transferModalOpen.value = false
      fetchData() // Recargamos la tabla para ver los cambios
    } else {
      showAlert('Error al actualizar los grupos', 'error')
    }
  } catch (error) {
    showAlert('Error de conexión', 'error')
  }
}

// Lógica de Alertas
const alert = ref({ show: false, message: '', type: 'success' as 'success' | 'error' })
const showAlert = (message: string, type: 'success' | 'error' = 'success') => {
  alert.value = { show: true, message, type }
  if (type === 'success') setTimeout(() => alert.value.show = false, 4000)
}
const closeAlert = () => alert.value.show = false

onMounted(fetchData)
</script>

<template>
  <div class="space-y-4">
    <div class="max-w-6xl mx-auto p-6 space-y-6">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 class="text-3xl font-light text-slate-900 dark:text-slate-900">Gestión de Grupos</h1>
          <p class="text-slate-500 text-sm mt-1">Gestione los alumnos de sus grupos</p>
        </div>
        </div>

      <div v-if="loading" class="flex flex-col items-center py-20">
        <div class="animate-spin size-10 border-4 border-[#e4002b] border-t-transparent rounded-full mb-4"></div>
        <p class="text-slate-500 animate-pulse">Cargando tus grupos asignados...</p>
      </div>

      <div v-else-if="myGroups.length === 0" class="text-center py-20 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
        <p class="text-slate-500">No tienes grupos asignados</p>
      </div>

      <div v-else class="space-y-4">
        <div v-for="group in myGroups" :key="group.id" 
             class="group relative flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden hover:shadow-md transition-all">
          
          <div class="w-1.5 self-stretch bg-[#e4002b]"></div>

          <div class="flex-1 grid grid-cols-1 md:grid-cols-12 items-center px-6 py-5 gap-4">
            
            <div class="md:col-span-3 flex flex-col border-r border-slate-100 dark:border-slate-800">
              <span class="text-xs text-slate-400 font-bold uppercase tracking-widest">Nombre</span>
              <span class="text-base font-bold text-slate-700 dark:text-slate-200 uppercase">
                {{ group.name }}
              </span>
            </div>

            <div class="md:col-span-4 flex flex-col">
              <span class="text-xs text-slate-400 font-bold uppercase">Asignatura</span>
              <span class="text-sm font-semibold text-slate-600 dark:text-white">
                {{ getSubjectName(group.subjectId) }}
              </span>
            </div>

            <div class="md:col-span-3 flex flex-col">
              <span class="text-xs text-slate-400 font-bold uppercase">Ocupación</span>
              <div class="flex items-center gap-2 mt-1">
                <span class="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase">
                  {{ group.students?.length || 0 }} Alumnos
                </span>
              </div>
            </div>

            <div class="md:col-span-2 flex justify-end">
              <button @click="openTransfer(group)" 
                      class="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 px-4 py-2 rounded border border-slate-200 transition-colors text-sm font-medium">
                <span class="material-symbols-outlined text-lg">sync_alt</span>
                Gestionar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <StudentTransferWindow
      :show="transferModalOpen"
      :sourceGroup="selectedGroup"
      :availableGroups="selectedGroup ? getCompatibleGroups(selectedGroup) : []"
      @close="transferModalOpen = false"
      @transfer="handleTransfer"
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
            <h3 class="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-tight">¡Operación Exitosa!</h3>
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
      <div v-if="alert.show && alert.type === 'error'" class="fixed inset-0 z-250 flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px]" @click="closeAlert"></div>
        <div class="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all">
          <div class="p-8 text-center">
            <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-50 dark:bg-red-900/10 mb-6">
              <span class="material-symbols-outlined text-red-500 text-4xl font-light">error</span>
            </div>
            <h3 class="text-2xl font-light text-slate-800 dark:text-white mb-3">Algo salió mal</h3>
            <p class="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{{ alert.message }}</p>
          </div>
          <div class="px-8 pb-8 flex flex-col">
            <button @click="closeAlert" class="w-full bg-[#262626] hover:bg-black text-white px-6 py-3 rounded shadow-sm transition-all font-medium text-sm active:scale-[0.98]">
              Cerrar y Reintentar
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>