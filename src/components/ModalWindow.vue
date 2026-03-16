<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth.store'

const API_URL = import.meta.env.VITE_API_URL
const auth = useAuthStore()

interface User { id?: string; email: string; name: string; role: string }
interface Subject { id?: string; name: string }
interface Group { id?: string; name: string; subjectId?: string; teacherId?: string }

const props = defineProps<{
  show: boolean
  mode: 'create' | 'edit' | 'delete'
  item: any
  type: 'user' | 'subject' | 'group' | 'location' // Añadido location
}>()

const emit = defineEmits(['close','submit'])

// Form fields
const name = ref('')
const email = ref('')
const password = ref('')
const role = ref('student')
const subjectId = ref('')
const teacherId = ref('')
const capacity = ref<number>(0)

// Lists for selects
const teachers = ref<User[]>([])
const subjects = ref<Subject[]>([])

async function loadDependencies() {
  if (props.type !== 'group') return
  
  const userId = await auth.isMicrosoftUser()
  
  // Cargar Profesores
  const resProfiles = await fetch(`${API_URL}/api/profiles/GetAll?adminId=${userId}`, { credentials: 'include' })
  if (resProfiles.ok) {
    const allUsers: User[] = await resProfiles.json()
    teachers.value = allUsers.filter(u => u.role.toLowerCase() === 'teacher')
  }

  // Cargar Asignaturas
  const resSubjects = await fetch(`${API_URL}/api/subjects`, { credentials: 'include' })
  if (resSubjects.ok) {
    subjects.value = await resSubjects.json()
  }
}

watch(() => props.show, (isShown) => {
  if (isShown) loadDependencies()
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
  }
})

function resetForm() {
  name.value = ''
  email.value = ''
  password.value = ''
  role.value = 'student'
  subjectId.value = ''
  teacherId.value = ''
  capacity.value = 0
}

function submit() {
  const payload: any = { name: name.value }
  
  if (props.type === 'user') {
    Object.assign(payload, { email: email.value, password: password.value, role: role.value })
  } else if (props.type === 'group') {
    Object.assign(payload, { subjectId: subjectId.value, teacherId: teacherId.value })
  } else if (props.type === 'location') {
    payload.capacity = Number(capacity.value)
  }
  
  emit('submit', payload)
}

function close() {
  resetForm()
  emit('close')
}
</script>

<template>
  <div v-if="props.show" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
    <div class="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md space-y-4 shadow-2xl">
      <h2 class="text-lg font-bold text-slate-900 dark:text-white">
        <span v-if="props.mode === 'create'">Crear</span>
        <span v-else-if="props.mode === 'edit'">Editar</span>
        <span v-else>Eliminar</span>
        {{ props.type === 'user' ? 'Usuario' : props.type === 'subject' ? 'Asignatura' : props.type === 'location' ? 'Ubicación' :'Grupo' }}
      </h2>

      <div v-if="props.mode !== 'delete'" class="space-y-3">
        <div>
          <label class="text-xs font-semibold text-slate-500 uppercase ml-1">Nombre</label>
          <input v-model="name" placeholder="Nombre..." class="w-full border rounded-lg p-2.5 dark:bg-slate-800 dark:border-slate-700 mt-1" />
        </div>


        <template v-if="props.type === 'group'">
          <div>
            <label class="text-xs font-semibold text-slate-500 uppercase ml-1">Asignatura</label>
            <select v-model="subjectId" class="w-full border rounded-lg p-2.5 dark:bg-slate-800 dark:border-slate-700 mt-1">
              <option value="" disabled>Selecciona asignatura</option>
              <option v-for="s in subjects" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </div>

          <div>
            <label class="text-xs font-semibold text-slate-500 uppercase ml-1">Profesor</label>
            <select v-model="teacherId" class="w-full border rounded-lg p-2.5 dark:bg-slate-800 dark:border-slate-700 mt-1">
              <option value="" disabled>Selecciona profesor</option>
              <option v-for="t in teachers" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </div>
        </template>

        <template v-if="props.type === 'user'">
          <input v-if="props.mode === 'create'" v-model="email" placeholder="Email" class="w-full border rounded-lg p-2.5 dark:bg-slate-800 dark:border-slate-700" />
          <input v-if="props.mode === 'create'" v-model="password" type="password" placeholder="Contraseña" class="w-full border rounded-lg p-2.5 dark:bg-slate-800 dark:border-slate-700" />
          <select v-model="role" class="w-full border rounded-lg p-2.5 dark:bg-slate-800 dark:border-slate-700">
            <option value="student">Estudiante</option>
            <option value="teacher">Profesor</option>
            <option value="admin">Administrador</option>
          </select>
        </template>

        <template v-if="props.type === 'location'">
          <label class="text-xs font-semibold text-slate-500 uppercase ml-1">Aforo Máximo</label>
          <input v-model="capacity" type="number" placeholder="Ej: 30" class="w-full border rounded-lg p-2.5 dark:bg-slate-800 dark:border-slate-700 mt-1" />
        </template>
      </div>

      <div v-else class="text-slate-600 dark:text-slate-300 py-2">
        ¿Estás seguro de que deseas eliminar este elemento? Esta acción no se puede deshacer.
      </div>

      <div class="flex justify-end gap-3 pt-4">
        <button @click="close" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-lg transition-colors">
          Cancelar
        </button>
        <button @click="submit" :class="props.mode === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'" class="px-4 py-2 text-sm font-bold text-white rounded-lg transition-all shadow-md active:scale-95">
          {{ props.mode === 'delete' ? 'Eliminar' : 'Guardar' }}
        </button>
      </div>
    </div>
  </div>
</template>