<script setup lang="ts">
import Header from '@/components/Header.vue';
</script>

<template>
  <div class="flex h-full min-h-screen grow flex-col font-display bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100">
    <Header />

    <main class="flex-1">
      <div class="max-w-7xl mx-auto p-8">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* Transición suave para el contenido */
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>