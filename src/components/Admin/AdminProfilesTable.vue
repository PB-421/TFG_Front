<script setup lang="ts">
import { ref, onMounted } from 'vue'
import ModalWindow from '@/components/ModalWindow.vue'

const API_URL = import.meta.env.VITE_API_URL

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

async function loadProfiles() {
  try {
    const res = await fetch(`${API_URL}/api/profiles/GetAll`, { credentials:'include' })
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

  if(modalMode.value==='create'){
    await fetch(`${API_URL}/api/auth/register`,{
      method:'POST',
      credentials:'include',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(data)
    })
  }

  if(modalMode.value==='edit' && selectedUser.value){
    await fetch(`${API_URL}/api/profiles/UpdateUser/${selectedUser.value.id}`,{
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
    await fetch(`${API_URL}/api/auth/delete/${selectedUser.value.id}`,{
      method:'DELETE',
      credentials:'include'
    })
  }

  modalOpen.value=false
  loadProfiles()
}

const getRoleClass = (role: string) => {
  return role.toLowerCase() === 'admin'
    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
}

onMounted(loadProfiles)
</script>


<template>
  <div class="space-y-4">

    <!-- HEADER -->
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-bold text-slate-900 dark:text-white">
        Gestión de Usuarios
      </h1>

      <button
        @click="openCreate"
        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
      >
        + Nuevo Usuario
      </button>
    </div>


    <!-- TABLE -->
    <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">

      <!-- LOADING -->
      <div v-if="loading" class="p-20 text-center">
        <div class="animate-spin inline-block size-8 border-[3px] border-blue-600 border-t-transparent rounded-full mb-4"></div>
        <p class="text-slate-500">Accediendo a la base de datos...</p>
      </div>

      <!-- TABLE -->
      <table v-else class="w-full text-left border-collapse">

        <thead>
          <tr class="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
            <th class="px-6 py-4 text-xs font-bold uppercase text-slate-500">
              Usuario
            </th>

            <th class="px-6 py-4 text-xs font-bold uppercase text-slate-500">
              Email
            </th>

            <th class="px-6 py-4 text-xs font-bold uppercase text-slate-500">
              Rol
            </th>

            <th class="px-6 py-4 text-xs font-bold uppercase text-slate-500 text-right">
              Acciones
            </th>
          </tr>
        </thead>

        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">

          <tr
            v-for="profile in profiles"
            :key="profile.id"
            class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
          >

            <!-- USER -->
            <td class="px-6 py-4">
              <div class="flex items-center gap-3">

                <img
                  :src="`https://ui-avatars.com/api/?name=${profile.name}&background=random`"
                  class="h-9 w-9 rounded-full"
                />

                <span class="text-sm font-bold text-slate-900 dark:text-white">
                  {{ profile.name }}
                </span>

              </div>
            </td>

            <!-- EMAIL -->
            <td class="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
              {{ profile.email }}
            </td>

            <!-- ROLE -->
            <td class="px-6 py-4">

              <span
                :class="getRoleClass(profile.role)"
                class="px-2.5 py-1 rounded text-[10px] font-bold uppercase"
              >
                {{ profile.role }}
              </span>

            </td>

            <!-- ACTIONS -->
            <td class="px-6 py-4 text-right">
              <div class="relative inline-block group">
                
                <button class="p-2 text-slate-400 group-hover:text-blue-600 transition-colors">
                  <span class="material-symbols-outlined text-lg leading-none">
                    (Icono)
                  </span>
                </button>

                <div class="absolute right-0 top-0 mt-0 hidden group-hover:flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg z-10 px-1 py-1 animate-in fade-in zoom-in duration-150">
                  
                  <button
                    @click="openEdit(profile)"
                    class="flex items-center gap-2 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-600 dark:text-slate-300 hover:text-blue-600 rounded-md transition-colors"
                    title="Editar"
                  >
                    <span class="material-symbols-outlined text-sm">edit</span>
                  </button>

                  <button
                    @click="openDelete(profile)"
                    class="flex items-center gap-2 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-600 dark:text-slate-300 hover:text-red-600 rounded-md transition-colors"
                    title="Eliminar"
                  >
                    <span class="material-symbols-outlined text-sm">delete</span>
                  </button>
                  
                </div>
              </div>
            </td>

          </tr>

        </tbody>
      </table>

    </div>


    <!-- MODAL -->
   <ModalWindow
      :show="modalOpen"
      :mode="modalMode"
      :item="selectedUser"
      @close="modalOpen = false"
      @submit="handleSubmit"
    />


  </div>
</template>