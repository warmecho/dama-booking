<template>
  <div class="competition-summary-page">
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-empty v-if="!hasData" description="暂无比赛考级信息" />

      <div v-else class="summary-content">
        <!-- 按最大日期排序显示模块 -->
        <template v-for="module in sortedModules" :key="module.type">
          <!-- 比赛模块 -->
          <div v-if="module.type === 'competition'" class="module-card competition">
            <div class="module-header">
              <span class="module-title">比赛</span>
              <span class="module-count">{{ module.items.length }}条</span>
            </div>
            <div class="module-list">
              <div
                v-for="item in module.items"
                :key="item.id"
                class="list-item"
              >
                <div class="item-row single-line">
                  <span class="item-nickname">{{ item.nickname }}</span>
                  <span class="item-group">{{ item.group }}</span>
                  <span class="item-date">{{ item.date }}</span>
                  <span class="item-order">第{{ item.groupNum }}组第{{ item.orderNum }}个</span>
                  <span class="item-warmup">{{ item.warmupTime }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 考级模块 -->
          <div v-else class="module-card level">
            <div class="module-header">
              <span class="module-title">考级</span>
              <span class="module-count">{{ module.items.length }}条</span>
            </div>
            <div class="module-list">
              <div
                v-for="item in module.items"
                :key="item.id"
                class="list-item"
              >
                <div class="item-row single-line">
                  <span class="item-nickname">{{ item.nickname }}</span>
                  <span class="item-station">{{ item.station }}</span>
                  <span class="item-subject-level">{{ item.subject }}/{{ item.level }}</span>
                  <span class="item-date">{{ item.date }}</span>
                  <span class="item-order">第{{ item.group }}组第{{ item.order }}个</span>
                  <span class="item-warmup">{{ item.warmupTime }}</span>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </van-pull-refresh>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { showToast } from 'vant'
import dayjs from 'dayjs'

const refreshing = ref(false)
const competitionItems = ref([])
const levelItems = ref([])

// 是否有数据
const hasData = computed(() => {
  return competitionItems.value.length > 0 || levelItems.value.length > 0
})

// 比赛模块（按日期降序排列）
const competitionModule = computed(() => {
  const items = [...competitionItems.value].sort((a, b) => {
    return dayjs(b.date).valueOf() - dayjs(a.date).valueOf()
  })
  const maxDate = items.length > 0
    ? Math.max(...items.map(i => dayjs(i.date).valueOf()))
    : 0
  return { items, maxDate }
})

// 考级模块（按日期降序排列）
const levelModule = computed(() => {
  const items = [...levelItems.value].sort((a, b) => {
    return dayjs(b.date).valueOf() - dayjs(a.date).valueOf()
  })
  const maxDate = items.length > 0
    ? Math.max(...items.map(i => dayjs(i.date).valueOf()))
    : 0
  return { items, maxDate }
})

// 模块排序：最大日期晚的排前面
const sortedModules = computed(() => {
  const modules = []
  if (competitionModule.value.items.length > 0) {
    modules.push({ type: 'competition', ...competitionModule.value })
  }
  if (levelModule.value.items.length > 0) {
    modules.push({ type: 'level', ...levelModule.value })
  }
  return modules.sort((a, b) => b.maxDate - a.maxDate)
})

// 加载数据
const loadData = () => {
  try {
    // 从 localStorage 读取所有家长端数据（按用户隔离的 key + 旧格式）
    const allCards = []

    // 1. 读取新的按用户隔离的数据
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('my_competitions_cards_')) {
        const stored = localStorage.getItem(key)
        if (stored) {
          const cards = JSON.parse(stored)
          allCards.push(...cards)
        }
      }
    }

    // 2. 兼容读取旧格式的共享数据（如果有）
    const oldStored = localStorage.getItem('my_competitions_cards')
    if (oldStored) {
      const oldCards = JSON.parse(oldStored)
      allCards.push(...oldCards)
    }

    // 只取已保存的卡片
    const savedCards = allCards.filter(c => c.saved)

    competitionItems.value = savedCards
      .filter(c => c.type === 'competition')
      .map(c => ({
        ...c,
        nickname: c.nickname || '未知学员'
      }))

    levelItems.value = savedCards
      .filter(c => c.type === 'level')
      .map(c => ({
        ...c,
        nickname: c.nickname || '未知学员'
      }))
  } catch (e) {
    console.error('加载数据失败:', e)
  }
}

const onRefresh = () => {
  loadData()
  refreshing.value = false
  showToast({ type: 'success', message: '刷新成功' })
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.competition-summary-page {
  padding: 12px;
}

.summary-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.module-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.module-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  background: #000;
}

.module-title {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.module-count {
  font-size: 12px;
  color: #999;
}

.module-list {
  padding: 8px 0;
}

.list-item {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.list-item:last-child {
  border-bottom: none;
}

.item-row {
  display: flex;
  align-items: center;
  gap: 12px;
  white-space: nowrap;
  overflow-x: auto;
  scrollbar-width: none;
}

.item-row::-webkit-scrollbar {
  display: none;
}

.item-row.single-line {
  gap: 8px;
}

.item-nickname {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  min-width: 60px;
  flex-shrink: 0;
}

/* 比赛卡片样式 */
.competition .item-group,
.competition .item-date,
.competition .item-order,
.competition .item-warmup {
  font-size: 13px;
  color: #666;
  flex-shrink: 0;
}

/* 考级卡片样式 - 除昵称外统一灰色 */
.level .item-station,
.level .item-subject-level,
.level .item-date,
.level .item-order,
.level .item-warmup {
  font-size: 13px;
  color: #999;
  flex-shrink: 0;
}
</style>
