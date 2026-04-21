<template>
  <div class="profile-page">
    <van-nav-bar title="个人信息" fixed placeholder />

    <div class="content">
      <!-- 头像 -->
      <van-cell-group inset class="avatar-group">
        <van-cell title="头像" center>
          <template #right-icon>
            <van-uploader :after-read="afterRead" accept="image/*">
              <van-image
                round
                width="60"
                height="60"
                :src="userInfo.avatar || defaultAvatar"
              />
            </van-uploader>
          </template>
        </van-cell>
      </van-cell-group>

      <!-- 基本信息 -->
      <van-cell-group inset>
        <van-field
          :model-value="userInfo.phone"
          label="手机号"
          readonly
        />
        <van-field
          v-model="form.nickname"
          label="昵称"
          placeholder="请输入昵称"
          maxlength="10"
          show-word-limit
        />
        <van-field
          v-model="form.birthday"
          label="生日"
          placeholder="请选择生日"
          readonly
          @click="showDatePicker = true"
        />
        <van-field
          :model-value="calculateAge(form.birthday) + '岁'"
          label="年龄"
          readonly
        />
        <van-field
          v-model="form.password"
          type="password"
          label="新密码"
          placeholder="输入新密码"
        />
        <van-field
          v-model="form.confirmPassword"
          type="password"
          label="确认密码"
          placeholder="再次输入新密码"
        />
      </van-cell-group>

      <!-- 日期选择弹窗 -->
      <van-popup v-model:show="showDatePicker" position="bottom">
        <van-date-picker
          v-model="currentDate"
          title="选择生日"
          :min-date="minDate"
          :max-date="maxDate"
          @confirm="onDateConfirm"
          @cancel="showDatePicker = false"
        />
      </van-popup>

      <!-- 保存按钮 -->
      <div class="btn-wrapper">
        <van-button
          type="primary"
          block
          round
          class="btn-black"
          :disabled="!isChanged"
          :loading="saving"
          @click="saveProfile"
        >
          保存修改
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import { useUserStore } from '@/stores/user'
import { updateProfile, uploadAvatar } from '@/api/auth'
import defaultAvatar from '@/assets/default-avatar.svg'
import dayjs from 'dayjs'

const router = useRouter()
const userStore = useUserStore()

const userInfo = ref({})
const form = ref({
  nickname: '',
  birthday: '2015-07-15',
  password: '',
  confirmPassword: ''
})
const saving = ref(false)
const showDatePicker = ref(false)
const currentDate = ref(['2015', '07', '15'])

// 日期选择范围
const minDate = new Date(2000, 0, 1)
const maxDate = new Date(2020, 11, 31)

const isChanged = computed(() => {
  return form.value.nickname !== userInfo.value.nickname ||
         form.value.birthday !== (userInfo.value.birthday || '2015-07-15') ||
         form.value.password !== ''
})

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

onMounted(() => {
  userInfo.value = { ...userStore.userInfo }
  form.value.nickname = userInfo.value.nickname || ''
  form.value.birthday = userInfo.value.birthday || '2015-07-15'
  const d = dayjs(form.value.birthday)
  currentDate.value = [d.format('YYYY'), d.format('MM'), d.format('DD')]
})

const afterRead = async (file) => {
  try {
    const res = await uploadAvatar(file.file)
    if (res.code === 200) {
      userInfo.value.avatar = res.data.url
      await userStore.fetchUserInfo()
      showToast({ type: 'success', message: '头像上传成功' })
    }
  } catch (error) {
    showToast({ type: 'fail', message: '头像上传失败' })
  }
}

const saveProfile = async () => {
  if (!validatePassword()) {
    return
  }

  saving.value = true
  try {
    const data = {}
    if (form.value.nickname !== userInfo.value.nickname) {
      data.nickname = form.value.nickname
    }
    if (form.value.birthday !== (userInfo.value.birthday || '2015-07-15')) {
      data.birthday = form.value.birthday
    }
    if (form.value.password) {
      data.password = form.value.password
    }

    const res = await updateProfile(data)
    if (res.code === 200) {
      userStore.userInfo = res.data
      userInfo.value = { ...res.data }
      form.value.password = ''
      form.value.confirmPassword = ''
      showToast({ type: 'success', message: '保存成功' })
    }
  } catch (error) {
    showToast({ type: 'fail', message: '保存失败' })
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

const onDateConfirm = ({ selectedValues }) => {
  form.value.birthday = `${selectedValues[0]}-${selectedValues[1]}-${selectedValues[2]}`
  showDatePicker.value = false
}

const calculateAge = (birthday) => {
  if (!birthday) return 0
  const birth = dayjs(birthday)
  const now = dayjs()
  const years = now.diff(birth, 'year', true)
  return years.toFixed(1)
}
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.content {
  padding: 12px;
}

.avatar-group {
  margin-bottom: 12px;
}

.text-gray {
  color: #999;
}

.text-black {
  color: #000;
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
</style>
