<template>
  <div class="coach-layout">
    <div class="content-wrapper">
      <router-view />
    </div>

    <van-tabbar fixed route placeholder>
      <van-tabbar-item to="/coach/bookings" icon="orders-o">约课管理</van-tabbar-item>
      <van-tabbar-item to="/coach/schedule" icon="setting-o">课时设置</van-tabbar-item>
      <van-tabbar-item to="/coach/students" icon="user-o">学员管理</van-tabbar-item>
      <van-tabbar-item to="/coach/profile" icon="manager-o">个人信息</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup>
// Layout component for coach pages
</script>

<style scoped>
.coach-layout {
  min-height: 100vh;
  background: #f5f5f5;
}

.content-wrapper {
  padding-bottom: 70px;
}
</style>
