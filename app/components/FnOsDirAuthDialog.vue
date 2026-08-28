<template>
  <Teleport to="body">
    <div v-if="open" class="overlay" role="presentation">
      <div class="dialog" role="alertdialog" aria-modal="true">
        <div class="handle" aria-hidden="true" />
        <h2 class="title">需要授权下载目录</h2>
        <p class="desc">
          当前为自定义下载路径，应用尚未获得该目录的读写权限。未授权时下载可能失败或无法写入文件。
        </p>
        <ul class="steps">
          <li>由<strong>管理员</strong>在设置中完成「授权当前路径」或「选择并授权目录」</li>
          <li>授权成功后<strong>重启应用</strong>，权限才会完全生效</li>
        </ul>
        <div class="footer">
          <button class="btn btn-ghost" type="button" @click="emit('dismiss')">稍后提醒</button>
          <button class="btn" type="button" @click="emit('authorize')">去授权</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{ open: boolean }>()
const emit = defineEmits<{ authorize: []; dismiss: [] }>()

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('dismiss')
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 110;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(15, 23, 42, 0.52);
  backdrop-filter: blur(3px);
}

.dialog {
  width: min(420px, 100%);
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: var(--color-bg-elev);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: calc(var(--radius) + 6px);
  padding: 22px 20px 18px;
  box-shadow: 0 16px 40px rgb(0 0 0 / 0.22);
}

.handle {
  display: none;
}

.title {
  margin: 0;
  font-size: 18px;
  font-weight: 650;
  line-height: 1.3;
}

.desc {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-dim);
  line-height: 1.55;
}

.steps {
  margin: 0;
  padding: 12px 12px 12px 28px;
  border-radius: 12px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  font-size: 13px;
  line-height: 1.55;
  display: grid;
  gap: 8px;
}

.steps strong {
  color: var(--color-accent);
}

.footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

.btn-ghost {
  background: transparent;
  color: var(--color-text-dim);
}

.btn-ghost:hover {
  color: var(--color-text);
}

@media (max-width: 768px) {
  .overlay {
    align-items: flex-end;
    padding: 0;
  }
  .dialog {
    width: 100%;
    max-width: none;
    border-radius: 16px 16px 0 0;
    padding: 10px 16px calc(16px + env(safe-area-inset-bottom, 0px));
  }
  .handle {
    display: block;
    width: 40px;
    height: 4px;
    margin: 4px auto 8px;
    border-radius: 999px;
    background: var(--color-border);
  }
  .footer {
    flex-direction: column-reverse;
  }
  .footer .btn {
    width: 100%;
    min-height: 44px;
  }
}
</style>
