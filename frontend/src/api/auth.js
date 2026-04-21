import request from './request'

export const login = (data) => {
  return request.post('/auth/login', data)
}

export const getUserInfo = () => {
  return request.get('/auth/userinfo')
}

export const updateProfile = (data) => {
  return request.put('/auth/profile', data)
}

export const uploadAvatar = (file) => {
  const formData = new FormData()
  formData.append('avatar', file)
  return request.post('/auth/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export const resetPassword = (data) => {
  return request.post('/auth/reset-password', data)
}

export const rootResetPassword = (data) => {
  return request.post('/auth/root-reset-password', data)
}

export const getCoaches = () => {
  return request.get('/coaches')
}

export const addCoach = (data) => {
  return request.post('/coaches', data)
}
