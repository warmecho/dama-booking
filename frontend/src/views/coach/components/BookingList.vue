<template>
  <div class="booking-list">
    <van-empty v-if="Object.keys(groupedByStudent).length === 0" description="暂无预约" />

    <div v-else class="student-groups">
      <div
        v-for="student in sortedStudents"
        :key="student.phone"
        class="student-card"
      >
        <!-- 学员头部 -->
        <div class="student-header" @click="toggleStudent(student.phone)">
          <div class="student-info">
            <van-image
              round
              width="44"
              height="44"
              :src="student.avatar || defaultAvatar"
            />
            <span class="student-name">{{ student.nickname }}</span>
          </div>

          <div class="header-actions" @click.stop>
            <van-button
              size="small"
              class="btn-edit"
              :disabled="!canEditSingle(student.phone)"
              @click="openEditDialog(student.phone)"
            >
              修改
            </van-button>
            <van-button
              size="small"
              class="btn-confirm"
              :disabled="!hasSelected(student.phone)"
              @click="confirmStudentAttendance(student.phone)"
            >
              确认上课
            </van-button>
            <van-button
              size="small"
              class="btn-cancel"
              :disabled="!hasSelected(student.phone)"
              @click="cancelStudentBooking(student.phone)"
            >
              取消约课
            </van-button>
            <van-icon :name="expandedStudents.includes(student.phone) ? 'arrow-up' : 'arrow-down'" />
          </div>
        </div>

        <!-- 学员约课清单 -->
        <div v-show="expandedStudents.includes(student.phone)" class="booking-content">
          <div
            v-for="(dayGroup, date) in getStudentBookingsByDate(student.phone)"
            :key="date"
            class="date-group"
          >
            <div class="date-label">{{ formatDateShort(date) }}</div>
            <div class="booking-items">
              <div
                v-for="booking in dayGroup"
                :key="booking.id"
                class="booking-item"
                :class="{
                  selected: isSelected(booking.id),
                  completed: booking.status === 'completed',
                  ice: booking.type === 'ice',
                  land: booking.type === 'land'
                }"
                @click="toggleSelect(booking)"
              >
                <div class="checkbox-wrapper">
                  <van-checkbox
                    :model-value="isSelected(booking.id)"
                    @click.stop
                  />
                </div>

                <div class="booking-detail">
                  <span class="time">{{ booking.start_time }}-{{ booking.end_time }}</span>
                  <van-tag
                    size="small"
                    :class="booking.type === 'ice' ? 'tag-ice' : 'tag-land'"
                  >
                    {{ booking.type === 'ice' ? '冰' : '陆' }}
                  </van-tag>
                  <span class="address">{{ booking.address_name }}</span>
                </div>

                <div class="booking-right">
                  <div v-if="booking.status === 'completed'" class="completed-badge">
                    已上
                  </div>
                  <span class="hours">{{ calculateHours(booking) }}h</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 取消确认上课浮层 -->
    <div v-if="hasOnlyCompletedSelected" class="cancel-confirm-bar">
      <div class="selected-info">
        已选中 {{ selectedCompletedCount }} 个时段，{{ selectedCompletedHours }}h
      </div>
      <van-button
        size="small"
        class="btn-cancel-confirm"
        @click="cancelConfirmAttendance"
      >
        取消确认上课
      </van-button>
    </div>

    <!-- 编辑预约弹窗 -->
    <van-popup v-model:show="showEditDialog" position="bottom" round :style="{ height: '70%' }">
      <div class="edit-dialog">
        <div class="edit-header">
          <span class="edit-title">修改预约</span>
          <van-icon name="cross" class="edit-close" @click="showEditDialog = false" />
        </div>

        <div class="edit-form">
          <!-- 开始时间 -->
          <div class="edit-row">
            <span class="edit-label">开始时间</span>
            <div class="time-inputs">
              <van-field
                v-model="editForm.startHour"
                type="digit"
                maxlength="2"
                placeholder="时"
                class="time-field"
                @blur="formatTime('startHour')"
              />
              <span class="time-separator">:</span>
              <van-field
                v-model="editForm.startMinute"
                type="digit"
                maxlength="2"
                placeholder="分"
                class="time-field"
                @blur="formatTime('startMinute')"
              />
            </div>
          </div>

          <!-- 结束时间 -->
          <div class="edit-row">
            <span class="edit-label">结束时间</span>
            <div class="time-inputs">
              <van-field
                v-model="editForm.endHour"
                type="digit"
                maxlength="2"
                placeholder="时"
                class="time-field"
                @blur="formatTime('endHour')"
              />
              <span class="time-separator">:</span>
              <van-field
                v-model="editForm.endMinute"
                type="digit"
                maxlength="2"
                placeholder="分"
                class="time-field"
                @blur="formatTime('endMinute')"
              />
            </div>
          </div>

          <!-- 课时类型 -->
          <div class="edit-row">
            <span class="edit-label">课时类型</span>
            <div class="type-options">
              <span
                class="type-tag"
                :class="{ active: editForm.type === 'ice' }"
                @click="editForm.type = 'ice'"
              >冰</span>
              <span
                class="type-tag"
                :class="{ active: editForm.type === 'land' }"
                @click="editForm.type = 'land'"
              >陆</span>
            </div>
          </div>

          <!-- 地点 -->
          <div class="edit-row">
            <span class="edit-label">地点</span>
            <div class="address-picker" @click="showAddressPicker = true">
              <span v-if="editForm.addressName" class="selected-text">{{ editForm.addressName }}</span>
              <span v-else class="placeholder">选择地点</span>
              <van-icon name="arrow" />
            </div>
          </div>
        </div>

        <div class="edit-footer">
          <van-button type="default" block @click="showEditDialog = false">取消</van-button>
          <van-button type="primary" block @click="saveEdit">保存</van-button>
        </div>
      </div>
    </van-popup>

    <!-- 地点选择器 -->
    <van-popup v-model:show="showAddressPicker" position="bottom" round>
      <van-picker
        title="选择地点"
        :columns="addressColumns"
        @confirm="onAddressConfirm"
        @cancel="showAddressPicker = false"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import { getBookings, batchConfirm, batchCancelConfirm, coachCancelBooking, updateBooking, getAddresses } from '@/api/coach'
