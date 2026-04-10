<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import ModalWindow from '@/components/ModalWindow.vue'
import { useAuthStore } from '@/stores/auth.store'


const API_URL = import.meta.env.VITE_API_URL
const auth = useAuthStore()

interface Subject {
  id?: string
  name: string
  course?: number
}

const subjects = ref<Subject[]>([])
const loading = ref(true)
const isSubmitting = ref(false)
const searchQuery = ref('')

const modalOpen = ref(false)
const modalMode = ref<'create' | 'edit' | 'delete'>('create')
const selectedSubject = ref<Subject | null>(null)

async function fetchData() {
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

const filteredSubjects = computed(() => {
  return subjects.value.filter(item => {

    const subjectsName = item.name
    const matchesName = subjectsName.toLowerCase().includes(searchQuery.value.toLowerCase())

    return matchesName 
  })
})

async function handleSubmit(data: Subject) {

  const userId = await auth.isMicrosoftUser();

  const headers = { 'Content-Type': 'application/json' }
  let response;

  isSubmitting.value = true;

  try {
    if (modalMode.value === 'create') {
      response = await fetch(`${API_URL}/api/subjects?adminId=${userId}`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ Name: data.name, Course: data.course })
      })
    }

    if (modalMode.value === 'edit' && selectedSubject.value) {
      response = await fetch(`${API_URL}/api/subjects/${selectedSubject.value.id}?adminId=${userId}`, {
        method: 'PUT',
        credentials: 'include',
        headers,
        body: JSON.stringify({ Id: selectedSubject.value.id, Name: data.name, Course: data.course })
      })
    }

    if (modalMode.value === 'delete' && selectedSubject.value) {
      response = await fetch(`${API_URL}/api/subjects/${selectedSubject.value.id}?adminId=${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
    }

    if (response) {
      const message = await response.text(); 
      
      if (response.ok) {
        showAlert(message || 'Operación realizada con éxito', 'success');
        modalOpen.value = false;
        fetchData(); 
      } else {
        showAlert(message || 'Hubo un error en el servidor', 'error');
      }
    }
  } catch (error) {
    console.error("Error en la operación:", error)
  } finally {
     isSubmitting.value = false;
  }
}

const alert = ref({
  show: false,
  message: '',
  type: 'success' as 'success' | 'error'
})

const showAlert = (message: string, type: 'success' | 'error' = 'success') => {
  alert.value = { show: true, message, type }
  
  // Solo cerramos automáticamente si es éxito
  if (type === 'success') {
    setTimeout(() => {
      alert.value.show = false
    }, 4000)
  }
}

const closeAlert = () => {
  alert.value.show = false
}

onMounted(fetchData)
</script>

<template>
  <div class="space-y-4">
    <div class="max-w-6xl mx-auto p-6 space-y-6">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 class="text-3xl font-light text-slate-900 dark:text-slate-900">Gestión de Asignaturas</h1>
        </div>
        <button 
          @click="openCreate" 
          class="flex items-center gap-2 bg-[#262626] hover:bg-black text-white px-6 py-2.5 rounded shadow-sm transition-all font-medium text-sm"
        >
          <span class="material-symbols-outlined text-sm">+</span>
          Nueva Asignatura
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-1 gap-4">
        <div class="relativ max-w-sm">
          <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">s</span>
          <input 
            v-model="searchQuery"
            type="text" 
            placeholder="Buscar por nombre..." 
            class="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-[#e4002b] outline-none transition-all"
          />
        </div>
      </div>

      <div v-if="loading" class="flex flex-col items-center py-20">
        <div class="animate-spin size-10 border-4 border-[#e4002b] border-t-transparent rounded-full mb-4"></div>
        <p class="text-slate-500 animate-pulse">Cargando asignaturas...</p>
      </div>

      <div v-if="filteredSubjects.length === 0 && !loading" class="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
        <span class="material-symbols-outlined text-4xl text-slate-300">search_off</span>
        <p class="text-slate-500 mt-2">No se encontraron asignaturas con ese nombre.</p>
        <button @click="searchQuery = ''" class="text-[#0090e4] text-sm font-medium mt-1 hover:underline">Limpiar filtros</button>
      </div>

      <div v-else class="space-y-4">
        <div v-for="subject in filteredSubjects" :key="subject.id" 
             class="group relative flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden hover:border-indigo-300 transition-all">
          
          <div class="w-1.5 self-stretch bg-[#e4002b]"></div>

          <div class="flex-1 grid grid-cols-1 md:grid-cols-12 items-center px-6 py-5 gap-4">
            
            <div class="md:col-span-8">
              <div class="flex flex-col md:flex-row md:items-center md:justify-between">
                <div class="flex-1">
                  <span class="text-xs text-slate-400 font-bold uppercase tracking-tighter">Nombre de la Asignatura</span>
                  <div class="text-lg font-semibold text-slate-800 dark:text-slate-200">
                    {{ subject.name }}
                  </div>
                </div>

                <div class="mt-2 md:mt-0 md:ml-4 text-right">
                  <span class="text-xs text-slate-400 font-bold uppercase tracking-tighter">Curso</span>
                  <div class="text-lg font-semibold text-slate-800 dark:text-slate-200">
                    {{ subject.course }}º
                  </div>
                </div>
              </div>
            </div>

            <div class="md:col-span-4 flex justify-end gap-2">
              <button @click="openEdit(subject)" class="p-2 text-slate-400 hover:text-[#0090e4] hover:bg-indigo-50 rounded-full transition-colors">
                <span class="material-symbols-outlined">edit_note</span>
              </button>
              <button @click="openDelete(subject)" class="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors">
                <span class="material-symbols-outlined">delete_sweep</span>
              </button>
            </div>
          </div>
        </div>

        <div v-if="subjects.length === 0" class="text-center py-20 border-2 border-dashed border-slate-200 rounded-xl">
          <p class="text-slate-400 italic">No hay asignaturas registradas actualmente.</p>
        </div>
      </div>
    </div>

    <ModalWindow
      :show="modalOpen"
      :mode="modalMode"
      :item="selectedSubject"
      :loading="isSubmitting"
      type="subject"
      @close="modalOpen = false"
      @submit="handleSubmit"
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
          class="fixed bottom-6 right-6 z-100 max-w-sm w-full bg-white dark:bg-slate-900 shadow-xl rounded-lg border border-slate-200 dark:border-slate-800 flex items-stretch overflow-hidden">
        
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
      <div v-if="alert.show && alert.type === 'error'" class="fixed inset-0 z-200 flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px]" @click="closeAlert"></div>

        <div class="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all">
          
          <div class="p-8 text-center">
            <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-50 dark:bg-red-900/10 mb-6">
              <span class="material-symbols-outlined text-red-500 text-4xl font-light">error</span>
            </div>
            
            <h3 class="text-2xl font-light text-slate-800 dark:text-white mb-3">Algo salió mal</h3>
            <p class="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
              {{ alert.message }}
            </p>
          </div>

          <div class="px-8 pb-8 flex flex-col">
            <button 
              @click="closeAlert"
              class="w-full bg-[#262626] hover:bg-black text-white px-6 py-3 rounded shadow-sm transition-all font-medium text-sm active:scale-[0.98]"
            >
              Cerrar y Reintentar
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>