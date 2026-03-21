import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

import LoginView from '@/views/LoginView.vue'
import DashboardView from '@/views/DashboardView.vue'
import AdminView from '@/views/AdminView.vue'
import StudentView from '@/views/StudentView.vue'
import AdminProfilesTable from '@/components/Admin/AdminProfilesTable.vue'
import AdminDashboard from '@/components/Admin/AdminDashboard.vue'
import AdminSubjectsTable from '@/components/Admin/AdminSubjectsTable.vue'
import AdminGroupsTable from '@/components/Admin/AdminGroupsTable.vue'
import AdminLocationsTable from '@/components/Admin/AdminLocationsTable.vue'
import AdminSchedulesTable from '@/components/Admin/AdminSchedulesTable.vue'
import StudentCalendar from '@/components/Student/StudentCalendar.vue'

const routes = [
  { 
    path: '/login', 
    component: LoginView 
  },

  {
    path: '/dashboard',
    component: DashboardView,
    meta: { auth: true }
  },

  {
    path: '/admin',
    component: AdminView,
    meta: { auth: true, role: 'admin' },
    children: [
      { path: '', component: AdminDashboard },
      { path: 'users', component: AdminProfilesTable },
      { path: 'subjets', component: AdminSubjectsTable },
      { path: 'groups', component: AdminGroupsTable },
      { path: 'locations', component: AdminLocationsTable },
      { path: 'schedules', component: AdminSchedulesTable },
    ]
  },

  {
    path: '/student',
    component: StudentView,
    meta: { auth: true, role: 'student' },
    children: [
      { path: '', component: StudentCalendar },
      { path: 'subjectCatalog', component: AdminProfilesTable },
    ]
  },

  // Catch-all redirect
  { path: '/:pathMatch(.*)*', redirect: '/login' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Global navigation guard
router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (!auth.initialized) {
    await auth.autoLogin()
  }

  // Redirigir si ruta requiere autenticación y no hay sesión
  if (to.meta.auth && !auth.isAuthenticated) {
    return { path: '/login' }
  }

  // Comprobar rol
  if (to.meta.role && auth.role !== to.meta.role) {
    return { path: '/dashboard' }
  }

  // Evitar que usuarios logueados vean login
  if (to.path === '/login' && auth.isAuthenticated) {
    return { path: '/dashboard' }
  }

  return true
})

export default router