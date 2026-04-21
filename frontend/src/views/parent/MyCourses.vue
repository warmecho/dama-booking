<template>
  <div class="courses-page">
    <van-nav-bar title="我的课程" fixed placeholder />

    <!-- 视图切换 -->
    <van-tabs v-model:active="activeTab" sticky offset-top="46">
      <van-tab title="本周预约">
        <CourseList view="week" />
      </van-tab>
      <van-tab title="本月预约">
        <CourseList view="month" />
      </van-tab>
      <van-tab title="历史统计">
        <CourseStats />
      </van-tab>
    </van-tabs>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import CourseList from './components/CourseList.vue'
import CourseStats from './components/CourseStats.vue'

const activeTab = ref(1)  // 默认进入本月预约
</script>

<style scoped>
.courses-page {
  min-height: 100vh;
  background: #f5f5f5;
}
</style>