import { formatDate } from '@/utils/date'

// 日期格式改为 mm/dd 周X
const formatDateShort = (date) => {
  const d = dayjs(date)
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const weekday = weekdays[d.day()]
  return `${d.format('MM')}/${d.format('DD')} ${weekday}`
}
import dayjs from 'dayjs'
import defaultAvatar from '@/assets/default-avatar.svg'

const props = defineProps({
  view: {
    type: String,
    default: 'week'
  }
})

const emit = defineEmits(['updated'])

const bookings = ref([])
const expandedStudents = ref([])
const selectedBookings = ref(new Set())

// 编辑弹窗相关
const showEditDialog = ref(false)
const showAddressPicker = ref(false)
const addresses = ref([])
const editForm = ref({
  bookingId: null,
  startHour: '',
  startMinute: '',
  endHour: '',
  endMinute: '',
  type: 'ice',
  addressId: null,
  addressName: ''
})

// 获取地址列表
const fetchAddresses = async () => {
  try {
    const res = await getAddresses()
    if (res.code === 200) {
      addresses.value = res.data || []
    }
  } catch (error) {
    console.error('获取地址失败:', error)
  }
}

// 地址选择器列
const addressColumns = computed(() => {
  return addresses.value.map(addr => ({
    text: addr.name,
    value: addr.id
  }))
})

// 是否只选中了一条记录（用于判断是否可编辑）
const canEditSingle = (phone) => {
  const student = groupedByStudent.value[phone]
  if (!student) return false
  const selected = student.bookings.filter(b => isSelected(b.id))
  return selected.length === 1
}

// 获取当前选中的单条预约
const getSelectedSingleBooking = (phone) => {
  const student = groupedByStudent.value[phone]
  if (!student) return null
  const selected = student.bookings.filter(b => isSelected(b.id))
  return selected.length === 1 ? selected[0] : null
}

// 打开编辑弹窗
const openEditDialog = (phone) => {
  const booking = getSelectedSingleBooking(phone)
  if (!booking) return

  // 解析时间
  const [startHour, startMinute] = booking.start_time.split(':')
  const [endHour, endMinute] = booking.end_time.split(':')

  editForm.value = {
    bookingId: booking.id,
    startHour: startHour,
    startMinute: startMinute,
    endHour: endHour,
    endMinute: endMinute,
    type: booking.type || 'ice',
    addressId: null,
    addressName: booking.address_name || ''
  }

  // 查找地址ID
  const addr = addresses.value.find(a => a.name === booking.address_name)
  if (addr) {
    editForm.value.addressId = addr.id
  }

  showEditDialog.value = true
}

