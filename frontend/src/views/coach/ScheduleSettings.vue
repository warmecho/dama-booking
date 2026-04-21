<template>
  <div class="schedule-page">
    <van-nav-bar title="课时设置" fixed placeholder />

    <ScheduleCalendar />
  </div>
</template>

<script setup>
import ScheduleCalendar from './components/ScheduleCalendar.vue'
</script>

<style scoped>
.schedule-page {
  min-height: 100vh;
  background: #f5f5f5;
}
</style>
