<template>
  <div class="coach-profile-page">
    <van-nav-bar title="个人信息" fixed placeholder />

    <div class="content">
      <!-- 邀请学员 -->
      <van-cell-group title="邀请学员" inset>
        <div class="qrcode-section">
          <div class="qrcode-wrapper">
            <canvas ref="qrcodeRef"></canvas>
          </div>
          <p class="qrcode-tip">扫码访问预约系统</p>
        </div>
      </van-cell-group>

      <!-- 家长端登录页设置 -->
      <van-cell-group title="家长端登录页设置" inset>
        <van-field
          v-model="form.title"
          label="主标题"
          placeholder="请输入家长端登录页主标题"
          maxlength="20"
        />
        <van-field
          v-model="form.subtitle"
          label="副标题"
          placeholder="请输入家长端登录页副标题"
          maxlength="30"
        />
        <van-cell title="家长端背景图" is-link @click="showBgUploader = true">
          <template #value>
            <van-image
              v-if="form.bg_image"
              width="60"
              height="40"
              :src="form.bg_image"
              fit="cover"
            />
            <span v-else>未设置</span>
          </template>
        </van-cell>
      </van-cell-group>

      <!-- 教练端登录页设置 -->
      <van-cell-group title="教练端登录页设置" inset>
        <van-cell title="教练端背景图" is-link @click="showCoachBgUploader = true">
          <template #value>
            <van-image
              v-if="form.coach_bg_image"
              width="60"
              height="40"
              :src="form.coach_bg_image"
              fit="cover"
            />
            <span v-else>未设置</span>
          </template>
        </van-cell>
      </van-cell-group>

      <!-- 账号安全 -->
      <van-cell-group title="账号安全" inset>
        <van-field
          v-model="form.login_account"
          label="登录账号"
          placeholder="请输入登录账号"
        />
        <van-field
          v-model="form.password"
          type="password"
          label="修改密码"
          placeholder="输入新密码"
        />
        <van-field
          v-model="form.confirmPassword"
          type="password"
          label="确认密码"
          placeholder="再次输入新密码"
        />
      </van-cell-group>

      <!-- 保存按钮 -->
      <div class="btn-wrapper">
        <van-button
          type="primary"
          block
          round
          class="btn-black"
          :loading="saving"
          @click="saveSettings"
        >
          保存设置
        </van-button>
      </div>

      <!-- 退出登录 -->
      <div class="btn-wrapper">
        <van-button
          type="danger"
          block
          round
          plain
          @click="confirmLogout"
        >
          退出登录
        </van-button>
      </div>
    </div>

    <!-- 家长端背景上传弹窗 -->
    <van-popup v-model:show="showBgUploader" position="bottom">
      <div class="uploader-content">
        <van-uploader :after-read="afterReadBg" accept="image/*">
          <van-button block type="primary">选择家长端背景图</van-button>
        </van-uploader>
        <van-button block @click="showBgUploader = false">取消</van-button>
      </div>
    </van-popup>

    <!-- 教练端背景上传弹窗 -->
    <van-popup v-model:show="showCoachBgUploader" position="bottom">
      <div class="uploader-content">
        <van-uploader :after-read="afterReadCoachBg" accept="image/*">
          <van-button block type="primary">选择教练端背景图</van-button>
        </van-uploader>
        <van-button block @click="showCoachBgUploader = false">取消</van-button>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import QRCode from 'qrcode'
import { useUserStore } from '@/stores/user'
import { getCoachSettings, updateCoachSettings, uploadBackground, uploadCoachBackground } from '@/api/coach'

const router = useRouter()
const userStore = useUserStore()

const qrcodeRef = ref(null)
const showBgUploader = ref(false)
const showCoachBgUploader = ref(false)
const saving = ref(false)

const form = ref({
  title: '',
  subtitle: '',
  bg_image: '',
  coach_bg_image: '',
  login_account: '',
  password: '',
  confirmPassword: ''
})

onMounted(() => {
  fetchSettings()
  generateQRCode()
})

const fetchSettings = async () => {
  try {
    const res = await getCoachSettings()
    console.log('获取设置:', res)
    if (res.code === 200) {
      form.value.title = res.data.title || ''
      form.value.subtitle = res.data.subtitle || ''
      form.value.bg_image = res.data.bg_image || ''
      form.value.coach_bg_image = res.data.coach_bg_image || ''
      form.value.login_account = res.data.login_account || ''
      // 如果后端没有教练端背景图，尝试从本地读取
      if (!form.value.coach_bg_image) {
        const coachBg = localStorage.getItem('coachLoginBg')
        if (coachBg) {
          form.value.coach_bg_image = coachBg
        }
      } else {
        // 同步到本地存储
        localStorage.setItem('coachLoginBg', form.value.coach_bg_image)
      }
    }
  } catch (error) {
    console.error('获取设置失败:', error)
  }
}

