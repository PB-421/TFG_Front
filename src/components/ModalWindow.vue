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

// Schedule specific fields
const groupId = ref('')
const locationId = ref('')
const startDate = ref('')
const endDate = ref('')

// Error handling simple
const showError = ref(false)

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
  if (!props.item || props.mode !== 'edit') return true // En 'create' siempre habilitamos la lógica normal

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
  
  if (props.type === 'schedule') {
    return groupId.value !== (props.item.groupId || '') ||
           locationId.value !== (props.item.locationId || '') ||
           startDate.value !== formatToDateTimeLocal(props.item.startDate) ||
           endDate.value !== formatToDateTimeLocal(props.item.endDate)
  }

  return name.value !== (props.item.name || '')
})

watch(() => props.item, (value) => {
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
  } else if (props.type === 'schedule') {
    groupId.value = value.groupId || ''
    locationId.value = value.locationId || ''
    startDate.value = formatToDateTimeLocal(value.startDate)
    endDate.value = formatToDateTimeLocal(value.endDate)
  }
})

function resetForm() {
  name.value = ''; email.value = ''; password.value = ''; role.value = 'student'
  subjectId.value = ''; teacherId.value = ''; capacity.value = 0
  groupId.value = ''; locationId.value = ''; startDate.value = ''; endDate.value = ''
  showError.value = false
}

// LÓGICA DE VALIDACIÓN DINÁMICA
const isFormInvalid = computed(() => {
  // Si es eliminar, no validamos campos
  if (props.mode === 'delete') return false
  
  // Si es edición, permitimos enviar (el backend suele ignorar nulos o actualizar solo lo enviado)
  if (props.mode !== 'create') return false

  // Validaciones según el tipo en modo CREATE
  if (props.type === 'schedule') {
    return !groupId.value || !locationId.value || !startDate.value || !endDate.value
  }
  if (props.type === 'user') {
    return !name.value || !email.value || !password.value || !role.value
  }
  if (props.type === 'group') {
    return !name.value || !subjectId.value || !teacherId.value
  }
  if (props.type === 'location') {
    return !name.value || capacity.value <= 0
  }
  return !name.value // Casos genéricos como 'subject'
})

