import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

// 登录页
const Login = () => import('@/views/Login.vue')
const CoachLogin = () => import('@/views/CoachLogin.vue')
const RootLogin = () => import('@/views/RootLogin.vue')

// 家长端
const ParentLayout = () => import('@/views/parent/Layout.vue')
const Booking = () => import('@/views/parent/Booking.vue')
const BookingConfirm = () => import('@/views/parent/BookingConfirm.vue')
const MyCourses = () => import('@/views/parent/MyCourses.vue')
const MyCompetitions = () => import('@/views/parent/MyCompetitions.vue')
const ParentProfile = () => import('@/views/parent/Profile.vue')

// 教练端
const CoachLayout = () => import('@/views/coach/Layout.vue')
const ScheduleSettings = () => import('@/views/coach/ScheduleSettings.vue')
const BookingManage = () => import('@/views/coach/BookingManage.vue')
const StudentManage = () => import('@/views/coach/StudentManage.vue')
const StudentDetail = () => import('@/views/coach/StudentDetail.vue')
const CoachProfile = () => import('@/views/coach/Profile.vue')

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { public: true }
  },
  {
    path: '/coach-login',
    name: 'CoachLogin',
    component: CoachLogin,
    meta: { public: true }
  },
  {
    path: '/root-login',
    name: 'RootLogin',
    component: RootLogin,
    meta: { public: true }
  },
  // 家长端路由
  {
    path: '/parent',
    component: ParentLayout,
    meta: { requiresAuth: true, role: 'parent' },
    children: [
      { path: '', redirect: '/parent/booking' },
      { path: 'booking', name: 'Booking', component: Booking },
      { path: 'booking-confirm', name: 'BookingConfirm', component: BookingConfirm },
      { path: 'courses', name: 'MyCourses', component: MyCourses },
      { path: 'competitions', name: 'MyCompetitions', component: MyCompetitions },
      { path: 'profile', name: 'ParentProfile', component: ParentProfile }
    ]
  },
  // 教练端路由
  {
    path: '/coach',
    component: CoachLayout,
    meta: { requiresAuth: true, role: 'coach' },
    children: [
      { path: '', redirect: '/coach/schedule' },
      { path: 'schedule', name: 'ScheduleSettings', component: ScheduleSettings },
      { path: 'bookings', name: 'BookingManage', component: BookingManage },
      { path: 'students', name: 'StudentManage', component: StudentManage },
      { path: 'students/:phone', name: 'StudentDetail', component: StudentDetail },
      { path: 'profile', name: 'CoachProfile', component: CoachProfile }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()

  if (to.meta.public) {
    next()
    return
  }

  if (to.meta.requiresAuth) {
    if (!userStore.token) {
      next('/login')
      return
    }

    if (to.meta.role && userStore.userInfo.role !== to.meta.role) {
      if (userStore.userInfo.role === 'coach') {
        next('/coach')
      } else {
        next('/parent')
      }
      return
    }
  }

  next()
})

export default router
