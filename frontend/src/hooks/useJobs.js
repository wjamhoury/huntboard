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
    // Optimistic update for instant UI feedback
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['jobs'] })

      // Snapshot previous values for all job queries
      const previousQueries = queryClient.getQueriesData({ queryKey: ['jobs'] })

      // Optimistically update jobs in all matching query caches
      queryClient.setQueriesData({ queryKey: ['jobs'] }, (old) => {
        if (!Array.isArray(old)) return old
        return old.map((job) =>
          job.id === id ? { ...job, ...data } : job
        )
      })

      return { previousQueries }
    },
    onError: (error, variables, context) => {
      // Rollback to previous state on error
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
      handleApiError(error)
    },
    onSettled: () => {
      // Refetch after success or error to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
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
