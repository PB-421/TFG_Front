<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { createClient } from '@supabase/supabase-js'
import { 
  XMarkIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon, 
  CloudArrowUpIcon,
  PaperAirplaneIcon,
  TrashIcon,
  ArrowPathIcon
} from '@heroicons/vue/24/solid'

const API_URL = import.meta.env.VITE_API_URL

const props = defineProps<{
  show: boolean
  mode: 'create' | 'delete'
  item: any
  studentId: string
  availableGroups: any[] 
  studentGroups: any[]    
  subjects: any[] 
}>()

const emit = defineEmits(['close', 'submit'])

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// --- ESTADO LOCAL ---
const originGroupId = ref('')      
const destinationGroupId = ref('') 
const weight = ref(10)
const studentComment = ref('')
const file = ref<File | null>(null)
const uploading = ref(false)

const reasons = [
  { label: 'Preferencia Personal', value: 10 },
  { label: 'Colisión con asignatura', value: 25 },
  { label: 'Externo (Justificado)', value: 60 }
]

// --- HELPERS ---
function getSubjectName(subjectId: string) {
  const subject = props.subjects.find(s => s.id === subjectId)
  return subject ? subject.name : 'Asignatura desconocida'
}

function onFileSelected(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files && target.files[0]) {
    file.value = target.files[0]
  }
}

const filteredGroups = computed(() => {
  if (!originGroupId.value) return []
  const selectedOriginGroup = props.studentGroups.find(g => g.id === originGroupId.value)
  if (!selectedOriginGroup) return []
  return props.availableGroups.filter(g => g.subjectId === selectedOriginGroup.subjectId)
})

const isFormInvalid = computed(() => {
  if (props.mode === 'delete') return false;
  if (!originGroupId.value || !destinationGroupId.value || !weight.value) return true;
  if(weight.value === 25){
    if (studentComment.value.trim() === '') return true;
  }
  if (weight.value === 60) {
    if (studentComment.value.trim() === '' || (!file.value && props.mode === 'create')) return true;
  }
  return false;
})

// --- LÓGICA SUPABASE ---
async function uploadToSupabase(): Promise<string> {
  if (!file.value) return ''
  uploading.value = true
  try {
    const res = await fetch(`${API_URL}/api/profiles/GetSession`,{credentials: 'include'});
    const session = await res.json();
    await supabase.auth.setSession({ access_token: session.accessToken, refresh_token: session.refreshToken })
    
    const { data: userData } = await supabase.auth.getUser()
    const fileName = `${userData.user?.id}/${Date.now()}.${file.value.name.split('.').pop()}`
    const { data, error } = await supabase.storage.from('RequestsPdfs').upload(fileName, file.value)
    if (error) throw error

    const { data: { publicUrl } } = supabase.storage.from('RequestsPdfs').getPublicUrl(data.path)
    return publicUrl
  } finally {
    uploading.value = false
  }
}

watch(() => props.show, (newVal) => {
  if (newVal && props.item) {
    originGroupId.value = props.item.originGroupId
    destinationGroupId.value = props.item.destinationGroupId
    weight.value = props.item.weight
    studentComment.value = props.item.studentComment
  } else if (newVal) {
    originGroupId.value = ''; destinationGroupId.value = ''; weight.value = 10; studentComment.value = ''; file.value = null;
  }
})

async function handleSubmit() {
  try {
    if (props.mode === 'delete') { emit('submit', props.item.id); return; }
    let pdfUrl = props.item?.pdfPath || ''
    let finalWeight = weight.value;

    if (weight.value === 25) {
      if (file.value) {
        finalWeight = 40;
        pdfUrl = await uploadToSupabase();
      } else {
        finalWeight = 25;
      }
    }
    
    if (weight.value === 60 && file.value) pdfUrl = await uploadToSupabase()
    
    
    emit('submit', {
      studentId: props.studentId,
      originGroupId: originGroupId.value,
      destinationGroupId: destinationGroupId.value,
      weight: finalWeight,
      studentComment: studentComment.value,
      pdfPath: pdfUrl,
      status: 0 
    })
    close() 
  } catch (e) { alert("Error: " + e) }
}

