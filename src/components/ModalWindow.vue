<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useAuthStore } from '@/stores/auth.store'

const API_URL = import.meta.env.VITE_API_URL
const auth = useAuthStore()

// Interfaces
interface User { id?: string; email: string; name: string; role: string }
interface Subject { id?: string; name: string }
interface SimpleEntity { id: string; name: string }

const props = defineProps<{
  show: boolean
  mode: 'create' | 'edit' | 'delete'
  item: any
  type: 'user' | 'subject' | 'group' | 'location' | 'schedule'
  groups?: SimpleEntity[]
  locations?: SimpleEntity[]
  loading?: boolean
}>()

const emit = defineEmits(['close', 'submit'])

// Form fields
const name = ref('')
const email = ref('')
const password = ref('')
const role = ref('student')
const subjectId = ref('')
const teacherId = ref('')
const capacity = ref<number>(0)
const course = ref<number>(0)

// Schedule specific fields
const groupId = ref('')
const locationId = ref('')
const scheduleDate = ref('')
const startTime = ref('')
const endTime = ref('')

// Error handling simple
const showError = ref(false)
const isLocationInUse = ref(false)
const isCheckingUsage = ref(false)

// Lists for selects
const teachers = ref<User[]>([])
const subjects = ref<Subject[]>([])

async function loadDependencies() {
  if (props.type !== 'group') return
  const userId = await auth.isMicrosoftUser()
  const resProfiles = await fetch(`${API_URL}/api/profiles/GetAll?adminId=${userId}`, { credentials: 'include' })
  if (resProfiles.ok) {
    const allUsers: User[] = await resProfiles.json()
    teachers.value = allUsers.filter(u => u.role.toLowerCase() === 'teacher')
  }
  const resSubjects = await fetch(`${API_URL}/api/subjects`, { credentials: 'include' })
  if (resSubjects.ok) {
    subjects.value = await resSubjects.json()
  }
}

watch(() => props.show, (isShown) => {
  if (isShown) {
    showError.value = false
    loadDependencies()
  }
})

const formatToDateTimeLocal = (dateStr?: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const tzOffset = date.getTimezoneOffset() * 60000
  const localISOTime = new Date(date.getTime() - tzOffset).toISOString()
  return localISOTime.slice(0, 16)
}

const hasChanges = computed(() => {
  if (!props.item || props.mode !== 'edit') return true 

  if (props.type === 'user') {
    return name.value !== (props.item.name || '') ||
           role.value !== (props.item.role || 'student')
  }
  
  if (props.type === 'group') {
    return name.value !== (props.item.name || '') ||
           subjectId.value !== (props.item.subjectId || '') ||
           teacherId.value !== (props.item.teacherId || '')
  }
  
  if (props.type === 'location') {
    return name.value !== (props.item.name || '') ||
           Number(capacity.value) !== (props.item.capacity || 0)
  }

  if (props.type === 'subject') {
    return name.value !== (props.item.name || '') ||
           Number(course.value) !== (props.item.course || 0)
  }
  
  if (props.type === 'schedule') {
    const currentStart = `${scheduleDate.value}T${startTime.value}`
    const currentEnd = `${scheduleDate.value}T${endTime.value}`
    return groupId.value !== (props.item.groupId || '') ||
          locationId.value !== (props.item.locationId || '') ||
          currentStart !== formatToDateTimeLocal(props.item.startDate) ||
          currentEnd !== formatToDateTimeLocal(props.item.endDate)
  }

  return name.value !== (props.item.name || '')
})

