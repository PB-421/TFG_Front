<script setup lang="ts">
import { ref, watch,computed } from 'vue'
import CommentWindow from '../CommentWindow.vue';

const props = defineProps<{
  show: boolean
  request: any
  subjectName: string
  originName: string
  destName: string
  studentName?: string
  loading?: boolean
}>()

const emit = defineEmits(['close', 'submit'])

const teacherComment = ref('')
const showStudentCommentModal = ref(false)
const activeAction = ref<number | null>(null)

watch(() => props.show, (newVal) => {
  if (newVal && props.request) {
    teacherComment.value = props.request.teacherComment || ''
    activeAction.value = null
  }
})

const isButtonDisabled = computed(() => props.loading)

function close() { emit('close') }

function handleAction(status: number) {
  activeAction.value = status
  emit('submit', {
    id: props.request.id,
    status: status,
    teacherComment: teacherComment.value
  })
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
    <div v-if="show && request" class="fixed inset-0 z-150 flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" @click="close"></div>

      <div class="relative bg-white dark:bg-slate-900 w-full max-w-3xl rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all">
        
        <div class="px-8 pt-8 pb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 class="text-xl font-light text-slate-800 dark:text-white uppercase tracking-tight">
              Revisar <span class="font-bold text-[#e4002b]">Petición</span>
            </h2>
            <p class="text-slate-400 text-[10px] mt-1 font-black tracking-widest uppercase">
              {{ subjectName }} — {{ studentName || 'Estudiante' }}
            </p>
          </div>
          <button @click="close" :disabled="loading" class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
          <div class="flex flex-col space-y-6">
            <div>
              <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">
                1. Detalles del Trayecto
              </label>
              <div class="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                <div class="space-y-3">
                  <div class="flex items-center justify-between">
                    <span class="text-[9px] font-bold text-slate-400 uppercase">Origen Actual</span>
                    <span class="text-xs font-bold text-slate-700 dark:text-white">Grupo {{ originName }}</span>
                  </div>
                  <div class="flex items-center justify-center py-1">
                    <span class="material-symbols-outlined text-slate-300 text-sm">arrow_downward</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-[9px] font-bold text-slate-400 uppercase">Destino Solicitado</span>
                    <span class="text-xs font-bold text-[#e4002b]">Grupo {{ destName }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">
                2. Exposición del Alumno
              </label>
              
              <div v-if="request.studentComment">
                <button 
                  @click="showStudentCommentModal = true"
                  class="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500 transition-all group cursor-pointer"
                >
                  <span class="text-xs text-slate-600 dark:text-slate-400 italic truncate pr-4">
                    "{{ request.studentComment }}"
                  </span>
                  <span class="material-symbols-outlined text-slate-400 group-hover:text-slate-600 dark:group-hover:text-white transition-colors">open_in_full</span>
                </button>
              </div>

              <div v-else class="text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/20 p-4 rounded-lg border border-slate-100 dark:border-slate-800 border-dashed italic">
                El alumno no ha proporcionado comentarios adicionales.
              </div>
            </div>

            <div v-if="request.pdfPath" class="animate-fade-in">
              <a :href="request.pdfPath" target="_blank" 
                class="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-red-100 dark:border-red-900/30 text-[#e4002b] rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-all text-[10px] font-black uppercase tracking-widest">
                <span class="material-symbols-outlined text-lg">picture_as_pdf</span>
                Ver Justificante Adjunto
              </a>
            </div>
          </div>

          <div class="flex flex-col space-y-5">
            <div>
              <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">
                3. Resolución Técnica
              </label>
              <textarea 
                v-model="teacherComment"
                rows="6"
                placeholder="Escribe aquí el motivo de la decisión o instrucciones para el alumno..."
                class="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-xs dark:text-white outline-none focus:border-slate-400 dark:focus:border-slate-500 transition-all resize-none"
              ></textarea>
            </div>
            
            <div class="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-dashed border-amber-200 dark:border-amber-900/30 flex gap-3">
              <span class="material-symbols-outlined text-amber-500 text-sm">info</span>
              <p class="text-[10px] text-amber-700 dark:text-amber-500/80 leading-snug font-medium">
                Al emitir un veredicto (Aceptar o Rechazar), la resolución será definitiva.
              </p>
            </div>
          </div>
        </div>

        <div class="px-8 py-6 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
          <button @click="close" :disabled="loading" class="px-6 py-2.5 rounded-lg text-xs font-black uppercase text-slate-400 hover:text-slate-600 transition-all">
            Cancelar
          </button>
          
          <div class="flex gap-2">
            <button @click="handleAction(1)" :disabled="isButtonDisabled"
              :class="isButtonDisabled ? 'opacity-50 grayscale' : 'hover:bg-red-50'"
              class="px-6 py-2.5 rounded-lg text-xs font-black uppercase border border-red-200 text-red-600 transition-all flex items-center gap-2">
              <template v-if="loading && activeAction === 1">
                <span class="material-symbols-outlined text-sm animate-spin">sync</span>
                <span>Procesando...</span>
              </template>
              <template v-else>
                <span>Rechazar</span>
              </template>
            </button>

            <button @click="handleAction(2)" :disabled="isButtonDisabled"
              :class="isButtonDisabled ? 'opacity-50 grayscale' : 'hover:bg-black active:scale-95'"
              class="bg-[#262626] text-white px-8 py-2.5 rounded-lg text-xs font-black uppercase shadow-lg transition-all flex items-center gap-2">
              <template v-if="loading && activeAction === 2">
                <span class="material-symbols-outlined text-sm animate-spin">sync</span>
                <span>Actualizando...</span>
              </template>
              <template v-else>
                <span class="material-symbols-outlined text-sm">check_circle</span>
                <span>Aprobar Cambio</span>
              </template>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
  <CommentWindow 
      :show="showStudentCommentModal" 
      :comment="request?.studentComment || ''" 
      :type="1"
      @close="showStudentCommentModal = false"
    />
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
</style>