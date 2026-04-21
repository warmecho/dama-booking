<template>
  <div class="my-competitions">
    <van-nav-bar title="我的比赛考级" fixed placeholder />

    <div class="action-buttons">
      <van-button class="btn-black" block @click="addLevelTestCard">
        + 考级
      </van-button>
      <van-button class="btn-black" block @click="addCompetitionCard">
        + 比赛
      </van-button>
    </div>

    <!-- 所有卡片列表 -->
    <div class="cards-section">
      <div v-for="(card, index) in allCards" :key="card.id" class="info-card">
        <!-- 考级卡片 - 编辑态 -->
        <template v-if="card.type === 'level' && !card.saved">
          <div class="card-header">
            <span class="card-title"></span>
            <van-icon name="cross" @click="removeCard(index)" />
          </div>

          <!-- 第几站 -->
          <div class="form-row">
            <span class="label">第几站</span>
            <div class="station-options">
              <span
                v-for="station in stations"
                :key="station"
                class="option-tag"
                :class="{ selected: card.station === station }"
                @click="toggleStation(card, station)"
              >
                {{ station }}
              </span>
            </div>
          </div>

          <!-- 科目 -->
          <div class="form-row">
            <span class="label">科目</span>
            <div class="subject-options">
              <span
                v-for="subject in subjects"
                :key="subject"
                class="option-tag"
                :class="{ selected: card.subject === subject }"
                @click="toggleSubject(card, subject)"
              >
                {{ subject }}
              </span>
            </div>
          </div>

          <!-- 等级 -->
          <div class="form-row">
            <span class="label">等级</span>
            <div class="level-options">
              <span
                v-for="level in levels"
                :key="level"
                class="option-tag"
                :class="{ selected: card.level === level }"
                @click="toggleLevel(card, level)"
              >
                {{ level }}
              </span>
            </div>
          </div>

          <!-- 日期 -->
          <div class="form-row">
            <span class="label">日期</span>
            <div class="picker-display" @click="openDatePicker(card)">
              <span v-if="card.date" class="selected-text">{{ card.date }}</span>
              <span v-else class="placeholder">点击选择日期</span>
            </div>
          </div>

          <!-- 出场顺序 -->
          <div class="form-row">
            <span class="label">出场顺序</span>
            <div class="order-input">
              第<van-field
                v-model="card.group"
                type="digit"
                placeholder=""
                class="mini-input"
              />组
              第<van-field
                v-model="card.order"
                type="digit"
                placeholder=""
                class="mini-input"
              />个
            </div>
          </div>

          <!-- 热身时间 -->
          <div class="form-row">
            <span class="label">热身时间</span>
            <div class="picker-display" @click="openTimePicker(card)">
              <span v-if="card.warmupTime" class="selected-text">{{ card.warmupTime }}</span>
              <span v-else class="placeholder">点击选择时间</span>
            </div>
          </div>

          <van-button class="btn-black" block size="small" @click="saveCard(index)">
            保存
          </van-button>
        </template>

        <!-- 考级卡片 - 展示态 -->
        <template v-else-if="card.type === 'level' && card.saved">
          <div class="card-header">
            <div class="card-title-wrapper">
              <span class="card-title">考级信息</span>
              <span v-if="card.lastEdited" class="edit-time">{{ formatEditTime(card.lastEdited) }}</span>
            </div>
            <div class="card-actions">
              <van-icon name="edit" @click="editCard(index)" />
              <van-icon name="cross" @click="removeCard(index)" />
            </div>
          </div>
          <div class="display-content">
            <div class="display-row"><span class="display-label">第几站：</span><b>{{ card.station }}</b></div>
            <div class="display-row"><span class="display-label">科目：</span><b>{{ card.subject }}</b></div>
            <div class="display-row"><span class="display-label">等级：</span><b>{{ card.level }}</b></div>
            <div class="display-row"><span class="display-label">日期：</span><b>{{ card.date }}</b></div>
            <div class="display-row"><span class="display-label">出场顺序：</span><b>第{{ card.group }}组第{{ card.order }}个</b></div>
            <div class="display-row"><span class="display-label">热身时间：</span><b>{{ card.warmupTime }}</b></div>
          </div>
        </template>

        <!-- 比赛卡片 - 编辑态 -->
        <template v-else-if="card.type === 'competition' && !card.saved">
          <div class="card-header">
            <span class="card-title"></span>
            <van-icon name="cross" @click="removeCard(index)" />
          </div>

          <!-- 类型 -->
          <div class="form-row">
            <span class="label">类型</span>
            <div class="type-options">
              <span
                v-for="type in typeColumns"
                :key="type"
                class="option-tag"
                :class="{ selected: card.compType === type }"
                @click="card.compType = type; card.group = ''"
              >
                {{ type }}
              </span>
            </div>
          </div>

          <!-- 组别 -->
          <div class="form-row">
            <span class="label">组别</span>
            <div class="picker-display" @click="showGroupPicker(card)">
              <span v-if="card.group" class="selected-text">{{ card.group }}</span>
              <span v-else class="placeholder">点击选择组别</span>
            </div>
          </div>

          <!-- 性别 -->
          <div class="form-row">
            <span class="label">性别</span>
            <div class="gender-options">
              <span
                v-for="gender in genders"
                :key="gender"
                class="option-tag"
                :class="{ selected: card.gender === gender }"
                @click="card.gender = gender"
              >
                {{ gender }}
              </span>
            </div>
          </div>

          <!-- 日期 -->
          <div class="form-row">
            <span class="label">日期</span>
            <div class="picker-display" @click="openDatePicker(card)">
              <span v-if="card.date" class="selected-text">{{ card.date }}</span>
              <span v-else class="placeholder">点击选择日期</span>
            </div>
          </div>

          <!-- 出场顺序 -->
          <div class="form-row">
            <span class="label">出场顺序</span>
            <div class="order-input">
              第<van-field
                v-model="card.groupNum"
                type="digit"
                placeholder=""
                class="mini-input"
              />组
              第<van-field
                v-model="card.orderNum"
                type="digit"
                placeholder=""
                class="mini-input"
              />个
            </div>
          </div>

          <!-- 热身时间 -->
          <div class="form-row">
            <span class="label">热身时间</span>
            <div class="picker-display" @click="openTimePicker(card)">
              <span v-if="card.warmupTime" class="selected-text">{{ card.warmupTime }}</span>
              <span v-else class="placeholder">点击选择时间</span>
            </div>
          </div>

          <van-button class="btn-black" block size="small" @click="saveCard(index)">
            保存
          </van-button>
        </template>

        <!-- 比赛卡片 - 展示态 -->
        <template v-else-if="card.type === 'competition' && card.saved">
          <div class="card-header">
            <div class="card-title-wrapper">
              <span class="card-title">比赛信息</span>
              <span v-if="card.lastEdited" class="edit-time">{{ formatEditTime(card.lastEdited) }}</span>
            </div>
            <div class="card-actions">
              <van-icon name="edit" @click="editCard(index)" />
              <van-icon name="cross" @click="removeCard(index)" />
            </div>
          </div>
          <div class="display-content">
            <div class="display-row"><span class="display-label">类型：</span><b>{{ card.compType }}</b></div>
            <div class="display-row"><span class="display-label">组别：</span><b>{{ card.group }}</b></div>
            <div class="display-row"><span class="display-label">性别：</span><b>{{ card.gender }}</b></div>
            <div class="display-row"><span class="display-label">日期：</span><b>{{ card.date }}</b></div>
            <div class="display-row"><span class="display-label">出场顺序：</span><b>第{{ card.groupNum }}组第{{ card.orderNum }}个</b></div>
            <div class="display-row"><span class="display-label">热身时间：</span><b>{{ card.warmupTime }}</b></div>
          </div>
        </template>
      </div>
    </div>

    <!-- 日期选择器 Popup -->
    <van-popup v-model:show="datePickerVisible" position="bottom" round>
      <div class="picker-header">
        <span class="picker-title">选择日期</span>
        <van-icon name="cross" class="picker-close" @click="datePickerVisible = false" />
      </div>
      <div class="custom-picker">
        <div class="picker-column">
          <div class="picker-label">月</div>
          <div class="picker-list">
            <div
              v-for="m in 12"
              :key="'m-'+m"
              class="picker-item"
              :class="{ active: selectedMonth === String(m).padStart(2, '0') }"
              @click="selectedMonth = String(m).padStart(2, '0')"
            >
              {{ String(m).padStart(2, '0') }}
            </div>
          </div>
        </div>
        <div class="picker-column">
          <div class="picker-label">日</div>
          <div class="picker-list">
            <div
              v-for="d in 31"
              :key="'d-'+d"
              class="picker-item"
              :class="{ active: selectedDay === String(d).padStart(2, '0') }"
              @click="selectedDay = String(d).padStart(2, '0')"
            >
              {{ String(d).padStart(2, '0') }}
            </div>
          </div>
        </div>
      </div>
      <div class="picker-footer">
        <van-button class="btn-black" block @click="confirmDate">确定</van-button>
      </div>
    </van-popup>

    <!-- 时间选择器 Popup -->
    <van-popup v-model:show="timePickerVisible" position="bottom" round>
      <div class="picker-header">
        <span class="picker-title">选择时间</span>
        <van-icon name="cross" class="picker-close" @click="timePickerVisible = false" />
      </div>
      <div class="custom-picker">
        <div class="picker-column">
          <div class="picker-label">时</div>
          <div class="picker-list">
            <div
              v-for="h in 24"
              :key="'h-'+h"
              class="picker-item"
              :class="{ active: selectedHour === String(h - 1).padStart(2, '0') }"
              @click="selectedHour = String(h - 1).padStart(2, '0')"
            >
              {{ String(h - 1).padStart(2, '0') }}
            </div>
          </div>
        </div>
        <div class="picker-column">
          <div class="picker-label">分</div>
          <div class="picker-list">
            <div
              v-for="m in 60"
              :key="'min-'+m"
              class="picker-item"
              :class="{ active: selectedMinute === String(m - 1).padStart(2, '0') }"
              @click="selectedMinute = String(m - 1).padStart(2, '0')"
            >
              {{ String(m - 1).padStart(2, '0') }}
            </div>
          </div>
        </div>
      </div>
      <div class="picker-footer">
        <van-button class="btn-black" block @click="confirmTime">确定</van-button>
      </div>
    </van-popup>

    <!-- 组别选择器 Popup -->
    <van-popup v-model:show="groupPickerVisible" position="bottom" round>
      <div class="picker-header">
        <span class="picker-title">选择组别</span>
        <van-icon name="cross" class="picker-close" @click="groupPickerVisible = false" />
      </div>
      <div class="group-list">
        <div
          v-for="group in availableGroups"
          :key="group"
          class="group-item"
          :class="{ active: selectedGroup === group }"
          @click="selectedGroup = group"
        >
          {{ group }}
        </div>
      </div>
      <div class="picker-footer">
        <van-button class="btn-black" block @click="confirmGroup">确定</van-button>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import dayjs from 'dayjs'
