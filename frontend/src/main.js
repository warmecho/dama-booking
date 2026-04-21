import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'

// Vant 组件库
import {
  Button,
  NavBar,
  Tabbar,
  TabbarItem,
  Calendar,
  Card,
  Cell,
  CellGroup,
  Field,
  Form,
  Popup,
  Picker,
  DatePicker,
  Dialog,
  Loading,
  Empty,
  SwipeCell,
  Tag,
  Checkbox,
  CheckboxGroup,
  Radio,
  RadioGroup,
  Stepper,
  Image,
  Uploader,
  List,
  PullRefresh,
  Sticky,
  Tabs,
  Tab,
  Search,
  Grid,
  GridItem,
  Icon,
  NoticeBar,
  ActionSheet
} from 'vant'
import { showToast } from 'vant'
import 'vant/lib/index.css'

// 全局样式
import './style.css'

const app = createApp(App)

// 注册 Vant 组件（Toast 是函数，不是组件，需要单独处理）
const components = [
  Button, NavBar, Tabbar, TabbarItem, Calendar, Card, Cell, CellGroup,
  Field, Form, Popup, Picker, DatePicker, Dialog, Loading, Empty, SwipeCell,
  Tag, Checkbox, CheckboxGroup, Radio, RadioGroup, Stepper, Image,
  Uploader, List, PullRefresh, Sticky, Tabs, Tab, Search, Grid, GridItem,
  Icon, NoticeBar, ActionSheet
]

components.forEach(comp => app.use(comp))

app.use(createPinia())
app.use(router)
app.mount('#app')

// ==================== PWA & 微信环境优化 ====================

// 检测是否为微信环境
const isWechat = /MicroMessenger/i.test(navigator.userAgent)
const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)

// 添加环境标记到body
if (isWechat) {
  document.body.classList.add('wechat-env')
}
if (isIOS) {
  document.body.classList.add('ios-env')
}

// PWA Service Worker 注册
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then(registration => {
    console.log('Service Worker 已就绪')

    // 监听更新
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // 有新版本可用
          showToast({
            message: '发现新版本，点击更新',
            position: 'bottom',
            duration: 5000,
            onClick: () => {
              newWorker.postMessage({ type: 'SKIP_WAITING' })
              window.location.reload()
            }
          })
        }
      })
    })
  })

  // 页面可见性变化时检查更新
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      navigator.serviceWorker.ready.then(registration => {
        registration.update()
      })
    }
  })
}

// 微信环境下优化页面滚动
if (isWechat) {
  // 防止微信浏览器下拉刷新与页面滚动冲突
  let startY = 0
  let isScrolling = false

  document.addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY
    isScrolling = false
  }, { passive: true })

  document.addEventListener('touchmove', (e) => {
    const touch = e.touches[0]
    const scrollTop = document.scrollingElement.scrollTop
    const target = e.target.closest('.scroll-container, .van-list, .van-pull-refresh, .van-popup')

    if (!target) {
      // 如果不在可滚动容器内，阻止默认行为
      if (scrollTop <= 0 && touch.clientY > startY) {
        e.preventDefault()
      }
    } else {
      isScrolling = true
    }
  }, { passive: false })

  // iOS微信底部安全区域适配
  if (isIOS) {
    const checkSafeArea = () => {
      const safeAreaBottom = getComputedStyle(document.documentElement).getPropertyValue('--safe-area-bottom') || '0px'
      document.documentElement.style.setProperty('--safe-area-bottom', safeAreaBottom)
    }
    checkSafeArea()
    window.addEventListener('resize', checkSafeArea)
  }
}

// 用户活跃时刷新token有效期
import { useUserStore } from '@/stores/user'
const userStore = useUserStore()

let activityTimer
const resetActivityTimer = () => {
  clearTimeout(activityTimer)
  userStore.refreshTokenExpiry()
  activityTimer = setTimeout(() => {
    // 15分钟无操作后停止刷新
  }, 15 * 60 * 1000)
}

// 监听用户活动
['mousedown', 'keydown', 'touchstart', 'scroll'].forEach(event => {
  document.addEventListener(event, resetActivityTimer, { passive: true })
})
