import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { batchApi } from '../services/api'
import { handleApiError } from '../utils/errorHandler'

export function useBatchStatus() {
  return useQuery({
    queryKey: ['batch', 'status'],
    queryFn: async () => {
      const response = await batchApi.status()
      return response.data
    },
    refetchInterval: (query) => {
      // Poll more frequently when a batch is running
      return query.state.data?.is_running ? 2000 : false
    },
  })
}

export function useBatchRuns(skip = 0, limit = 20) {
  return useQuery({
    queryKey: ['batch', 'runs', skip, limit],
    queryFn: async () => {
      const response = await batchApi.getRuns(skip, limit)
      return response.data
    },
  })
}

export function useBatchSources() {
  return useQuery({
    queryKey: ['batch', 'sources'],
    queryFn: async () => {
      const response = await batchApi.getSources()
      return response.data
    },
  })
}

export function useSchedule() {
  return useQuery({
    queryKey: ['batch', 'schedule'],
    queryFn: async () => {
      const response = await batchApi.getSchedule()
      return response.data
    },
  })
}

export function useTriggerSync() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await batchApi.trigger()
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch', 'status'] })
      queryClient.invalidateQueries({ queryKey: ['batch', 'runs'] })
    },
    onError: (error) => handleApiError(error, 'feed-sync'),
  })
}

export function useSelectiveSync() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ sources, scoreAfter = true }) => {
      const response = await batchApi.selectiveSync(sources, scoreAfter)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch', 'status'] })
      queryClient.invalidateQueries({ queryKey: ['batch', 'runs'] })
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
    onError: (error) => handleApiError(error, 'feed-sync'),
  })
}

export function useScoreJobs() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (jobIds = null) => {
      const response = await batchApi.scoreJobs(jobIds)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch', 'status'] })
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
    onError: (error) => handleApiError(error, 'ai-scoring'),
  })
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data) => {
      const response = await batchApi.updateSchedule(data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch', 'schedule'] })
    },
    onError: (error) => handleApiError(error),
  })
}
