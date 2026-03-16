<script setup lang="ts">
import { ref, onMounted } from 'vue'
import ModalWindow from '@/components/ModalWindow.vue'
import { useAuthStore } from '@/stores/auth.store'

const API_URL = import.meta.env.VITE_API_URL
const auth = useAuthStore()

interface Group {
  id?: string
  subjectId?: string
  name: string
  teacherId?: string
  students?: any[]
}

// Interfaces para el mapeo de nombres
interface SimpleEntity { id: string; name: string }

const groups = ref<Group[]>([])
const subjects = ref<SimpleEntity[]>([])
const teachers = ref<SimpleEntity[]>([])
const loading = ref(true)

const modalOpen = ref(false)
const modalMode = ref<'create' | 'edit' | 'delete'>('create')
const selectedGroup = ref<Group | null>(null)

// Funciones para obtener el nombre legible
const getSubjectName = (id?: string) => subjects.value.find(s => s.id === id)?.name || id || 'Sin asignar'
const getTeacherName = (id?: string) => teachers.value.find(t => t.id === id)?.name || id || 'Sin profesor'

async function fetchData() {
  loading.value = true
  try {
    // Cargamos todo en paralelo para mayor velocidad
    const [resGroups, resSubjects, resProfiles] = await Promise.all([
      fetch(`${API_URL}/api/groups`, { credentials: 'include' }),
      fetch(`${API_URL}/api/subjects`, { credentials: 'include' }),
      fetch(`${API_URL}/api/profiles/GetAll`, { credentials: 'include' }) // Usamos tu endpoint de perfiles
    ])

    if (resGroups.ok) groups.value = await resGroups.json()
    if (resSubjects.ok) subjects.value = await resSubjects.json()
    
    if (resProfiles.ok) {
      const allProfiles = await resProfiles.json()
      // Filtramos solo los que son profesores para la lista de referencia
      teachers.value = allProfiles.filter((p: any) => p.role === 'teacher' || p.role === 'admin')
    }
  } catch (error) {
    console.error("Error cargando datos:", error)
  } finally {
    loading.value = false
  }
}

function openCreate() {
  modalMode.value = 'create'
  selectedGroup.value = null
  modalOpen.value = true
}

function openEdit(group: Group) {
  modalMode.value = 'edit'
  selectedGroup.value = { ...group }
  modalOpen.value = true
}

function openDelete(group: Group) {
  modalMode.value = 'delete'
  selectedGroup.value = group
  modalOpen.value = true
}

async function handleSubmit(data: any) {
  const headers = { 'Content-Type': 'application/json' }
  try {
    if (modalMode.value === 'create') {
      await fetch(`${API_URL}/api/groups`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          Name: data.name,
          SubjectId: data.subjectId,
          TeacherId: data.teacherId
        })
      })
    }

    if (modalMode.value === 'edit' && selectedGroup.value) {
      await fetch(`${API_URL}/api/groups/${selectedGroup.value.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          Id: selectedGroup.value.id,
          Name: data.name,
          SubjectId: data.subjectId,
          TeacherId: data.teacherId
        })
      })
    }

    if (modalMode.value === 'delete' && selectedGroup.value) {
      await fetch(`${API_URL}/api/groups/${selectedGroup.value.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })
    }
  } catch (error) {
    console.error("Error en la operación:", error)
  }

  modalOpen.value = false
  fetchData()
}

onMounted(fetchData)
</script>

<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Gestión de Grupos</h1>
      <button @click="openCreate" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all active:scale-95">
        + Nuevo Grupo
      </button>
    </div>

    <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div v-if="loading" class="p-20 text-center">
        <div class="animate-spin inline-block size-8 border-[3px] border-blue-600 border-t-transparent rounded-full mb-4"></div>
        <p class="text-slate-500 font-medium">Accediendo a la base de datos...</p>
      </div>
      
      <table v-else class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
            <th class="px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider">Nombre del Grupo</th>
            <th class="px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider">Asignatura</th>
            <th class="px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider">Profesor</th>
            <th class="px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider">Estudiantes</th>
            <th class="px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider text-right">Acciones</th>
          </tr>
        </thead>

        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          <tr v-for="group in groups" :key="group.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group/row">
            <td class="px-6 py-4">
              <span class="text-sm font-bold text-slate-900 dark:text-white">{{ group.name }}</span>
            </td>

            <td class="px-6 py-4">
              <div class="flex flex-col">
                <span class="text-sm text-slate-700 dark:text-slate-200 font-medium">
                  {{ getSubjectName(group.subjectId) }}
                </span>
              </div>
            </td>

            <td class="px-6 py-4">
              <div class="flex items-center gap-2">
                <div class="size-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-500">
                  {{ getTeacherName(group.teacherId).charAt(0).toUpperCase() }}
                </div>
                <span class="text-sm text-slate-700 dark:text-slate-200">
                  {{ getTeacherName(group.teacherId) }}
                </span>
              </div>
            </td>

            <td class="px-6 py-4">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                {{ group.students?.length || 0 }} alumnos
              </span>
            </td>

            <td class="px-6 py-4 text-right">
              <div class="relative inline-block group">
                 <button class="p-2 text-slate-400 group-hover:text-blue-600 transition-colors">
                  <span class="material-symbols-outlined text-lg leading-none">more_vert</span>
                </button>
                <div class="absolute right-0 top-0 mt-0 hidden group-hover:flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg z-10 px-1 py-1">
                  <button @click="openEdit(group)" class="p-2 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-md"><span class="material-symbols-outlined text-sm">edit</span></button>
                  <button @click="openDelete(group)" class="p-2 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-md"><span class="material-symbols-outlined text-sm">delete</span></button>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <ModalWindow
      :show="modalOpen"
      :mode="modalMode"
      :item="selectedGroup"
      :subjects="subjects" 
      :teachers="teachers"
      type="group"
      @close="modalOpen = false"
      @submit="handleSubmit"
    />
  </div>
</template>