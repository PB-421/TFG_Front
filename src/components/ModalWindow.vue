<script setup lang="ts">
import { ref, watch } from 'vue'

interface User {
  id?: string
  email: string
  name: string
  role: string
}

interface Subject {
  id?: string
  name: string
}

const props = defineProps<{
  show: boolean
  mode: 'create' | 'edit' | 'delete'
  item: User | Subject | null
}>()

const emit = defineEmits(['close','submit'])

const name = ref('')
const email = ref('')
const password = ref('')
const role = ref('student')

// Type guard: le dice a TS cuándo algo es User
function isUser(item: User | Subject | null | undefined): item is User {
  return !!item && 'email' in item
}

// Opcional: helper para template que mira props.item
const isUserProp = () => isUser(props.item)

watch(() => props.item, (value) => {
  if (!value) {
    name.value = ''
    email.value = ''
    password.value = ''
    role.value = 'student'
    return
  }

  if (isUser(value)) {
    // Aquí TS sabe que value es User
    name.value = value.name ?? ''
    email.value = value.email ?? ''
    role.value = value.role ?? 'student'
  } else {
    // Aquí TS sabe que value es Subject
    name.value = value.name ?? ''
  }
})

function submit() {
  if (isUser(props.item)) {
    emit('submit', {
      name: name.value,
      email: email.value,
      password: password.value,
      role: role.value
    })
  } else {
    emit('submit', {
      name: name.value
    })
  }
}

function close() {
  name.value = ''
  email.value = ''
  password.value = ''
  role.value = 'student'
  emit('close')
}
</script>

<template>
  <div v-if="props.show" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div class="bg-white dark:bg-slate-900 rounded-xl p-6 w-420px space-y-4">
      <h2 class="text-lg font-bold">
        <template v-if="isUserProp()">
          <span v-if="props.mode === 'create'">Crear Usuario</span>
          <span v-else-if="props.mode === 'edit'">Editar Usuario</span>
          <span v-else>Eliminar Usuario</span>
        </template>

        <template v-else>
          <span v-if="props.mode === 'create'">Crear Asignatura</span>
          <span v-else-if="props.mode === 'edit'">Editar Asignatura</span>
          <span v-else>Eliminar Asignatura</span>
        </template>
      </h2>

      <!-- CREATE / EDIT -->
      <div v-if="props.mode !== 'delete'" class="space-y-3">
        <!-- Nombre (siempre aparece) -->
        <input
          v-model="name"
          placeholder="Nombre"
          class="w-full border rounded p-2 dark:bg-slate-800"
        />

        <!-- Campos exclusivos de User -->
        <template v-if="isUserProp()">
          <input
            v-if="props.mode === 'create'"
            v-model="email"
            placeholder="Email"
            class="w-full border rounded p-2 dark:bg-slate-800"
          />

          <input
            v-if="props.mode === 'create'"
            v-model="password"
            type="password"
            placeholder="Password"
            class="w-full border rounded p-2 dark:bg-slate-800"
          />

          <select
            v-model="role"
            class="w-full border rounded p-2 dark:bg-slate-800"
          >
            <option value="student">Student</option>
            <option value="admin">Admin</option>
          </select>
        </template>
      </div>

      <!-- DELETE -->
      <div v-else class="text-slate-600 dark:text-slate-300">
        <template v-if="isUserProp()">
          ¿Seguro que quieres eliminar este usuario?
        </template>

        <template v-else>
          ¿Seguro que quieres eliminar esta asignatura?
        </template>
      </div>

      <div class="flex justify-end gap-2 pt-3">
        <button
          @click="close"
          class="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Cancelar
        </button>

        <button
          @click="submit"
          class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Confirmar
        </button>
      </div>
    </div>
  </div>
</template>