import { showToast, showSuccessToast } from 'vant'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

// 数据定义
const stations = ['第一站', '第二站', '第三站', '第四站', '第五站']
const subjects = ['自由滑', '步法']
const levels = ['基础', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
const genders = ['男', '女']
const typeColumns = ['自由滑', '冰舞']

// 自由滑组别
const freeSkatingGroups = [
  '幼儿低龄组', '幼儿高龄组', '儿童低龄组', '儿童高龄组',
  '少年低龄组', '少年中龄组', '少年高龄组', '青年组', '成年组'
]
// 冰舞组别
const iceDanceGroups = ['少年高龄组', '青年组']

// 统一的卡片列表
const allCards = ref([])

// 获取当前用户隔离的 storage key
const getStorageKey = () => {
  const userPhone = userStore.userInfo?.phone || userStore.userInfo?.id || 'guest'
  return `my_competitions_cards_${userPhone}`
}

// 从 localStorage 加载数据
const loadFromStorage = () => {
  try {
    const stored = localStorage.getItem(getStorageKey())
    if (stored) {
      allCards.value = JSON.parse(stored)
    } else {
      allCards.value = []
    }
  } catch (e) {
    console.error('加载数据失败:', e)
    allCards.value = []
  }
}

// 保存到 localStorage
const saveToStorage = () => {
  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(allCards.value))
  } catch (e) {
    console.error('保存数据失败:', e)
  }
}

