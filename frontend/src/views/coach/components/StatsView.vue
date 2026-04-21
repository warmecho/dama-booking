<template>
  <div class="stats-view">
    <div class="stats-cards">
      <div class="stat-card">
        <span class="label">预约课时数</span>
        <span class="value value-black">{{ totalBookingHours }}</span>
      </div>
      <div v-if="showAttendance" class="stat-card">
        <span class="label">上课率</span>
        <span class="value value-green">{{ averageAttendanceRate }}%</span>
      </div>
    </div>

    <div class="chart-container">
      <div ref="chartRef" class="chart"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'
import { getStats } from '@/api/coach'

const props = defineProps({
  view: {
    type: String,
    default: 'week'
  }
})

const chartRef = ref(null)
let chart = null
const stats = ref([])

const showAttendance = computed(() => {
  return ['week', 'next_week', 'month', 'year'].includes(props.view)
})

// 预约课时数 = 统计时间内预约课时数加总
const totalBookingHours = computed(() => {
  if (stats.value.length === 0) return 0
  const total = stats.value.reduce((sum, s) => sum + parseFloat(s.bookingHours || 0), 0)
  return total.toFixed(1)
})

// 上课率 = 已被确认上课的课时数 / 当天所有成功预约的课时数
const averageAttendanceRate = computed(() => {
  if (stats.value.length === 0) return 0
  const total = stats.value.reduce((sum, s) => sum + parseFloat(s.attendanceRate || 0), 0)
  return (total / stats.value.length).toFixed(1)
})

onMounted(() => {
  fetchStats()
})

onUnmounted(() => {
  if (chart) {
    chart.dispose()
  }
})

watch(() => props.view, () => {
  fetchStats()
})

const fetchStats = async () => {
  try {
    const res = await getStats({ view: props.view })
    if (res.code === 200) {
      stats.value = res.data
      renderChart()
    }
  } catch (error) {
    console.error('获取统计失败:', error)
  }
}

const renderChart = () => {
  if (!chartRef.value) return

  if (chart) {
    chart.dispose()
  }

  chart = echarts.init(chartRef.value)

  const labels = stats.value.map(s => s.label)
  const bookingData = stats.value.map(s => parseFloat(s.bookingHours))
  const attendanceData = showAttendance.value
    ? stats.value.map(s => parseFloat(s.attendanceRate || 0))
    : []

  const series = [
    {
      name: '预约课时数',
      type: 'bar',
      data: bookingData,
      itemStyle: { color: '#9ca3af' },
      yAxisIndex: 0
    }
  ]

  if (showAttendance.value) {
    series.push({
      name: '上课率',
      type: 'line',
      data: attendanceData,
      itemStyle: { color: '#0e9f6e' },
      lineStyle: { width: 3 },
      symbol: 'circle',
      symbolSize: 8,
      yAxisIndex: 1
    })
  }

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    legend: {
      data: showAttendance.value ? ['预约课时数', '上课率'] : ['预约课时数'],
      bottom: 0
    },
    grid: {
      left: '3%',
      right: '12%',
      bottom: '15%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: labels
    },
    yAxis: [
      {
        type: 'value',
        name: '课时',
        position: 'left',
        axisLine: { show: true, lineStyle: { color: '#000' } },
        axisLabel: { color: '#000' }
      },
      {
        type: 'value',
        name: '%',
        position: 'right',
        min: 0,
        max: 100,
        axisLine: { show: true, lineStyle: { color: '#0e9f6e' } },
        axisLabel: { formatter: '{value}%', color: '#0e9f6e' },
        splitLine: { show: false }
      }
    ],
    series
  }

  chart.setOption(option)
}
</script>

<style scoped>
.stats-view {
  padding: 12px;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.stat-card .label {
  font-size: 12px;
  color: #999;
  margin-bottom: 8px;
}

.stat-card .value {
  font-size: 28px;
  font-weight: 700;
  color: #1a56db;
}

.stat-card .value-black {
  color: #000;
}

.stat-card .value-green {
  color: #0e9f6e;
}

.chart-container {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.chart {
  height: 200px;
}
</style>
