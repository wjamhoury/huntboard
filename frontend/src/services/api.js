import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1'

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to attach auth token
api.interceptors.request.use(
  async (config) => {
    // Import dynamically to avoid circular dependency
    const { fetchAuthSession } = await import('aws-amplify/auth')
    const isDevMode = import.meta.env.VITE_AUTH_DEV_MODE === 'true'

    if (isDevMode) {
      config.headers.Authorization = 'Bearer dev-token'
    } else {
      try {
        const session = await fetchAuthSession()
        const token = session.tokens?.accessToken?.toString()
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
      } catch {
        // No valid session, continue without token
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const isDevMode = import.meta.env.VITE_AUTH_DEV_MODE === 'true'

      // In dev mode, don't redirect
      if (isDevMode) {
        return Promise.reject(error)
      }

      // Try to refresh the session
      try {
        const { fetchAuthSession } = await import('aws-amplify/auth')
        const session = await fetchAuthSession({ forceRefresh: true })
        if (session.tokens?.accessToken) {
          // Retry the original request with new token
          error.config.headers.Authorization = `Bearer ${session.tokens.accessToken.toString()}`
          return api.request(error.config)
        }
      } catch {
        // Session refresh failed
      }

      // Show session expired toast and redirect to login
      // Using setTimeout to ensure toast shows before redirect
      const { default: toast } = await import('react-hot-toast')
      toast.error('Session expired. Please log in again.')

      // Small delay to ensure toast is visible
      setTimeout(() => {
        window.location.href = '/login'
      }, 500)
    }
    return Promise.reject(error)
  }
)

export const jobsApi = {
  getAll: (params = {}) => api.get('/jobs', { params }),
  getOne: (id) => api.get(`/jobs/${id}`),
  create: (data) => api.post('/jobs', data),
  update: (id, data) => api.put(`/jobs/${id}`, data),
  updateStatus: (id, status) => api.patch(`/jobs/${id}/status`, { status }),
  delete: (id) => api.delete(`/jobs/${id}`),
  bulkDelete: (ids) => api.post('/jobs/bulk-delete', { ids }),
  bulkUpdateStatus: (ids, status) => api.patch('/jobs/bulk-status', { ids, status }),
  importFromUrl: (url) => api.post('/jobs/import-url', { url }),
  checkUrlExists: (url) => api.get('/jobs/check-url', { params: { url } }),
  exportMatched: (minScore = 75) => api.get('/jobs/export/matched', { params: { min_score: minScore } }),
  exportCsv: () => api.get('/jobs/export/csv', { responseType: 'blob' }),
  getActivities: (id) => api.get(`/jobs/${id}/activities`),
}

export const resumesApi = {
  getAll: () => api.get('/resumes'),
  getOne: (id) => api.get(`/resumes/${id}`),
  getText: (id) => api.get(`/resumes/${id}/text`),
  upload: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/resumes', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  setPrimary: (id) => api.patch(`/resumes/${id}/primary`),
  delete: (id) => api.delete(`/resumes/${id}`),
}

export const feedsApi = {
  getAll: () => api.get('/feeds'),
  create: (data) => api.post('/feeds', data),
  refresh: () => api.post('/feeds/refresh'),
  reset: () => api.post('/feeds/reset'),
  toggle: (id) => api.patch(`/feeds/${id}/toggle`),
  delete: (id) => api.delete(`/feeds/${id}`),
}

export const aiApi = {
  getCoverLetterPrompt: (jobId, resumeId = null) =>
    api.post('/ai/cover-letter-prompt', { job_id: jobId, resume_id: resumeId }),
  getResumeTailorPrompt: (jobId, resumeId = null) =>
    api.post('/ai/resume-tailor-prompt', { job_id: jobId, resume_id: resumeId }),
  getMatchAnalysis: (jobId) =>
    api.post('/ai/match-analysis', { job_id: jobId }),
}

export const companiesApi = {
  getAll: () => api.get('/companies'),
  create: (data) => api.post('/companies', data),
  refresh: () => api.post('/companies/refresh'),
  reset: () => api.post('/companies/reset'),
  toggle: (id) => api.patch(`/companies/${id}/toggle`),
  delete: (id) => api.delete(`/companies/${id}`),
}

export const analyticsApi = {
  get: (days = null) => api.get('/analytics', { params: days ? { days } : {} }),
}

export const batchApi = {
  trigger: () => api.post('/batch/trigger'),
  status: () => api.get('/batch/status'),
  scoreJobs: (jobIds = null) => api.post('/batch/score-jobs', { job_ids: jobIds }),
  getRuns: (skip = 0, limit = 20) => api.get('/batch/runs', { params: { skip, limit } }),
  getSources: () => api.get('/batch/sources'),
  selectiveSync: (sources, scoreAfter = true) => api.post('/batch/sync', { sources, score_after: scoreAfter }),
  getSchedule: () => api.get('/batch/schedule'),
  updateSchedule: (data) => api.patch('/batch/schedule', data),
}

export const sourcesApi = {
  getTemplates: (search = null) => api.get('/sources/templates', { params: search ? { search } : {} }),
  getSuggestions: () => api.get('/sources/suggestions'),
}

export const usersApi = {
  getMe: () => api.get('/users/me'),
  updateMe: (data) => api.patch('/users/me', data),
  deleteMe: () => api.delete('/users/me'),
}

export const healthApi = {
  check: () => {
    // Health endpoint is at /api/health, not /api/v1/health
    const baseUrl = API_BASE.replace('/v1', '')
    return axios.get(`${baseUrl}/health`, { timeout: 5000 })
  },
}

export default api
