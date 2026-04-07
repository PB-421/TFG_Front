<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth.store'

const API_URL = import.meta.env.VITE_API_URL
const auth = useAuthStore()

// Interfaces actualizadas según tu DTO
interface Subject {
  id: string
  name: string
}

interface Group {
  id: string
  name: string
  subjectId: string
  teacherId: string // Añadido según tu GroupsDto
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

// Lógica del Calendario (Se mantiene igual)
const daysInMonth = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const days = new Date(year, month + 1, 0).getDate()
  const padding = firstDay === 0 ? 6 : firstDay - 1 
  return { padding, days, month, year }
})

const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
]

const getSubjectName = (id?: string) => subjects.value.find(s => s.id === id)?.name || id || 'Sin asignar'

// --- Lógica Principal de Carga para Profesor ---
async function fetchTeacherSchedules() {
  loading.value = true;
  const userId = await auth.isMicrosoftUser();
  
  try {
    // 1. Obtenemos perfil y todas las asignaturas
    const [resProfile, resAllSubjects] = await Promise.all([
      fetch(`${API_URL}/api/profiles/GetUser?id=${userId}`, { credentials: 'include' }),
      fetch(`${API_URL}/api/subjects`, { credentials: 'include' })
    ]);

    if (!resProfile.ok) throw new Error('Usuario no encontrado');
    if (resAllSubjects.ok) subjects.value = await resAllSubjects.json();
    
    const profileData: Profile = await resProfile.json();
    const teacherId = profileData.id;

    // 2. Obtenemos los grupos. 
    // Nota: Aquí asumo que existe un endpoint /api/groups/teacher/{id} 
    // o que filtramos la lista general por teacherId.
    const resGroups = await fetch(`${API_URL}/api/groups`, { credentials: 'include' });
    if (!resGroups.ok) throw new Error("Error cargando grupos");
    
    const allGroups: Group[] = await resGroups.json();
    
    // Filtramos los grupos donde el usuario actual es el profesor
    const teacherGroups = allGroups.filter(g => g.teacherId === teacherId);

    const groupSubjectRelation: MapSubjects[] = teacherGroups.map(g => ({
      GroupId: g.id,
      SubjectId: g.subjectId
    }));

    const groupIds = teacherGroups.map(g => g.id);

    if (groupIds.length === 0) {
      schedules.value = [];
      return;
    }

    // 3. Obtenemos horarios de esos grupos específicos
    const fetches = groupIds.map(id =>
      fetch(`${API_URL}/api/schedules/group/${id}`, { credentials: 'include' })
        .then(res => res.ok ? (res.json() as Promise<Schedule[]>) : [])
        .catch(() => [] as Schedule[])
    );

    const schedulesPerGroup = await Promise.all(fetches);
    const allSchedules = schedulesPerGroup.flat();

    // 4. Mapeo de IDs de asignatura para la visualización
    const relationMap = new Map(groupSubjectRelation.map(r => [r.GroupId, r.SubjectId]));

    schedules.value = allSchedules.map(s => {
      const subjectId = relationMap.get(s.group.id);
      if (subjectId) s.group.subjectId = subjectId;
      return s;
    });

  } catch (error) {
    console.error("Error cargando calendario docente:", error);
  } finally {
    loading.value = false;
  }
}

const getSessionsForDay = (day: number) => {
  return schedules.value
    .filter(s => {
      const d = new Date(s.startDate)
      return d.getDate() === day && 
             d.getMonth() === currentDate.value.getMonth() && 
             d.getFullYear() === currentDate.value.getFullYear()
    })
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
}

const formatTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const changeMonth = (offset: number) => {
  currentDate.value = new Date(currentDate.value.setMonth(currentDate.value.getMonth() + offset))
}

onMounted(fetchTeacherSchedules)
</script>

<template>
  <div class="max-w-6xl mx-auto p-6">
    <div class="flex items-center justify-between mb-8 border-b border-slate-200 pb-6">
      <div>
        <h1 class="text-3xl font-light text-slate-900 dark:text-slate-900">Calendario de prácticas</h1>
        <p class="text-slate-500 text-sm mt-1 uppercase tracking-widest font-bold">
          {{ monthNames[currentDate.getMonth()] }} {{ currentDate.getFullYear() }}
        </p>
      </div>
      <div class="flex gap-2">
        <button @click="changeMonth(-1)" class="p-2 flex items-center justify-center rounded-full border border-slate-800 text-slate-800 transition-all duration-300 hover:bg-slate-800 hover:text-white hover:border-white">
          <span class="material-symbols-outlined">left</span>
        </button>
        <button @click="changeMonth(1)" class="p-2 flex items-center justify-center rounded-full border border-slate-800 text-slate-800 transition-all duration-300 hover:bg-slate-800 hover:text-white hover:border-white">
          <span class="material-symbols-outlined">right</span>
        </button> 
      </div>
    </div>

    <div v-if="loading" class="flex flex-col items-center py-20">
      <div class="animate-spin size-10 border-4 border-[#e4002b] border-t-transparent rounded-full mb-4"></div>
      <p class="text-slate-500 animate-pulse">Sincronizando...</p>
    </div>

    <div v-else class="bg-white dark:bg-slate-900 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
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
              class="custom-tooltip absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 shadow-2xl p-4 rounded-xl transition-all duration-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible">
            
            <div class="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
              <span class="text-xs font-black uppercase text-slate-400">Día {{ day }}</span>
              <span class="bg-slate-100 dark:bg-slate-800 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">{{ getSessionsForDay(day).length }} clases</span>
            </div>

            <div class="space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              <div v-for="session in getSessionsForDay(day)" :key="'detail-'+session.id" class="relative pl-3 border-l-2 border-[#e4002b]">
                <h4 class="text-xs font-bold text-slate-800 dark:text-white uppercase leading-tight">
                  {{ getSubjectName(session.group?.subjectId) }}
                </h4>
                
                <p class="text-[10px] text-[#e4002b] font-medium mt-0.5 italic">
                  Grupo: {{ session.group?.name || 'N/A' }}
                </p>

                <div class="mt-2 grid grid-cols-2 gap-2">
                  <div class="flex flex-col">
                    <span class="text-[9px] text-slate-400 font-bold uppercase">Hora</span>
                    <span class="text-[11px] text-slate-600 dark:text-slate-300">{{ formatTime(session.startDate) }} - {{ formatTime(session.endDate) }}</span>
                  </div>
                  <div class="flex flex-col">
                    <span class="text-[9px] text-slate-400 font-bold uppercase">Aula</span>
                    <span class="text-[11px] text-slate-600 dark:text-slate-300 truncate">{{ session.location?.name || 'N/A' }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="tooltip-arrow"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24; }

.custom-tooltip {
  transition: opacity 0.2s ease, visibility 0.2s;
  transition-delay: 0.1s; 
  pointer-events: auto;
}

.group:hover .custom-tooltip {
  transition-delay: 0s;
}

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