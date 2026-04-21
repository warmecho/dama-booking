<template>
  <div class="schedule-calendar">
    <!-- 提示文字 -->
    <div class="tips-section" :class="{ 'edit-mode-tips': isEditMode }">
      <template v-if="isEditMode">
        <p class="tips-line">选中多天可以一起设置时段，</p>
        <p class="tips-line">也可以复制到下周同一天</p>
      </template>
      <template v-else>
        <p class="tips-line">选中日期可以设置开放约课的时段</p>
        <p class="tips-line">本月已设置 <b> {{ monthlyStats.daysWithSchedules }} </b> 天开放约课</p>
        <p class="tips-line">日期数字下方圆点数表示当天开放约课的时段数</p>
      </template>
    </div>

    <!-- 批量设置按钮 -->
    <div class="action-section">
      <van-button
        v-if="!isEditMode"
        class="btn-black"
        block
        @click="enterEditMode"
        :disabled="isPastMonth"
      >
        批量为多天设置课时
      </van-button>
      <div v-else class="edit-actions">
        <span class="edit-mode-text">编辑模式</span>
        <van-button size="small" class="btn-black" @click="cancelEdit">取消</van-button>
      </div>
    </div>

    <!-- 日历 -->
    <div class="calendar-wrapper" :class="{ 'edit-mode': isEditMode }">
      <div class="calendar-header">
        <div class="month-nav">
            <van-icon
              name="arrow-left"
              :class="{ disabled: isEditMode || isPastMonth }"
              @click="!isEditMode && changeMonth(-1)"
            />
            <span class="current-month">{{ displayYear }}年{{ displayMonth }}月</span>
            <van-icon
              name="arrow"
              :class="{ disabled: isEditMode }"
              @click="!isEditMode && changeMonth(1)"
            />
          </div>
        </div>

        <div class="calendar-grid">
          <div class="weekday-header">
            <span v-for="day in weekdays" :key="day" class="weekday">{{ day }}</span>
          </div>

          <div class="days-grid">
            <div
              v-for="date in calendarDays"
              :key="date.date"
              class="day-cell"
              :class="{
                'other-month': !date.isCurrentMonth,
                'today': date.isToday,
                'selected': isSelected(date.date),
                'has-schedule': getScheduleCount(date.date) > 0,
                'holiday': isHoliday(date.date),
                'past-date': isPastDate(date.date),
                'disabled': isEditMode && (isPastDate(date.date) || !date.isCurrentMonth)
              }"
              @click="handleDateClick(date)"
            >
              <span class="day-number">{{ date.day }}</span>
              <div v-if="getScheduleCount(date.date) > 0" class="schedule-dots">
                <span
                  v-for="schedule in getDateSchedules(date.date)"
                  :key="schedule.id"
                  :class="['schedule-dot', schedule.type === 'ice' ? 'dot-ice' : 'dot-land']"
                ></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 编辑模式：按周批量复制按钮 -->
      <div v-if="isEditMode" class="week-copy-section">
        <van-button
          block
          class="btn-black"
          :disabled="!canCopyToNextWeek"
          :loading="copyingWeek"
          @click="copyWeekToNextWeek"
        >
          按周批量复制到下一周
        </van-button>
      </div>
    </div>

    <!-- 选中日期排期展示 -->
    <div v-if="!isEditMode && selectedDate" class="day-schedules-section">
      <!-- 有排期时显示排期列表 -->
      <template v-if="selectedDateSchedules.length > 0">
        <div class="section-title">
          {{ formatDayDisplay(selectedDate) }}有{{ selectedDateSchedules.length }}个可约课时段
        </div>

        <div
          v-for="schedule in selectedDateSchedules"
          :key="schedule.id"
          class="schedule-card"
        >
          <div class="card-content">
            <span class="time">{{ schedule.start_time }} - {{ schedule.end_time }}</span>
            <van-tag :class="schedule.type === 'ice' ? 'tag-ice' : 'tag-land'">
              {{ schedule.type === 'ice' ? '冰时' : '陆训' }}
            </van-tag>
            <span class="location">{{ schedule.address_name }}</span>
          </div>
          <div class="card-actions">
            <van-button size="mini" class="btn-black" @click="editSchedule(schedule)">修改</van-button>
            <van-button size="mini" class="btn-black btn-danger" @click="deleteSchedule(schedule)">删除</van-button>
          </div>
        </div>
      </template>

      <!-- 添加时段模块（始终显示） -->
      <div class="section-title">{{ selectedDateSchedules.length > 0 ? '添加新时段' : '当天未设课时，请添加' }}</div>

      <div class="timeslot-form">
        <div class="slot-inputs">
          <div
            v-for="(slot, index) in viewModeSlots"
            :key="index"
            class="slot-row"
          >
            <div class="slot-info-row">
              <span class="slot-time" @click="openViewModeTimePicker(index)">{{ slot.start_time }}-{{ slot.end_time }}</span>
              <span :class="['slot-type', slot.type === 'ice' ? 'type-ice' : 'type-land']" @click="openViewModeTypePicker(index)">{{ slot.type === 'ice' ? '冰' : '陆' }}</span>
              <span class="slot-address" @click="openViewModeAddressPicker(index)">{{ slot.address_name }}</span>
            </div>
            <van-icon
              v-if="viewModeSlots.length > 1"
              name="delete-o"
              class="delete-icon"
              @click="removeViewModeSlot(index)"
            />
          </div>
        </div>

        <div class="form-actions">
          <van-button size="small" icon="plus" class="btn-black" @click="addViewModeSlot">添加时段</van-button>
          <van-button
            size="small"
            class="btn-black"
            :loading="saving"
            @click="saveViewModeSchedule"
            :disabled="isPastDate(selectedDate)"
          >
            保存为可约课时段
          </van-button>
        </div>
      </div>
    </div>

    <!-- 编辑模式：选中多天的表单 -->
    <div v-if="isEditMode && selectedDates.length > 0" class="edit-section">
      <div class="section-title">
        为选中的{{ selectedDates.length }}天设置约课时段
      </div>

      <div class="timeslot-form edit-mode-form">
        <div class="slot-inputs">
          <div
            v-for="(slot, index) in editModeSlots"
            :key="index"
            class="slot-row"
          >
            <div class="slot-info-row">
              <span class="slot-time" @click="openEditModeTimePicker(index)">{{ slot.start_time }}-{{ slot.end_time }}</span>
              <span :class="['slot-type', slot.type === 'ice' ? 'type-ice' : 'type-land']" @click="openEditModeTypePicker(index)">{{ slot.type === 'ice' ? '冰' : '陆' }}</span>
              <span class="slot-address" @click="openEditModeAddressPicker(index)">{{ slot.address_name }}</span>
            </div>
            <van-icon
              v-if="editModeSlots.length > 1"
              name="delete-o"
              class="delete-icon"
              @click="removeEditModeSlot(index)"
            />
          </div>
        </div>

        <div class="form-actions">
          <van-button
            size="small"
            icon="plus"
            class="btn-black"
            @click="addEditModeSlot"
          >
            添加时段
          </van-button>
          <van-button
            size="small"
            class="btn-black"
            :loading="saving"
            @click="saveEditModeSchedule"
          >
            保存为可约课时段
          </van-button>
        </div>
      </div>
    </div>

    <!-- 地点管理 -->
    <div class="address-section">
      <div class="section-header">
        <span>上课地点</span>
        <van-button size="small" icon="plus" class="btn-black" @click="showAddAddressDialog">新增</van-button>
      </div>

      <div class="address-list">
        <div
          v-for="addr in addresses"
          :key="addr.id"
          class="address-item"
        >
          <van-tag
            class="address-tag"
            size="large"
            @click="editAddress(addr)"
          >
            {{ addr.name }}
          </van-tag>
          <van-icon
            name="cross"
            class="delete-address-icon"
            @click="deleteAddress(addr)"
          />
        </div>
      </div>
    </div>

    <!-- 新增地点弹窗 -->
    <van-dialog
      v-model:show="showAddAddress"
      title="新增地点"
      show-cancel-button
      @confirm="addAddress"
      confirm-button-text="确认"
      cancel-button-text="取消"
    >
      <van-field
        v-model="newAddressName"
        placeholder="请输入地点名称（最多20字符）"
        maxlength="20"
      />
    </van-dialog>

    <!-- 修改排期弹窗 -->
    <van-dialog
      v-model:show="showEditDialog"
      title="修改排期"
      show-cancel-button
      @confirm="confirmEditSchedule"
    >
      <van-field
        v-model="editForm.start_time"
        label="开始时间"
        placeholder="09:00"
        maxlength="5"
      />
      <van-field
        v-model="editForm.end_time"
        label="结束时间"
        placeholder="10:00"
        maxlength="5"
      />
      <van-field
        v-model="editForm.type"
        label="类型"
        readonly
        @click="showEditTypePicker = true"
      />
      <van-field
        v-model="editForm.address_name"
        label="地点"
        readonly
        @click="showEditAddressPicker = true"
      />
    </van-dialog>

    <!-- 修改排期类型选择 -->
    <van-popup v-model:show="showEditTypePicker" position="bottom">
      <van-picker
        :columns="typeColumns"
        @confirm="onEditTypeConfirm"
        @cancel="showEditTypePicker = false"
      />
    </van-popup>

    <!-- 修改排期地址选择 -->
    <van-popup v-model:show="showEditAddressPicker" position="bottom">
      <van-picker
        :columns="addressColumns"
        @confirm="onEditAddressConfirm"
        @cancel="showEditAddressPicker = false"
      />
    </van-popup>

    <!-- 展示模式类型选择 -->
    <van-popup v-model:show="showViewModeTypePicker" position="bottom">
      <van-picker
        :columns="typeColumns"
        @confirm="onViewModeTypeConfirm"
        @cancel="showViewModeTypePicker = false"
      />
    </van-popup>

    <!-- 展示模式地址选择 -->
    <van-popup v-model:show="showViewModeAddressPicker" position="bottom">
      <van-picker
        :columns="addressColumns"
        @confirm="onViewModeAddressConfirm"
        @cancel="showViewModeAddressPicker = false"
      />
    </van-popup>

    <!-- 编辑模式类型选择 -->
    <van-popup v-model:show="showEditModeTypePicker" position="bottom">
      <van-picker
        :columns="typeColumns"
        @confirm="onEditModeTypeConfirm"
        @cancel="showEditModeTypePicker = false"
      />
    </van-popup>

    <!-- 编辑模式地址选择 -->
    <van-popup v-model:show="showEditModeAddressPicker" position="bottom">
      <van-picker
        :columns="addressColumns"
        @confirm="onEditModeAddressConfirm"
        @cancel="showEditModeAddressPicker = false"
      />
    </van-popup>

    <!-- 展示模式时间选择 -->
    <van-popup v-model:show="showViewModeTimePicker" position="bottom">
      <van-picker
        v-if="showViewModeTimePicker"
        :key="viewModeSlotIndex + '-' + viewModeTimeDefaultIndex.join(',')"
        :columns="timePickerColumns"
        :default-index="viewModeTimeDefaultIndex"
        :title="viewModeTimePickerTitle"
        @confirm="onViewModeTimeConfirm"
        @cancel="showViewModeTimePicker = false"
        @change="onViewModeTimeChange"
      />
    </van-popup>

    <!-- 编辑模式时间选择 -->
    <van-popup v-model:show="showEditModeTimePicker" position="bottom">
      <van-picker
        v-if="showEditModeTimePicker"
        :key="editModeSlotIndex + '-' + editModeTimeDefaultIndex.join(',')"
        :columns="timePickerColumns"
        :default-index="editModeTimeDefaultIndex"
        :title="editModeTimePickerTitle"
        @confirm="onEditModeTimeConfirm"
        @cancel="showEditModeTimePicker = false"
        @change="onEditModeTimeChange"
      />
    </van-popup>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import dayjs from 'dayjs'