watch(() => props.item, async (value) => {
  if (!value) {
    resetForm()
    return
  }
  name.value = value.name || ''
  if (props.type === 'user') {
    email.value = value.email || ''
    role.value = value.role || 'student'
  } else if (props.type === 'group') {
    subjectId.value = value.subjectId || ''
    teacherId.value = value.teacherId || ''
  } else if (props.type === 'location') {
    capacity.value = value.capacity || 0
    if (props.mode === 'edit' && value.id) {
      isCheckingUsage.value = true
      isLocationInUse.value = false
      try {
        const res = await fetch(`${API_URL}/api/schedules/hasLocation/${value.id}`, { 
          credentials: 'include' 
        })
        if (res.ok) {
          isLocationInUse.value = await res.json()
        }
      } catch (error) {
        console.error("Error comprobando uso de ubicación:", error)
      } finally {
        isCheckingUsage.value = false
      }
    }
  } else if (props.type === 'subject') {
    course.value = value.course || 0
  } else if (props.type === 'schedule') {
    groupId.value = value.groupId || ''
    locationId.value = value.locationId || ''
    const sDate = value.startDate
    const eDate = value.endDate
    if (typeof sDate === 'string' && typeof eDate === 'string') {
      const start = new Date(sDate)
      const end = new Date(eDate)
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        scheduleDate.value = start.toISOString().split('T')[0]!
        startTime.value = start.toTimeString().slice(0, 5)
        endTime.value = end.toTimeString().slice(0, 5)
      }
    }
  }
})

function resetForm() {
  name.value = ''; email.value = ''; password.value = ''; role.value = 'student'
  subjectId.value = ''; teacherId.value = ''; capacity.value = 0
  groupId.value = ''; locationId.value = ''; scheduleDate.value = ''; startTime.value = ''; endTime.value = ''
  showError.value = false
  isLocationInUse.value = false
  isCheckingUsage.value = false
}

const isFormInvalid = computed(() => {
  if (props.mode === 'delete') return false
  if (props.mode !== 'create') return false
  if (props.type === 'schedule') return !groupId.value || !locationId.value || !scheduleDate.value || !startTime.value || !endTime.value
  if (props.type === 'user') return !name.value || !email.value || !password.value || !role.value
  if (props.type === 'group') return !name.value || !subjectId.value || !teacherId.value
  if (props.type === 'location') return !name.value || capacity.value <= 0
  if (props.type === 'subject') return !name.value || course.value <= 0
  return !name.value 
})

const isButtonDisabled = computed(() => {
  if (props.loading) return true // Si está cargando, deshabilitar
  if (props.mode === 'delete') return false
  if (props.mode === 'edit' && !hasChanges.value) return true
  return isFormInvalid.value
})

function submit() {
  if (isFormInvalid.value) {
    showError.value = true
    return
  }
  let payload: any = {}
  if (props.type === 'schedule') {
    payload = { 
      groupId: groupId.value, 
      locationId: locationId.value, 
      startDate: `${scheduleDate.value}T${startTime.value}`, 
      endDate: `${scheduleDate.value}T${endTime.value}` 
    }
  } else {
    payload.name = name.value
    if (props.type === 'user') {
      Object.assign(payload, { email: email.value, password: password.value, role: role.value })
    } else if (props.type === 'group') {
      Object.assign(payload, { subjectId: subjectId.value, teacherId: teacherId.value })
    } else if (props.type === 'location') {
      payload.capacity = Number(capacity.value)
    } else if (props.type === 'subject') {
      payload.course = Number(course.value)
    }
  }
  emit('submit', payload)
}

function close() {
  resetForm()
  emit('close')
}
</script>

