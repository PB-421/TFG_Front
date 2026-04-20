<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  ClockIcon, 
  MapPinIcon, 
  UserGroupIcon,
  CalendarDaysIcon,
  InformationCircleIcon
} from '@heroicons/vue/24/solid'

const API_URL = import.meta.env.VITE_API_URL
const auth = useAuthStore()

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
      fetch(`${API_URL}/api/subjects`, { credentials: 'include',headers: { 'Authorization': `${userId}` }  })
    ]);

    if (!resProfile.ok) throw new Error('Usuario no encontrado');
    if(resAllSubjects) subjects.value = await resAllSubjects.json()
    const data:Promise<Profile> = await resProfile.json()
    const resGroups = await fetch(`${API_URL}/api/groups/student/${(await data).id}`, { credentials: 'include',headers: { 'Authorization': `${userId}` }  });
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
      fetch(`${API_URL}/api/schedules/group/${id}`, { credentials: 'include',headers: { 'Authorization': `${userId}` }  })
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
  return schedules.value
    .filter(s => {
      const d = new Date(s.startDate)
      return d.getDate() === day && 
             d.getMonth() === currentDate.value.getMonth() && 
             d.getFullYear() === currentDate.value.getFullYear()
    })
    .sort((a, b) => {
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
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
      <div class="flex items-center gap-4">
        <div class="bg-[#e4002b] p-2.5 rounded-lg shadow-lg shadow-red-500/20">
          <CalendarDaysIcon class="size-6 text-white" />
        </div>
        <div>
          <h1 class="text-3xl font-light text-slate-900 dark:text-slate-900 tracking-tight">Mi Calendario de Practicas</h1>
          <p class="text-slate-500 text-xs mt-0.5 uppercase tracking-[0.2em] font-black">
            {{ monthNames[currentDate.getMonth()] }} {{ currentDate.getFullYear() }}
          </p>
        </div>
      </div>
      
      <div class="flex items-center bg-white dark:bg-slate-900 border border-slate-200 rounded-xl p-1 shadow-sm">
        <button @click="changeMonth(-1)" class="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-600">
          <ChevronLeftIcon class="size-5 stroke-[2.5px]" />
        </button>
        <div class="px-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-x border-slate-100">Mes</div>
        <button @click="changeMonth(1)" class="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-600">
          <ChevronRightIcon class="size-5 stroke-[2.5px]" />
        </button> 
      </div>
    </div>

    <div v-if="loading" class="flex flex-col items-center py-20">
      <div class="animate-spin size-10 border-4 border-[#e4002b] border-t-transparent rounded-full mb-4"></div>
      <p class="text-slate-500 animate-pulse">Sincronizando...</p>
    </div>

    <div v-else class="bg-white dark:bg-slate-900 border border-slate-200 rounded-xl shadow-sm relative">
      <div class="grid grid-cols-7 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200">
        <div v-for="d in ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']" :key="d" class="py-3 text-center text-[10px] font-bold text-slate-400 uppercase">{{ d }}</div>
      </div>

      <div class="grid grid-cols-7">
        <div v-for="p in daysInMonth.padding" :key="'p'+p" class="h-32 border-b border-r border-slate-100 bg-slate-50/30"></div>

        <div v-for="day in daysInMonth.days" :key="day" 
            class="h-32 border-b border-r border-slate-100 relative group transition-colors hover:bg-slate-50/50">
          
          <span class="absolute top-3 left-4 text-sm font-medium text-slate-400">{{ day }}</span>

          <div v-if="getSessionsForDay(day).length > 0" class="mt-10 px-2">
            <div v-for="session in getSessionsForDay(day).slice(0, 2)" :key="session.id" class="bg-[#e4002b]/10 border-l-2 border-[#e4002b] px-2 py-0.5 mb-1">
              <p class="text-[9px] font-bold text-[#e4002b] truncate uppercase">{{ getSubjectName(session.group?.subjectId) }}</p>
            </div>
            <p v-if="getSessionsForDay(day).length > 2" class="text-[8px] text-slate-400 font-bold ml-1">+ {{ getSessionsForDay(day).length - 2 }} más</p>
          </div>

          <div v-if="getSessionsForDay(day).length > 0" 
              class="custom-tooltip absolute z-50 left-1/2 -translate-x-1/2 w-72 bg-white dark:bg-slate-900 border border-slate-200 shadow-2xl p-4 rounded-xl transition-all duration-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible"
              :class="day <= 14 ? 'top-full mt-2' : 'bottom-full mb-2'">
            
            <div class="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
              <div class="flex items-center gap-2">
                <InformationCircleIcon class="size-4 text-[#e4002b]" />
                <span class="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Programación Día {{ day }}</span>
              </div>
              <span class="bg-slate-100 dark:bg-slate-800 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">{{ getSessionsForDay(day).length }} sesiones</span>
            </div>

            <div class="space-y-5 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
              <div v-for="session in getSessionsForDay(day)" :key="'detail-'+session.id" class="relative pl-4 border-l-2 border-slate-200 hover:border-[#e4002b] transition-colors group/item">
                <h4 class="text-xs font-black text-slate-800 dark:text-white uppercase leading-tight mb-2">
                  {{ getSubjectName(session.group?.subjectId) }}
                </h4>
                
                <div class="space-y-2">
                  <div class="flex items-center gap-2 text-[10px] text-slate-500">
                    <ClockIcon class="size-3.5 text-slate-400" />
                    <span class="font-bold">{{ formatTime(session.startDate) }} - {{ formatTime(session.endDate) }}</span>
                  </div>
                  
                  <div class="flex items-center gap-2 text-[10px] text-slate-500">
                    <MapPinIcon class="size-3.5 text-[#e4002b]" />
                    <span class="truncate">{{ session.location?.name || 'Aula no asignada' }}</span>
                  </div>

                  <div class="flex items-center gap-2 text-[10px] text-slate-500">
                    <UserGroupIcon class="size-3.5 text-slate-400" />
                    <span class="italic">Grupo: {{ session.group?.name || 'N/A' }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div :class="day <= 14 ? 'tooltip-arrow-up' : 'tooltip-arrow'"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24; }

/* Estilo para que el tooltip no desaparezca de golpe y permita el scroll */
.custom-tooltip {
  /* Al quitar el mouse, espera 0.1s antes de volverse invisible */
  transition: opacity 0.2s ease, visibility 0.2s;
  transition-delay: 0.1s; 
  pointer-events: auto; /* Permite hacer clic y scroll dentro */
}

/* Cuando el padre tiene hover, el tooltip aparece sin delay */
.group:hover .custom-tooltip {
  transition-delay: 0s;
}

/* Scrollbar estética */
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}

.tooltip-arrow-up {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-bottom: 8px solid white; /* Flecha hacia arriba */
}

/* Triangulito inferior del modal */
.tooltip-arrow {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 8px solid white;
}
:deep(.dark) .tooltip-arrow {
  border-top-color: #0f172a;
}
</style>