// 格式化时间输入（仅补零，不做校验）
const formatTime = (field) => {
  let val = parseInt(editForm.value[field])
  if (isNaN(val)) {
    editForm.value[field] = '00'
    return
  }
  editForm.value[field] = String(val).padStart(2, '0')
}

// 地址选择确认
const onAddressConfirm = ({ selectedOptions }) => {
  editForm.value.addressId = selectedOptions[0].value
  editForm.value.addressName = selectedOptions[0].text
  showAddressPicker.value = false
}

// 保存编辑
const saveEdit = async () => {
  try {
    const startTime = `${editForm.value.startHour}:${editForm.value.startMinute}`
    const endTime = `${editForm.value.endHour}:${editForm.value.endMinute}`

    const data = {
      start_time: startTime,
      end_time: endTime,
      type: editForm.value.type
    }

    if (editForm.value.addressId !== null) {
      data.address_id = editForm.value.addressId
    }
    if (editForm.value.addressName) {
      data.address_name = editForm.value.addressName
    }

    const res = await updateBooking(editForm.value.bookingId, data)

    if (res.code === 200) {
      showToast({ type: 'success', message: '修改成功' })
      showEditDialog.value = false
      selectedBookings.value.clear()
      fetchBookings()
      emit('updated')
    }
  } catch (error) {
    console.error('修改失败:', error)
    showToast({ type: 'fail', message: '修改失败' })
  }
}

// 在onMounted中加载地址
onMounted(() => {
  fetchBookings()
  fetchAddresses()
})

// 按学员分组
const groupedByStudent = computed(() => {
  const groups = {}
  bookings.value.forEach(booking => {
    if (!groups[booking.parent_phone]) {
      groups[booking.parent_phone] = {
        phone: booking.parent_phone,
        nickname: booking.nickname,
        avatar: booking.avatar,
        bookings: []
      }
    }
    groups[booking.parent_phone].bookings.push(booking)
  })
  return groups
})

// 按姓名首字母升序排列的学员列表
const sortedStudents = computed(() => {
  return Object.values(groupedByStudent.value).sort((a, b) => {
    return a.nickname.localeCompare(b.nickname, 'zh-CN')
  })
})

// 获取某学员按日期分组的约课
const getStudentBookingsByDate = (phone) => {
  const student = groupedByStudent.value[phone]
  if (!student) return {}

  // 按日期分组
  const byDate = {}
  student.bookings.forEach(booking => {
    if (!byDate[booking.date]) {
      byDate[booking.date] = []
    }
    byDate[booking.date].push(booking)
  })

  // 日期升序，每天内按时段升序
  const sortedDates = Object.keys(byDate).sort()
  const result = {}
  sortedDates.forEach(date => {
    result[date] = byDate[date].sort((a, b) =>
      a.start_time.localeCompare(b.start_time)
    )
  })
  return result
}

// 计算课时数
const calculateHours = (booking) => {
  const start = booking.start_time.split(':').map(Number)
  const end = booking.end_time.split(':').map(Number)
  const hours = (end[0] - start[0]) + (end[1] - start[1]) / 60
  return hours.toFixed(1)
}

// 是否选中
const isSelected = (id) => selectedBookings.value.has(id)

// 切换选中
const toggleSelect = (booking) => {
  if (isSelected(booking.id)) {
    selectedBookings.value.delete(booking.id)
  } else {
    selectedBookings.value.add(booking.id)
  }
}

// 某学员是否有选中的记录
const hasSelected = (phone) => {
  const student = groupedByStudent.value[phone]
  if (!student) return false
  return student.bookings.some(b => isSelected(b.id))
}

// 获取某学员选中的记录
const getStudentSelectedBookings = (phone) => {
  const student = groupedByStudent.value[phone]
  if (!student) return []
  return student.bookings.filter(b => isSelected(b.id))
}

// 获取所有选中的记录
const getAllSelectedBookings = () => {
  const allBookings = []
  bookings.value.forEach(booking => {
    if (isSelected(booking.id)) {
      allBookings.push(booking)
    }
  })
  return allBookings
}

