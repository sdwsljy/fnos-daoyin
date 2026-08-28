<template>
  <Teleport to="body">
    <div class="dialog-mask" @click.self="emit('close')">
      <div class="dialog">
        <h3>关于盗音</h3>
        <p><b>盗音</b> v{{ version }}</p>
        <p class="dim">
          多平台音乐搜索、试听与高质量下载工具，兼容洛雪音源脚本生态。面向飞牛 fnOS 原生应用。
        </p>
        <p class="dim">支持 wy / kw / kg / tx 平台搜索，wy / tx / kg 歌单导入。</p>
        <div class="dialog-actions">
          <a v-if="repoUrl" :href="repoUrl" target="_blank">
            <button class="btn-secondary">项目主页</button>
          </a>
          <button @click="emit('close')">关闭</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const runtimeConfig = useRuntimeConfig()
const version = runtimeConfig.public.appVersion
const repoUrl = runtimeConfig.public.repoUrl
const emit = defineEmits<{ close: [] }>()
</script>

<style scoped>
.dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 1500;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog {
  background: var(--color-bg-elev);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 20px;
  width: 420px;
  max-width: 92vw;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dim {
  color: var(--color-text-dim);
  margin: 0;
  font-size: 13px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  align-items: center;
}
</style>
