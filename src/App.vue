<script setup lang="ts">
import { computed } from 'vue'
import AppLayout from '@/components/AppLayout.vue'
import { useAuth } from '@/composables/useAuth'

const { isLoggedIn } = useAuth()
const showLayout = computed(() => isLoggedIn.value)
</script>

<template>
  <AppLayout v-if="showLayout" />
  <router-view v-else />
</template>
