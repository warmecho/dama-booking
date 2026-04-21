<template>
  <div class="course-list">
    <!-- 统计卡片 -->
    <div class="stats-cards">
      <div class="stat-card total">
        <span class="value">{{ stats.total }}</span>
        <span class="label">总课时</span>
      </div>
      <div class="stat-card completed">
        <span class="value">{{ stats.completed }}</span>
        <span class="label">已完成</span>
      </div>
      <div class="stat-card pending">
        <span class="value">{{ stats.pending }}</span>
        <span class="label">待上课</span>
      </div>
    </div>

    <!-- 课程列表 -->
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-empty v-if="groupedCourses.length === 0 && !loading" description="暂无课程" />

      <div v-else class="course-list-content">
        <div
          v-for="dayGroup in groupedCourses"
          :key="dayGroup.date"
          class="course-card"
        >
          <div class="card-header">
            <span class="date">{{ formatDateWithWeekday(dayGroup.date) }}</span>
          </div>

          <div class="card-body">
            <div
              v-for="course in dayGroup.courses"
              :key="course.id"
              class="course-row"
            >
              <span class="time">{{ course.start_time }}-{{ course.end_time }}</span>
              <van-tag size="small" :class="course.type === 'ice' ? 'tag-ice' : 'tag-land'">
                {{ course.type === 'ice' ? '冰' : '陆' }}
              </van-tag>
              <span class="location">{{ course.address_name }}</span>
              <span class="coach">{{ course.coach_nickname }}</span>
              <span class="hours">{{ course.hours }}h</span>
              <van-tag v-if="course.status === 'completed'" size="small" class="tag-completed">已上</van-tag>
            </div>
          </div>
        </div>
      </div>
    </van-pull-refresh>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { showToast } from 'vant'
import { getMyCourses } from '@/api/booking'
import dayjs from 'dayjs'

const props = defineProps({
  view: {
    type: String,
    default: 'week'
  }
})

const courses = ref([])
const stats = ref({
  total: 0,
  completed: 0,
  pending: 0
})
const loading = ref(false)
const refreshing = ref(false)

// 按日期聚合成一天一张卡片
const groupedCourses = computed(() => {
  const groups = {}

  courses.value.forEach(course => {
    if (!groups[course.date]) {
      groups[course.date] = {
        date: course.date,
        courses: []
      }
    }
    // 计算课时小时数
    const start = course.start_time.split(':').map(Number)
    const end = course.end_time.split(':').map(Number)
    const hours = (end[0] - start[0]) + (end[1] - start[1]) / 60
    course.hours = hours.toFixed(1)

    groups[course.date].courses.push(course)
  })

  // 转换为数组并按日期升序排列
  const result = Object.values(groups).sort((a, b) =>
    new Date(a.date) - new Date(b.date)
  )

  // 每天内的时段按开始时间升序排列
  result.forEach(day => {
    day.courses.sort((a, b) => a.start_time.localeCompare(b.start_time))
  })

  return result
})

onMounted(() => {
  fetchCourses()
})

const fetchCourses = async () => {
  loading.value = true
  try {
    const res = await getMyCourses({ view: props.view })
    if (res.code === 200) {
      courses.value = res.data.bookings
      stats.value = res.data.stats
    }
  } catch (error) {
    console.error('获取课程失败:', error)
  } finally {
    loading.value = false
  }
}

const onRefresh = async () => {
  await fetchCourses()
  refreshing.value = false
  showToast({ type: 'success', message: '刷新成功' })
}

const formatDateWithWeekday = (date) => {
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const d = dayjs(date)
  const mm = d.format('MM')
  const dd = d.format('DD')
  const weekday = weekdays[d.day()]
  return `${mm}/${dd} ${weekday}`
}
</script>

<style scoped>
.course-list {
  padding: 12px;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.stat-card .value {
  font-size: 24px;
  font-weight: 700;
  color: #333;
}

.stat-card .label {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.stat-card.total .value {
  color: #1a56db;
}

.stat-card.completed .value {
  color: #0e9f6e;
}

.stat-card.pending .value {
  color: #f05252;
}

.course-list-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.course-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.card-header {
  margin-bottom: 12px;
}

.card-header .date {
  font-weight: 600;
  font-size: 15px;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.course-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  flex-wrap: wrap;
}

.course-row .time {
  color: #333;
  font-weight: 500;
  min-width: 95px;
}

.course-row .location {
  color: #666;
  flex: 1;
  min-width: 60px;
}

.course-row .coach {
  color: #666;
}

.course-row .hours {
  color: #1a56db;
  font-weight: 500;
}

.tag-ice {
  background: #e3f2fd !important;
  color: #1a56db !important;
}

.tag-land {
  background: #fce4ec !important;
  color: #c2185b !important;
}

.tag-completed {
  background: #0e9f6e !important;
  color: #fff !important;
}
</style>
