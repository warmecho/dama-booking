<template>
  <div class="login-page">
    <!-- 背景图片 -->
    <div class="login-bg" :style="{ backgroundImage: `url(${loginBg})` }">
      <div class="login-overlay">
        <!-- 标题 -->
        <div class="title-section">
          <h1 class="main-title">{{ settings.title || '大马课程预约' }}</h1>
          <p class="sub-title">{{ settings.subtitle || '以冰锻魂 双十必达' }}</p>
        </div>

        <!-- 登录表单 -->
        <div class="form-section">
          <van-form @submit="onSubmit">
            <van-field
              v-model="form.phone"
              name="phone"
              label="手机号"
              placeholder="请输入手机号"
              :rules="[{ required: true, message: '请输入手机号' }, { pattern: /^1[3-9]\d{9}$/, message: '手机号格式错误' }]"
              class="login-field"
            />
            <van-field
              v-model="form.nickname"
              name="nickname"
              label="学生昵称"
              placeholder="最多20字符"
              maxlength="20"
              :rules="[{ required: true, message: '请输入学生昵称' }]"
              class="login-field"
            />
            <van-field
              v-model="form.password"
              type="password"
              name="password"
              label="密码"
              placeholder="首次登录默认123456"
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

          <!-- 教练入口 -->
          <div class="coach-entry" @click="goCoachLogin">
            <span>教练</span>
          </div>

          <!-- root入口 -->
          <div class="root-entry" @click="showRootLogin = true">
            <span>root</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Root登录弹窗 -->
    <van-dialog
      v-model:show="showRootLogin"
      title="Root管理员"
      show-cancel-button
      @confirm="handleRootLogin"
    >
      <van-field
        v-model="rootPassword"
        type="password"
        placeholder="请输入Root密码"
      />
    </van-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { getCoachSettings } from '@/api/coach'
import { useUserStore } from '@/stores/user'
import defaultBg from '@/assets/default-bg.jpg'

const router = useRouter()
const userStore = useUserStore()

const form = ref({
  phone: '',
  nickname: '',
  password: ''
})

const loading = ref(false)
const loginBg = ref(defaultBg)
const settings = ref({})
const showRootLogin = ref(false)
const rootPassword = ref('')

onMounted(() => {
  // 如果已登录，跳转到对应页面
  if (userStore.isLoggedIn) {
    if (userStore.isCoach) {
      router.replace('/coach')
    } else {
      router.replace('/parent')
    }
  }

  // 获取登录页设置（从后端获取第一个教练的设置）
  fetchLoginSettings()
})

const fetchLoginSettings = async () => {
  try {
    // 尝试从 localStorage 获取
    const savedSettings = localStorage.getItem('loginSettings')
    if (savedSettings) {
      settings.value = JSON.parse(savedSettings)
      if (settings.value.bg_image) {
        loginBg.value = settings.value.bg_image
      }
    }
  } catch (error) {
    console.error('获取登录设置失败:', error)
  }
}

const onSubmit = async () => {
  loading.value = true

  const result = await userStore.login({
    phone: form.value.phone,
    password: form.value.password,
    nickname: form.value.nickname,
    role: 'parent'
  })

  loading.value = false

  if (result.success) {
    showToast({ type: 'success', message: '登录成功' })
    router.replace('/parent')
  } else {
    // 优化错误提示，将后端错误转换为更友好的文案
    const msg = result.message || ''
    if (msg.includes('用户不存在') || msg.includes('手机号未注册')) {
      showToast({ type: 'fail', message: '手机号未注册，请检查或先注册' })
    } else if (msg.includes('密码错误')) {
      showToast({ type: 'fail', message: '密码错误，请重新输入' })
    } else if (msg.includes('角色不匹配')) {
      showToast({ type: 'fail', message: '该手机号不是家长账号' })
    } else if (msg.includes('昵称')) {
      showToast({ type: 'fail', message: msg })
    } else if (msg.includes('请求参数错误')) {
      showToast({ type: 'fail', message: '请检查手机号、密码和昵称是否填写正确' })
    } else {
      showToast({ type: 'fail', message: msg || '登录失败，请稍后重试' })
    }
  }
}

const goCoachLogin = () => {
  router.push('/coach-login')
}

const handleRootLogin = () => {
  if (rootPassword.value === 'cyberci') {
    router.push('/root-login')
  } else {
    showToast({ type: 'fail', message: '密码错误' })
  }
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
  background-repeat: no-repeat;
  background-color: #000;
}

.login-overlay {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 40px 24px;
}

.title-section {
  text-align: center;
  margin-top: 60px;
  margin-bottom: 60px;
}

.main-title {
  font-size: 32px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  margin-bottom: 12px;
}

.sub-title {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

.form-section {
  flex: 1;
  position: relative;
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

.coach-entry {
  position: absolute;
  bottom: 40px;
  left: 24px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  font-size: 14px;
  color: #fff;
  cursor: pointer;
  transition: all 0.3s;
}

.coach-entry:hover {
  background: rgba(255, 255, 255, 0.3);
}

.coach-entry span {
  font-weight: 500;
}

.root-entry {
  position: absolute;
  bottom: 40px;
  right: 24px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
}
</style>
