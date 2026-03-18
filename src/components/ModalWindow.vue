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
  // Pero si quieres que al menos el nombre esté, puedes ajustarlo. 
  // Para este requerimiento, solo obligamos en 'create':
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
  <div v-if="props.show" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
    <div class="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800">
      
      <h2 class="text-lg font-bold text-slate-900 dark:text-white">
        <span v-if="props.mode === 'create'">Crear</span>
        <span v-else-if="props.mode === 'edit'">Editar</span>
        <span v-else>Eliminar</span>
        {{ 
          props.type === 'user' ? 'Usuario' : 
          props.type === 'subject' ? 'Asignatura' : 
          props.type === 'location' ? 'Ubicación' : 
          props.type === 'schedule' ? 'Horario' : 'Grupo' 
        }}
      </h2>

      <div v-if="showError" class="bg-red-50 text-red-600 p-2 rounded-lg text-xs font-medium border border-red-200">
        Por favor, completa todos los campos obligatorios.
      </div>

      <div v-if="props.mode !== 'delete'" class="space-y-3">
        <div v-if="props.type !== 'schedule'">
          <label class="text-xs font-semibold text-slate-500 uppercase ml-1">
            Nombre <span v-if="props.mode === 'create'" class="text-red-500">*</span>
          </label>
          <input v-model="name" placeholder="Nombre..." :required="props.mode === 'create'"
            class="w-full border rounded-lg p-2.5 dark:bg-slate-800 dark:border-slate-700 mt-1 focus:ring-2 focus:ring-blue-500 outline-none" 
            :class="{'border-red-300': showError && !name && props.mode === 'create'}"/>
        </div>

        <template v-if="props.type === 'schedule'">
          <div>
            <label class="text-xs font-semibold text-slate-500 uppercase ml-1">
              Grupo <span v-if="props.mode === 'create'" class="text-red-500">*</span>
            </label>
            <select v-model="groupId" class="w-full border rounded-lg p-2.5 dark:bg-slate-800 dark:border-slate-700 mt-1"
              :class="{'border-red-300': showError && !groupId && props.mode === 'create'}">
              <option value="" disabled>Selecciona un grupo</option>
              <option v-for="g in props.groups" :key="g.id" :value="g.id">{{ g.name }}</option>
            </select>
          </div>

          <div>
            <label class="text-xs font-semibold text-slate-500 uppercase ml-1">
              Ubicación / Aula <span v-if="props.mode === 'create'" class="text-red-500">*</span>
            </label>
            <select v-model="locationId" class="w-full border rounded-lg p-2.5 dark:bg-slate-800 dark:border-slate-700 mt-1"
              :class="{'border-red-300': showError && !locationId && props.mode === 'create'}">
              <option value="" disabled>Selecciona ubicación</option>
              <option v-for="l in props.locations" :key="l.id" :value="l.id">{{ l.name }}</option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-xs font-semibold text-slate-500 uppercase ml-1">Inicio</label>
              <input type="datetime-local" v-model="startDate" class="w-full border rounded-lg p-2.5 dark:bg-slate-800 dark:border-slate-700 mt-1 text-sm" 
                :class="{'border-red-300': showError && !startDate && props.mode === 'create'}"/>
            </div>
            <div>
              <label class="text-xs font-semibold text-slate-500 uppercase ml-1">Fin</label>
              <input type="datetime-local" v-model="endDate" class="w-full border rounded-lg p-2.5 dark:bg-slate-800 dark:border-slate-700 mt-1 text-sm" 
                :class="{'border-red-300': showError && !endDate && props.mode === 'create'}"/>
            </div>
          </div>
        </template>

        <template v-if="props.type === 'group'">
          <div>
            <label class="text-xs font-semibold text-slate-500 uppercase ml-1">Asignatura</label>
            <select v-model="subjectId" class="w-full border rounded-lg p-2.5 dark:bg-slate-800 dark:border-slate-700 mt-1"
              :class="{'border-red-300': showError && !subjectId && props.mode === 'create'}">
              <option value="" disabled>Selecciona asignatura</option>
              <option v-for="s in subjects" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </div>
          <div>
            <label class="text-xs font-semibold text-slate-500 uppercase ml-1">Profesor</label>
            <select v-model="teacherId" class="w-full border rounded-lg p-2.5 dark:bg-slate-800 dark:border-slate-700 mt-1"
              :class="{'border-red-300': showError && !teacherId && props.mode === 'create'}">
              <option value="" disabled>Selecciona profesor</option>
              <option v-for="t in teachers" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </div>
        </template>

        <template v-if="props.type === 'user'">
          <input v-if="props.mode === 'create'" v-model="email" placeholder="Email" 
            class="w-full border rounded-lg p-2.5 dark:bg-slate-800 dark:border-slate-700"
            :class="{'border-red-300': showError && !email && props.mode === 'create'}"/>

          <input v-if="props.mode === 'create'" v-model="password" type="password" placeholder="Contraseña" 
            class="w-full border rounded-lg p-2.5 dark:bg-slate-800 dark:border-slate-700"
            :class="{'border-red-300': showError && !password && props.mode === 'create'}"/>
          
          <select v-model="role" class="w-full border rounded-lg p-2.5 dark:bg-slate-800 dark:border-slate-700">
            <option value="student">Estudiante</option>
            <option value="teacher">Profesor</option>
            <option value="admin">Administrador</option>
          </select>
        </template>

        <template v-if="props.type === 'location'">
          <label class="text-xs font-semibold text-slate-500 uppercase ml-1">Aforo Máximo</label>
          <input v-model="capacity" type="number" placeholder="Ej: 30" 
            class="w-full border rounded-lg p-2.5 dark:bg-slate-800 dark:border-slate-700 mt-1"
            :class="{'border-red-300': showError && capacity <= 0 && props.mode === 'create'}"/>
        </template>
      </div>

      <div v-else class="text-slate-600 dark:text-slate-300 py-2">
        ¿Estás seguro de que deseas eliminar este elemento? Esta acción no se puede deshacer.
      </div>

      <div class="flex justify-end gap-3 pt-4">
        <button @click="close" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-lg transition-colors">
          Cancelar
        </button>
        <button @click="submit" 
          :class="[
            props.mode === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700',
            (isFormInvalid && showError) ? 'opacity-50 cursor-not-allowed' : ''
          ]"
          class="px-4 py-2 text-sm font-bold text-white rounded-lg transition-all shadow-md active:scale-95">
          {{ props.mode === 'delete' ? 'Eliminar' : 'Guardar' }}
        </button>
      </div>
    </div>
  </div>
</template>