<template>
  <div class="booking-page">
    <van-nav-bar title="约课" fixed placeholder />

    <div class="content">
      <!-- 教练选择器 -->
      <div class="coach-selector">
        <van-radio-group v-model="selectedCoach" direction="horizontal">
          <van-radio name="dama">大马</van-radio>
          <van-radio name="jia">佳佳</van-radio>
        </van-radio-group>
      </div>

      <!-- 日历组件 -->
      <div class="calendar-wrapper">
        <div class="calendar-header">
          <div class="month-nav">
            <van-icon name="arrow-left" @click="changeMonth(-1)" />
            <span class="current-month">{{ currentYear }}年{{ currentMonth }}月</span>
            <van-icon name="arrow" @click="changeMonth(1)" />
          </div>
        </div>

        <div class="calendar-grid">
          <!-- 星期标题 -->
          <div class="weekday-header">
            <span v-for="day in weekdays" :key="day" class="weekday">{{ day }}</span>
          </div>

          <!-- 日期格子 -->
          <div class="days-grid">
            <div
              v-for="date in calendarDays"
              :key="date.date"
              class="day-cell"
              :class="{
                'other-month': !date.isCurrentMonth,
                'today': date.isToday,
                'selected': selectedDate === date.date,
                'disabled': isPastDate(date.date),
                'has-schedule': hasSchedule(date.date)
              }"
              @click="selectDate(date)"
            >
              <span class="day-number">{{ date.day }}</span>
              <!-- 第一行：教练开放的约课时段 -->
              <div v-if="hasSchedule(date.date)" class="schedule-dots">
                <span
                  v-for="schedule in getDateSchedules(date.date)"
                  :key="schedule.id"
                  :class="['schedule-dot', schedule.type === 'ice' ? 'dot-ice' : 'dot-land']"
                ></span>
              </div>
              <!-- 第二行：已预约成功的时段（与上方对齐） -->
              <div v-if="hasMyBooking(date.date)" class="my-booking-dots">
                <span
                  v-for="schedule in getDateSchedules(date.date)"
                  :key="'booked-' + schedule.id"
                  :class="['schedule-dot', schedule.my_booking_count > 0 ? 'dot-booked' : 'dot-empty']"
                ></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 时段卡片列表 -->
      <div class="timeslot-section">
        <div class="section-title">
          <span>{{ selectedDate ? formatDate(selectedDate) : '请选择日期' }}</span>
          <span v-if="selectedDate && holidayName" class="holiday-tag">{{ holidayName }}</span>
        </div>

        <div v-if="loading" class="loading-wrapper">
          <van-loading size="24px" vertical>加载中...</van-loading>
        </div>

        <van-empty v-else-if="!selectedDate" description="请先选择日期" />

        <van-empty v-else-if="timeslots.length === 0" description="该日期暂无可用时段" />

        <div v-else class="timeslot-list">
          <div
            v-for="slot in timeslots"
            :key="slot.id"
            class="timeslot-card"
            :class="{
              'expired': isExpired(slot),
              'selected': isSelected(slot),
              'booked': isBookedByMe(slot),
              'ice': slot.type === 'ice',
              'land': slot.type === 'land'
            }"
            @click="!isBookedByMe(slot) && toggleSlot(slot)"
          >
            <div class="card-content">
              <div class="time-section">
                <span class="time-range">{{ slot.start_time }} - {{ slot.end_time }}</span>
                <van-tag :class="slot.type === 'ice' ? 'tag-ice' : 'tag-land'">
                  {{ slot.type === 'ice' ? '冰' : '陆' }}
                </van-tag>
                <span class="location"><van-icon name="location-o" size="14" />{{ slot.address_name }}</span>
                <van-button
                  v-if="isBookedByMe(slot)"
                  size="small"
                  class="btn-cancel-booking"
                  @click.stop="cancelMyBooking(slot)"
                >
                  取消
                </van-button>
              </div>

              <div class="info-section">
                <div class="booking-info-row">
                  <div class="booked-users">
                    <span class="booked-label">已约 <b>{{ slot.booked_count || 0 }}</b> 人：</span>
                    <div v-if="slot.booked_users_list" class="user-avatars">
                      <div
                        v-for="user in slot.booked_users_list"
                        :key="user.phone"
                        class="user-item"
                      >
                        <van-image round width="24" height="24" :src="user.avatar || defaultAvatar" />
                        <span class="user-name">{{ user.nickname }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部确认按钮 -->
    <div v-if="bookingStore.hasSelectedSlots" class="footer-bar">
      <div class="selected-info">
        已选 <b>{{ bookingStore.selectedSlots.length }}</b> 个时段，共<b>{{ bookingStore.totalDuration.toFixed(1) }}</b> 个小时
      </div>
      <van-button class="btn-black" @click="confirmBooking">
        确认
      </van-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useBookingStore } from '@/stores/booking'
