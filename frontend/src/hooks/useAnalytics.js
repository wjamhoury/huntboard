import { useQuery } from '@tanstack/react-query'
import { analyticsApi } from '../services/api'

export function useAnalytics(days = null) {
  return useQuery({
    queryKey: ['analytics', days],
    queryFn: async () => {
      const response = await analyticsApi.get(days)
      return response.data
    },
  })
}
