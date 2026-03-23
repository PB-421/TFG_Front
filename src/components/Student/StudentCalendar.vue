<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth.store'

const API_URL = import.meta.env.VITE_API_URL
const auth = useAuthStore()

// Interfaces basadas en tus DTOs

interface Subject {
  id: string
  name: string
}

interface Group {
  id: string
  name: string
  subjectId: string
}

interface Schedule {
  id: string
  group: Group
  startDate: string
  endDate: string
  location?: { name: string }
}

interface Profile {
  id: string
  email: string
  name: string
  role: string
}

interface MapSubjects {
  GroupId: string,
  SubjectId: string
}

// Estado
const subjects = ref<Subject[]>([])
const schedules = ref<Schedule[]>([])
const loading = ref(true)
const currentDate = ref(new Date())

// Lógica del Calendario
const daysInMonth = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const days = new Date(year, month + 1, 0).getDate()
  
  // Ajuste para que lunes sea el primer día (opcional, aquí estándar)
  const padding = firstDay === 0 ? 6 : firstDay - 1 
  return { padding, days, month, year }
})

const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
]

const getSubjectName = (id?: string) => subjects.value.find(s => s.id === id)?.name || id || 'Sin asignar'

async function fetchStudentSchedules() {
  loading.value = true;
  const userId = await auth.isMicrosoftUser();
  try {
    const [resProfile, resAllSubjects] = await Promise.all([
      fetch(`${API_URL}/api/profiles/GetUser?id=${userId}`, { credentials: 'include' }),
      fetch(`${API_URL}/api/subjects`, { credentials: 'include' })
    ]);

    if (!resProfile.ok) throw new Error('Usuario no encontrado');
    if(resAllSubjects) subjects.value = await resAllSubjects.json()
    const data:Promise<Profile> = await resProfile.json()
    const resGroups = await fetch(`${API_URL}/api/groups/student/${(await data).id}`, { credentials: 'include' });
    if (!resGroups.ok) throw new Error("Error cargando grupos");
    const groups: Group[] = await resGroups.json();
    const groupSubjectRelation: MapSubjects[] = groups.map(g => ({
      GroupId: g.id,
      SubjectId: g.subjectId
    }))
    const groupIds = groups.map(g => g.id);
    console.log("grupos del estudiante: "+groupIds)

    if (groupIds.length === 0) {
      schedules.value = [];
      return;
    }

    // 2. Hacemos una petición por cada groupId
    const fetches = groupIds.map(id =>
      fetch(`${API_URL}/api/schedules/group/${id}`, { credentials: 'include' })
        .then(res => {
          if (!res.ok) throw new Error(`Error cargando schedules para grupo ${id}`);
          return res.json() as Promise<Schedule[]>;
        })
        .catch(err => {
          console.error(err);
          return [] as Schedule[];
        })
    );

    const schedulesPerGroup = await Promise.all(fetches);
    const allSchedules = schedulesPerGroup.flat();
    schedules.value = allSchedules;
    // Crear mapa para búsquedas rápidas
    const relationMap = new Map(
      groupSubjectRelation.map(r => [r.GroupId, r.SubjectId])
    );

    schedules.value = schedules.value.map(s => {
      const subjectId = relationMap.get(s.group.id);
      if (subjectId) {
        s.group.subjectId = subjectId;
      }
      return s;
    });

  } catch (error) {
    console.error("Error cargando calendario:", error);
  } finally {
    loading.value = false;
  }
}

// Helper para encontrar sesiones en un día específico
const getSessionsForDay = (day: number) => {
  return schedules.value.filter(s => {
    const d = new Date(s.startDate)
    return d.getDate() === day && 
           d.getMonth() === currentDate.value.getMonth() && 
           d.getFullYear() === currentDate.value.getFullYear()
  })
}

const formatTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const changeMonth = (offset: number) => {
  currentDate.value = new Date(currentDate.value.setMonth(currentDate.value.getMonth() + offset))
}

