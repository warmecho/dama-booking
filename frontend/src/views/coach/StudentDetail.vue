<template>
  <div class="student-detail-page">
    <van-nav-bar
      title="学员详情"
      left-arrow
      @click-left="router.back()"
      fixed
      placeholder
    />

    <div class="content">
      <!-- 第一区域：基本信息 -->
      <div class="section">
        <div class="section-title">基本信息</div>

        <div class="basic-info">
          <van-image
            round
            width="60"
            height="60"
            :src="student.avatar || defaultAvatar"
          />
          <div class="info-text">
            <div class="nickname">{{ student.nickname }}</div>
            <div class="birth-info" v-if="student.birthday">
              {{ student.birthday }} · {{ calculateAge(student.birthday) }}岁
            </div>
          </div>
        </div>

        <van-cell-group inset>
          <van-cell title="生日">
            <template #value>
              <span class="text-value">{{ student.birthday || '-' }}</span>
            </template>
          </van-cell>
          <van-cell title="年龄">
            <template #value>
              <span class="text-value">{{ calculateAge(student.birthday) }}岁</span>
            </template>
          </van-cell>

          <van-field
            v-model="student.free_skating_level"
            label="自由滑等级"
            type="number"
            placeholder="请输入等级"
            input-align="right"
          >
            <template #right-icon>级</template>
          </van-field>

          <van-field
            v-model="student.footwork_level"
            label="步法等级"
            type="number"
            placeholder="请输入等级"
            input-align="right"
          >
            <template #right-icon>级</template>
          </van-field>
        </van-cell-group>

        <div class="save-btn">
          <van-button
            type="primary"
            block
            :disabled="!isModified"
            @click="saveStudentInfo"
          >
            保存
          </van-button>
        </div>
      </div>

      <!-- 第二区域：课时统计 -->
      <div class="section">
        <div class="section-title">课时统计</div>

        <div class="stats-cards">
          <div class="stat-card">
            <div class="stat-value blue">{{ stats.totalHours }}h</div>
            <div class="stat-label">累计约课</div>
          </div>
          <div class="stat-card">
            <div class="stat-value green">{{ stats.completedHours }}h</div>
            <div class="stat-label">累计上课</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast } from 'vant'
import { getStudentDetail, updateStudentLevel } from '@/api/coach'
import defaultAvatar from '@/assets/default-avatar.svg'
import dayjs from 'dayjs'

const router = useRouter()
const route = useRoute()

const student = ref({
  nickname: '',
  avatar: '',
  birthday: '',
  free_skating_level: 0,
  footwork_level: 0
})

// 原始数据副本，用于比较是否修改
const originalData = ref({
  free_skating_level: 0,
  footwork_level: 0
})

const stats = ref({
  totalHours: '0.0',
  completedHours: '0.0'
})

const phone = route.params.phone

// 是否已修改数据
const isModified = computed(() => {
  return (
    parseInt(student.value.free_skating_level || 0) !== parseInt(originalData.value.free_skating_level || 0) ||
    parseInt(student.value.footwork_level || 0) !== parseInt(originalData.value.footwork_level || 0)
  )
})

onMounted(() => {
  if (phone) {
    fetchStudentDetail()
  }
})

const fetchStudentDetail = async () => {
  try {
    const res = await getStudentDetail(phone)
    if (res.code === 200) {
      const data = res.data
      student.value = {
        nickname: data.nickname || '',
        avatar: data.avatar || '',
        birthday: data.birthday || '',
        free_skating_level: data.free_skating_level || 0,
        footwork_level: data.footwork_level || 0
      }
      // 保存原始数据副本
      originalData.value = {
        free_skating_level: data.free_skating_level || 0,
        footwork_level: data.footwork_level || 0
      }
      stats.value = {
        totalHours: (data.total_hours || 0).toFixed(1),
        completedHours: (data.completed_hours || 0).toFixed(1)
      }
    }
  } catch (error) {
    console.error('获取学员详情失败:', error)
    showToast({ type: 'fail', message: '获取学员详情失败' })
  }
}

const calculateAge = (birthday) => {
  if (!birthday) return '0.0'
  const birth = dayjs(birthday)
  const now = dayjs()
  const years = now.diff(birth, 'year', true)
  return years.toFixed(1)
}

const saveStudentInfo = async () => {
  try {
    const res = await updateStudentLevel(phone, {
      free_skating_level: parseInt(student.value.free_skating_level) || 0,
      footwork_level: parseInt(student.value.footwork_level) || 0
    })
    if (res.code === 200) {
      showToast({ type: 'success', message: '保存成功' })
      // 更新原始数据，使按钮恢复禁用状态
      originalData.value = {
        free_skating_level: parseInt(student.value.free_skating_level) || 0,
        footwork_level: parseInt(student.value.footwork_level) || 0
      }
    }
  } catch (error) {
    console.error('保存失败:', error)
    showToast({ type: 'fail', message: '保存失败' })
  }
}

</script>

<style scoped>
.student-detail-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.content {
  padding: 12px;
}

.section {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  padding-left: 4px;
}

.basic-info {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  padding: 0 4px;
}

.info-text {
  flex: 1;
}

.nickname {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
}

.birth-info {
  font-size: 14px;
  color: #666;
}

.save-btn {
  margin-top: 16px;
  padding: 0 4px;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.stat-card {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 8px;
}

.stat-value.blue {
  color: #1a56db;
}

.stat-value.green {
  color: #0e9f6e;
}

.stat-label {
  font-size: 13px;
  color: #666;
}

.text-value {
  color: #333;
}
</style>