const generateQRCode = async () => {
  await nextTick()
  if (qrcodeRef.value) {
    const url = window.location.origin + '/#/login'
    QRCode.toCanvas(qrcodeRef.value, url, {
      width: 200,
      margin: 2,
      color: {
        dark: '#1a56db',
        light: '#fff'
      }
    })
  }
}

const validatePassword = () => {
  if (form.value.password || form.value.confirmPassword) {
    if (form.value.password !== form.value.confirmPassword) {
      showToast({ type: 'fail', message: '两次输入的密码不一致' })
      return false
    }
    if (form.value.password.length < 6) {
      showToast({ type: 'fail', message: '密码长度至少6位' })
      return false
    }
  }
  return true
}

const afterReadBg = async (file) => {
  try {
    console.log('上传家长端背景图:', file)
    const res = await uploadBackground(file.file)
    console.log('上传结果:', res)
    if (res.code === 200) {
      form.value.bg_image = res.data.url
      showBgUploader.value = false
      showToast({ type: 'success', message: '上传成功' })

      // 保存到本地供家长端登录页使用
      const settings = {
        title: form.value.title,
        subtitle: form.value.subtitle,
        bg_image: form.value.bg_image
      }
      localStorage.setItem('loginSettings', JSON.stringify(settings))
    } else {
      showToast({ type: 'fail', message: res.message || '上传失败' })
    }
  } catch (error) {
    console.error('上传失败:', error)
    showToast({ type: 'fail', message: '上传失败: ' + (error.message || '未知错误') })
  }
}

const afterReadCoachBg = async (file) => {
  try {
    console.log('上传教练端背景图:', file)
    const res = await uploadCoachBackground(file.file)
    console.log('上传结果:', res)
    if (res.code === 200) {
      form.value.coach_bg_image = res.data.url
      showCoachBgUploader.value = false
      showToast({ type: 'success', message: '上传成功' })

      // 保存到本地供教练端登录页使用
      localStorage.setItem('coachLoginBg', form.value.coach_bg_image)
    } else {
      showToast({ type: 'fail', message: res.message || '上传失败' })
    }
  } catch (error) {
    console.error('上传失败:', error)
    showToast({ type: 'fail', message: '上传失败: ' + (error.message || '未知错误') })
  }
}

const saveSettings = async () => {
  if (!validatePassword()) {
    return
  }

  saving.value = true
  try {
    const data = { ...form.value }
    delete data.confirmPassword
    if (!data.password) {
      delete data.password
    }

    console.log('保存设置数据:', data)
    const res = await updateCoachSettings(data)
    console.log('保存结果:', res)
    if (res.code === 200) {
      showToast({ type: 'success', message: '保存成功' })

      // 更新本地家长端登录页设置
      const settings = {
        title: form.value.title,
        subtitle: form.value.subtitle,
        bg_image: form.value.bg_image
      }
      localStorage.setItem('loginSettings', JSON.stringify(settings))

      // 保存教练端背景图到本地
      if (form.value.coach_bg_image) {
        localStorage.setItem('coachLoginBg', form.value.coach_bg_image)
      }

      form.value.password = ''
      form.value.confirmPassword = ''
    } else {
      showToast({ type: 'fail', message: res.message || '保存失败' })
    }
  } catch (error) {
    console.error('保存失败:', error)
    showToast({ type: 'fail', message: '保存失败: ' + (error.message || '未知错误') })
  } finally {
    saving.value = false
  }
}

const confirmLogout = () => {
  showConfirmDialog({
    title: '确认退出',
    message: '确定要退出登录吗？'
  }).then(() => {
    userStore.logout()
    router.replace('/login')
  }).catch(() => {})
}
</script>

<style scoped>
.coach-profile-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.content {
  padding: 12px;
}

.qrcode-section {
  padding: 20px;
  text-align: center;
}

.qrcode-wrapper {
  display: inline-block;
  padding: 12px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.qrcode-tip {
  margin-top: 12px;
  font-size: 14px;
  color: #666;
}

.btn-wrapper {
  margin-top: 24px;
  padding: 0 16px;
}

/* 黑色保存按钮 */
.btn-black {
  background: #000 !important;
  color: #fff !important;
  border-color: #000 !important;
}

.uploader-content {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
