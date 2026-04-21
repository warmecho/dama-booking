<template>
  <div class="course-stats">
    <!-- 总时长统计 -->
    <div class="total-stats">
      <div class="stat-item">
        <span class="label">总上课时长</span>
        <span class="value">{{ totalHours.toFixed(1) }} 小时</span>
      </div>
      <div class="stat-detail">
        <div class="detail-item ice">
          <span class="dot"></span>
          <span>冰时：{{ iceHours.toFixed(1) }} 小时</span>
        </div>
        <div class="detail-item land">
          <span class="dot"></span>
          <span>陆训：{{ landHours.toFixed(1) }} 小时</span>
        </div>
      </div>
    </div>

    <!-- 月度柱状图 -->
    <div class="chart-section">
      <div class="chart-title">近12个月课时统计</div>
      <div ref="chartRef" class="chart-container"></div>
    </div>

    <!-- 温馨提示 -->
    <div class="tip">
      <van-icon name="info-o" />
      <span>历史记录仅保留最近1年的数据</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { getMonthlyStats } from '@/api/booking'

const chartRef = ref(null)
let chart = null

const totalHours = ref(0)
const iceHours = ref(0)
const landHours = ref(0)

onMounted(() => {
  fetchStats()
})

onUnmounted(() => {
  if (chart) {
    chart.dispose()
  }
})

const fetchStats = async () => {
  try {
    const res = await getMonthlyStats()
    if (res.code === 200) {
      const data = res.data

      // 计算总时长
      totalHours.value = data.reduce((sum, item) => sum + (item.hours || 0), 0)

      // 区分冰时和陆训
      iceHours.value = data
        .filter(item => item.type === 'ice')
        .reduce((sum, item) => sum + (item.hours || 0), 0)

      landHours.value = data
        .filter(item => item.type === 'land')
        .reduce((sum, item) => sum + (item.hours || 0), 0)

      // 渲染图表
      renderChart(data)
    }
  } catch (error) {
    console.error('获取统计失败:', error)
  }
}

const renderChart = (data) => {
  if (!chartRef.value) return

  chart = echarts.init(chartRef.value)

  // 按月份聚合
  const monthMap = {}
  data.forEach(item => {
    if (!monthMap[item.month]) {
      monthMap[item.month] = { ice: 0, land: 0 }
    }
    monthMap[item.month][item.type] += item.hours || 0
  })

  const months = Object.keys(monthMap).sort()
  const iceData = months.map(m => monthMap[m].ice.toFixed(1))
  const landData = months.map(m => monthMap[m].land.toFixed(1))

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    legend: {
      data: ['冰时', '陆训'],
      bottom: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: months.map(m => m.slice(5)),
      axisLabel: {
        rotate: 45
      }
    },
    yAxis: {
      type: 'value',
      name: '小时'
    },
    series: [
      {
        name: '冰时',
        type: 'bar',
        data: iceData,
        itemStyle: { color: '#0277bd' }
      },
      {
        name: '陆训',
        type: 'bar',
        data: landData,
        itemStyle: { color: '#7b1fa2' }
      }
    ]
  }

  chart.setOption(option)
}
</script>

<style scoped>
.course-stats {
  padding: 12px;
}

.total-stats {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.stat-item .label {
  font-size: 16px;
  color: #666;
}

.stat-item .value {
  font-size: 24px;
  font-weight: 700;
  color: #1a56db;
}

.stat-detail {
  display: flex;
  gap: 24px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #666;
}

.detail-item .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.detail-item.ice .dot {
  background: #0277bd;
}

.detail-item.land .dot {
  background: #7b1fa2;
}

.chart-section {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.chart-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
}

.chart-container {
  height: 250px;
}

.tip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 12px;
  color: #999;
}
</style>
