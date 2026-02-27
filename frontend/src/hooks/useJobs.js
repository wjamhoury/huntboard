import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { jobsApi } from '../services/api'
import { handleApiError } from '../utils/errorHandler'

/**
 * Hook to fetch jobs with optional filter parameters
 * @param {Object} params - Filter parameters to pass to the API
 * @param {Object} options - Additional React Query options
 */
export function useJobs(params = {}, options = {}) {
  return useQuery({
    queryKey: ['jobs', params],
    queryFn: async () => {
      const response = await jobsApi.getAll(params)
      return response.data
    },
    ...options,
  })
}

/**
 * Hook to fetch jobs with filters from useJobFilters hook
 * This is a convenience wrapper that reads filters from URL params
 */
export function useFilteredJobs() {
  // Import dynamically to avoid circular dependency
  const { useJobFilters } = require('./useJobFilters')
  const { apiParams } = useJobFilters()
  return useJobs(apiParams)
}

export function useJob(id) {
  return useQuery({
    queryKey: ['jobs', id],
    queryFn: async () => {
      const response = await jobsApi.getOne(id)
      return response.data
    },
    enabled: !!id,
  })
}

export function useCreateJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data) => {
      const response = await jobsApi.create(data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
    onError: (error) => handleApiError(error),
  })
}

export function useUpdateJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await jobsApi.update(id, data)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      queryClient.setQueryData(['jobs', data.id], data)
    },
    onError: (error) => handleApiError(error),
  })
}

export function useUpdateJobStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status }) => {
      const response = await jobsApi.updateStatus(id, status)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
    onError: (error) => handleApiError(error),
  })
}

export function useDeleteJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id) => {
      await jobsApi.delete(id)
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
    onError: (error) => handleApiError(error),
  })
}

export function useBulkDeleteJobs() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ids) => {
      await jobsApi.bulkDelete(ids)
      return ids
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
    onError: (error) => handleApiError(error),
  })
}

export function useBulkUpdateJobStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ ids, status }) => {
      await jobsApi.bulkUpdateStatus(ids, status)
      return { ids, status }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
    onError: (error) => handleApiError(error),
  })
}

export function useImportJobFromUrl() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (url) => {
      const response = await jobsApi.importFromUrl(url)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
    onError: (error) => handleApiError(error, 'job-import'),
  })
}
