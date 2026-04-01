<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { createClient } from '@supabase/supabase-js'

const props = defineProps<{
  show: boolean
  mode: 'create' | 'edit' | 'delete'
  item: any
  studentId: string
  availableGroups: any[] 
  studentGroups: any[]    
  subjects: any[] // <--- Nueva prop necesaria
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
  { label: 'Interno', value: 10 },
  { label: 'Externo (Justificado)', value: 60 }
]

// --- HELPERS ---

// Busca el nombre de la asignatura por su ID
function getSubjectName(subjectId: string) {
  const subject = props.subjects.find(s => s.id === subjectId)
  return subject ? subject.name : 'Asignatura desconocida'
}

// Manejador del archivo (para que el input funcione)
function onFileSelected(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files && target.files[0]) {
    file.value = target.files[0]
  }
}

// --- LÓGICA DE FILTRADO ---
const filteredGroups = computed(() => {
  if (!originGroupId.value) return []
  
  const selectedOriginGroup = props.studentGroups.find(g => g.id === originGroupId.value)
  if (!selectedOriginGroup) return []

  // Filtramos los grupos disponibles que coincidan con la asignatura del origen
  return props.availableGroups.filter(g => g.subjectId === selectedOriginGroup.subjectId)
})

watch(originGroupId, () => {
  destinationGroupId.value = ''
})

const isFormInvalid = computed(() => {
  if (props.mode === 'delete') return false
  const basic = !originGroupId.value || !destinationGroupId.value || !weight.value
  const needsFile = weight.value === 60 && !file.value && props.mode === 'create'
  return basic || needsFile
})

async function uploadToSupabase(): Promise<string> {
  if (!file.value) return ''
  const currentFile = file.value
  uploading.value = true
  
  try {
    const fileExt = currentFile.name.split('.').pop()
    const fileName = `${props.studentId}/${Date.now()}.${fileExt}`
    
    const { data, error: uploadError } = await supabase.storage
      .from('requests-documents')
      .upload(fileName, currentFile, { upsert: true })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('requests-documents')
      .getPublicUrl(data.path)

    return publicUrl
  } catch (error: any) {
    console.error('Error storage:', error.message)
    throw error
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
  }
})

async function handleSubmit() {

  try {
    if (props.mode === 'delete') {
      emit('submit', null)
      return
    }
    let pdfUrl = props.item?.pdfPath || ''
    if (weight.value === 60 && file.value) {
      pdfUrl = await uploadToSupabase()
    }

    const payload = {
      studentId: props.studentId,
      originGroupId: originGroupId.value,
      destinationGroupId: destinationGroupId.value,
      weight: weight.value,
      studentComment: studentComment.value,
      pdfPath: pdfUrl,
      status: 0 
    }
    emit('submit', payload)
    close() // Limpiamos al terminar
  } catch (e) {
    alert("Error al procesar el archivo.")
  }
}

function close() {
  originGroupId.value = ''
  destinationGroupId.value = ''
  studentComment.value = ''
  file.value = null
  emit('close')
}
</script>

<template>
  <Transition enter-active-class="ease-out duration-300" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="ease-in duration-200" leave-from-class="opacity-100" leave-to-class="opacity-0">
    <div v-if="show" class="fixed inset-0 z-150 flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" @click="close"></div>

      <div class="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div class="px-8 pt-8 pb-4 flex items-center justify-between">
          <h2 class="text-2xl font-light text-slate-800 dark:text-white uppercase">
            {{ mode === 'create' ? 'Nueva' : 'Eliminar' }} <span class="font-bold text-[#e4002b]">Petición</span>
          </h2>
          <button @click="close" class="text-slate-400 hover:text-slate-600">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="px-8 py-4 space-y-5">
          <div v-if="mode === 'delete'" class="py-4 text-center">
            <div class="size-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span class="material-symbols-outlined text-red-500 text-3xl">warning</span>
            </div>
            <p class="text-slate-600 dark:text-slate-300">¿Estás seguro de que deseas eliminar esta petición de cambio?</p>
            <p class="text-xs text-slate-400 mt-2 italic">Esta acción no se puede deshacer.</p>
          </div>
          <template v-else>
            <div>
              <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Asignatura a cambiar (Origen)*</label>
              <select v-model="originGroupId" class="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-sm dark:text-white outline-none">
                <option value="" disabled>Selecciona tu asignatura actual</option>
                <option v-for="g in studentGroups" :key="g.id" :value="g.id">
                  {{ getSubjectName(g.subjectId) }} — (Grupo {{ g.name }})
                </option>
              </select>
            </div>

            <div :class="{ 'opacity-50 pointer-events-none': !originGroupId }">
              <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nuevo Grupo Destino*</label>
              <select v-model="destinationGroupId" class="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-sm dark:text-white outline-none focus:border-[#e4002b]">
                <option value="" disabled>{{ originGroupId ? 'Selecciona el nuevo grupo' : 'Primero elige asignatura' }}</option>
                <option v-for="g in filteredGroups" :key="g.id" :value="g.id">
                  Grupo {{ g.name }}
                </option>
              </select>
              <p v-if="originGroupId && filteredGroups.length === 0" class="text-[10px] text-red-500 mt-2 font-bold italic">
                No hay otros grupos disponibles para esta asignatura en este momento.
              </p>
            </div>

            <div>
              <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Motivo del Cambio*</label>
              <div class="grid grid-cols-2 gap-3">
                <button v-for="r in reasons" :key="r.value" @click="weight = r.value"
                  :class="weight === r.value ? 'border-[#e4002b] bg-red-50 dark:bg-red-900/10 text-[#e4002b]' : 'border-slate-200 dark:border-slate-700 text-slate-500'"
                  class="px-4 py-3 border rounded-lg text-xs font-bold transition-all uppercase">
                  {{ r.label }}
                </button>
              </div>
            </div>

            <div>
              <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Comentario (Opcional)</label>
              <textarea v-model="studentComment" rows="2" class="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-sm dark:text-white outline-none focus:border-slate-400" placeholder="Explica brevemente tu situación..."></textarea>
            </div>

            <div v-if="weight === 60" class="animate-fade-in">
              <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Justificante PDF*</label>
              <div class="flex items-center justify-center w-full">
                <label class="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <div class="flex flex-col items-center justify-center">
                    <span class="material-symbols-outlined text-slate-400 mb-1">upload_file</span>
                    <p class="text-[11px] text-slate-500 text-center px-4">
                      {{ file ? file.name : 'Haz clic para subir el justificante' }}
                    </p>
                  </div>
                  <input type="file" class="hidden" accept="application/pdf" @change="onFileSelected" />
                </label>
              </div>
            </div>
          </template>
        </div>

        <div class="px-8 py-8 flex gap-3">
          <button @click="close" class="flex-1 px-6 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-all">Cancelar</button>
          <button 
            @click="handleSubmit" 
            :disabled="(!isFormInvalid && mode !== 'delete') || uploading"
            :class="mode === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#262626] hover:bg-black'"
            class="flex-1 px-6 py-3 text-white rounded-lg text-sm font-bold disabled:opacity-30 transition-all"
          >
            <span v-if="uploading">Procesando...</span>
            <span v-else-if="mode === 'delete'">Eliminar</span>
            <span v-else>Enviar Petición</span>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>