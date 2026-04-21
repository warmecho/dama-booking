<template>
  <div class="student-list-page">
    <van-search
      v-model="searchKey"
      placeholder="搜索学员昵称或手机号"
      @search="onSearch"
      @clear="onClear"
      clearable
    />

    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-empty v-if="students.length === 0 && !loading" description="暂无学员" />

      <div v-else class="student-list">
        <div
          v-for="student in students"
          :key="student.phone"
          class="student-card"
          @click="goDetail(student.phone)"
        >
          <div class="card-left">
            <van-image
              round
              width="50"
              height="50"
              :src="student.avatar || defaultAvatar"
            />
          </div>

          <div class="card-center">
            <div class="name">{{ student.nickname }}</div>
            <div class="info-row">
              <span v-if="student.birthday" class="info-item">{{ calculateAge(student.birthday) }}岁</span>
              <span v-if="student.free_skating_level" class="info-item">自由滑{{ student.free_skating_level }}级</span>
              <span v-if="student.footwork_level" class="info-item">步法{{ student.footwork_level }}级</span>
            </div>
            <div class="stats">
              <span>总约课: {{ student.total_bookings || 0 }}</span>
              <span>已上: {{ (student.completed_hours || 0).toFixed(1) }}h</span>
            </div>
          </div>

          <div class="card-right">
            <van-icon name="arrow" />
          </div>
        </div>
      </div>
    </van-pull-refresh>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { getStudents } from '@/api/coach'
import defaultAvatar from '@/assets/default-avatar.svg'
import dayjs from 'dayjs'

const router = useRouter()

const students = ref([])
const loading = ref(false)
const refreshing = ref(false)
const searchKey = ref('')

onMounted(() => {
  fetchStudents()
})

const fetchStudents = async () => {
  loading.value = true
  try {
    const res = await getStudents({ search: searchKey.value })
    if (res.code === 200) {
      // 按昵称首字母升序排列
      students.value = res.data.sort((a, b) => {
        return a.nickname.localeCompare(b.nickname, 'zh-CN')
      })
    }
  } catch (error) {
    console.error('获取学员列表失败:', error)
  } finally {
    loading.value = false
  }
}

const onSearch = () => {
  fetchStudents()
}

const onClear = () => {
  searchKey.value = ''
  fetchStudents()
}

const onRefresh = async () => {
  await fetchStudents()
  refreshing.value = false
  showToast({ type: 'success', message: '刷新成功' })
}

const goDetail = (phone) => {
  router.push(`/coach/students/${phone}`)
}

const calculateAge = (birthday) => {
  if (!birthday) return 0
  return dayjs().diff(dayjs(birthday), 'year')
}
</script>

<style scoped>
.student-list-page {
  padding: 12px;
}

.student-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
}

.student-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.card-center {
  flex: 1;
}

.name {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.info-row {
  display: flex;
  gap: 12px;
  font-size: 13px;
  color: #666;
  margin-bottom: 4px;
}

.info-item {
  color: #333;
}

.stats {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #666;
}

.card-right {
  color: #ccc;
}
</style>
