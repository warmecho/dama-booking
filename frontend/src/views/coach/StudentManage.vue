<template>
  <div class="student-manage-page">
    <van-nav-bar title="学员管理" fixed placeholder />

    <!-- 子页面切换 tabs -->
    <div class="sub-tabs">
      <div
        class="sub-tab"
        :class="{ active: currentTab === 'list' }"
        @click="currentTab = 'list'"
      >
        学员
      </div>
      <div
        class="sub-tab"
        :class="{ active: currentTab === 'level' }"
        @click="currentTab = 'level'"
      >
        考级
      </div>
      <div
        class="sub-tab"
        :class="{ active: currentTab === 'competition' }"
        @click="currentTab = 'competition'"
      >
        比赛
      </div>
    </div>

    <!-- 子页面内容 -->
    <div class="tab-content">
      <StudentList v-if="currentTab === 'list'" />
      <LevelTestPage v-else-if="currentTab === 'level'" />
      <CompetitionPage v-else />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import StudentList from './StudentList.vue'
import LevelTestPage from './LevelTestPage.vue'
import CompetitionPage from './CompetitionPage.vue'

const currentTab = ref('list')
</script>

<style scoped>
.student-manage-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.sub-tabs {
  display: flex;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  position: sticky;
  top: 46px;
  z-index: 99;
}

.sub-tab {
  flex: 1;
  text-align: center;
  padding: 14px 0;
  font-size: 15px;
  color: #666;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
}

.sub-tab.active {
  color: #000;
  font-weight: 600;
}

.sub-tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 3px;
  background: #000;
  border-radius: 2px;
}

.tab-content {
  padding-top: 8px;
}
</style>