import {
  getSchedule,
  createSchedule,
  updateSchedule,
  deleteSchedule as deleteScheduleApi,
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress as deleteAddressApi
} from '@/api/coach'
import { getCalendarDays } from '@/utils/date'

// 2025年中国法定节假日
const HOLIDAYS_2025 = {
  '2025-01-01': '元旦',
  '2025-01-28': '春节',
  '2025-01-29': '春节',
  '2025-01-30': '春节',
  '2025-01-31': '春节',
  '2025-02-01': '春节',
  '2025-02-02': '春节',
  '2025-02-03': '春节',
  '2025-02-04': '春节',
  '2025-04-04': '清明节',
  '2025-04-05': '清明节',
  '2025-04-06': '清明节',
  '2025-05-01': '劳动节',
  '2025-05-02': '劳动节',
  '2025-05-03': '劳动节',
  '2025-05-04': '劳动节',
  '2025-05-05': '劳动节',
  '2025-05-31': '端午节',
  '2025-06-01': '端午节',
  '2025-06-02': '端午节',
  '2025-10-01': '国庆节',
  '2025-10-02': '国庆节',
  '2025-10-03': '国庆节',
  '2025-10-04': '国庆节',
  '2025-10-05': '国庆节',
  '2025-10-06': '国庆节',
  '2025-10-07': '国庆节',
  '2025-10-08': '国庆节'
}

