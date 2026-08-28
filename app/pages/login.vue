<template>
  <div class="login-wrap">
    <div class="login-card card">
      <BrandLogo />
      <h1>盗音</h1>
      <p class="dim">输入访问口令以继续</p>
      <form @submit.prevent="submit">
        <input v-model="password" type="password" placeholder="访问口令" autofocus />
        <button type="submit" :disabled="loading" class="login-btn">
          {{ loading ? '登录中…' : '登录' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '~/composables/useAuth'

const password = ref('')
const loading = ref(false)
const { login } = useAuth()

async function submit() {
  loading.value = true
  await login(password.value)
  loading.value = false
}
</script>

<style scoped>
.login-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}

.login-card {
  width: 360px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 14px;
  align-items: center;
}

.login-card h1 {
  margin: 0;
  color: var(--color-accent);
}

.dim {
  color: var(--color-text-dim);
  margin: 0;
}

form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.login-btn {
  width: 100%;
}
</style>