import { getTimeslots, createBooking, cancelBooking, getMyCourses } from '@/api/booking'
import { getCalendarDays, formatDate, isExpired as checkExpired, getHolidayName } from '@/utils/date'
import defaultAvatar from '@/assets/default-avatar.svg'
import dayjs from 'dayjs'

const router = useRouter()
const bookingStore = useBookingStore()

const weekdays = ['一', '二', '三', '四', '五', '六', '日']
const currentYear = ref(dayjs().year())
const currentMonth = ref(dayjs().month() + 1)
const selectedDate = ref(null)
const selectedCoach = ref('dama')
const timeslots = ref([])
const loading = ref(false)
const monthSchedules = ref([])  // 存储当月所有排期，用于日历显示

const calendarDays = computed(() => {
  return getCalendarDays(currentYear.value, currentMonth.value)
})

const holidayName = computed(() => {
  return selectedDate.value ? getHolidayName(selectedDate.value) : null
})

onMounted(() => {
  // 恢复之前的选择
  selectedCoach.value = bookingStore.currentCoach
  if (bookingStore.selectedDate) {
    selectedDate.value = bookingStore.selectedDate
    const d = dayjs(bookingStore.selectedDate)
    currentYear.value = d.year()
    currentMonth.value = d.month() + 1
    fetchTimeslots()
  } else {
    // 默认选中当天
    const today = dayjs()
    selectedDate.value = today.format('YYYY-MM-DD')
    currentYear.value = today.year()
    currentMonth.value = today.month() + 1
    fetchTimeslots()
  }
  fetchMonthSchedules()
})

watch(selectedCoach, (val) => {
  bookingStore.setCurrentCoach(val)
  bookingStore.clearSelectedSlots() // 切换教练时清除已选时段
  if (selectedDate.value) {
    fetchTimeslots()
  }
  fetchMonthSchedules()
})

watch([currentYear, currentMonth], () => {
  fetchMonthSchedules()
})

watch(selectedDate, (val) => {
  bookingStore.setSelectedDate(val)
  bookingStore.clearSelectedSlots() // 切换日期时清除已选时段
  if (val) {
    fetchTimeslots()
  }
})

const changeMonth = (delta) => {
  const newDate = dayjs(`${currentYear.value}-${currentMonth.value}-01`).add(delta, 'month')
  currentYear.value = newDate.year()
  currentMonth.value = newDate.month() + 1
}

const selectDate = (date) => {
  selectedDate.value = date.date
}

const isPastDate = (date) => {
  return dayjs(date).isBefore(dayjs(), 'day')
}

const hasSchedule = (date) => {
  return monthSchedules.value.some(s => s.date === date)
}

const getDateSchedules = (date) => {
  return monthSchedules.value.filter(s => s.date === date)
}

// 判断用户是否已预约该日期
const hasMyBooking = (date) => {
  return monthSchedules.value.some(s => s.date === date && Number(s.my_booking_count) > 0)
}

// 获取用户已预约的时段（用于显示绿色小圆点）
const getMyBookings = (date) => {
  return monthSchedules.value.filter(s => s.date === date && Number(s.my_booking_count) > 0)
}

const fetchMonthSchedules = async () => {
  try {
    const month = `${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}`
    const res = await getTimeslots({ month, coach: selectedCoach.value })
    if (res.code === 200) {
      monthSchedules.value = res.data || []
    }
  } catch (error) {
    console.error('获取月度排期失败:', error)
  }
}

const fetchTimeslots = async () => {
  if (!selectedDate.value) return

  loading.value = true
  try {
    const res = await getTimeslots({
      date: selectedDate.value,
      coach: selectedCoach.value
    })
    if (res.code === 200) {
      timeslots.value = res.data
    }
  } catch (error) {
    console.error('获取时段失败:', error)
  } finally {
    loading.value = false
  }
}