const props = defineProps({
  month: {
    type: String,
    default: 'current'
  }
})

const weekdays = ['一', '二', '三', '四', '五', '六', '日']
const typeColumns = [
  { text: '冰时', value: 'ice' },
  { text: '陆训', value: 'land' }
]

const displayYear = ref(dayjs().year())
const displayMonth = ref(dayjs().month() + 1)
const selectedDate = ref(dayjs().format('YYYY-MM-DD'))
const selectedDates = ref([])
const schedules = ref([])
const addresses = ref([])
const saving = ref(false)
const copyingWeek = ref(false)
const isEditMode = ref(false)
const showAddAddress = ref(false)
const newAddressName = ref('')

// 编辑排期相关
const showEditDialog = ref(false)
const showEditTypePicker = ref(false)
const showEditAddressPicker = ref(false)
const editForm = ref({
  id: null,
  start_time: '',
  end_time: '',
  type: 'ice',
  address_id: null,
  address_name: ''
})

// 展示模式时段表单
const viewModeSlots = ref([{
  start_time: '09:00',
  end_time: '10:30',
  type: 'ice',
  address_id: null,
  address_name: ''
}])

// 编辑模式时段表单
const editModeSlots = ref([{
  start_time: '09:00',
  end_time: '10:30',
  type: 'ice',
  address_id: null,
  address_name: ''
}])

// 展示模式 picker
const showViewModeTypePicker = ref(false)
const showViewModeAddressPicker = ref(false)
const showViewModeTimePicker = ref(false)
const viewModeSlotIndex = ref(0)

// 编辑模式 picker
const showEditModeTypePicker = ref(false)
const showEditModeAddressPicker = ref(false)
const showEditModeTimePicker = ref(false)
const editModeSlotIndex = ref(0)

// 时间选择器默认索引
const viewModeTimeDefaultIndex = ref([9, 0, 10, 6])
const editModeTimeDefaultIndex = ref([9, 0, 10, 6])

// 时间选择器配置 - 4列：开始小时、开始分钟、结束小时、结束分钟
const hourOptions = Array.from({ length: 24 }, (_, i) => ({ text: String(i).padStart(2, '0'), value: String(i).padStart(2, '0') }))
const minuteOptions = Array.from({ length: 12 }, (_, i) => ({ text: String(i * 5).padStart(2, '0'), value: String(i * 5).padStart(2, '0') }))
const timePickerColumns = [
  hourOptions,
  minuteOptions,
  hourOptions,
  minuteOptions
]

// 时间选择器标题
const viewModeTimePickerTitle = computed(() => {
  const slot = viewModeSlots.value[viewModeSlotIndex.value]
  if (!slot) return '选择时间'
  return `${slot.start_time} - ${slot.end_time}`
})

const editModeTimePickerTitle = computed(() => {
  const slot = editModeSlots.value[editModeSlotIndex.value]
  if (!slot) return '选择时间'
  return `${slot.start_time} - ${slot.end_time}`
})

const calendarDays = computed(() => {
  return getCalendarDays(displayYear.value, displayMonth.value)
})

const addressColumns = computed(() => {
  return addresses.value.map(a => ({ text: a.name, value: a.id }))
})

// 是否可以复制到下周：选中同一周的周一到周日（至少2天，且在同一周）
const canCopyToNextWeek = computed(() => {
  if (selectedDates.value.length < 2) return false

  // 获取每个日期所在的周（基于周一为一周开始）
  const getWeekKey = (dateStr) => {
    const d = dayjs(dateStr)
    const dayOfWeek = d.day() || 7 // 周日转为7
    const weekStart = d.subtract(dayOfWeek - 1, 'day').format('YYYY-MM-DD')
    return weekStart
  }

  const firstWeek = getWeekKey(selectedDates.value[0])
  return selectedDates.value.every(d => getWeekKey(d) === firstWeek)
})

// 是否过去月份
const isPastMonth = computed(() => {
  const currentMonth = dayjs().startOf('month')
  const displayMonthDate = dayjs(`${displayYear.value}-${displayMonth.value}-01`).startOf('month')
  return displayMonthDate.isBefore(currentMonth)
})

// 月度统计
const monthlyStats = computed(() => {
  const daysWithSchedules = new Set(schedules.value.map(s => s.date)).size
  return {
    daysWithSchedules
  }
})