onMounted(fetchStudentSchedules)
</script>

<template>
  <div class="max-w-6xl mx-auto p-6">
    <div class="flex items-center justify-between mb-8 border-b border-slate-200 pb-6">
      <div>
        <h1 class="text-3xl font-light text-slate-800 dark:text-white">Mi Calendario</h1>
        <p class="text-slate-500 text-sm mt-1 uppercase tracking-widest font-bold">
          {{ monthNames[currentDate.getMonth()] }} {{ currentDate.getFullYear() }}
        </p>
      </div>
      
      <div class="flex gap-2">
        <button 
          @click="changeMonth(-1)"
          class="p-2 flex items-center justify-center rounded-full
                border border-slate-800 text-slate-800
                transition-all duration-300
                hover:bg-slate-800 hover:text-white hover:border-white">
          <span class="material-symbols-outlined">chevron_left</span>
        </button>

        <button 
          @click="changeMonth(1)"
          class="p-2 flex items-center justify-center rounded-full
                border border-slate-800 text-slate-800
                transition-all duration-300
                hover:bg-slate-800 hover:text-white hover:border-white">
          <span class="material-symbols-outlined">chevron_right</span>
        </button>
      </div>
    </div>

    <div v-if="loading" class="flex flex-col items-center py-20">
      <div class="animate-spin size-10 border-4 border-[#e4002b] border-t-transparent rounded-full mb-4"></div>
      <p class="text-slate-500 animate-pulse">Sincronizando sesiones...</p>
    </div>

    <div v-else class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
      <div class="grid grid-cols-7 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
        <div v-for="d in ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']" :key="d" 
             class="py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
          {{ d }}
        </div>
      </div>

      <div class="grid grid-cols-7">
        <div v-for="p in daysInMonth.padding" :key="'p'+p" class="h-32 border-b border-r border-slate-100 dark:border-slate-800 bg-slate-50/30"></div>

        <div v-for="day in daysInMonth.days" :key="day" 
             class="h-32 border-b border-r border-slate-100 dark:border-slate-800 relative group transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
          
          <span class="absolute top-3 left-4 text-sm font-medium text-slate-400">{{ day }}</span>

          <div v-if="getSessionsForDay(day).length > 0" class="mt-10 px-2">
            <div v-for="session in getSessionsForDay(day)" :key="session.id"
                 class="bg-[#e4002b]/10 border-l-2 border-[#e4002b] px-2 py-1 mb-1 cursor-help">
              
              <p class="text-[10px] font-bold text-[#e4002b] truncate uppercase">
                {{ getSubjectName(session.group?.subjectId) }}
              </p>
              
              <div class="invisible group-hover:visible absolute z-50 left-full ml-2 top-0 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-4 rounded-lg pointer-events-none">
                <div class="flex items-center gap-2 mb-2">
                  <span class="w-2 h-2 rounded-full bg-[#e4002b]"></span>
                  <span class="text-xs font-bold uppercase tracking-tight">{{ getSubjectName(session.group?.subjectId) }}</span>
                </div>
                <div class="space-y-2">
                  <div class="flex flex-col">
                    <span class="text-[10px] text-slate-400 font-bold uppercase">Grupo</span>
                    <span class="text-sm text-slate-700 dark:text-slate-200">{{ session.group?.name }}</span>
                  </div>
                  <div class="flex flex-col">
                    <span class="text-[10px] text-slate-400 font-bold uppercase">Horario</span>
                    <span class="text-sm text-slate-700 dark:text-slate-200">
                      {{ formatTime(session.startDate) }} - {{ formatTime(session.endDate) }}
                    </span>
                  </div>
                  <div class="flex flex-col">
                    <span class="text-[10px] text-slate-400 font-bold uppercase">Ubicación</span>
                    <span class="text-sm text-slate-700 dark:text-slate-200">
                      {{ session.location?.name || 'Aula no asignada' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24;
}
</style>