<template>
  <Transition
    enter-active-class="ease-out duration-300"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="ease-in duration-200"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div v-if="props.show" class="fixed inset-0 z-150 flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" @click="close"></div>

      <div class="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all">
        
        <div class="px-8 pt-8 pb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 class="text-xl font-light text-slate-800 dark:text-white uppercase tracking-tight">
              {{props.mode === 'create' ? 'Crear' : props.mode === 'edit' ? 'Editar' : 'Eliminar' }} 
              <span class="font-bold text-[#e4002b]">
                {{ 
                  props.type === 'user' ? 'Usuario' : 
                  props.type === 'subject' ? 'Asignatura' : 
                  props.type === 'location' ? 'Ubicación' : 
                  props.type === 'schedule' ? 'Horario' : 'Grupo' 
                }}
              </span>
            </h2>
            <p class="text-slate-400 text-[10px] mt-1 font-black tracking-widest uppercase">
              Módulo de <span class="text-slate-600 dark:text-slate-200">Administración</span>
            </p>
          </div>
          <button @click="close" class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="p-8">
          <div v-if="showError" class="mb-6 bg-red-50 dark:bg-red-900/10 text-red-600 p-3 rounded-lg text-[10px] font-black border border-red-100 dark:border-red-900/20 flex items-center gap-2 uppercase tracking-widest">
            <span class="material-symbols-outlined text-sm">warning</span>
            Error: Campos obligatorios vacíos
          </div>

          <div v-if="props.mode === 'delete'" class="py-10 flex flex-col items-center text-center">
            <div class="h-20 w-20 bg-red-50 dark:bg-red-900/10 rounded-full flex items-center justify-center mb-6">
              <span class="material-symbols-outlined text-red-500 text-4xl">delete_forever</span>
            </div>
            <h3 class="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-tight">¿Confirmar eliminación?</h3>
            <p class="text-slate-500 dark:text-slate-400 text-xs mt-2 max-w-xs leading-relaxed">
              Esta acción es permanente y eliminará todos los datos asociados a este registro.
            </p>
          </div>

          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            <div class="flex flex-col space-y-5">
              <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                1. Información Básica
              </label>

              <div v-if="props.type !== 'schedule'">
                <span class="text-[9px] font-bold text-slate-400 uppercase ml-1">Nombre</span>
                <input v-model="name" placeholder="Escribir..." 
                  class="mt-1 w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-xs focus:border-red-400 outline-none transition-all dark:text-white" />
              </div>

              <template v-if="props.type === 'user'">
                <div>
                  <span class="text-[9px] font-bold text-slate-400 uppercase ml-1">Email Institucional</span>
                  <input v-model="email" type="email" :disabled="props.mode === 'edit'"
                    class="mt-1 w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-xs outline-none focus:border-red-400 transition-all dark:text-white disabled:opacity-50" />
                </div>
                <div v-if="props.mode === 'create'">
                  <span class="text-[9px] font-bold text-slate-400 uppercase ml-1">Contraseña</span>
                  <input v-model="password" type="password" 
                    class="mt-1 w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-xs outline-none focus:border-red-400 transition-all dark:text-white" />
                </div>
              </template>

              <template v-if="props.type === 'schedule'">
                <div>
                  <span class="text-[9px] font-bold text-slate-400 uppercase ml-1">Grupo Asignado</span>
                  <select v-model="groupId" class="mt-1 w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-xs outline-none focus:border-red-400 transition-all dark:text-white">
                    <option value="" disabled>Seleccionar...</option>
                    <option v-for="g in props.groups" :key="g.id" :value="g.id">{{ g.name }}</option>
                  </select>
                </div>
                <div>
                  <span class="text-[9px] font-bold text-slate-400 uppercase ml-1">Ubicación / Aula</span>
                  <select v-model="locationId" class="mt-1 w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-xs outline-none focus:border-red-400 transition-all dark:text-white">
                    <option value="" disabled>Seleccionar...</option>
                    <option v-for="l in props.locations" :key="l.id" :value="l.id">{{ l.name }}</option>
                  </select>
                </div>
              </template>
            </div>

            <div class="flex flex-col space-y-5">
              <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                2. Parámetros Técnicos
              </label>

              <div v-if="props.type === 'subject'">
                <span class="text-[9px] font-bold text-slate-400 uppercase ml-1">Año / Curso Escolar</span>
                <input v-model="course" type="number" min="1" max="5"
                  class="mt-1 w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-xs outline-none dark:text-white focus:border-red-400 transition-all" 
                  placeholder="Ej: 1, 2, 3..." />
              </div>

              <template v-if="props.type === 'group'">
                <div>
                  <span class="text-[9px] font-bold text-slate-400 uppercase ml-1">Asignatura</span>
                  <select v-model="subjectId" class="mt-1 w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-xs outline-none focus:border-red-400 transition-all dark:text-white">
                    <option value="" disabled>Elegir...</option>
                    <option v-for="s in subjects" :key="s.id" :value="s.id">{{ s.name }}</option>
                  </select>
                </div>
                <div>
                  <span class="text-[9px] font-bold text-slate-400 uppercase ml-1">Profesor Responsable</span>
                  <select v-model="teacherId" class="mt-1 w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-xs outline-none focus:border-red-400 transition-all dark:text-white">
                    <option value="" disabled>Asignar...</option>
                    <option v-for="t in teachers" :key="t.id" :value="t.id">{{ t.name }}</option>
                  </select>
                </div>
              </template>

              <div v-if="props.type === 'user'">
                <span class="text-[9px] font-bold text-slate-400 uppercase ml-1">Privilegios de Rol</span>
                <select v-model="role" class="mt-1 w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-xs outline-none focus:border-red-400 transition-all dark:text-white">
                  <option value="student">Estudiante</option>
                  <option value="teacher">Profesor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <template v-if="props.type === 'schedule'">
                <div>
                  <span class="text-[9px] font-bold text-slate-400 uppercase ml-1">Fecha de Sesión</span>
                  <input type="date" v-model="scheduleDate" class="mt-1 w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-xs outline-none focus:border-red-400 transition-all dark:text-white" />
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <span class="text-[9px] font-bold text-slate-400 uppercase ml-1">Inicio</span>
                    <input type="time" v-model="startTime" class="mt-1 w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-xs outline-none dark:text-white" />
                  </div>
                  <div>
                    <span class="text-[9px] font-bold text-slate-400 uppercase ml-1">Fin</span>
                    <input type="time" v-model="endTime" class="mt-1 w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-xs outline-none dark:text-white" />
                  </div>
                </div>
              </template>

              <div v-if="props.type === 'location'">
                  <span class="text-[9px] font-bold text-slate-400 uppercase">Aforo Máximo</span>
                  <span v-if="isCheckingUsage" class="text-[8px] font-bold text-[#0090e4] animate-pulse uppercase tracking-wider">
                    Verificando disponibilidad...
                  </span>
                <input 
                  v-model="capacity" 
                  type="number" 
                  :hidden="isLocationInUse"
                  :disabled="isCheckingUsage"
                  class="mt-1 w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-xs outline-none dark:text-white focus:border-red-400 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-800" 
                />
                
                <p v-if="isLocationInUse" class="mt-2 text-[9px] font-black text-orange-500 uppercase tracking-widest flex items-center gap-1">
                  <span class="material-symbols-outlined text-[12px]">lock</span>
                  Ubicación en uso. Aforo bloqueado.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="px-8 py-6 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
          <button @click="close" class="px-6 py-2.5 rounded-lg text-xs font-black uppercase text-slate-400 hover:text-slate-600 transition-all">
            Cancelar
          </button>
          <button 
            @click="submit" 
            :disabled="isButtonDisabled"
            :class="[
              props.mode === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#262626] hover:bg-black',
              isButtonDisabled ? 'opacity-50 grayscale cursor-not-allowed' : 'active:scale-95'
            ]"
            class="text-white min-w-160px px-8 py-2.5 rounded-lg text-xs font-black uppercase shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <template v-if="props.loading">
              <span class="material-symbols-outlined text-sm animate-spin">sync</span>
              <span>Procesando solicitud...</span>
            </template>

            <template v-else>
              <span class="material-symbols-outlined text-sm">
                {{ props.mode === 'delete' ? 'delete' : 'save_as' }}
              </span>
              {{ props.mode === 'delete' ? 'Confirmar Baja' : 'Guardar Datos' }}
            </template>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* Consistencia visual con Window */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
</style>