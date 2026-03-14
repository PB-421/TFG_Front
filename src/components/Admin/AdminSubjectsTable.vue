<script setup lang="ts">
import { ref, onMounted } from 'vue'
import ModalWindow from '@/components/ModalWindow.vue'

const API_URL = import.meta.env.VITE_API_URL

interface Subject {
  id?: string
  name: string
}

const subjects = ref<Subject[]>([])
const loading = ref(true)

const modalOpen = ref(false)
const modalMode = ref<'create' | 'edit' | 'delete'>('create')
const selectedSubject = ref<Subject | null>(null)

async function loadSubjects() {
  loading.value = true
  try {
    const res = await fetch(`${API_URL}/api/subjects`, { credentials: 'include' })
    if (res.ok) {
      subjects.value = await res.json()
    }
  } catch (error) {
    console.error("Error cargando asignaturas:", error)
  } finally {
    loading.value = false
  }
}

function openCreate() {
  modalMode.value = 'create'
  selectedSubject.value = null
  modalOpen.value = true
}

function openEdit(subject: Subject) {
  modalMode.value = 'edit'
  selectedSubject.value = { ...subject }
  modalOpen.value = true
}

function openDelete(subject: Subject) {
  modalMode.value = 'delete'
  selectedSubject.value = subject
  modalOpen.value = true
}

async function handleSubmit(data: Subject) {
  const headers = { 'Content-Type': 'application/json' }
  try {
    if (modalMode.value === 'create') {
      await fetch(`${API_URL}/api/subjects`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ Name: data.name })
      })
    }

    if (modalMode.value === 'edit' && selectedSubject.value) {
      await fetch(`${API_URL}/api/subjects/${selectedSubject.value.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers,
        body: JSON.stringify({ Id: selectedSubject.value.id, Name: data.name })
      })
    }

    if (modalMode.value === 'delete' && selectedSubject.value) {
      await fetch(`${API_URL}/api/subjects/${selectedSubject.value.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })
    }
  } catch (error) {
    console.error("Error en la operación:", error)
  }

  modalOpen.value = false
  loadSubjects()
}

onMounted(loadSubjects)
</script>

<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-bold text-slate-900 dark:text-white">
        Gestión de Asignaturas
      </h1>

      <button
        @click="openCreate"
        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all active:scale-95"
      >
        + Nueva Asignatura
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
            <th class="px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider">
              Asignatura
            </th>
            <th class="px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider text-right">
              Acciones
            </th>
          </tr>
        </thead>

        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          <tr
            v-for="subject in subjects"
            :key="subject.id"
            class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group/row"
          >
            <td class="px-6 py-4">
              <div class="flex items-center gap-3">
                <span class="text-sm font-bold text-slate-900 dark:text-white">
                  {{ subject.name }}
                </span>
              </div>
            </td>

            <td class="px-6 py-4 text-right">
              <div class="relative inline-block group">
                <button class="p-2 text-slate-400 group-hover:text-blue-600 transition-colors">
                  <span class="material-symbols-outlined text-lg leading-none">(Icono)</span>
                </button>

                <div
                  class="absolute right-0 top-0 mt-0 hidden group-hover:flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg z-10 px-1 py-1 animate-in fade-in zoom-in duration-150"
                >
                  <button
                    @click="openEdit(subject)"
                    class="flex items-center gap-2 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-600 dark:text-slate-300 hover:text-blue-600 rounded-md transition-colors"
                    title="Editar"
                  >
                    <span class="material-symbols-outlined text-sm">edit</span>
                  </button>

                  <button
                    @click="openDelete(subject)"
                    class="flex items-center gap-2 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-600 dark:text-slate-300 hover:text-red-600 rounded-md transition-colors"
                    title="Eliminar"
                  >
                    <span class="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              </div>
            </td>
          </tr>

          <tr v-if="subjects.length === 0">
            <td colspan="2" class="px-6 py-10 text-center text-slate-400 italic">
              No hay asignaturas registradas.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <ModalWindow
      :show="modalOpen"
      :mode="modalMode"
      :item="selectedSubject"
      type="subject"
      @close="modalOpen = false"
      @submit="handleSubmit"
    />
  </div>
</template>