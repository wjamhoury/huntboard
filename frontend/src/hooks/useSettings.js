import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi, jobsApi } from '../services/api'
import { handleApiError } from '../utils/errorHandler'
import toast from 'react-hot-toast'

/**
 * Update user profile (name, onboarding_complete, preferences)
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data) => {
      const response = await usersApi.updateMe(data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] })
    },
    onError: (error) => handleApiError(error, 'updating profile'),
  })
}

/**
 * Update user preferences (sort order, auto-archive settings)
 */
export function useUpdatePreferences() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (preferences) => {
      const response = await usersApi.updateMe({ preferences })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] })
      toast.success('Preferences saved')
    },
    onError: (error) => handleApiError(error, 'updating preferences'),
  })
}

/**
 * Reset onboarding to rerun setup wizard
 */
export function useRerunOnboarding() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await usersApi.updateMe({ onboarding_complete: false })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] })
    },
    onError: (error) => handleApiError(error, 'resetting onboarding'),
  })
}

/**
 * Export jobs as CSV
 */
export function useExportJobsCsv() {
  return useMutation({
    mutationFn: async () => {
      const response = await jobsApi.exportCsv()
      return response.data
    },
    onSuccess: (blob) => {
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'huntboard-jobs-export.csv')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Jobs exported successfully')
    },
    onError: (error) => handleApiError(error, 'exporting jobs'),
  })
}

/**
 * Delete all user's jobs
 */
export function useDeleteAllJobs() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      // Get all jobs first, then bulk delete
      const response = await jobsApi.getAll()
      const jobIds = response.data.map(job => job.id)
      if (jobIds.length > 0) {
        await jobsApi.bulkDelete(jobIds)
      }
      return jobIds.length
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      toast.success(`Deleted ${count} jobs`)
    },
    onError: (error) => handleApiError(error, 'deleting jobs'),
  })
}

/**
 * Delete user account and all data
 */
export function useDeleteAccount() {
  return useMutation({
    mutationFn: async () => {
      await usersApi.deleteMe()
    },
    onError: (error) => handleApiError(error, 'deleting account'),
  })
}

/**
 * Update target job titles for AI scoring
 */
export function useUpdateTargetRoles() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (targetJobTitles) => {
      const response = await usersApi.updateMe({ target_job_titles: targetJobTitles })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] })
      toast.success('Target roles saved')
    },
    onError: (error) => handleApiError(error, 'updating target roles'),
  })
}