// 监听数据变化，自动保存
watch(allCards, saveToStorage, { deep: true })

// 页面加载时读取数据
onMounted(() => {
  loadFromStorage()
})

// 当前编辑的卡片
const editingCard = ref(null)

// 选择器显示控制
const datePickerVisible = ref(false)
const timePickerVisible = ref(false)
const groupPickerVisible = ref(false)

// 日期选择器状态
const selectedMonth = ref(dayjs().format('MM'))
const selectedDay = ref(dayjs().format('DD'))

// 时间选择器状态
const selectedHour = ref('00')
const selectedMinute = ref('00')

// 组别选择器状态
const selectedGroup = ref('')

// 计算属性：根据类型返回可选组别
const availableGroups = computed(() => {
  if (!editingCard.value) return freeSkatingGroups
  return editingCard.value.compType === '冰舞' ? iceDanceGroups : freeSkatingGroups
})

// 生成唯一ID
let cardIdCounter = 0
const generateId = () => {
  return `card_${Date.now()}_${cardIdCounter++}`
}

// 获取当前用户昵称（尝试多个可能的字段）
const getCurrentUserNickname = () => {
  const info = userStore.userInfo
  return info.nickname || info.name || info.username || info.phone || '未知学员'
}

// 创建新的考级卡片
const createLevelTestCard = () => {
  return {
    id: generateId(),
    type: 'level',
    station: '',
    subject: '',
    level: '',
    date: '',
    group: '',
    order: '',
    warmupTime: '',
    saved: false,
    createdAt: Date.now(),
    nickname: getCurrentUserNickname()
  }
}

