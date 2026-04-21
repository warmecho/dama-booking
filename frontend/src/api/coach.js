import request from './request'

// ========== 课时设置 ==========

// 获取日历排期
export const getSchedule = (params) => {
  return request.get('/coach/schedule', { params })
}

// 创建排期
export const createSchedule = (data) => {
  return request.post('/coach/schedule', data)
}

// 更新排期
export const updateSchedule = (id, data) => {
  return request.put(`/coach/schedule/${id}`, data)
}

// 删除排期
export const deleteSchedule = (id) => {
  return request.delete(`/coach/schedule/${id}`)
}

// 复制上月计划
export const copyLastMonth = (params) => {
  return request.post('/coach/schedule/copy', null, { params })
}

// ========== 地址管理 ==========

export const getAddresses = () => {
  return request.get('/coach/addresses')
}

export const createAddress = (data) => {
  return request.post('/coach/addresses', data)
}

export const updateAddress = (id, data) => {
  return request.put(`/coach/addresses/${id}`, data)
}

export const deleteAddress = (id) => {
  return request.delete(`/coach/addresses/${id}`)
}

// ========== 预约管理 ==========

// 获取统计数据
export const getStats = (params) => {
  return request.get('/coach/stats', { params })
}

// 获取预约列表
export const getBookings = (params) => {
  return request.get('/coach/bookings', { params })
}

// 确认上课
export const confirmAttendance = (id) => {
  return request.post(`/coach/bookings/${id}/confirm`)
}

// 批量确认上课
export const batchConfirm = (data) => {
  return request.post('/coach/bookings/batch-confirm', data)
}

// 批量取消确认上课
export const batchCancelConfirm = (data) => {
  return request.post('/coach/bookings/batch-cancel-confirm', data)
}

// 修改预约时间
export const updateBookingTime = (id, data) => {
  return request.put(`/coach/bookings/${id}/time`, data)
}

// 修改预约（支持修改时间、类型、地点）
export const updateBooking = (id, data) => {
  return request.put(`/coach/bookings/${id}`, data)
}

// 教练取消/调整预约
export const coachCancelBooking = (id) => {
  return request.delete(`/coach/bookings/${id}`)
}

// ========== 学员管理 ==========

export const getStudents = (params) => {
  return request.get('/coach/students', { params })
}

export const getStudentDetail = (phone) => {
  return request.get(`/coach/students/${phone}`)
}

export const updateStudentHours = (phone, data) => {
  return request.put(`/coach/students/${phone}/hours`, data)
}

export const updateStudentLevel = (phone, data) => {
  return request.put(`/coach/students/${phone}/level`, data)
}

export const resetStudentPassword = (phone) => {
  return request.post(`/coach/students/${phone}/reset-password`)
}

// ========== 教练设置 ==========

export const getCoachSettings = () => {
  return request.get('/coach/settings')
}

export const updateCoachSettings = (data) => {
  return request.put('/coach/settings', data)
}

export const uploadBackground = (file) => {
  const formData = new FormData()
  formData.append('background', file)
  return request.post('/coach/settings/background', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export const uploadCoachBackground = (file) => {
  const formData = new FormData()
  formData.append('background', file)
  return request.post('/coach/settings/coach-background', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}
