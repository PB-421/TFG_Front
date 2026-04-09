<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

/* LINKS POR ROL */

const linksByRole = {
  admin: [
    { name: 'Dashboard', path: '/admin' },
    { name: 'Usuarios', path: '/admin/users' },
    { name: 'Asignaturas', path: '/admin/subjets' },
    { name: 'Grupos', path: '/admin/groups' },
    { name: 'Localizaciones', path: '/admin/locations' },
    { name: 'Horarios', path: '/admin/schedules' }
  ],

  teacher: [
    { name: 'Calendario', path: '/teacher' },
    { name: 'Grupos', path: '/teacher/groups'},
    { name: 'Peticiones de cambio', path: '/teacher/requests'},
  ],

  student: [
    { name: 'Calendario', path: '/student' },
    { name: 'Catalogo de asignaturas', path: '/student/subjectCatalog' },
    { name: 'Peticiones de cambio', path: '/student/requests' }
  ]
}

/* NAV LINKS SEGÚN ROL */

const navLinks = computed(() => {
  return linksByRole[auth.role as keyof typeof linksByRole] ?? []
})

/* NAVIGATE */

const goToUrl = (path: string) => {
  router.push(path)
}
</script>

<template>
  <nav class="flex items-center gap-2">
    <button
      v-for="link in navLinks"
      :key="link.path"
      @click="goToUrl(link.path)"
      :class="[
        route.path === link.path
          ? 'bg-[#002d56] text-white shadow-sm' 
          : 'text-slate-600 hover:bg-gray-100 hover:text-[#002d56]'
      ]"
      class="text-sm px-4 py-2 rounded-md font-medium transition-all duration-200"
    >
      {{ link.name }}
    </button>
  </nav>
</template>