// 选中日期的排期
const selectedDateSchedules = computed(() => {
  if (!selectedDate.value) return []
  return schedules.value
    .filter(s => s.date === selectedDate.value)
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
})

onMounted(() => {
  if (props.month === 'next') {
    const nextMonth = dayjs().add(1, 'month')
    displayYear.value = nextMonth.year()
    displayMonth.value = nextMonth.month() + 1
  }
  fetchSchedules()
  fetchAddresses()
})

// 监听选中日期变化，重置展示模式表单
watch(selectedDate, (newDate) => {
  if (newDate && !isEditMode.value && addresses.value.length > 0) {
    // 获取该日期已有的排期
    const existingSchedules = schedules.value
      .filter(s => s.date === newDate)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))

    if (existingSchedules.length > 0) {
      // 有排期时，使用最后一条排期的结束时间+10分钟作为新时段的开始时间
      const lastSchedule = existingSchedules[existingSchedules.length - 1]
      const [hour, min] = lastSchedule.end_time.split(':').map(Number)
      let startDate = dayjs().hour(hour).minute(min).add(10, 'minute')
      let startHour = startDate.hour()
      let startMin = startDate.minute()
      // 将分钟调整到最近的 5 分钟
      startMin = Math.round(startMin / 5) * 5
      if (startMin >= 60) {
        startMin = 0
        startHour += 1
      }
      const nextStart = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`
      // 开始时间 + 1 小时 = 结束时间
      let endDate = startDate.hour(startHour).minute(startMin).add(1, 'hour')
      const nextEnd = `${String(endDate.hour()).padStart(2, '0')}:${String(endDate.minute()).padStart(2, '0')}`

      viewModeSlots.value = [{
        start_time: nextStart,
        end_time: nextEnd,
        type: lastSchedule.type,
        address_id: lastSchedule.address_id,
        address_name: lastSchedule.address_name
      }]
      // 设置默认索引
      viewModeTimeDefaultIndex.value = [startHour, startMin / 5, endDate.hour(), endDate.minute() / 5]
    } else {
      // 无排期时，使用默认值
      viewModeSlots.value = [{
        start_time: '09:00',
        end_time: '10:30',
        type: 'ice',
        address_id: addresses.value[0]?.id || null,
        address_name: addresses.value[0]?.name || ''
      }]
      // 设置默认索引为 09:00-10:30
      viewModeTimeDefaultIndex.value = [9, 0, 10, 6]
    }
  }
})

const fetchSchedules = async () => {
  const month = `${displayYear.value}-${String(displayMonth.value).padStart(2, '0')}`
  try {
    const res = await getSchedule({ month })
    if (res.code === 200) {
      schedules.value = res.data
    }
  } catch (error) {
    console.error('获取排期失败:', error)
  }
}

const fetchAddresses = async () => {
  try {
    const res = await getAddresses()
    if (res.code === 200) {
      addresses.value = res.data
      if (res.data.length > 0) {
        // 初始化各种模式的地址
        if (viewModeSlots.value[0].address_id === null) {
          viewModeSlots.value[0].address_id = res.data[0].id
          viewModeSlots.value[0].address_name = res.data[0].name
        }
        if (editModeSlots.value[0].address_id === null) {
          editModeSlots.value[0].address_id = res.data[0].id
          editModeSlots.value[0].address_name = res.data[0].name
        }
      }
    }
  } catch (error) {
    console.error('获取地址失败:', error)
  }
}

const changeMonth = (delta) => {
  if (isEditMode.value) return
  const newDate = dayjs(`${displayYear.value}-${displayMonth.value}-01`).add(delta, 'month')
  displayYear.value = newDate.year()
  displayMonth.value = newDate.month() + 1
  selectedDate.value = dayjs().format('YYYY-MM-DD')
  selectedDates.value = []
  fetchSchedules()
}

// 进入编辑模式
const enterEditMode = () => {
  if (isPastMonth.value) {
    showToast('过去月份不能添加排期')
    return
  }
  if (addresses.value.length === 0) {
    showToast('请先添加上课地址')
    return
  }
  isEditMode.value = true
  selectedDates.value = []
  editModeSlots.value = [{
    start_time: '09:00',
    end_time: '10:30',
    type: 'ice',
    address_id: addresses.value[0]?.id || null,
    address_name: addresses.value[0]?.name || ''
  }]
  // 设置默认索引为 09:00-10:30
  editModeTimeDefaultIndex.value = [9, 0, 10, 6]
}

// 取消编辑
const cancelEdit = () => {
  isEditMode.value = false
  selectedDates.value = []
  if (addresses.value.length > 0) {
    editModeSlots.value = [{
      start_time: '09:00',
      end_time: '10:30',
      type: 'ice',
      address_id: addresses.value[0]?.id || null,
      address_name: addresses.value[0]?.name || ''
    }]
  }
  // 重置默认索引为 09:00-10:30
  editModeTimeDefaultIndex.value = [9, 0, 10, 6]
}

// 处理日期点击
const handleDateClick = (date) => {
  if (!date.isCurrentMonth) return

  // 过去月份只能查看
  if (isPastMonth.value) {
    selectedDate.value = date.date
    return
  }

  if (isEditMode.value) {
    // 编辑模式：多选，不能选过去日期
    if (isPastDate(date.date)) {
      showToast('不能选择过去的日期')
      return
    }
    toggleDate(date)
  } else {
    // 查看模式：单选
    selectedDate.value = date.date
  }
}

const isPastDate = (dateStr) => {
  return dayjs(dateStr).isBefore(dayjs(), 'day')
}

const toggleDate = (date) => {
  const index = selectedDates.value.indexOf(date.date)
  if (index > -1) {
    selectedDates.value = selectedDates.value.filter(d => d !== date.date)
  } else {
    selectedDates.value = [...selectedDates.value, date.date]
  }
  // 重置编辑模式表单
  if (selectedDates.value.length > 0 && addresses.value.length > 0) {
    editModeSlots.value = [{
      start_time: '09:00',
      end_time: '10:30',
      type: 'ice',
      address_id: addresses.value[0]?.id || null,
      address_name: addresses.value[0]?.name || ''
    }]
  }
}

const isSelected = (dateStr) => {
  if (isEditMode.value) {
    return selectedDates.value.includes(dateStr)
  }
  return selectedDate.value === dateStr
}

const getScheduleCount = (date) => {
  return schedules.value.filter(s => s.date === date).length
}

const getDateSchedules = (date) => {
  return schedules.value.filter(s => s.date === date)
}

const isHoliday = (date) => {
  return HOLIDAYS_2025[date]
}

const formatDayDisplay = (dateStr) => {
  const d = dayjs(dateStr)
  return `${d.month() + 1}月${d.date()}日`
}

// 检查时段间是否有冲突
const checkTimeConflict = (slots) => {
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const slot1 = slots[i]
      const slot2 = slots[j]
      const start1 = dayjs(`2000-01-01 ${slot1.start_time}`)
      const end1 = dayjs(`2000-01-01 ${slot1.end_time}`)
      const start2 = dayjs(`2000-01-01 ${slot2.start_time}`)
      const end2 = dayjs(`2000-01-01 ${slot2.end_time}`)

      // 检查是否有重叠
      if ((start1.isBefore(end2) && end1.isAfter(start2)) ||
          (start2.isBefore(end1) && end2.isAfter(start1))) {
        return true
      }
    }
  }
  return false
}

const getWeekday = (dateStr) => {
  const day = dayjs(dateStr).day()
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][day]
}

// 展示模式：添加时段
const addViewModeSlot = () => {
  const lastSlot = viewModeSlots.value[viewModeSlots.value.length - 1]
  const lastEnd = lastSlot ? lastSlot.end_time : '10:30'
  const [hour, min] = lastEnd.split(':').map(Number)

  // 上一条结束时间 + 10 分钟 = 新的开始时间
  let startDate = dayjs().hour(hour).minute(min).add(10, 'minute')
  let startHour = startDate.hour()
  let startMin = startDate.minute()
  // 将分钟调整到最近的 5 分钟
  startMin = Math.round(startMin / 5) * 5
  if (startMin >= 60) {
    startMin = 0
    startHour += 1
  }
  const nextStart = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`

  // 开始时间 + 1 小时 = 结束时间
  let endDate = startDate.hour(startHour).minute(startMin).add(1, 'hour')
  const nextEnd = `${String(endDate.hour()).padStart(2, '0')}:${String(endDate.minute()).padStart(2, '0')}`

  viewModeSlots.value.push({
    start_time: nextStart,
    end_time: nextEnd,
    type: lastSlot ? lastSlot.type : 'ice',
    address_id: lastSlot ? lastSlot.address_id : (addresses.value[0]?.id || null),
    address_name: lastSlot ? lastSlot.address_name : (addresses.value[0]?.name || '')
  })

  // 设置新添加时段的时间为picker默认值
  const newStartHour = startDate.hour()
  const newStartMin = startDate.minute()
  const newEndHour = endDate.hour()
  const newEndMin = endDate.minute()
  viewModeTimeDefaultIndex.value = [
    newStartHour,
    newStartMin / 5,
    newEndHour,
    newEndMin / 5
  ]
}

// 展示模式：删除时段
const removeViewModeSlot = (index) => {
  viewModeSlots.value.splice(index, 1)
}

// 展示模式：打开时间选择
const openViewModeTimePicker = async (index) => {
  viewModeSlotIndex.value = index

  // 根据当前时间计算并设置默认索引
  const slot = viewModeSlots.value[index]
  if (slot) {
    const [startHour, startMin] = slot.start_time.split(':')
    const [endHour, endMin] = slot.end_time.split(':')

    // 计算索引：小时(0-23)，分钟(0-11，每5分钟一个)
    viewModeTimeDefaultIndex.value = [
      parseInt(startHour),
      parseInt(startMin) / 5,
      parseInt(endHour),
      parseInt(endMin) / 5
    ]
  }

  // 等待下一个 tick，确保 defaultIndex 已更新
  await nextTick()
  showViewModeTimePicker.value = true
}

// 展示模式：打开类型选择
const openViewModeTypePicker = (index) => {
  viewModeSlotIndex.value = index
  showViewModeTypePicker.value = true
}

// 展示模式：类型确认
const onViewModeTypeConfirm = (value) => {
  viewModeSlots.value[viewModeSlotIndex.value].type = value.selectedOptions[0].value
  showViewModeTypePicker.value = false
}

// 展示模式：时间确认
const onViewModeTimeConfirm = (value) => {
  const slot = viewModeSlots.value[viewModeSlotIndex.value]
  const startHour = value.selectedOptions[0]?.value || '09'
  const startMin = value.selectedOptions[1]?.value || '00'
  const endHour = value.selectedOptions[2]?.value || '10'
  const endMin = value.selectedOptions[3]?.value || '30'
  slot.start_time = `${startHour}:${startMin}`
  slot.end_time = `${endHour}:${endMin}`
  showViewModeTimePicker.value = false
}

// 展示模式：时间变化时更新
const onViewModeTimeChange = (value) => {
  const slot = viewModeSlots.value[viewModeSlotIndex.value]
  const startHour = value.selectedOptions[0]?.value || '09'
  const startMin = value.selectedOptions[1]?.value || '00'
  const endHour = value.selectedOptions[2]?.value || '10'
  const endMin = value.selectedOptions[3]?.value || '30'
  slot.start_time = `${startHour}:${startMin}`
  slot.end_time = `${endHour}:${endMin}`
}

// 展示模式：打开地址选择
const openViewModeAddressPicker = (index) => {
  viewModeSlotIndex.value = index
  showViewModeAddressPicker.value = true
}

// 展示模式：地址确认
const onViewModeAddressConfirm = (value) => {
  viewModeSlots.value[viewModeSlotIndex.value].address_id = value.selectedOptions[0].value
  viewModeSlots.value[viewModeSlotIndex.value].address_name = value.selectedOptions[0].text
  showViewModeAddressPicker.value = false
}

// 展示模式：保存排期 - 修复：正确处理多个时段
const saveViewModeSchedule = async () => {
  if (!selectedDate.value) {
    showToast('请选择日期')
    return
  }

  for (const slot of viewModeSlots.value) {
    if (!/^\d{2}:\d{2}$/.test(slot.start_time) || !/^\d{2}:\d{2}$/.test(slot.end_time)) {
      showToast('时间格式错误，请使用 HH:MM 格式')
      return
    }
  }

  // 检查时段间是否有冲突
  if (checkTimeConflict(viewModeSlots.value)) {
    showToast('时段间有冲突')
    return
  }

  saving.value = true
  try {
    // 一次性发送所有时段
    const res = await createSchedule({
      date: selectedDate.value,
      slots: viewModeSlots.value.map(slot => ({
        start_time: slot.start_time,
        end_time: slot.end_time,
        type: slot.type,
        address_id: slot.address_id
      }))
    })

    if (res.code !== 200) {
      throw new Error(res.message)
    }

    showToast({ type: 'success', message: '排期保存成功' })
    viewModeSlots.value = [{
      start_time: '09:00',
      end_time: '10:30',
      type: 'ice',
      address_id: addresses.value[0]?.id || null,
      address_name: addresses.value[0]?.name || ''
    }]
    // 重置默认索引为 09:00-10:30
    viewModeTimeDefaultIndex.value = [9, 0, 10, 6]
    fetchSchedules()
  } catch (error) {
    showToast({ type: 'fail', message: error.message || '保存失败' })
  } finally {
    saving.value = false
  }
}

// 编辑模式：添加时段
const addEditModeSlot = () => {
  const lastSlot = editModeSlots.value[editModeSlots.value.length - 1]
  const lastEnd = lastSlot ? lastSlot.end_time : '10:30'
  const [hour, min] = lastEnd.split(':').map(Number)

  // 上一条结束时间 + 10 分钟 = 新的开始时间
  let startDate = dayjs().hour(hour).minute(min).add(10, 'minute')
  let startHour = startDate.hour()
  let startMin = startDate.minute()
  // 将分钟调整到最近的 5 分钟
  startMin = Math.round(startMin / 5) * 5
  if (startMin >= 60) {
    startMin = 0
    startHour += 1
  }
  const nextStart = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`

  // 开始时间 + 1 小时 = 结束时间
  let endDate = startDate.hour(startHour).minute(startMin).add(1, 'hour')
  const nextEnd = `${String(endDate.hour()).padStart(2, '0')}:${String(endDate.minute()).padStart(2, '0')}`

  editModeSlots.value.push({
    start_time: nextStart,
    end_time: nextEnd,
    type: lastSlot ? lastSlot.type : 'ice',
    address_id: lastSlot ? lastSlot.address_id : (addresses.value[0]?.id || null),
    address_name: lastSlot ? lastSlot.address_name : (addresses.value[0]?.name || '')
  })

  // 设置新添加时段的时间为picker默认值
  const newStartHour = startDate.hour()
  const newStartMin = startDate.minute()
  const newEndHour = endDate.hour()
  const newEndMin = endDate.minute()
  editModeTimeDefaultIndex.value = [
    newStartHour,
    newStartMin / 5,
    newEndHour,
    newEndMin / 5
  ]
}

// 编辑模式：删除时段
const removeEditModeSlot = (index) => {
  editModeSlots.value.splice(index, 1)
}

// 编辑模式：打开时间选择
const openEditModeTimePicker = async (index) => {
  editModeSlotIndex.value = index

  // 根据当前时间计算并设置默认索引
  const slot = editModeSlots.value[index]
  if (slot) {
    const [startHour, startMin] = slot.start_time.split(':')
    const [endHour, endMin] = slot.end_time.split(':')

    // 计算索引：小时(0-23)，分钟(0-11，每5分钟一个)
    editModeTimeDefaultIndex.value = [
      parseInt(startHour),
      parseInt(startMin) / 5,
      parseInt(endHour),
      parseInt(endMin) / 5
    ]
  }

  // 等待下一个 tick，确保 defaultIndex 已更新
  await nextTick()
  showEditModeTimePicker.value = true
}

// 编辑模式：打开类型选择
const openEditModeTypePicker = (index) => {
  editModeSlotIndex.value = index
  showEditModeTypePicker.value = true
}

// 编辑模式：类型确认
const onEditModeTypeConfirm = (value) => {
  editModeSlots.value[editModeSlotIndex.value].type = value.selectedOptions[0].value
  showEditModeTypePicker.value = false
}

// 编辑模式：时间确认
const onEditModeTimeConfirm = (value) => {
  const slot = editModeSlots.value[editModeSlotIndex.value]
  const startHour = value.selectedOptions[0]?.value || '09'
  const startMin = value.selectedOptions[1]?.value || '00'
  const endHour = value.selectedOptions[2]?.value || '10'
  const endMin = value.selectedOptions[3]?.value || '30'
  slot.start_time = `${startHour}:${startMin}`
  slot.end_time = `${endHour}:${endMin}`
  showEditModeTimePicker.value = false
}

// 编辑模式：时间变化时更新
const onEditModeTimeChange = (value) => {
  const slot = editModeSlots.value[editModeSlotIndex.value]
  const startHour = value.selectedOptions[0]?.value || '09'
  const startMin = value.selectedOptions[1]?.value || '00'
  const endHour = value.selectedOptions[2]?.value || '10'
  const endMin = value.selectedOptions[3]?.value || '30'
  slot.start_time = `${startHour}:${startMin}`
  slot.end_time = `${endHour}:${endMin}`
}

// 编辑模式：打开地址选择
const openEditModeAddressPicker = (index) => {
  editModeSlotIndex.value = index
  showEditModeAddressPicker.value = true
}

// 编辑模式：地址确认
const onEditModeAddressConfirm = (value) => {
  editModeSlots.value[editModeSlotIndex.value].address_id = value.selectedOptions[0].value
  editModeSlots.value[editModeSlotIndex.value].address_name = value.selectedOptions[0].text
  showEditModeAddressPicker.value = false
}

// 编辑模式：保存排期 - 修复：正确处理多个日期和多个时段
const saveEditModeSchedule = async () => {
  if (selectedDates.value.length === 0) {
    showToast('请选择日期')
    return
  }

  for (const slot of editModeSlots.value) {
    if (!/^\d{2}:\d{2}$/.test(slot.start_time) || !/^\d{2}:\d{2}$/.test(slot.end_time)) {
      showToast('时间格式错误，请使用 HH:MM 格式')
      return
    }
  }

  // 检查时段间是否有冲突
  if (checkTimeConflict(editModeSlots.value)) {
    showToast('时段间有冲突')
    return
  }

  saving.value = true
  try {
    // 准备时段数据
    const slotsData = editModeSlots.value.map(slot => ({
      start_time: slot.start_time,
      end_time: slot.end_time,
      type: slot.type,
      address_id: slot.address_id
    }))

    // 为每个选中的日期一次性发送所有时段
    for (const date of selectedDates.value) {
      const res = await createSchedule({
        date,
        slots: slotsData
      })

      if (res.code !== 200) {
        throw new Error(res.message)
      }
    }

    showToast({ type: 'success', message: '排期保存成功' })
    selectedDates.value = []
    editModeSlots.value = [{
      start_time: '09:00',
      end_time: '10:30',
      type: 'ice',
      address_id: addresses.value[0]?.id || null,
      address_name: addresses.value[0]?.name || ''
    }]
    // 重置默认索引为 09:00-10:30
    editModeTimeDefaultIndex.value = [9, 0, 10, 6]
    isEditMode.value = false
    fetchSchedules()
  } catch (error) {
    showToast({ type: 'fail', message: error.message || '保存失败' })
  } finally {
    saving.value = false
  }
}

const editSchedule = (schedule) => {
  editForm.value = {
    id: schedule.id,
    start_time: schedule.start_time,
    end_time: schedule.end_time,
    type: schedule.type,
    address_id: schedule.address_id,
    address_name: schedule.address_name
  }
  showEditDialog.value = true
}

const confirmEditSchedule = async () => {
  if (!/^\d{2}:\d{2}$/.test(editForm.value.start_time) || !/^\d{2}:\d{2}$/.test(editForm.value.end_time)) {
    showToast('时间格式错误，请使用 HH:MM 格式')
    return
  }

  try {
    const res = await updateSchedule(editForm.value.id, {
      start_time: editForm.value.start_time,
      end_time: editForm.value.end_time,
      type: editForm.value.type,
      address_id: editForm.value.address_id
    })

    if (res.code === 200) {
      showToast({ type: 'success', message: '排期修改成功' })
      fetchSchedules()
    }
  } catch (error) {
    showToast({ type: 'fail', message: error.message || '修改失败' })
  }
}

const onEditTypeConfirm = (value) => {
  editForm.value.type = value.selectedOptions[0].value
  showEditTypePicker.value = false
}

const onEditAddressConfirm = (value) => {
  editForm.value.address_id = value.selectedOptions[0].value
  editForm.value.address_name = value.selectedOptions[0].text
  showEditAddressPicker.value = false
}

const deleteSchedule = async (schedule) => {
  try {
    await showConfirmDialog({
      title: '确认删除',
      message: `确定要删除 ${schedule.date} ${schedule.start_time}-${schedule.end_time} 的排期吗？`
    })

    const res = await deleteScheduleApi(schedule.id)
    if (res.code === 200) {
      showToast({ type: 'success', message: '删除成功' })
      fetchSchedules()
    }
  } catch (error) {
    if (error !== 'cancel') {
      showToast({ type: 'fail', message: error.message || '删除失败' })
    }
  }
}

const showAddAddressDialog = () => {
  showAddAddress.value = true
}

const addAddress = async () => {
  if (!newAddressName.value || newAddressName.value.length > 20) {
    showToast('地点名称不能为空且不能超过20字符')
    return
  }

  try {
    const res = await createAddress({ name: newAddressName.value })
    if (res.code === 200) {
      showToast({ type: 'success', message: '地点添加成功' })
      fetchAddresses()
      newAddressName.value = ''
    }
  } catch (error) {
    showToast({ type: 'fail', message: '添加失败' })
  }
}

const editAddress = async (addr) => {
  const newName = prompt('修改地点名称:', addr.name)
  if (newName && newName !== addr.name) {
    if (newName.length > 20) {
      showToast('地点名称不能超过20字符')
      return
    }

    try {
      const res = await updateAddress(addr.id, { name: newName })
      if (res.code === 200) {
        showToast({ type: 'success', message: '修改成功' })
        fetchAddresses()
      }
    } catch (error) {
      showToast({ type: 'fail', message: '修改失败' })
    }
  }
}

const deleteAddress = async (addr) => {
  try {
    await showConfirmDialog({
      title: '确认删除',
      message: `确定要删除地点 "${addr.name}" 吗？\n删除后仅影响新的约课设置，历史记录不受影响。`,
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })

    const res = await deleteAddressApi(addr.id)
    if (res.code === 200) {
      showToast({ type: 'success', message: '删除成功' })
      fetchAddresses()
    }
  } catch (error) {
    if (error !== 'cancel') {
      showToast({ type: 'fail', message: error.message || '删除失败' })
    }
  }
}

// 按周批量复制到下一周
const copyWeekToNextWeek = async () => {
  if (!canCopyToNextWeek.value) return

  copyingWeek.value = true
  try {
    // 获取选中日期各自的排期，并复制到下周同一天
    for (const dateStr of selectedDates.value) {
      const dateSchedules = schedules.value.filter(s => s.date === dateStr)

      if (dateSchedules.length > 0) {
        // 计算下周同一天
        const nextWeekDate = dayjs(dateStr).add(1, 'week').format('YYYY-MM-DD')

        // 准备时段数据
        const slotsData = dateSchedules.map(s => ({
          start_time: s.start_time,
          end_time: s.end_time,
          type: s.type,
          address_id: s.address_id
        }))

        // 复制到下周同一天
        const res = await createSchedule({
          date: nextWeekDate,
          slots: slotsData
        })

        if (res.code !== 200) {
          throw new Error(res.message)
        }
      }
    }

    showToast({ type: 'success', message: '复制成功' })
    selectedDates.value = []
    fetchSchedules()
  } catch (error) {
    showToast({ type: 'fail', message: error.message || '复制失败' })
  } finally {
    copyingWeek.value = false
  }
}
</script>

<style scoped>
.schedule-calendar {
  padding: 12px;
}

.tips-section {
  background: #f0f0f0;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}

/* 编辑态提示语样式 - 淡黄色背景，黑色字体 */
.tips-section.edit-mode-tips {
  background: #fff9c4;
}

.tips-section.edit-mode-tips .tips-line {
  color: #000;
}

/* 黑底白字按钮样式 */
.btn-black {
  background: #000 !important;
  color: #fff !important;
  border-color: #000 !important;
}

.btn-black.van-button--plain {
  background: transparent !important;
  color: #000 !important;
  border-color: #000 !important;
}

.btn-black.van-button--disabled {
  background: #ccc !important;
  color: #fff !important;
  border-color: #ccc !important;
}

.btn-black.van-button--danger {
  background: #ff4d4f !important;
  color: #fff !important;
  border-color: #ff4d4f !important;
}

/* 删除按钮样式 */
.btn-danger {
  background: #ff4d4f !important;
  color: #fff !important;
  border-color: #ff4d4f !important;
}

.tips-line {
  font-size: 13px;
  color: #666;
  line-height: 1.8;
  margin: 0;
}

.action-section {
  margin-bottom: 12px;
}

.edit-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #fff3e0;
  border-radius: 8px;
}

.edit-mode-text {
  color: #ff9800;
  font-weight: 600;
}

.calendar-wrapper {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  transition: all 0.3s;
}

.calendar-wrapper.edit-mode {
  background: #fff8e1;
  border: 2px solid #ffc107;
}

.week-copy-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed #ddd;
}

.calendar-header {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.month-nav {
  display: flex;
  align-items: center;
  gap: 20px;
  font-size: 16px;
  font-weight: 600;
}

.month-nav .van-icon {
  cursor: pointer;
  padding: 4px;
}

.month-nav .van-icon.disabled {
  color: #ccc;
  cursor: not-allowed;
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
  padding: 4px;
}

.day-cell:not(.other-month):not(.disabled):active {
  background: #f0f0f0;
}

.day-cell.other-month {
  color: #ccc;
  cursor: default;
}

.day-cell.today .day-number {
  background: #1a56db;
  color: #fff;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.day-cell.selected {
  background: #e8f0fe;
  border: 2px solid #1a56db;
}

.day-cell.holiday .day-number {
  color: #f05252;
}

.day-cell.past-date {
  color: #999;
}

.day-cell.disabled {
  color: #ccc;
  cursor: not-allowed;
  background: #f5f5f5;
}

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
  background: #0e9f6e;
  border-radius: 50%;
}

.schedule-dot.dot-ice {
  background: #1a56db;
}

.schedule-dot.dot-land {
  background: #f05252;
}

.day-number {
  font-size: 14px;
}

.day-schedules-section,
.edit-section {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #333;
}

.empty-schedules,
.no-available-slots {
  text-align: center;
  color: #999;
  padding: 20px;
  font-size: 14px;
}

.timeslot-form {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 12px;
  margin-top: 12px;
}

.timeslot-form.edit-mode-form {
  background: #fff;
  border: 1px solid #e5e7eb;
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-weight: 600;
}

.slot-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
}

.slot-info-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  overflow: hidden;
}

.slot-time {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  cursor: pointer;
}

.slot-type {
  font-size: 14px;
  color: #000;
  cursor: pointer;
  padding: 4px 10px;
  border-radius: 4px;
  white-space: nowrap;
}

.slot-type.type-ice {
  background: #e3f2fd;
}

.slot-type.type-land {
  background: #fce4ec;
}

.slot-address {
  font-size: 14px;
  color: #000;
  background: #f5f5f5;
  cursor: pointer;
  padding: 4px 10px;
  border-radius: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.delete-icon {
  color: #f05252;
  font-size: 20px;
  cursor: pointer;
}

.form-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
}

.multi-day-tip {
  text-align: center;
  color: #999;
  font-size: 12px;
  margin-top: 8px;
}

.schedule-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}

.card-date {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
}

.card-content {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.card-content .time {
  font-size: 14px;
}

.card-content .location {
  font-size: 13px;
  color: #666;
}

.card-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.tag-ice {
  background: #e1effe;
  color: #1a56db;
}

.tag-land {
  background: #fce8e8;
  color: #f05252;
}

.address-section {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  font-weight: 600;
}

.address-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.address-tag {
  cursor: pointer;
}

.address-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.delete-address-icon {
  color: #999;
  font-size: 14px;
  cursor: pointer;
  padding: 4px;
}

.delete-address-icon:hover {
  color: #ff4d4f;
}

/* 弹窗按钮样式 */
:deep(.van-dialog__confirm) {
  background: #000 !important;
  color: #fff !important;
}

:deep(.van-dialog__cancel) {
  color: #666 !important;
}
</style>
