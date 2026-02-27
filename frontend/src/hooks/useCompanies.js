import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { companiesApi } from '../services/api'
import { handleApiError } from '../utils/errorHandler'

export function useCompanies() {
  return useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const response = await companiesApi.getAll()
      return response.data
    },
  })
}

export function useCreateCompany() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data) => {
      const response = await companiesApi.create(data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
    },
    onError: (error) => handleApiError(error),
  })
}

export function useRefreshCompanies() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await companiesApi.refresh()
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
    onError: (error) => handleApiError(error, 'feed-sync'),
  })
}

export function useResetCompanies() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await companiesApi.reset()
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
    },
    onError: (error) => handleApiError(error),
  })
}

export function useToggleCompany() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id) => {
      const response = await companiesApi.toggle(id)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
    },
    onError: (error) => handleApiError(error),
  })
}

export function useDeleteCompany() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id) => {
      await companiesApi.delete(id)
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
    },
    onError: (error) => handleApiError(error),
  })
}
