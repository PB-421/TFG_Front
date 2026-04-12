<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { 
  XMarkIcon, 
  MagnifyingGlassIcon, 
  CheckCircleIcon, 
  InformationCircleIcon, 
  ArrowsRightLeftIcon 
} from '@heroicons/vue/24/solid'

interface Profile {
  id: string
  name: string
  email?: string
}

interface Group {
  id: string
  name: string
  subjectId: string
  teacherId: string
  students: Profile[]
}

const props = defineProps<{
  show: boolean
  sourceGroup: Group | null
  availableGroups: Group[] // Grupos de la misma asignatura y profesor
}>()

const emit = defineEmits(['close', 'transfer'])

// Estado interno
const searchQuery = ref('')
const selectedStudentId = ref<string | null>(null)
const targetGroupId = ref('')
const isSubmitting = ref(false)

// Filtrar alumnos del grupo actual por nombre
const filteredStudents = computed(() => {
  if (!props.sourceGroup?.students) return []
  const query = searchQuery.value.toLowerCase().trim()
  if (!query) return props.sourceGroup.students
  return props.sourceGroup.students.filter(s => 
    s.name.toLowerCase().includes(query) || 
    s.email?.toLowerCase().includes(query)
  )
})

// Resetear al cerrar o cambiar de grupo
watch(() => props.show, (newVal) => {
  if (newVal) {
    selectedStudentId.value = null
    targetGroupId.value = ''
    searchQuery.value = ''
  }
})

function handleTransfer() {
  if (!selectedStudentId.value || !targetGroupId.value || !props.sourceGroup) return

  const student = props.sourceGroup.students.find(s => s.id === selectedStudentId.value)
  
  // Emitimos el movimiento al componente padre
  emit('transfer', {
    studentId: selectedStudentId.value,
    studentName: student?.name,
    fromGroupId: props.sourceGroup.id,
    toGroupId: targetGroupId.value
  })
}

function close() {
  emit('close')
}
</script>

<template>
  <Transition
    enter-active-class="ease-out duration-300"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="ease-in duration-200"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div v-if="show" class="fixed inset-0 z-150 flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" @click="close"></div>

      <div class="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all">
        
        <div class="px-8 pt-8 pb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 class="text-xl font-light text-slate-800 dark:text-white uppercase tracking-tight">
              Gestionar <span class="font-bold text-[#e4002b]">Alumnos</span>
            </h2>
            <p class="text-slate-400 text-[10px] mt-1 font-black tracking-widest uppercase">
              Mover de: <span class="text-slate-600 dark:text-slate-200">{{ sourceGroup?.name }}</span>
            </p>
          </div>
          <button @click="close" class="p-2 text-slate-400 hover:text-red-500 dark:hover:text-slate-200 transition-colors">
            <XMarkIcon class="w-6 h-6" />
          </button>
        </div>

        <div class="p-8">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            <div class="flex flex-col space-y-4">
              <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                1. Seleccionar Alumno
              </label>
              
              <div class="relative">
                <MagnifyingGlassIcon class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  v-model="searchQuery"
                  type="text" 
                  placeholder="Filtrar por nombre..."
                  class="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-4 py-2.5 text-xs outline-none focus:border-red-400 transition-all dark:text-white"
                />
              </div>

              <div class="h-64 overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-lg bg-slate-50/30 dark:bg-slate-900/50 custom-scrollbar">
                <div v-if="filteredStudents.length === 0" class="p-8 text-center text-slate-400 text-xs italic">
                  No se encontraron alumnos
                </div>
                <button 
                  v-for="student in filteredStudents" 
                  :key="student.id"
                  @click="selectedStudentId = student.id"
                  :class="[
                    'w-full text-left px-4 py-3 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between transition-all',
                    selectedStudentId === student.id ? 'bg-red-50 dark:bg-red-900/20 border-l-4 border-l-red-500' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  ]"
                >
                  <div class="flex flex-col">
                    <span class="text-sm font-bold text-slate-700 dark:text-slate-200">{{ student.name }}</span>
                    <span class="text-[10px] text-slate-400">{{ student.email }}</span>
                  </div>
                  <CheckCircleIcon v-if="selectedStudentId === student.id" class="w-5 h-5 text-red-500" />
                </button>
              </div>
            </div>

            <div class="flex flex-col space-y-6">
              <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">
                  2. Grupo Destino
                </label>
                <div class="space-y-2">
                  <div v-if="availableGroups.length === 0" class="p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/20 rounded-lg">
                    <p class="text-[10px] text-orange-600 font-bold uppercase leading-tight">
                      No hay otros grupos disponibles para esta asignatura.
                    </p>
                  </div>
                  <div v-else v-for="group in availableGroups" :key="group.id">
                    <label class="relative flex items-center p-3 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                      <input 
                        type="radio" 
                        name="targetGroup" 
                        :value="group.id" 
                        v-model="targetGroupId"
                        class="accent-red-600 h-4 w-4"
                      />
                      <div class="ml-3">
                        <span class="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase">{{ group.name }}</span>
                        <span class="block text-[10px] text-slate-400">{{ group.students?.length || 0 }} Alumnos actualmente</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div v-if="selectedStudentId && targetGroupId" class="mt-auto p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                <div class="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                  <InformationCircleIcon class="w-5 h-5 text-[#e4002b]" />
                  <p class="text-[11px] leading-snug">
                    Se moverá al alumno seleccionado al grupo <span class="font-bold text-slate-800 dark:text-white">{{ availableGroups.find(g => g.id === targetGroupId)?.name }}</span>.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>

        <div class="px-8 py-6 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
          <button @click="close" class="px-6 py-2.5 rounded-lg text-xs font-black uppercase text-slate-400 hover:text-slate-600 transition-all">
            Cancelar
          </button>
          <button 
            @click="handleTransfer"
            :disabled="!selectedStudentId || !targetGroupId"
            class="bg-[#262626] hover:bg-black disabled:opacity-20 disabled:grayscale text-white px-8 py-2.5 rounded-lg text-xs font-black uppercase shadow-lg transition-all active:scale-95 flex items-center gap-2"
          >
            <ArrowsRightLeftIcon class="w-4 h-4" />
            Confirmar Cambio
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
.dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; }
</style>