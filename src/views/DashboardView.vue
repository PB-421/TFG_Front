<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

onMounted(() => {
  if (auth.role === 'admin') {
    router.push('/admin')     // ruta para admin
  } else if (auth.role === 'student') {
    router.push('/student')   // ruta para estudiante
  } else {
    router.push('/login')     // por si no hay rol
  }
})

async function logout() {
  await auth.logout()
  router.push('/login')
}
</script>