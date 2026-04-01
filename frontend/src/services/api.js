import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 120000,
})

api.interceptors.response.use(
  res => res.data,
  err => {
    const msg = err.response?.data?.error || err.message || 'Request failed'
    return Promise.reject(new Error(msg))
  }
)

export const consultationAPI = {
  process: (data) => api.post('/consultation/process', data),

  processAudio: (formData) => api.post('/consultation/process', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  getById: (id) => api.get(`/consultation/${id}`),

  getAll: (page = 1, limit = 10) => api.get(`/consultation?page=${page}&limit=${limit}`),

  getStats: () => api.get('/consultation/stats'),

  delete: (id) => api.delete(`/consultation/${id}`),
}

export default api