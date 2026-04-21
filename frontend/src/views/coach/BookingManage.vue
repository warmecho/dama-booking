<template>
  <div class="booking-manage-page">
    <van-nav-bar title="约课管理" fixed placeholder />

    <van-tabs v-model:active="activeTab" sticky offset-top="46">
      <van-tab title="今明">
        <TodayTomorrowView />
      </van-tab>
      <van-tab title="本周">
        <StatsView :key="'week-' + refreshKey" view="week" />
        <BookingList view="week" @updated="onBookingUpdated" />
      </van-tab>
      <van-tab title="本月">
        <StatsView :key="'month-' + refreshKey" view="month" />
        <BookingList view="month" @updated="onBookingUpdated" />
      </van-tab>
      <van-tab title="今年">
        <StatsView :key="'year-' + refreshKey" view="year" />
      </van-tab>
    </van-tabs>
  </div>
</template>

<script setup>
import { ref, provide } from 'vue'
import StatsView from './components/StatsView.vue'
import BookingList from './components/BookingList.vue'
import TodayTomorrowView from './components/TodayTomorrowView.vue'

const activeTab = ref(0)

// 用于强制刷新 StatsView 的 key
const refreshKey = ref(0)

// 提供刷新方法给子组件
provide('refreshStats', () => {
  refreshKey.value++
})

// 约课操作后刷新对应的统计视图
const onBookingUpdated = () => {
  refreshKey.value++
}
</script>

<style scoped>
.booking-manage-page {
  min-height: 100vh;
  background: #f5f5f5;
}
</style>
