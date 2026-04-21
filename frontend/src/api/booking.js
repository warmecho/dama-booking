import request from './request'

// 获取指定日期和教练的时段
export const getTimeslots = (params) => {
  return request.get('/timeslots', { params })
}

// 创建预约
export const createBooking = (data) => {
  return request.post('/bookings', data)
}

// 取消预约
export const cancelBooking = (id) => {
  return request.delete(`/bookings/${id}`)
}

// 获取我的课程
export const getMyCourses = (params) => {
  return request.get('/bookings/my', { params })
}

// 获取课程统计
export const getCourseStats = () => {
  return request.get('/bookings/stats')
}

// 获取月度统计（历史）
export const getMonthlyStats = () => {
  return request.get('/bookings/monthly-stats')
}
