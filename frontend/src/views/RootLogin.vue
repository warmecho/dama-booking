<template>
  <div class="root-page">
    <van-nav-bar title="Root 管理后台" fixed placeholder />

    <div class="content">
      <van-cell-group title="教练管理" inset>
        <van-cell title="重置教练密码" is-link @click="showResetPicker = true" />

        <!-- 新增教练 -->
        <van-cell title="新增教练">
          <template #value>
            <div class="add-coach-row">
              <van-field
                v-model="newCoachName"
                placeholder="输入教练名"
                class="coach-input"
              />
              <van-button
                size="small"
                type="primary"
                :disabled="!newCoachName"
                @click="addNewCoach"
              >
                添加
              </van-button>
            </div>
          </template>
        </van-cell>
      </van-cell-group>

      <!-- 重置教练密码选择器 -->
      <van-popup v-model:show="showResetPicker" position="bottom">
        <van-picker
          title="选择教练"
          :columns="coachColumns"
          @confirm="onResetConfirm"
          @cancel="showResetPicker = false"
        />
      </van-popup>

      <van-cell-group title="学员管理" inset>
        <van-field
          v-model="targetPhone"
          label="手机号"
          placeholder="输入要重置密码的学员手机号"
        />
        <van-cell title="重置该学员密码">
          <template #right-icon>
            <van-button size="small" type="primary" @click="resetUserPassword">
              确认重置
            </van-button>
          </template>
        </van-cell>
      </van-cell-group>

      <div class="logout-wrapper">
        <van-button block type="danger" @click="goBack">
          退出管理后台
        </van-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import { rootResetPassword, getCoaches, addCoach } from '@/api/auth'

const router = useRouter()
const targetPhone = ref('')
const showResetPicker = ref(false)
const coachColumns = ref([])
const newCoachName = ref('')

// 加载教练列表
onMounted(async () => {
  await loadCoaches()
})

const loadCoaches = async () => {
  try {
    const res = await getCoaches()
    if (res.code === 200) {
      coachColumns.value = res.data.map(coach => ({
        text: coach.nickname,
        value: coach.phone
      }))
    }
  } catch (error) {
    console.error('获取教练列表失败:', error)
  }
}

// 重置教练密码
const onResetConfirm = async ({ selectedOptions }) => {
  showResetPicker.value = false
  const coach = selectedOptions[0]

  try {
    await showConfirmDialog({
      title: '确认重置',
      message: `确定要把教练 "${coach.text}" 的密码重置为 123456 吗？`
    })

    const res = await rootResetPassword({
      rootPassword: 'cyberci',
      coachPhone: coach.value
    })
    if (res.code === 200) {
      showToast({ type: 'success', message: res.message })
    }
  } catch (error) {
    // 用户取消或出错
    if (error?.message) {
      showToast({ type: 'fail', message: error.message })
    }
  }
}

// 新增教练
const addNewCoach = async () => {
  if (!newCoachName.value) {
    showToast({ type: 'fail', message: '请输入教练名' })
    return
  }

  try {
    await showConfirmDialog({
      title: '确认新增',
      message: `确定要新增教练 "${newCoachName.value}" 吗？初始密码为 123456`
    })

    // 使用教练名作为手机号（小写，去除空格）
    const phone = newCoachName.value.toLowerCase().replace(/\s/g, '')

    const res = await addCoach({
      rootPassword: 'cyberci',
      phone: phone,
      nickname: newCoachName.value
    })

    if (res.code === 200) {
      showToast({ type: 'success', message: res.message })
      newCoachName.value = ''
      // 刷新教练列表
      await loadCoaches()
    }
  } catch (error) {
    // 用户取消或出错
    if (error?.message) {
      showToast({ type: 'fail', message: error.message })
    }
  }
}

const resetUserPassword = async () => {
  if (!targetPhone.value) {
    showToast({ type: 'fail', message: '请输入手机号' })
    return
  }

  try {
    await showConfirmDialog({
      title: '确认重置',
      message: `确定要重置 ${targetPhone.value} 的密码为 123456 吗？`
    })

    const res = await rootResetPassword({
      rootPassword: 'cyberci',
      phone: targetPhone.value
    })

    if (res.code === 200) {
      showToast({ type: 'success', message: res.message })
      targetPhone.value = ''
    }
  } catch (error) {
    // 用户取消
  }
}

const goBack = () => {
  router.push('/login')
}
</script>

<style scoped>
.root-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.content {
  padding: 16px 0;
}

.logout-wrapper {
  margin-top: 40px;
  padding: 0 16px;
}

.add-coach-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.coach-input {
  width: 120px;
  padding: 0;
  margin: 0;
}

.coach-input :deep(.van-field__control) {
  text-align: right;
}
</style>