// 是否只选中了已完成的记录（用于显示取消确认浮层）
const hasOnlyCompletedSelected = computed(() => {
  const selected = getAllSelectedBookings()
  if (selected.length === 0) return false
  return selected.every(b => b.status === 'completed')
})

// 选中的已完成记录总数
const selectedCompletedCount = computed(() => {
  return getAllSelectedBookings().filter(b => b.status === 'completed').length
})

// 选中的已完成记录总课时数
const selectedCompletedHours = computed(() => {
  const selected = getAllSelectedBookings().filter(b => b.status === 'completed')
  const total = selected.reduce((sum, b) => sum + parseFloat(calculateHours(b)), 0)
  return total.toFixed(1)
})

onMounted(() => {
  fetchBookings()
})

// 监听 view 变化，重新获取数据
watch(() => props.view, () => {
  fetchBookings()
  // 清空展开状态
  expandedStudents.value = []
})

const fetchBookings = async () => {
  try {
    const res = await getBookings({ view: props.view })
    if (res.code === 200) {
      bookings.value = res.data
      // 清空选中
      selectedBookings.value.clear()
    }
  } catch (error) {
    console.error('获取预约失败:', error)
  }
}

const toggleStudent = (phone) => {
  const index = expandedStudents.value.indexOf(phone)
  if (index > -1) {
    expandedStudents.value.splice(index, 1)
  } else {
    expandedStudents.value.push(phone)
  }
}

// 确认学员上课
const confirmStudentAttendance = async (phone) => {
  const selected = getStudentSelectedBookings(phone)
  if (selected.length === 0) return

  // 过滤出未确认的记录
  const pendingBookings = selected.filter(b => b.status !== 'completed')

  if (pendingBookings.length === 0) {
    showToast({ type: 'fail', message: '选中的记录已全部确认上课' })
    return
  }

  try {
    const res = await batchConfirm({
      ids: pendingBookings.map(b => b.id)
    })
    if (res.code === 200) {
      showToast({ type: 'success', message: `成功确认 ${pendingBookings.length} 条记录` })
      selectedBookings.value.clear()
      fetchBookings()
      emit('updated')
    }
  } catch (error) {
    showToast({ type: 'fail', message: '确认失败' })
  }
}

// 取消学员约课
const cancelStudentBooking = async (phone) => {
  const selected = getStudentSelectedBookings(phone)
  if (selected.length === 0) return

  // 检查是否包含已上课的记录
  const hasCompleted = selected.some(b => b.status === 'completed')
  if (hasCompleted) {
    showToast({ type: 'fail', message: '选中的记录包含已上课条目，无法取消' })
    return
  }

  try {
    await showConfirmDialog({
      title: '确认取消',
      message: `确定要取消 ${selected.length} 条预约记录吗？`
    })

    // 逐个取消
    for (const booking of selected) {
      await coachCancelBooking(booking.id)
    }

    showToast({ type: 'success', message: '取消成功' })
    selectedBookings.value.clear()
    fetchBookings()
    emit('updated')
  } catch (error) {
    if (error !== 'cancel' && error?.message !== 'cancel') {
      console.error('取消约课错误:', error)
      const message = error?.message || error?.response?.data?.message || '取消失败'
      showToast({ type: 'fail', message })
    }
  }
}

// 取消确认上课
const cancelConfirmAttendance = async () => {
  const selected = getAllSelectedBookings().filter(b => b.status === 'completed')
  if (selected.length === 0) return

  try {
    await showConfirmDialog({
      title: '确认取消上课',
      message: `确定要取消 ${selected.length} 条记录的上课确认状态吗？`
    })

    const res = await batchCancelConfirm({
      ids: selected.map(b => b.id)
    })

    if (res.code === 200) {
      showToast({ type: 'success', message: `成功取消 ${selected.length} 条记录的上课确认` })
      selectedBookings.value.clear()
      fetchBookings()
      emit('updated')
    }
  } catch (error) {
    if (error !== 'cancel' && error?.message !== 'cancel') {
      console.error('取消确认上课错误:', error)
      const message = error?.message || error?.response?.data?.message || '取消确认失败'
      showToast({ type: 'fail', message })
    }
  }
}
</script>

<style scoped>
.booking-list {
  padding: 12px;
}

.student-card {
  background: #fff;
  border-radius: 12px;
  margin-bottom: 12px;
  overflow: hidden;
}

