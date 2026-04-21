<template>
  <div class="parent-layout">
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>

    <!-- 底部导航 -->
    <van-tabbar v-model="activeTab" fixed route placeholder>
      <van-tabbar-item to="/parent/booking" icon="calendar-o">约课</van-tabbar-item>
      <van-tabbar-item to="/parent/courses" icon="orders-o">我的课程</van-tabbar-item>
      <van-tabbar-item to="/parent/competitions" icon="medal-o">我的比赛考级</van-tabbar-item>
      <van-tabbar-item to="/parent/profile" icon="user-o">个人信息</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const activeTab = ref(0)

const tabMap = {
  '/parent/booking': 0,
  '/parent/courses': 1,
  '/parent/competitions': 2,
  '/parent/profile': 3
}

watch(() => route.path, (path) => {
  activeTab.value = tabMap[path] || 0
}, { immediate: true })
</script>

<style scoped>
.parent-layout {
  min-height: 100vh;
  padding-bottom: 60px;
  background: #f5f5f5;
}
</style>
