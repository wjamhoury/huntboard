import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { jobsApi, aiApi, batchApi } from '../services/api'
import { handleApiError } from '../utils/errorHandler'

/**
 * Hook to fetch a single job by ID
 */
export function useJobDetail(id) {
  return useQuery({
    queryKey: ['jobs', id],
    queryFn: async () => {
      const response = await jobsApi.getOne(id)
      return response.data
    },
    enabled: !!id,
  })
}

/**
 * Hook to fetch job activities
 */
export function useJobActivities(id) {
  return useQuery({
    queryKey: ['jobs', id, 'activities'],
    queryFn: async () => {
      const response = await jobsApi.getActivities(id)
      return response.data
    },
    enabled: !!id,
  })
}

/**
 * Hook to update job notes with debouncing support
 */
export function useUpdateJobNotes() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, notes }) => {
      const response = await jobsApi.update(id, { notes })
      return response.data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['jobs', data.id], data)
      queryClient.invalidateQueries({ queryKey: ['jobs', data.id, 'activities'] })
    },
    onError: (error) => handleApiError(error, 'updating notes'),
  })
}

/**
 * Hook to update job status
 */
export function useUpdateJobStatusDetail() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status }) => {
      const response = await jobsApi.updateStatus(id, status)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['jobs', data.id], data)
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      queryClient.invalidateQueries({ queryKey: ['jobs', data.id, 'activities'] })
    },
    onError: (error) => handleApiError(error, 'updating status'),
  })
}

/**
 * Hook to trigger AI scoring for a single job
 */
export function useScoreJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (jobId) => {
      const response = await batchApi.scoreJobs([jobId])
      return response.data
    },
    onSuccess: (_, jobId) => {
      // Invalidate the job to refetch with new score
      queryClient.invalidateQueries({ queryKey: ['jobs', jobId] })
      queryClient.invalidateQueries({ queryKey: ['jobs', jobId, 'activities'] })
    },
    onError: (error) => handleApiError(error, 'scoring job'),
  })
}

/**
 * Hook to get match analysis prompt (for display)
 */
export function useMatchAnalysis(jobId) {
  return useQuery({
    queryKey: ['ai', 'match-analysis', jobId],
    queryFn: async () => {
      const response = await aiApi.getMatchAnalysis(jobId)
      return response.data
    },
    enabled: false, // Only fetch when explicitly requested
  })
}