// 创建新的比赛卡片
const createCompetitionCard = () => {
  return {
    id: generateId(),
    type: 'competition',
    compType: '冰舞',
    group: '',
    gender: '',
    date: dayjs().format('MM-DD'),
    groupNum: '',
    orderNum: '',
    warmupTime: '',
    saved: false,
    createdAt: Date.now(),
    nickname: getCurrentUserNickname()
  }
}

// 添加考级卡片
const addLevelTestCard = () => {
  allCards.value.unshift(createLevelTestCard())
}

// 添加比赛卡片
const addCompetitionCard = () => {
  allCards.value.unshift(createCompetitionCard())
}

// 切换第几站选择
const toggleStation = (card, station) => {
  card.station = card.station === station ? '' : station
}

// 切换科目选择
const toggleSubject = (card, subject) => {
  card.subject = card.subject === subject ? '' : subject
}

// 切换等级选择
const toggleLevel = (card, level) => {
  card.level = card.level === level ? '' : level
}

// 打开日期选择器
const openDatePicker = (card) => {
  editingCard.value = card
  if (card.date) {
    const [month, day] = card.date.split('-')
    selectedMonth.value = month
    selectedDay.value = day
  } else {
    selectedMonth.value = dayjs().format('MM')
    selectedDay.value = dayjs().format('DD')
  }
  datePickerVisible.value = true
}

// 确认日期选择
const confirmDate = () => {
  if (editingCard.value) {
    editingCard.value.date = `${selectedMonth.value}-${selectedDay.value}`
  }
  datePickerVisible.value = false
}

// 打开时间选择器
const openTimePicker = (card) => {
  editingCard.value = card
  if (card.warmupTime) {
    const [hour, minute] = card.warmupTime.split(':')
    selectedHour.value = hour
    selectedMinute.value = minute
  } else {
    selectedHour.value = '00'
    selectedMinute.value = '00'
  }
  timePickerVisible.value = true
}

// 确认时间选择
const confirmTime = () => {
  if (editingCard.value) {
    editingCard.value.warmupTime = `${selectedHour.value}:${selectedMinute.value}`
  }
  timePickerVisible.value = false
}

// 显示组别选择器
const showGroupPicker = (card) => {
  if (!card.compType) {
    showToast('请先选择类型')
    return
  }
  editingCard.value = card
  selectedGroup.value = card.group || ''
  groupPickerVisible.value = true
}

// 确认组别选择
const confirmGroup = () => {
  if (!selectedGroup.value) {
    showToast('请选择组别')
    return
  }
  if (editingCard.value) {
    editingCard.value.group = selectedGroup.value
  }
  groupPickerVisible.value = false
}

// 格式化日期时间
const formatEditTime = (timestamp) => {
  if (!timestamp) return ''
  return dayjs(timestamp).format('MM-DD HH:mm')
}

