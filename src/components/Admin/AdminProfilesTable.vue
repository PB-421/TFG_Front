<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import ModalWindow from '@/components/ModalWindow.vue' 
import { useAuthStore } from '@/stores/auth.store'
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  EnvelopeIcon, 
  IdentificationIcon,
  PencilSquareIcon,
  UserMinusIcon,
  MagnifyingGlassCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon
} from '@heroicons/vue/24/solid'

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
const isSubmitting = ref(false)
const searchQuery = ref('')
const searchEmail = ref('')
const searchRole = ref('')

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

const filteredProfiles = computed(() => {
  return profiles.value.filter(profile => {

    const matchesName = profile.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    
    const matchesEmail = profile.email.toLowerCase().includes(searchEmail.value.toLowerCase())
    
    const matchesRole = searchRole.value === '' ||  profile.role.toLowerCase() === searchRole.value.toLowerCase()

    return matchesName && matchesEmail && matchesRole
  })
})

async function handleSubmit(data:any){

  const userId = await auth.isMicrosoftUser();
  let response;
  isSubmitting.value = true;
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
          <h1 class="text-3xl font-light text-slate-900 dark:text-slate-900">Gestión de Usuarios</h1>
        </div>
        <button @click="openCreate" class="flex items-center gap-2 bg-[#262626] hover:bg-black text-white px-6 py-2.5 rounded shadow-sm transition-all font-medium text-sm">
          <PlusIcon class="size-4 stroke-[3px]" />
          Nuevo Usuario
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="relative">
          <MagnifyingGlassIcon class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-5" />
          <input 
            v-model="searchQuery"
            type="text" 
            placeholder="Buscar por nombre..." 
            class="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-[#e4002b] outline-none transition-all"
          />
        </div>

        <div class="relative">
          <EnvelopeIcon class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-5" />
          <input 
            v-model="searchEmail"
            type="text" 
            placeholder="Buscar por correo..." 
            class="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-[#e4002b] outline-none transition-all"
          />
        </div>

        <div class="relative">
          <IdentificationIcon class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-5" />
          <select 
            v-model="searchRole"
            class="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-[#e4002b] outline-none transition-all appearance-none"
          >
            <option value="">Todos los roles</option>
            <option value="admin">Admin</option>
            <option value="teacher">Profesor</option>
            <option value="student">Estudiante</option>
          </select>
        </div>
      </div>

      <div v-if="loading" class="flex flex-col items-center py-20">
        <div class="animate-spin size-10 border-4 border-[#e4002b] border-t-transparent rounded-full mb-4"></div>
        <p class="text-slate-500 animate-pulse">Cargando usuarios...</p>
      </div>

      <div v-else-if="filteredProfiles.length === 0" class="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
        <MagnifyingGlassCircleIcon class="size-12 text-slate-300 mx-auto" />
        <p class="text-slate-500 mt-2">No se encontraron usuarios con esos filtros.</p>
        <button @click="searchQuery = ''; searchEmail = ''; searchRole= ''" class="text-[#0090e4] text-sm font-medium mt-1 hover:underline">Limpiar filtros</button>
      </div>

      <div v-else class="space-y-4">
        <div v-for="profile in filteredProfiles" :key="profile.id" 
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
                <PencilSquareIcon class="size-5" />
              </button>
              <button @click="openDelete(profile)" class="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors">
                <UserMinusIcon class="size-5" />
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
      :loading="isSubmitting"
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
            <CheckCircleIcon class="size-6" />
          </div>
          <div class="flex-1">
            <h3 class="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-tight">¡Éxito!</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{{ alert.message }}</p>
          </div>
          <button @click="closeAlert" class="p-1 text-slate-300 hover:text-slate-500 transition-colors">
            <XMarkIcon class="size-5" />
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
              <ExclamationTriangleIcon class="size-10 text-red-500" />
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