const isExpired = (slot) => {
  return checkExpired(slot.date, slot.start_time)
}

const isSelected = (slot) => {
  return bookingStore.selectedSlots.some(s =>
    s.id === slot.id
  )
}

// 判断用户是否已预约该时段
const isBookedByMe = (slot) => {
  return slot.my_booking_count > 0
}

// 取消预约
const cancelMyBooking = async (slot) => {
  try {
    // 先查询用户的预约记录，找到对应的 booking id
    const myCoursesRes = await getMyCourses()
    if (myCoursesRes.code !== 200) {
      showToast({ type: 'fail', message: '获取预约记录失败' })
      return
    }

    // 找到对应时段的预约记录（只找pending状态的）
    const booking = myCoursesRes.data?.bookings?.find(b =>
      b.date === slot.date &&
      b.start_time === slot.start_time &&
      b.end_time === slot.end_time &&
      b.status === 'pending'
    )

    if (!booking) {
      showToast({ type: 'fail', message: '未找到可取消的预约记录（已上课或已取消）' })
      return
    }

    const res = await cancelBooking(booking.id)
    if (res.code === 200) {
      showToast({ type: 'success', message: '取消预约成功' })
      // 刷新数据
      fetchTimeslots()
      fetchMonthSchedules()
    } else {
      showToast({ type: 'fail', message: res.message || '取消失败' })
    }
  } catch (error) {
    console.error('取消预约失败:', error)
    const message = error?.message || error?.response?.data?.message || '取消预约失败'
    showToast({ type: 'fail', message })
  }
}

const toggleSlot = (slot) => {
  if (isExpired(slot)) {
    showToast('该时段已过期')
    return
  }

  bookingStore.toggleSlot({
    id: slot.id,
    date: selectedDate.value,
    start_time: slot.start_time,
    end_time: slot.end_time,
    type: slot.type,
    address_name: slot.address_name
  })
}

const confirmBooking = async () => {
  if (bookingStore.selectedSlots.length === 0) {
    showToast('请选择时段')
    return
  }

  try {
    // 批量提交预约
    const res = await createBooking({
      slots: bookingStore.selectedSlots.map(slot => ({
        id: slot.id,
        date: slot.date,
        start_time: slot.start_time,
        end_time: slot.end_time
      })),
      location: bookingStore.selectedSlots[0]?.address_name || ''
    })

    if (res.code !== 200) {
      throw new Error(res.message || '预约失败')
    }

    if (res.data?.failed?.length > 0) {
      showToast({ type: 'fail', message: `${res.data.failed.length}个时段预约失败` })
    } else {
      showToast({ type: 'success', message: '预约成功' })
    }
    bookingStore.clearSelectedSlots()
    fetchMonthSchedules() // 刷新日历小圆点
    fetchTimeslots() // 刷新时段卡片列表
  } catch (error) {
    showToast({ type: 'fail', message: error.message || '预约失败' })
  }
}
</script>

<style scoped>
.booking-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.content {
  padding: 12px;
}

.coach-selector {
  background: #fff;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 12px;
  display: flex;
  justify-content: center;
}

.calendar-wrapper {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.calendar-header {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 16px;
}

.month-nav {
  display: flex;
  align-items: center;
  gap: 20px;
  font-size: 16px;
  font-weight: 600;
}

.weekday-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  margin-bottom: 8px;
}

.weekday {
  font-size: 12px;
  color: #999;
  padding: 8px 0;
}

.days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.day-cell {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  cursor: pointer;
  position: relative;
}

.day-cell:not(.disabled):active {
  background: #f0f0f0;
}

.day-cell.other-month {
  color: #ccc;
}

.day-cell.today .day-number {
  background: #1a56db;
  color: #fff !important;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-weight: 600;
}

.day-cell.selected {
  background: #e8f0fe;
}

.day-cell.selected .day-number {
  color: #fff !important;
  font-weight: 600;
}

.day-cell.selected.today .day-number {
  background: #1a56db;
  color: #fff !important;
}

.day-cell.disabled {
  color: #ccc;
  cursor: pointer;
}

.day-cell.disabled .day-number {
  color: #ccc !important;
}

