<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

onMounted(() => {
  if (auth.role === 'admin') {
    router.push('/admin')  
  } else if (auth.role === 'student') {
    router.push('/student') 
  } else if (auth.role === 'teacher') {
    router.push('/teacher')
  }else {
    router.push('/login')    
  }
})

async function logout() {
  await auth.logout()
  router.push('/login')
}
</script>