<template>
  <div class="quality-menu-wrap">
    <button class="btn-ghost" @click.stop="open = !open">下载</button>
    <div v-if="open" class="quality-menu" @click.stop>
      <div class="quality-menu-title">选择音质</div>
      <button
        v-for="q in options"
        :key="q"
        class="quality-option"
        :class="{ active: q === current }"
        @click="pick(q)"
      >
        {{ qualityLabel(q) }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { qualityLabel } from '~/utils/mediaLabels'

const props = defineProps<{ current?: string }>()
const emit = defineEmits<{ pick: [quality: string] }>()

const options = ['flac24bit', 'flac', '320k', '192k', '128k']
const open = ref(false)

function pick(q: string) {
  open.value = false
  emit('pick', q)
}
</script>

<style scoped>
.quality-menu-wrap {
  position: relative;
  display: inline-block;
}

.quality-menu {
  position: absolute;
  right: 0;
  top: 100%;
  margin-top: 4px;
  min-width: 140px;
  background: var(--color-bg-elev);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  z-index: 50;
  overflow: hidden;
}

.quality-menu-title {
  padding: 6px 12px;
  font-size: 11px;
  color: var(--color-text-dim);
  border-bottom: 1px solid var(--color-border);
}

.quality-option {
  display: block;
  width: 100%;
  padding: 8px 12px;
  text-align: left;
  background: transparent;
  color: var(--color-text);
  font-size: 13px;
  border-radius: 0;
}

.quality-option:hover {
  background: var(--color-bg-elev2);
  color: var(--color-accent);
}

.quality-option.active {
  color: var(--color-accent);
}
</style>