function close() { emit('close') }
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

      <div class="relative bg-white dark:bg-slate-900 w-full max-w-3xl rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all">
        
        <div class="px-8 pt-8 pb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 class="text-xl font-light text-slate-800 dark:text-white uppercase tracking-tight">
              {{ mode === 'create' ? 'Nueva' : 'Eliminar' }} <span class="font-bold text-[#e4002b]">Petición</span>
            </h2>
            <p class="text-slate-400 text-[10px] mt-1 font-black tracking-widest uppercase">
              Proceso de solicitud de cambio de grupo
            </p>
          </div>
          <button @click="close" class="p-2 text-slate-400 hover:text-red-500 transition-colors cursor-pointer">
            <XMarkIcon class="w-6 h-6" />
          </button>
        </div>

        <div class="p-8">
          <div v-if="mode === 'delete'" class="py-12 text-center">
            <div class="size-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <ExclamationTriangleIcon class="w-10 h-10 text-red-500" />
            </div>
            <h3 class="text-lg font-bold text-slate-800 dark:text-white uppercase tracking-tight">¿Confirmar eliminación?</h3>
            <p class="text-slate-500 dark:text-slate-400 text-sm mt-2">Esta acción borrará permanentemente la solicitud seleccionada.</p>
          </div>

          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-10">
            
            <div class="flex flex-col space-y-6">
              <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">
                  1. Configuración del Cambio
                </label>
                
                <div class="space-y-4">
                  <div>
                    <span class="text-[9px] font-bold text-slate-400 uppercase ml-1">Asignatura Origen</span>
                    <select v-model="originGroupId" class="mt-1 w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-xs dark:text-white outline-none focus:border-red-400 transition-all">
                      <option value="" disabled>Selecciona tu grupo actual</option>
                      <option v-for="g in studentGroups" :key="g.id" :value="g.id">
                        {{ getSubjectName(g.subjectId) }} — (G. {{ g.name }})
                      </option>
                    </select>
                  </div>

                  <div :class="{ 'opacity-40 pointer-events-none': !originGroupId }">
                    <span class="text-[9px] font-bold text-slate-400 uppercase ml-1">Grupo Destino Sugerido</span>
                    <select v-model="destinationGroupId" class="mt-1 w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-xs dark:text-white outline-none focus:border-red-400 transition-all">
                      <option value="" disabled>{{ originGroupId ? 'Selecciona el nuevo grupo' : 'Espera...' }}</option>
                      <option v-for="g in filteredGroups" :key="g.id" :value="g.id">Grupo {{ g.name }}</option>
                    </select>
                    <p v-if="originGroupId && filteredGroups.length === 0" class="text-[10px] text-red-500 mt-2 font-bold italic px-1 leading-tight">
                      No hay otros grupos disponibles para esta asignatura.
                    </p>
                  </div>
                </div>
              </div>

              <div v-if="originGroupId && destinationGroupId" class="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                <div class="flex items-start gap-3 text-slate-600 dark:text-slate-400">
                  <InformationCircleIcon class="w-5 h-5 text-[#e4002b] shrink-0" />
                  <p class="text-[11px] leading-snug">
                    Solicitando traslado de <span class="font-bold text-slate-800 dark:text-white">{{ studentGroups.find(g => g.id === originGroupId)?.name }}</span> a 
                    <span class="font-bold text-slate-800 dark:text-white">{{ filteredGroups.find(g => g.id === destinationGroupId)?.name }}</span>.
                  </p>
                </div>
              </div>
            </div>

            <div class="flex flex-col space-y-5">
              <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">
                  2. Justificación
                </label>
                
                <div class="flex gap-2 mb-4">
                  <button v-for="r in reasons" :key="r.value" @click="weight = r.value"
                    :class="weight === r.value ? 'border-[#e4002b] bg-red-50 dark:bg-red-900/20 text-[#e4002b]' : 'border-slate-200 dark:border-slate-700 hover:text-[#e4002b] hover:border-[#e4002b]'"
                    class="flex-1 px-3 py-2.5 border rounded-lg text-[10px] font-black transition-all uppercase tracking-tighter">
                    {{ r.label }}
                  </button>
                </div>

                <textarea v-model="studentComment" rows="3" 
                  class="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-xs dark:text-white outline-none focus:border-slate-400 transition-all resize-none" 
                  :placeholder="weight === 60 ? 'Describe tu situación laboral/médica de forma detallada...' : 'Comentario opcional...'"></textarea>
              </div>

              <div v-if="weight === 60 || weight === 25" class="animate-fade-in">
                <span class="text-[9px] font-bold text-slate-400 uppercase ml-1">
                  Justificante (PDF) {{ weight === 25 ? '(Opcional)' : '(Obligatorio)' }}
                </span>
                <label class="mt-1 flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group">
                  <div class="flex flex-col items-center justify-center pt-2">
                    <CloudArrowUpIcon class="w-8 h-8 text-slate-400 group-hover:text-red-400 mb-1 transition-colors" />
                    <p class="text-[10px] text-slate-500 font-medium px-4 text-center leading-tight">
                      {{ file ? file.name : 'Haz clic para adjuntar documento acreditativo' }}
                    </p>
                  </div>
                  <input type="file" class="hidden" accept="application/pdf" @change="onFileSelected" />
                </label>
              </div>
            </div>

          </div>
        </div>

        <div class="px-8 py-6 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
          <button @click="close" class="px-6 py-2.5 rounded-lg text-xs font-black uppercase text-slate-400 hover:text-slate-600 transition-all">
            Cancelar
          </button>
          <button 
            @click="handleSubmit" 
            :disabled="isFormInvalid || uploading"
            :class="mode === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#262626] hover:bg-black'"
            class="disabled:opacity-20 disabled:grayscale text-white px-8 py-2.5 rounded-lg text-xs font-black uppercase shadow-lg transition-all active:scale-95 flex items-center gap-2"
          >
            <TrashIcon v-if="mode === 'delete'" class="w-4 h-4" />
            <ArrowPathIcon v-else-if="isFormInvalid || uploading" class="w-4 h-4 animate-spin" />
            <PaperAirplaneIcon v-else class="w-4 h-4" />

          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
</style>