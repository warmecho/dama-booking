<template>
  <div class="confirm-page">
    <van-nav-bar title="确认预约" left-arrow fixed placeholder @click-left="goBack" />

    <div class="content">
      <!-- 已选时段列表 -->
      <van-cell-group title="已选时段" inset>
        <div v-for="(group, date) in groupedSlots" :key="date" class="date-group">
          <div class="date-header">
            <span>{{ formatDate(date, 'MM月DD日') }}</span>
            <span v-if="getHolidayName(date)" class="holiday-tag">{{ getHolidayName(date) }}</span>
          </div>

          <van-checkbox-group v-model="selectedItems">
            <van-cell-group>
              <van-cell v-for="slot in group" :key="`${date}-${slot.start_time}`">
                <template #title>
                  <div class="slot-info">
                    <span class="time">{{ slot.start_time }} - {{ slot.end_time }}</span>
                    <van-tag :type="slot.type === 'ice' ? 'primary' : 'success'" size="small">
                      {{ slot.type === 'ice' ? '冰时' : '陆训' }}
                    </van-tag>
                  </div>
                </template>
                <template #right-icon>
                  <van-checkbox :name="`${date}-${slot.start_time}`" />
                </template>
              </van-cell>
            </van-cell-group>
          </van-checkbox-group>
        </div>
      </van-cell-group>

      <!-- 上课地点 -->
      <van-cell-group title="上课地点" inset>
        <van-field
          v-model="location"
          is-link
          readonly
          label="地点"
          placeholder="请选择上课地点"
          @click="showLocationPicker = true"
        />
      </van-cell-group>

      <!-- 重复预约 -->
      <van-cell-group title="重复预约" inset>
        <van-radio-group v-model="repeatOption">
          <van-cell-group>
            <van-cell title="不重复" clickable @click="repeatOption = 'none'">
              <template #right-icon>
                <van-radio name="none" />
              </template>
            </van-cell>
            <van-cell title="明日" clickable @click="repeatOption = 'tomorrow'">
              <template #right-icon>
                <van-radio name="tomorrow" />
              </template>
            </van-cell>
            <van-cell title="工作日" clickable @click="repeatOption = 'workday'">
              <template #right-icon>
                <van-radio name="workday" />
              </template>
            </van-cell>
            <van-cell title="周六日" clickable @click="repeatOption = 'weekend'">
              <template #right-icon>
                <van-radio name="weekend" />
              </template>
            </van-cell>
            <van-cell title="下周今日" clickable @click="repeatOption = 'next_week'">
              <template #right-icon>
                <van-radio name="next_week" />
              </template>
            </van-cell>
          </van-cell-group>
        </van-radio-group>
      </van-cell-group>

      <!-- 统计信息 -->
      <div class="summary">
        <p>共计 {{ totalSlots }} 个时段，{{ totalDuration.toFixed(1) }} 小时</p>
        <p v-if="repeatOption !== 'none'" class="repeat-info">将为您生成重复预约</p>
      </div>
    </div>

    <!-- 底部提交按钮 -->
    <div class="footer-bar">
      <van-button
        type="primary"
        block
        round
        class="btn-gradient"
        :loading="submitting"
        @click="submitBooking"
      >
        确认提交
      </van-button>
    </div>

    <!-- 地点选择器 -->
    <van-popup v-model:show="showLocationPicker" position="bottom">
      <van-picker
        :columns="locations"
        @confirm="onLocationConfirm"
        @cancel="showLocationPicker = false"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Toast, showConfirmDialog } from 'vant'
import { useBookingStore } from '@/stores/booking'
import { getAddresses } from '@/api/coach'
import { formatDate, getHolidayName } from '@/utils/date'

const router = useRouter()
const bookingStore = useBookingStore()

const selectedItems = ref([])
const location = ref('')
const repeatOption = ref('none')
const showLocationPicker = ref(false)
const locations = ref(['冰立方'])
const submitting = ref(false)

onMounted(() => {
  // 恢复store中的选择
  selectedItems.value = bookingStore.selectedSlots.map(s => `${s.date}-${s.start_time}`)
  location.value = bookingStore.selectedLocation || '冰立方'
  repeatOption.value = bookingStore.repeatOption

  fetchAddresses()
})

const groupedSlots = computed(() => {
  const groups = {}
  bookingStore.selectedSlots.forEach(slot => {
    if (!groups[slot.date]) {
      groups[slot.date] = []
    }
    groups[slot.date].push(slot)
  })
  return groups
})

const totalSlots = computed(() => bookingStore.selectedSlots.length)
const totalDuration = computed(() => bookingStore.totalDuration)

const fetchAddresses = async () => {
  try {
    const res = await getAddresses()
    if (res.code === 200) {
      locations.value = res.data.map(a => a.name)
      if (!location.value && locations.value.length > 0) {
        location.value = locations.value[0]
      }
    }
  } catch (error) {
    console.error('获取地址失败:', error)
  }
}

const onLocationConfirm = (value) => {
  location.value = value.selectedOptions[0].text
  showLocationPicker.value = false
}

const goBack = () => {
  router.back()
}

const submitBooking = async () => {
  if (!location.value) {
    Toast('请选择上课地点')
    return
  }

  submitting.value = true

  try {
    const result = await bookingStore.submitBooking()

    if (result.code === 200) {
      const { success, failed } = result.data

      if (failed.length === 0) {
        Toast.success('预约成功')
        bookingStore.clearSelectedSlots()
        router.replace('/parent/courses')
      } else {
        // 部分成功
        Dialog.alert({
          title: '预约结果',
          message: `成功：${success.length} 个时段\n失败：${failed.length} 个时段\n${failed.map(f => `${f.slot.date} ${f.slot.start_time}-${f.slot.end_time}: ${f.reason}`).join('\n')}`
        }).then(() => {
          // 移除已成功的
          success.forEach(s => {
            bookingStore.removeSlot(s)
          })
        })
      }
    } else {
      Toast.fail(result.message || '预约失败')
    }
  } catch (error) {
    console.error('提交预约失败:', error)
    Toast.fail('网络错误，请稍后重试')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.confirm-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 80px;
}

.content {
  padding: 12px;
}

.date-group {
  margin-bottom: 16px;
}

.date-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  font-weight: 600;
  font-size: 15px;
}

.holiday-tag {
  font-size: 12px;
  color: #f05252;
  background: #fee2e2;
  padding: 2px 8px;
  border-radius: 4px;
}

.slot-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.slot-info .time {
  font-weight: 500;
}

.summary {
  text-align: center;
  padding: 20px;
  color: #666;
  font-size: 14px;
}

.repeat-info {
  color: #1a56db;
  margin-top: 8px;
}

.footer-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  max-width: 430px;
  margin: 0 auto;
  background: #fff;
  padding: 12px 16px;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
  z-index: 100;
}
</style>
