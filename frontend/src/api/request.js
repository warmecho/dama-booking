import axios from 'axios'
import { useUserStore } from '@/stores/user'

const request = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 每次请求时动态获取 token，避免初始化问题
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    const { code, message } = response.data
    if (code !== 200) {
      // 401 特殊处理：跳转到登录页
      if (code === 401) {
        const userStore = useUserStore()
        userStore.logout()
        window.location.href = '/login'
      }
      return Promise.reject({ ...response.data, isApiError: true })
    }
    return response.data
  },
  (error) => {
    // 提取后端返回的错误信息或 HTTP 状态错误
    const status = error.response?.status
    const message = error.response?.data?.message

    let errorMessage
    if (message) {
      // 后端返回了具体错误信息
      errorMessage = message
    } else if (status === 400) {
      errorMessage = '请求参数错误，请检查输入内容'
    } else if (status === 401) {
      errorMessage = '登录已过期，请重新登录'
    } else if (status === 403) {
      errorMessage = '没有权限执行此操作'
    } else if (status === 404) {
      errorMessage = '请求的资源不存在'
    } else if (status === 500) {
      errorMessage = '服务器内部错误，请稍后重试'
    } else if (status === 429) {
      errorMessage = '请求过于频繁，请稍后再试'
    } else if (!navigator.onLine) {
      errorMessage = '网络连接失败，请检查网络'
    } else {
      errorMessage = '网络错误，请稍后重试'
    }

    return Promise.reject({ message: errorMessage, status, isHttpError: true })
  }
)

export default request