.student-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8f9fa;
}

.student-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.student-name {
  font-weight: 600;
  font-size: 15px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-confirm {
  background: #0e9f6e !important;
  color: #fff !important;
  border-color: #0e9f6e !important;
}

.btn-confirm.van-button--disabled {
  background: #ccc !important;
  border-color: #ccc !important;
  color: #fff !important;
}

.btn-cancel {
  background: #000 !important;
  color: #fff !important;
  border-color: #000 !important;
}

.btn-cancel.van-button--disabled {
  background: #ccc !important;
  border-color: #ccc !important;
  color: #fff !important;
}

.btn-edit {
  background: #1a56db !important;
  color: #fff !important;
  border-color: #1a56db !important;
}

.btn-edit.van-button--disabled {
  background: #ccc !important;
  border-color: #ccc !important;
  color: #fff !important;
}

.booking-content {
  padding: 12px;
}

.date-group {
  margin-bottom: 12px;
}

.date-group:last-child {
  margin-bottom: 0;
}

.date-label {
  font-size: 14px;
  color: #000;
  font-weight: 600;
  margin-bottom: 8px;
  padding-left: 4px;
}

.booking-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.booking-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #e0e0e0;
  cursor: pointer;
  transition: all 0.2s;
}

.booking-item.selected {
  background: #e8f5e9;
  border: 1px solid #0e9f6e;
}

.booking-item.completed {
  opacity: 0.7;
}

.booking-item.ice.selected {
  background: #e3f2fd;
  border: 1px solid #1a56db;
}

.booking-item.land.selected {
  background: #fce4ec;
  border: 1px solid #c2185b;
}

.checkbox-wrapper {
  flex-shrink: 0;
}

.booking-detail {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
}

.booking-detail .time {
  min-width: 95px;
  font-weight: 500;
}

.booking-detail .address {
  flex: 1;
  color: #666;
  min-width: 80px;
}

/* 右侧区域 - 已上标签和课时统计 */
.booking-right {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: flex-end;
  min-width: 100px;
}

/* 课时统计数固定宽度居右对齐 */
.booking-right .hours {
  color: #666;
  font-weight: 500;
  font-size: 13px;
  min-width: 55px;
  text-align: right;
  flex-shrink: 0;
  margin-right: 10px;
}

/* 课时类型标签样式 */
.tag-ice {
  background: #e3f2fd !important;
  color: #1a56db !important;
  min-width: 20px;
  padding: 2px 6px !important;
  text-align: center;
  border-radius: 4px;
}

.tag-land {
  background: #fce4ec !important;
  color: #f05252 !important;
  min-width: 20px;
  padding: 2px 6px !important;
  text-align: center;
  border-radius: 4px;
}

.completed-badge {
  font-size: 12px;
  color: #0e9f6e;
  background: #d1fae5;
  padding: 4px 8px;
  border-radius: 4px;
  white-space: nowrap;
}

/* 取消确认上课浮层 */
.cancel-confirm-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.cancel-confirm-bar .selected-info {
  font-size: 14px;
  color: #333;
}

.cancel-confirm-bar .btn-cancel-confirm {
  background: #f05252 !important;
  color: #fff !important;
  border-color: #f05252 !important;
}

/* 编辑弹窗样式 */
.edit-dialog {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.edit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.edit-title {
  font-size: 16px;
  font-weight: 600;
}

.edit-close {
  font-size: 20px;
  color: #666;
}

.edit-form {
  flex: 1;
  padding: 16px;
}

.edit-row {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.edit-label {
  width: 80px;
  font-size: 14px;
  color: #333;
  flex-shrink: 0;
}

.time-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.time-field {
  width: 60px;
  padding: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  text-align: center;
  font-size: 16px;
}

.time-separator {
  font-size: 16px;
  color: #333;
}

.type-options {
  display: flex;
  gap: 12px;
  flex: 1;
}

.type-tag {
  padding: 8px 24px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.type-tag.active {
  background: #1a56db;
  color: #fff;
  border-color: #1a56db;
}

.address-picker {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
}

.selected-text {
  font-size: 14px;
  color: #333;
}

.placeholder {
  font-size: 14px;
  color: #999;
}

.edit-footer {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid #e5e7eb;
}

.edit-footer .van-button {
  flex: 1;
}
</style>