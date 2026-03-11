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
    { name: 'Dahsboard', path: '/admin' },
    { name: 'Usuarios', path: '/admin/users' },
    { name: 'Asignaturas', path: '/admin/subjets' },
    { name: 'Grupos', path: '/admin/grupos' },
    { name: 'Localizaciones', path: '/admin/localizaciones' },
    { name: 'Horarios', path: '/admin/horarios' }
  ],

  teacher: [
    { name: 'Grupos', path: '/teacher/groups' },
    { name: 'Evaluaciones', path: '/teacher/evaluaciones' }
  ],

  student: [
    { name: 'Mis prácticas', path: '/student/practicas' },
    { name: 'Calendario', path: '/student/calendario' }
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
  <nav class="flex items-center gap-1">
    <button
      v-for="link in navLinks"
      :key="link.path"
      @click="goToUrl(link.path)"
      :class="[
        route.path === link.path
          ? 'bg-primary/10 text-primary font-bold'
          : 'text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-100 dark:hover:bg-slate-800'
      ]"
      class="text-sm px-4 py-2 rounded-lg transition-all duration-200"
    >
      {{ link.name }}
    </button>
  </nav>
</template>