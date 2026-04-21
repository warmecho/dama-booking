<template>
  <div class="login-page">
    <div class="login-bg" :style="{ backgroundImage: `url(${loginBg})` }">
      <div class="login-overlay">
        <div class="title-section">
          <h1 class="main-title">教练登录</h1>
        </div>

        <div class="form-section">
          <van-form @submit="onSubmit">
            <van-field
              v-model="form.account"
              name="account"
              label="账号"
              placeholder="请输入教练账号"
              :rules="[{ required: true, message: '请输入账号' }]"
              class="login-field"
            />
            <van-field
              v-model="form.password"
              type="password"
              name="password"
              label="密码"
              placeholder="请输入密码"
              :rules="[{ required: true, message: '请输入密码' }]"
              class="login-field"
            />

            <div class="submit-btn-wrapper">
              <van-button
                round
                block
                type="default"
                native-type="submit"
                :loading="loading"
                class="btn-login"
              >
                登录
              </van-button>
            </div>
          </van-form>

          <div class="switch-entry">
            <span @click="goParentLogin">切换为家长端</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useUserStore } from '@/stores/user'
import defaultBg from '@/assets/default-bg.jpg'

const router = useRouter()
const userStore = useUserStore()

const form = ref({
  account: '',
  password: ''
})

const loading = ref(false)
const loginBg = ref(defaultBg)

onMounted(() => {
  // 优先使用教练端专用背景图
  const coachBg = localStorage.getItem('coachLoginBg')
  if (coachBg) {
    loginBg.value = coachBg
    return
  }
  // 否则使用通用背景图
  const savedSettings = localStorage.getItem('loginSettings')
  if (savedSettings) {
    const settings = JSON.parse(savedSettings)
    if (settings.bg_image) {
      loginBg.value = settings.bg_image
    }
  }
})

const onSubmit = async () => {
  loading.value = true

  // 教练账号映射到手机号
  const accountMap = {
    'dama': 'dama',
    'jia': 'jia'
  }
  const phone = accountMap[form.value.account] || form.value.account

  const result = await userStore.login({
    phone: phone,
    password: form.value.password,
    role: 'coach'
  })

  loading.value = false

  if (result.success) {
    showToast({ type: 'success', message: '登录成功' })
    router.replace('/coach')
  } else {
    // 优化错误提示
    const msg = result.message || ''
    if (msg.includes('用户不存在') || msg.includes('请求参数错误')) {
      showToast({ type: 'fail', message: '账号不存在' })
    } else if (msg.includes('密码错误')) {
      showToast({ type: 'fail', message: '密码错误' })
    } else if (msg.includes('角色不匹配')) {
      showToast({ type: 'fail', message: '该账号不是教练账号' })
    } else {
      showToast({ type: 'fail', message: msg || '登录失败' })
    }
  }
}

const goParentLogin = () => {
  router.push('/login')
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
}

.login-bg {
  min-height: 100vh;
  background-size: cover;
  background-position: center;
}

.login-overlay {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 40px 24px;
}

.title-section {
  text-align: center;
  margin-top: 80px;
  margin-bottom: 60px;
}

.main-title {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.form-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.login-field {
  background: rgba(255, 255, 255, 0.9) !important;
  border-radius: 12px;
  margin-bottom: 16px;
  overflow: hidden;
  width: 80% !important;
}

:deep(.van-form) {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.submit-btn-wrapper {
  margin-top: 32px;
  width: 80%;
}

.btn-login {
  background: rgba(0, 0, 0, 0.3) !important;
  border-color: transparent !important;
  color: #fff !important;
}

.btn-login:hover {
  background: rgba(0, 0, 0, 0.4) !important;
}

.switch-entry {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  transition: all 0.3s;
}

.switch-entry:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