const isButtonDisabled = computed(() => {
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
    payload = { groupId: groupId.value, locationId: locationId.value, startDate: startDate.value, endDate: endDate.value }
  } else {
    payload.name = name.value
    if (props.type === 'user') {
      Object.assign(payload, { email: email.value, password: password.value, role: role.value })
    } else if (props.type === 'group') {
      Object.assign(payload, { subjectId: subjectId.value, teacherId: teacherId.value })
    } else if (props.type === 'location') {
      payload.capacity = Number(capacity.value)
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

      <div class="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all">
        
        <div class="px-8 pt-8 pb-4 flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-light text-slate-800 dark:text-white uppercase tracking-tight">
              {{props.type === 'subject' && props.mode === 'create' ? 'Nueva' : props.mode === 'create' ? 'Nuevo' : props.mode === 'edit' ? 'Editar' : 'Eliminar' }} 
              <span class="font-bold text-[#0090e4]">
                {{ 
                  props.type === 'user' ? 'Usuario' : 
                  props.type === 'subject' ? 'Asignatura' : 
                  props.type === 'location' ? 'Ubicación' : 
                  props.type === 'schedule' ? 'Horario' : 'Grupo' 
                }}
              </span>
            </h2>
            <p v-if="props.mode !== 'delete'" class="text-slate-400 text-xs mt-1 font-medium tracking-wide uppercase">Completa los datos necesarios</p>
          </div>
          <button @click="close" class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="px-8 py-4">
          <div v-if="showError" class="mb-4 bg-red-50 dark:bg-red-900/10 text-red-600 p-3 rounded-lg text-xs font-bold border border-red-100 dark:border-red-900/20 flex items-center gap-2">
            <span class="material-symbols-outlined text-sm">warning</span>
            Por favor, completa todos los campos marcados con asterisco.
          </div>

          <div v-if="props.mode !== 'delete'" class="space-y-5">
            <div v-if="props.type !== 'schedule'">
              <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nombre<span class="text-red-500">*</span></label>
              <input v-model="name" placeholder="Escribe aqui..." 
                class="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all dark:text-white" />
            </div>

            <template v-if="props.type === 'schedule'">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Grupo de Clase</label>
                  <select v-model="groupId" class="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all dark:text-white">
                    <option value="" disabled>Selecciona un grupo</option>
                    <option v-for="g in props.groups" :key="g.id" :value="g.id">{{ g.name }}</option>
                  </select>
                </div>
                <div>
                  <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Ubicación / Aula</label>
                  <select v-model="locationId" class="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all dark:text-white">
                    <option value="" disabled>Selecciona aula</option>
                    <option v-for="l in props.locations" :key="l.id" :value="l.id">{{ l.name }}</option>
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Fecha de Inicio</label>
                  <input type="datetime-local" v-model="startDate" class="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all dark:text-white" />
                </div>
                <div>
                  <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Fecha de Fin</label>
                  <input type="datetime-local" v-model="endDate" class="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all dark:text-white" />
                </div>
              </div>
            </template>

            <template v-if="props.type === 'group'">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Asignatura</label>
                  <select v-model="subjectId" class="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all dark:text-white">
                    <option value="" disabled>Selecciona...</option>
                    <option v-for="s in subjects" :key="s.id" :value="s.id">{{ s.name }}</option>
                  </select>
                </div>
                <div>
                  <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Profesor</label>
                  <select v-model="teacherId" class="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all dark:text-white">
                    <option value="" disabled>Asignar profesor</option>
                    <option v-for="t in teachers" :key="t.id" :value="t.id">{{ t.name }}</option>
                  </select>
                </div>
              </div>
            </template>

            <template v-if="props.type === 'user'">
              <div v-if="props.mode === 'create'" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Correo Electrónico</label>
                  <input v-model="email" type="email" placeholder="ejemplo@dominio.com" class="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-sm outline-none dark:text-white" />
                </div>
                <div>
                  <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Contraseña</label>
                  <input v-model="password" type="password" placeholder="••••••••" class="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-sm outline-none dark:text-white" />
                </div>
              </div>
              <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Rol de Usuario</label>
                <select v-model="role" class="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-sm outline-none dark:text-white">
                  <option value="student">Estudiante</option>
                  <option value="teacher">Profesor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </template>

            <template v-if="props.type === 'location'">
              <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Capacidad / Aforo</label>
                <input v-model="capacity" type="number" class="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-sm outline-none dark:text-white" />
              </div>
            </template>
          </div>

          <div v-else class="py-6 flex flex-col items-center text-center">
            <div class="h-20 w-20 bg-red-50 dark:bg-red-900/10 rounded-full flex items-center justify-center mb-4">
              <span class="material-symbols-outlined text-red-500 text-4xl">delete_forever</span>
            </div>
            <h3 class="text-xl font-bold text-slate-800 dark:text-white mb-2">¿Estás completamente seguro?</h3>
            <p class="text-slate-500 dark:text-slate-400 text-sm max-w-300px">

              Esta acción eliminará permanentemente el registro de <strong>{{ 
                  props.type === 'user' ? 'Usuarios' : 
                  props.type === 'subject' ? 'Asignaturas' : 
                  props.type === 'location' ? 'Ubicaciones' : 
                  props.type === 'schedule' ? 'Horarios' : 'Grupos' 
                }}</strong>. No podrás deshacer este cambio.
            </p>
          </div>
        </div>

        <div class="px-8 py-8 flex items-center gap-3">
          <button @click="close" class="flex-1 px-6 py-3 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-all active:scale-[0.98]">
            Cancelar
          </button>
          <button 
            @click="submit" 
            :disabled="isButtonDisabled"
            :class="[
              props.mode === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#262626] hover:bg-black dark:bg-[#0090e4] dark:hover:bg-[#0090e4]',
              isButtonDisabled ? 'opacity-30 cursor-not-allowed grayscale' : 'active:scale-[0.98]'
            ]"
            class="flex-1 px-6 py-3 rounded-lg text-sm font-bold text-white shadow-lg transition-all"
          >
            {{ props.mode === 'delete' ? 'Confirmar Eliminación' : 'Guardar Cambios' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>