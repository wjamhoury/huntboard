import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { jobsApi } from '../services/api'
import { handleApiError } from '../utils/errorHandler'

/**
 * Hook to fetch jobs for triage with optional filters
 * Always filters to status="new" and sorts by match_score descending
 * @param {Object} additionalParams - Additional filter params (location, keyword, etc.)
 */
export function useTriageJobs(additionalParams = {}) {
  return useQuery({
    queryKey: ['jobs', 'triage', additionalParams],
    queryFn: async () => {
      // Force status=new for triage, merge with additional filters
      // Remove status from additionalParams if present (triage always uses 'new')
      const { status, ...filters } = additionalParams
      const params = { ...filters, status: 'new', sort: 'score_desc' }
      const { data } = await jobsApi.getAll(params)
      // Sort by ai_score descending (best matches first), nulls last
      // Note: API already sorts, but we double-check here
      return data.sort((a, b) => {
        const scoreA = a.match_score ?? -1
        const scoreB = b.match_score ?? -1
        return scoreB - scoreA
      })
    },
  })
}

export function useNewJobsCount() {
  const { data: jobs } = useTriageJobs()
  return jobs?.length ?? 0
}

export function useUpdateJobStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ jobId, status }) => {
      const { data } = await jobsApi.updateStatus(jobId, status)
      return data
    },
    onMutate: async ({ jobId, status }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['jobs', 'triage'] })
      await queryClient.cancelQueries({ queryKey: ['jobs'] })

      // Snapshot the previous value
      const previousTriageJobs = queryClient.getQueryData(['jobs', 'triage'])

      // Optimistically remove the job from the triage list
      queryClient.setQueryData(['jobs', 'triage'], (old) =>
        old ? old.filter((job) => job.id !== jobId) : []
      )

      return { previousTriageJobs }
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousTriageJobs) {
        queryClient.setQueryData(['jobs', 'triage'], context.previousTriageJobs)
      }
      handleApiError(error, 'update job status')
    },
    onSettled: () => {
      // Invalidate all jobs queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })
}
