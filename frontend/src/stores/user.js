import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { login as loginApi, getUserInfo } from '@/api/auth'

// 存储键名
const STORAGE_KEYS = {
  TOKEN: 'token',
  USER_INFO: 'userInfo',
  LOGIN_TIME: 'loginTime',
  TOKEN_EXPIRY: 'tokenExpiry'
}

// Token 有效期（7天）
const TOKEN_VALIDITY = 7 * 24 * 60 * 60 * 1000

export const useUserStore = defineStore('user', () => {
  // State
  const token = ref('')
  const userInfo = ref({})
  const loading = ref(false)
  const isReady = ref(false)

  // Getters
  const isLoggedIn = computed(() => {
    if (!token.value) return false
    // 检查token是否过期
    const expiry = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY)
    if (expiry && Date.now() > parseInt(expiry)) {
      return false
    }
    return true
  })
  const isCoach = computed(() => userInfo.value?.role === 'coach')
  const isParent = computed(() => userInfo.value?.role === 'parent')
  const loginDays = computed(() => {
    const loginTime = localStorage.getItem(STORAGE_KEYS.LOGIN_TIME)
    if (!loginTime) return 0
    const days = Math.floor((Date.now() - parseInt(loginTime)) / (24 * 60 * 60 * 1000))
    return days
  })

  // 从存储初始化状态
  function initFromStorage() {
    try {
      const savedToken = localStorage.getItem(STORAGE_KEYS.TOKEN)
      const savedUserInfo = localStorage.getItem(STORAGE_KEYS.USER_INFO)
      const expiry = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY)

      // 检查token是否过期
      if (expiry && Date.now() > parseInt(expiry)) {
        clearStorage()
        isReady.value = true
        return false
      }

      if (savedToken) {
        token.value = savedToken
        if (savedUserInfo) {
          userInfo.value = JSON.parse(savedUserInfo)
        }
        isReady.value = true
        return true
      }
    } catch (error) {
      console.error('初始化登录状态失败:', error)
      clearStorage()
    }
    isReady.value = true
    return false
  }

  // Actions
  async function login(credentials) {
    loading.value = true
    try {
      const res = await loginApi(credentials)
      // 登录成功
      token.value = res.data.token
      userInfo.value = res.data.user

      // 保存到本地存储
      localStorage.setItem(STORAGE_KEYS.TOKEN, res.data.token)
      localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(res.data.user))
      localStorage.setItem(STORAGE_KEYS.LOGIN_TIME, Date.now().toString())
      localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, (Date.now() + TOKEN_VALIDITY).toString())

      return { success: true }
    } catch (error) {
      // 统一错误处理
      return { success: false, message: error.message || '登录失败，请稍后重试' }
    } finally {
      loading.value = false
    }
  }

  async function fetchUserInfo() {
    try {
      const res = await getUserInfo()
      if (res.code === 200) {
        userInfo.value = res.data
        localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(res.data))
      }
    } catch (error) {
      console.error('获取用户信息失败:', error)
      // 如果是401错误，清除登录状态
      if (error.response?.status === 401) {
        logout()
      }
    }
  }

  function clearStorage() {
    token.value = ''
    userInfo.value = {}
    localStorage.removeItem(STORAGE_KEYS.TOKEN)
    localStorage.removeItem(STORAGE_KEYS.USER_INFO)
    localStorage.removeItem(STORAGE_KEYS.LOGIN_TIME)
    localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY)
  }

  function logout() {
    clearStorage()
    // 同时清除sessionStorage
    sessionStorage.clear()
  }

  // 刷新token有效期（用于用户活跃时延长登录）
  function refreshTokenExpiry() {
    if (token.value) {
      localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, (Date.now() + TOKEN_VALIDITY).toString())
    }
  }

  function initAuth() {
    const hasToken = initFromStorage()
    if (hasToken) {
      fetchUserInfo()
    }
  }

  return {
    token,
    userInfo,
    loading,
    isReady,
    isLoggedIn,
    isCoach,
    isParent,
    loginDays,
    login,
    logout,
    fetchUserInfo,
    initAuth,
    refreshTokenExpiry
  }
})
