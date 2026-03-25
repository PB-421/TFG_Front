<script setup lang="ts">
import { ref, onMounted } from 'vue'
import ModalWindow from '@/components/ModalWindow.vue' 
import { useAuthStore } from '@/stores/auth.store'

const API_URL = import.meta.env.VITE_API_URL
const auth = useAuthStore()

interface Profile {
  id: string
  email: string
  name: string
  role: string
}

const profiles = ref<Profile[]>([])
const loading = ref(true)

const modalOpen = ref(false)
const modalMode = ref<'create'|'edit'|'delete'>('create')
const selectedUser = ref<Profile | null>(null)

async function fetchData() {
  const userId = await auth.isMicrosoftUser();
  try {
    const res = await fetch(`${API_URL}/api/profiles/GetAll?adminId=${userId}`, { credentials:'include' })
    profiles.value = await res.json()
  } finally {
    loading.value = false
  }
}

function openCreate(){
  modalMode.value='create'
  selectedUser.value=null
  modalOpen.value=true
}

function openEdit(user:Profile){
  modalMode.value='edit'
  selectedUser.value=user
  modalOpen.value=true
}

function openDelete(user:Profile){
  modalMode.value='delete'
  selectedUser.value=user
  modalOpen.value=true
}

async function handleSubmit(data:any){

  const userId = await auth.isMicrosoftUser();
  let response;
  try{
    if(modalMode.value==='create'){
      response = await fetch(`${API_URL}/api/auth/register?adminId=${userId}`,{
        method:'POST',
        credentials:'include',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(data)
      })
    }

    if(modalMode.value==='edit' && selectedUser.value){
      response = await fetch(`${API_URL}/api/profiles/UpdateUser/${selectedUser.value.id}?adminId=${userId}`,{
        method:'PUT',
        credentials:'include',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          name:data.name,
          role:data.role
        })
      })
    }

    if(modalMode.value==='delete' && selectedUser.value){
      response = await fetch(`${API_URL}/api/auth/delete/${selectedUser.value.id}?adminId=${userId}`,{
        method:'DELETE',
        credentials:'include'
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

const getRoleClass = (role: string) => {
  const base = "inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider w-fit min-w-[80px]"
  return role.toLowerCase() === 'admin'
    ? `${base} bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300`
    : `${base} bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300`
}

onMounted(fetchData)
</script>


<template>
  <div class="space-y-4">
    <div class="max-w-6xl mx-auto p-6 space-y-6">
      
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 class="text-3xl font-light text-slate-800 dark:text-white">Gestión de Usuarios</h1>
          <p class="text-slate-500 text-sm mt-1">Directorio de cuentas y permisos</p>
        </div>
        <button @click="openCreate" class="flex items-center gap-2 bg-[#262626] hover:bg-black text-white px-6 py-2.5 rounded shadow-sm transition-all font-medium text-sm">
          <span class="material-symbols-outlined text-sm">+</span>
          Nuevo Usuario
        </button>
      </div>

      <div v-if="loading" class="flex flex-col items-center py-20">
        <div class="animate-spin size-10 border-4 border-[#e4002b] border-t-transparent rounded-full mb-4"></div>
        <p class="text-slate-500 animate-pulse">Cargando usuarios...</p>
      </div>

      <div v-else class="space-y-4">
        <div v-for="profile in profiles" :key="profile.id" 
             class="group relative flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden hover:border-indigo-300 transition-all">
          
          <div class="w-1.5 self-stretch bg-[#e4002b]"></div>

          <div class="flex-1 grid grid-cols-1 md:grid-cols-12 items-center px-6 py-5 gap-4">
  
            <div class="md:col-span-5 flex items-center gap-4 border-r border-slate-100 dark:border-slate-800 pr-4">
              <img :src="`https://ui-avatars.com/api/?name=${profile.name}&background=random`" class="h-10 w-10 rounded-full" />
              <div class="flex flex-col">
                <span class="text-base font-semibold text-slate-800 dark:text-white leading-tight">{{ profile.name }}</span>
                <span class="text-xs text-slate-400 font-medium">{{ profile.email }}</span>
              </div>
            </div>

            <div class="md:col-span-4 flex flex-col">
              <span class="text-xs text-slate-400 font-bold uppercase tracking-tighter">Rol de Sistema</span>
              <span :class="getRoleClass(profile.role)" class="text-sm font-bold uppercase mt-0.5">
                {{ profile.role }}
              </span>
            </div>

            <div class="md:col-span-3 flex justify-end gap-2">
              <button @click="openEdit(profile)" class="p-2 text-slate-400 hover:text-[#0090e4] hover:bg-indigo-50 rounded-full transition-colors">
                <span class="material-symbols-outlined">edit</span>
              </button>
              <button @click="openDelete(profile)" class="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors">
                <span class="material-symbols-outlined">person_remove</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <ModalWindow
      :show="modalOpen"
      :mode="modalMode"
      :item="selectedUser"
      type="user"
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
            <h3 class="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-tight">¡Éxito!</h3>
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
            <h3 class="text-2xl font-light text-slate-800 dark:text-white mb-3">Error de Sistema</h3>
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