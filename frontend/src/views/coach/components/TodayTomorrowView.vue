<template>
  <div class="today-tomorrow-view">
    <!-- 统计卡片 -->
    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-value">{{ totalHours }}</span>
        <span class="stat-label">预约总课时</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ uniqueStudents }}</span>
        <span class="stat-label">预约学员数</span>
      </div>
    </div>

    <!-- 今天卡片 -->
    <div class="day-card">
      <div class="day-header">
        <span class="day-title">今天</span>
        <span class="day-date">{{ today }}</span>
      </div>
      <div v-if="todaySlots.length === 0" class="empty-text">
        今天暂无预约
      </div>
      <div v-else class="slots-list">
        <div
          v-for="slot in todaySlots"
          :key="slot.id"
          class="slot-item"
          :class="{ completed: slot.status === 'completed' }"
        >
          <div class="slot-main">
            <span class="slot-time">{{ slot.start_time }} - {{ slot.end_time }}</span>
            <van-tag :class="slot.type === 'ice' ? 'tag-ice' : 'tag-land'">
              {{ slot.type === 'ice' ? '冰' : '陆' }}
            </van-tag>
            <span class="slot-count">{{ slot.bookings.length }}人</span>
            <span class="slot-hours">{{ calculateHours(slot) }}h</span>
          </div>
          <div class="slot-users">
            <div
              v-for="booking in slot.bookings"
              :key="booking.id"
              class="user-item"
            >
              <van-image round width="28" height="28" :src="booking.avatar || defaultAvatar" />
              <span class="user-name">{{ booking.nickname }}</span>
              <van-tag v-if="booking.status === 'completed'" size="mini" class="tag-completed">
                已上
              </van-tag>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 明天卡片 -->
    <div class="day-card">
      <div class="day-header">
        <span class="day-title">明天</span>
        <span class="day-date">{{ tomorrow }}</span>
      </div>
      <div v-if="tomorrowSlots.length === 0" class="empty-text">
        明天暂无预约
      </div>
      <div v-else class="slots-list">
        <div
          v-for="slot in tomorrowSlots"
          :key="slot.id"
          class="slot-item"
          :class="{ completed: slot.status === 'completed' }"
        >
          <div class="slot-main">
            <span class="slot-time">{{ slot.start_time }} - {{ slot.end_time }}</span>
            <van-tag :class="slot.type === 'ice' ? 'tag-ice' : 'tag-land'">
              {{ slot.type === 'ice' ? '冰' : '陆' }}
            </van-tag>
            <span class="slot-count">{{ slot.bookings.length }}人</span>
            <span class="slot-hours">{{ calculateHours(slot) }}h</span>
          </div>
          <div class="slot-users">
            <div
              v-for="booking in slot.bookings"
              :key="booking.id"
              class="user-item"
            >
              <van-image round width="28" height="28" :src="booking.avatar || defaultAvatar" />
              <span class="user-name">{{ booking.nickname }}</span>
              <van-tag v-if="booking.status === 'completed'" size="mini" class="tag-completed">
                已上
              </van-tag>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import dayjs from 'dayjs'
import { getBookings } from '@/api/coach'
import defaultAvatar from '@/assets/default-avatar.svg'

const bookings = ref([])

const today = dayjs().format('MM-DD')
const tomorrow = dayjs().add(1, 'day').format('MM-DD')
const todayDate = dayjs().format('YYYY-MM-DD')
const tomorrowDate = dayjs().add(1, 'day').format('YYYY-MM-DD')

// 计算课时
const calculateHours = (slot) => {
  const start = slot.start_time.split(':').map(Number)
  const end = slot.end_time.split(':').map(Number)
  const hours = (end[0] - start[0]) + (end[1] - start[1]) / 60
  return hours.toFixed(1)
}

// 将预约数据按时段分组
const groupBySlot = (dateBookings) => {
  const slots = {}
  dateBookings.forEach(booking => {
    const key = `${booking.start_time}-${booking.end_time}`
    if (!slots[key]) {
      slots[key] = {
        id: booking.timeslot_plan_id,
        start_time: booking.start_time,
        end_time: booking.end_time,
        type: booking.type,
        bookings: []
      }
    }
    slots[key].bookings.push(booking)
  })
  // 按时段时间升序排列
  return Object.values(slots).sort((a, b) =>
    a.start_time.localeCompare(b.start_time)
  )
}

// 今天的时段
const todaySlots = computed(() => {
  const todayBookings = bookings.value.filter(b => b.date === todayDate)
  return groupBySlot(todayBookings)
})

// 明天的时段
const tomorrowSlots = computed(() => {
  const tomorrowBookings = bookings.value.filter(b => b.date === tomorrowDate)
  return groupBySlot(tomorrowBookings)
})

// 预约总课时
const totalHours = computed(() => {
  const total = bookings.value.reduce((sum, b) => {
    const start = b.start_time.split(':').map(Number)
    const end = b.end_time.split(':').map(Number)
    const hours = (end[0] - start[0]) + (end[1] - start[1]) / 60
    return sum + hours
  }, 0)
  return total.toFixed(1)
})

// 预约学员数（去重）
const uniqueStudents = computed(() => {
  const uniquePhones = new Set(bookings.value.map(b => b.parent_phone))
  return uniquePhones.size
})

onMounted(() => {
  fetchBookings()
})

const fetchBookings = async () => {
  try {
    const res = await getBookings({ view: 'today_tomorrow' })
    if (res.code === 200) {
      bookings.value = res.data
    }
  } catch (error) {
    console.error('获取今明预约失败:', error)
  }
}
</script>

<style scoped>
.today-tomorrow-view {
  padding: 12px;
}

/* 统计栏 */
.stats-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.stat-item {
  flex: 1;
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #1a56db;
}

.stat-label {
  font-size: 13px;
  color: #666;
  margin-top: 4px;
}

/* 日期卡片 */
.day-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.day-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.day-title {
  font-size: 18px;
  font-weight: 600;
}

.day-date {
  font-size: 14px;
  color: #666;
}

.empty-text {
  text-align: center;
  color: #999;
  padding: 20px 0;
}

/* 时段列表 */
.slots-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.slot-item {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px;
}

.slot-item.completed {
  opacity: 0.7;
}

.slot-main {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.slot-time {
  font-size: 16px;
  font-weight: 600;
  min-width: 110px;
}

.slot-count {
  font-size: 14px;
  color: #666;
}

.slot-hours {
  font-size: 14px;
  color: #1a56db;
  font-weight: 500;
  margin-left: auto;
}

/* 时段类型标签 */
.tag-ice {
  background: #e3f2fd !important;
  color: #1a56db !important;
  min-width: 20px;
  padding: 2px 6px !important;
  text-align: center;
}

.tag-land {
  background: #fce4ec !important;
  color: #f05252 !important;
  min-width: 20px;
  padding: 2px 6px !important;
  text-align: center;
}

.tag-completed {
  background: #d1fae5 !important;
  color: #0e9f6e !important;
}

/* 学员列表 */
.slot-users {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.user-item {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #fff;
  padding: 4px 8px;
  border-radius: 20px;
  font-size: 13px;
}

.user-name {
  color: #333;
}
</style>
