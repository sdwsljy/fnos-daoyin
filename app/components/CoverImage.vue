<template>
  <div class="cover" :class="`cover-${size}`">
    <img v-if="src && !errored" :src="src" :alt="alt || 'cover'" loading="lazy" @error="errored = true" />
    <div v-else class="cover-fallback">♪</div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{ src?: string; alt?: string; size?: 'sm' | 'md' | 'lg' }>()
const errored = ref(false)
watch(
  () => props.src,
  () => {
    errored.value = false
  },
)
</script>

<style scoped>
.cover {
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--color-bg-elev2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.cover-sm {
  width: 44px;
  height: 44px;
}
.cover-md {
  width: 64px;
  height: 64px;
}
.cover-lg {
  width: 120px;
  height: 120px;
}

.cover-fallback {
  color: var(--color-text-dim);
  font-size: 20px;
}
</style>
