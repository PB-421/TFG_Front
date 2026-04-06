<script setup lang="ts">
defineProps<{
  show: boolean
  comment: string
}>()

const emit = defineEmits(['close'])
</script>

<template>
  <Transition 
    enter-active-class="ease-out duration-300" enter-from-class="opacity-0" enter-to-class="opacity-100" 
    leave-active-class="ease-in duration-200" leave-from-class="opacity-100" leave-to-class="opacity-0"
  >
    <div v-if="show" class="fixed inset-0 z-250 flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" @click="emit('close')"></div>

      <div class="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all">
        
        <div class="px-8 pt-8 pb-4 flex items-center justify-between">
          <h2 class="text-xl font-light text-slate-800 dark:text-white uppercase">
            Respuesta del <span class="font-bold text-amber-500">Profesor</span>
          </h2>
          <button @click="emit('close')" class="text-slate-400 hover:text-slate-600 transition-colors">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="px-8 py-6">
          <div class="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-5 border border-slate-100 dark:border-slate-700 max-h-72 overflow-y-auto overflow-x-hidden custom-scrollbar">
            
            <p class="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap wrap-break-words italic pr-3">
              {{ comment }}
            </p>
          </div>
        </div>

        <div class="px-8 pb-8">
          <button 
            @click="emit('close')" 
            class="w-full bg-[#262626] hover:bg-black text-white px-6 py-3 rounded-lg text-sm font-bold transition-all active:scale-[0.98]"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* Estilización refinada de la barra vertical */
.custom-scrollbar::-webkit-scrollbar {
  width: 5px; /* Un poco más ancha para facilitar el agarre */
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
  margin: 10px 0; /* Separa un poco la barra de los bordes superior/inferior */
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1; /* slate-300 */
  border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8; /* slate-400 al pasar el ratón */
}

.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background: #334155; /* slate-700 */
}

.dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #475569; /* slate-600 */
}
</style>