import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { resumesApi } from '../services/api'
import { handleApiError } from '../utils/errorHandler'

export function useResumes() {
  return useQuery({
    queryKey: ['resumes'],
    queryFn: async () => {
      const response = await resumesApi.getAll()
      return response.data
    },
  })
}

export function useResumeText(id) {
  return useQuery({
    queryKey: ['resumes', id, 'text'],
    queryFn: async () => {
      const response = await resumesApi.getText(id)
      return response.data
    },
    enabled: !!id,
  })
}

export function useUploadResume() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (file) => {
      const response = await resumesApi.upload(file)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] })
    },
    onError: (error) => handleApiError(error, 'resume-upload'),
  })
}

export function useSetPrimaryResume() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id) => {
      const response = await resumesApi.setPrimary(id)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] })
    },
    onError: (error) => handleApiError(error),
  })
}

export function useDeleteResume() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id) => {
      await resumesApi.delete(id)
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] })
    },
    onError: (error) => handleApiError(error),
  })
}
