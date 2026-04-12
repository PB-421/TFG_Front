<script setup lang="ts">
import { XMarkIcon } from '@heroicons/vue/24/solid';
defineProps<{
  show: boolean
  comment: string
  type: number
}>()

const emit = defineEmits(['close'])
</script>

<template>
  <Transition 
    enter-active-class="ease-out duration-300" enter-from-class="opacity-0" enter-to-class="opacity-100" 
    leave-active-class="ease-in duration-200" leave-from-class="opacity-100" leave-to-class="opacity-0"
  >
    <div v-if="show" class="fixed inset-0 z-300 flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" @click="emit('close')"></div>

      <div class="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all">
        
        <div class="px-8 pt-8 pb-4 flex items-center justify-between">
          <h2 class="text-xl font-light text-slate-800 dark:text-white uppercase tracking-tight">
            Comentario del <span class="font-bold text-amber-500">{{type === 1 ? "Estudiante" : "Profesor"}}</span>
          </h2>
          <button @click="emit('close')" class="p-2 text-slate-400 hover:text-red-500 transition-colors cursor-pointer">
            <XMarkIcon class="w-6 h-6" />
          </button>
        </div>

        <div class="px-8 py-6">
          <div class="bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div class="h-64 overflow-y-auto p-5 custom-scrollbar">
              <p class="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap wrap-break-word italic">
                {{ comment }}
              </p>
            </div>
          </div>
        </div>

        <div class="px-8 pb-8">
          <button 
            @click="emit('close')" 
            class="w-full bg-[#262626] dark:bg-slate-100 hover:bg-black dark:hover:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-lg text-sm font-bold transition-all active:scale-[0.98] cursor-pointer"
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
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1; /* slate-300 */
  border-radius: 10px;
}

.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background: #334155; /* slate-700 */
}

/* Evita que el scroll se vea "cortado" en las esquinas redondeadas */
.custom-scrollbar {
  scrollbar-gutter: stable;
}
</style>