/* 过期日期的时段卡片样式 */
.timeslot-card.past-date {
  opacity: 0.5;
  background: #e0e0e0;
  cursor: not-allowed;
}

.timeslot-card.past-date .btn-book,
.timeslot-card.past-date .btn-cancel-booking {
  display: none;
}

.day-number {
  font-size: 14px;
}

/* 有排期的日期数字显示为星巴克绿色 */
.day-cell.has-schedule .day-number {
  color: #00704a !important;
  font-weight: 600;
}

/* 日历小圆点样式 - 与教练端一致 */
.schedule-dots {
  display: flex;
  gap: 2px;
  margin-top: 2px;
  flex-wrap: wrap;
  justify-content: center;
  max-width: 100%;
}

.schedule-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}

.schedule-dot.dot-ice {
  background: #1a56db;
}

.schedule-dot.dot-land {
  background: #f05252;
}

/* 已预约标记 - 绿色 */
.schedule-dot.dot-booked {
  background: #00c853;
}

/* 空占位小圆点 - 透明 */
.schedule-dot.dot-empty {
  background: transparent;
}

/* 第二行：已预约小圆点 - 与第一行对齐 */
.my-booking-dots {
  display: flex;
  gap: 2px;
  margin-top: 2px;
  flex-wrap: wrap;
  justify-content: center;
  max-width: 100%;
}

.timeslot-section {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  min-height: 200px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.holiday-tag {
  font-size: 12px;
  color: #f05252;
  background: #fee2e2;
  padding: 2px 8px;
  border-radius: 4px;
}

.loading-wrapper {
  padding: 40px 0;
  text-align: center;
}

.timeslot-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 卡片统一淡灰色，无勾边 */
.timeslot-card {
  background: #f5f5f5;
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.timeslot-card:not(.expired):active {
  transform: scale(0.98);
}

.timeslot-card.expired {
  opacity: 0.5;
  background: #e0e0e0;
  cursor: not-allowed;
}

/* 卡片选中时淡蓝色底色，无勾边 */
/* 冰时卡片选中时淡蓝色 */
.timeslot-card.selected.ice {
  background: #e3f2fd;
  border: none;
}

/* 陆训卡片选中时淡粉色 */
.timeslot-card.selected.land {
  background: #fce4ec;
  border: none;
}

/* 已预约卡片淡绿色背景 */
.timeslot-card.booked {
  background: #e8f5e9 !important;
  border: 1px solid #81c784;
  cursor: default;
}

/* 取消按钮样式 - 放在时间行 */
.btn-cancel-booking {
  background: #fff !important;
  color: #f44336 !important;
  border: 1px solid #f44336 !important;
  margin-left: auto;
}

.booking-info-row {
  display: flex;
  align-items: flex-start;
}

/* 已约人显示样式 */
.booked-users {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 15px;
  color: #666;
}

.booked-label {
  white-space: nowrap;
}

.booked-label b {
  font-weight: bold;
}

.user-avatars {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.user-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.user-name {
  font-weight: bold;
  font-size: 15px;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.time-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.time-range {
  font-size: 16px;
  font-weight: 600;
}

.info-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: #666;
}

/* 地址样式 - 字号-1(15px)，黑色，不加粗 */
.location {
  font-size: 15px;
  color: #000;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 冰时标签字号加大到与时间数字一致 */
.tag-ice {
  font-size: 16px !important;
  padding: 4px 8px !important;
}

/* 陆训标签淡粉色背景 */
.tag-land {
  background: #fce4ec !important;
  color: #000 !important;
  font-size: 16px !important;
  padding: 4px 8px !important;
}

.footer-bar {
  position: fixed;
  bottom: 50px;
  left: 0;
  right: 0;
  max-width: 430px;
  margin: 0 auto;
  background: #fff;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
  z-index: 100;
}

.selected-info {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0;
  white-space: nowrap;
}

/* 底部确认区域样式 */
.footer-bar {
  position: fixed;
  bottom: 50px;
  left: 0;
  right: 0;
  max-width: 430px;
  margin: 0 auto;
  background: #fff;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
  z-index: 100;
}

.selected-info {
  font-size: 14px;
  color: #000;
}

/* 黑色确认按钮 */
.btn-black {
  background: #000 !important;
  color: #fff !important;
  border-color: #000 !important;
}
</style>