// 保存卡片
const saveCard = (index) => {
  const card = allCards.value[index]

  if (card.type === 'level') {
    // 考级卡片校验
    if (!card.station) {
      showToast('请选择第几站')
      return
    }
    if (!card.subject) {
      showToast('请选择科目')
      return
    }
    if (!card.level) {
      showToast('请选择等级')
      return
    }
    if (!card.date) {
      showToast('请选择日期')
      return
    }
    if (!card.group || !card.order) {
      showToast('请填写出场顺序')
      return
    }
    if (!card.warmupTime) {
      showToast('请选择热身时间')
      return
    }
  } else {
    // 比赛卡片校验
    if (!card.compType) {
      showToast('请选择类型')
      return
    }
    if (!card.group) {
      showToast('请选择组别')
      return
    }
    if (!card.gender) {
      showToast('请选择性别')
      return
    }
    if (!card.groupNum || !card.orderNum) {
      showToast('请填写出场顺序')
      return
    }
    if (!card.warmupTime) {
      showToast('请选择热身时间')
      return
    }
  }

  card.saved = true
  card.lastEdited = Date.now()
  // 确保昵称被记录（如果之前没有）
  if (!card.nickname || card.nickname === '未知学员') {
    card.nickname = getCurrentUserNickname()
  }
  showSuccessToast('保存成功')
}

// 编辑卡片
const editCard = (index) => {
  allCards.value[index].saved = false
}

// 删除卡片
const removeCard = (index) => {
  allCards.value.splice(index, 1)
}
</script>

<style scoped>
.my-competitions {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 20px;
}

.action-buttons {
  padding: 16px;
  display: flex;
  flex-direction: row;
  gap: 12px;
}

.action-buttons .btn-black {
  flex: 1;
  background: #000;
  color: #fff;
  border-color: #000;
}

.action-buttons .btn-black:active {
  background: #333;
}

.cards-section {
  padding: 0 16px;
}

.info-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.card-title-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
}

.edit-time {
  font-size: 12px;
  color: #999;
  font-weight: normal;
}

.card-actions {
  display: flex;
  gap: 16px;
}

.card-actions .van-icon {
  font-size: 18px;
  color: #666;
  cursor: pointer;
}

.form-row {
  margin-bottom: 16px;
}

.form-row .label {
  display: block;
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.station-options,
.subject-options,
.level-options,
.gender-options,
.type-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.option-tag {
  padding: 6px 12px;
  border-radius: 16px;
  background: #f5f5f5;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.option-tag.selected {
  background: #000;
  color: #fff;
}

.picker-display {
  padding: 10px 12px;
  background: #f5f5f5;
  border-radius: 8px;
  cursor: pointer;
}

.picker-display .selected-text {
  font-weight: bold;
  color: #000;
}

.order-input {
  display: flex;
  align-items: center;
  gap: 4px;
}

.mini-input {
  display: inline-block;
  width: 50px;
  padding: 0;
}

.mini-input :deep(.van-field__control) {
  text-align: center;
  border-bottom: 1px solid #ccc;
}

.placeholder {
  color: #999;
}

.btn-black {
  background: #000;
  color: #fff;
  border-color: #000;
}

.btn-black:active {
  background: #333;
}

/* 展示态样式 */
.display-content {
  padding-top: 8px;
}

.display-row {
  margin-bottom: 12px;
  font-size: 14px;
}

.display-label {
  color: #666;
}

.display-row b {
  color: #000;
  font-weight: 600;
}

/* 自定义选择器样式 */
.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.picker-title {
  font-size: 16px;
  font-weight: 600;
}

.picker-close {
  font-size: 20px;
  color: #999;
  cursor: pointer;
}

.custom-picker {
  display: flex;
  height: 260px;
  padding: 10px 0;
}

.picker-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.picker-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
  font-weight: 600;
}

.picker-list {
  flex: 1;
  overflow-y: auto;
  width: 100%;
  text-align: center;
}

.picker-item {
  padding: 10px 0;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.picker-item.active {
  background: #000;
  color: #fff;
  font-weight: bold;
}

.group-list {
  max-height: 300px;
  overflow-y: auto;
  padding: 10px 16px;
}

.group-item {
  padding: 12px 16px;
  font-size: 15px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
}

.group-item.active {
  background: #000;
  color: #fff;
  border-radius: 8px;
}

.picker-footer {
  padding: 16px;
  border-top: 1px solid #f0f0f0;
}
</style>
