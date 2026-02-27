import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { feedsApi } from '../services/api'
import { handleApiError } from '../utils/errorHandler'

export function useFeeds() {
  return useQuery({
    queryKey: ['feeds'],
    queryFn: async () => {
      const response = await feedsApi.getAll()
      return response.data
    },
  })
}

export function useCreateFeed() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data) => {
      const response = await feedsApi.create(data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] })
    },
    onError: (error) => handleApiError(error),
  })
}

export function useRefreshFeeds() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await feedsApi.refresh()
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] })
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
    onError: (error) => handleApiError(error, 'feed-sync'),
  })
}

export function useResetFeeds() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await feedsApi.reset()
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] })
    },
    onError: (error) => handleApiError(error),
  })
}

export function useToggleFeed() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id) => {
      const response = await feedsApi.toggle(id)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] })
    },
    onError: (error) => handleApiError(error),
  })
}

export function useDeleteFeed() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id) => {
      await feedsApi.delete(id)
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] })
    },
    onError: (error) => handleApiError(error),
  })
}
