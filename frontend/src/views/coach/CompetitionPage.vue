<template>
  <div class="competition-page">
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-empty v-if="competitionItems.length === 0" description="暂无比赛信息" />

      <div v-else class="competition-list">
        <div
          v-for="item in sortedCompetitionItems"
          :key="item.id"
          class="competition-item"
        >
          <div class="item-row">
            <span class="item-nickname">{{ item.nickname }}</span>
            <span class="item-date">{{ formatDate(item.date) }}</span>
            <span class="item-type">{{ item.compType }}</span>
            <span class="item-group">{{ item.group }}</span>
            <span class="item-order">第{{ item.groupNum }}组第{{ item.orderNum }}个</span>
            <span class="item-warmup">{{ item.warmupTime }}热身</span>
          </div>
        </div>
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

// 按日期降序、时间降序排列的比赛列表
const sortedCompetitionItems = computed(() => {
  return [...competitionItems.value].sort((a, b) => {
    const dateA = dayjs(a.date)
    const dateB = dayjs(b.date)
    // 日期不同，按日期降序
    if (!dateA.isSame(dateB, 'day')) {
      return dateB.valueOf() - dateA.valueOf()
    }
    // 日期相同，按时间降序
    return b.warmupTime.localeCompare(a.warmupTime)
  })
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

    // 只取已保存的比赛卡片
    const savedCards = allCards.filter(c => c.saved && c.type === 'competition')

    competitionItems.value = savedCards.map(c => ({
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

// 格式化日期为 mm/dd
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  // 处理 MM-DD 或 YYYY-MM-DD 格式
  const parts = dateStr.split('-')
  if (parts.length >= 2) {
    return `${parts[0]}/${parts[1]}`
  }
  return dateStr
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.competition-page {
  padding: 12px;
}

.competition-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.competition-item {
  background: #fff;
  border-radius: 8px;
  padding: 12px 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.item-row {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  overflow-x: auto;
  scrollbar-width: none;
}

.item-row::-webkit-scrollbar {
  display: none;
}

.item-nickname {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  min-width: 60px;
  flex-shrink: 0;
}

.item-date,
.item-type,
.item-group,
.item-order,
.item-warmup {
  font-size: 13px;
  color: #666;
  flex-shrink: 0;
}

.item-type {
  color: #1a56db;
  font-weight: 500;
}
</style>
