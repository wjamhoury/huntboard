import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sourcesApi, feedsApi, companiesApi } from '../services/api'
import { handleApiError } from '../utils/errorHandler'

/**
 * Fetch source templates from the catalog (public endpoint, no auth required)
 */
export function useSourceTemplates(search = null) {
  return useQuery({
    queryKey: ['sourceTemplates', search],
    queryFn: async () => {
      const response = await sourcesApi.getTemplates(search)
      return response.data
    },
    staleTime: 5 * 60 * 1000, // Templates don't change often, cache for 5 minutes
  })
}

/**
 * Fetch personalized source suggestions based on user's primary resume
 */
export function useSourceSuggestions() {
  return useQuery({
    queryKey: ['sourceSuggestions'],
    queryFn: async () => {
      const response = await sourcesApi.getSuggestions()
      return response.data
    },
    staleTime: 5 * 60 * 1000, // Suggestions don't change often
  })
}

/**
 * Combine RSS feeds and company feeds into a unified list of user's sources
 */
export function useMyFeeds() {
  const feedsQuery = useQuery({
    queryKey: ['feeds'],
    queryFn: async () => {
      const response = await feedsApi.getAll()
      return response.data
    },
  })

  const companiesQuery = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const response = await companiesApi.getAll()
      return response.data
    },
  })

  // Combine both into a unified format
  const feeds = feedsQuery.data || []
  const companies = companiesQuery.data || []

  const unifiedSources = [
    ...feeds.map(feed => ({
      id: feed.id,
      type: 'rss',
      name: feed.name,
      platform: 'rss',
      enabled: feed.is_active,
      url: feed.url,
      lastSynced: feed.last_fetched,
      jobCount: feed.job_count || 0,
      dbId: feed.id,
    })),
    ...companies.map(company => ({
      id: company.id,
      type: 'company',
      name: company.company_name,
      platform: company.feed_type, // greenhouse, workday, lever
      enabled: company.is_active,
      slug: company.greenhouse_board_token || company.lever_slug,
      url: company.workday_url,
      lastSynced: company.last_fetched,
      jobCount: company.job_count || 0,
      dbId: company.id,
    })),
  ]

  return {
    data: unifiedSources,
    feeds,
    companies,
    isLoading: feedsQuery.isLoading || companiesQuery.isLoading,
    isError: feedsQuery.isError || companiesQuery.isError,
    error: feedsQuery.error || companiesQuery.error,
    refetch: () => {
      feedsQuery.refetch()
      companiesQuery.refetch()
    },
  }
}

/**
 * Add a source from a catalog template
 */
export function useAddFromTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (template) => {
      if (template.platform === 'rss') {
        // RSS feed template
        const response = await feedsApi.create({
          name: template.name,
          url: template.url,
        })
        return response.data
      } else if (template.platform === 'greenhouse') {
        // Greenhouse company template
        const response = await companiesApi.create({
          company_name: template.name,
          feed_type: 'greenhouse',
          greenhouse_board_token: template.slug,
        })
        return response.data
      } else if (template.platform === 'workday') {
        // Workday company template
        const response = await companiesApi.create({
          company_name: template.name,
          feed_type: 'workday',
          workday_url: template.url,
        })
        return response.data
      } else if (template.platform === 'lever') {
        // Lever company template
        const response = await companiesApi.create({
          company_name: template.name,
          feed_type: 'lever',
          lever_slug: template.slug,
        })
        return response.data
      }
      throw new Error(`Unknown platform: ${template.platform}`)
    },
    onSuccess: (_, template) => {
      if (template.platform === 'rss') {
        queryClient.invalidateQueries({ queryKey: ['feeds'] })
      } else {
        queryClient.invalidateQueries({ queryKey: ['companies'] })
      }
    },
    onError: (error) => handleApiError(error),
  })
}

/**
 * Add a custom source (not from template)
 * @param type - 'rss', 'greenhouse', 'workday', or 'lever'
 */
export function useAddCustomSource() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ type, data }) => {
      if (type === 'rss') {
        const response = await feedsApi.create({
          name: data.name,
          url: data.url,
        })
        return response.data
      } else if (type === 'greenhouse') {
        const response = await companiesApi.create({
          company_name: data.companyName,
          feed_type: 'greenhouse',
          greenhouse_board_token: data.slug,
        })
        return response.data
      } else if (type === 'workday') {
        const response = await companiesApi.create({
          company_name: data.companyName,
          feed_type: 'workday',
          workday_url: data.url,
        })
        return response.data
      } else if (type === 'lever') {
        const response = await companiesApi.create({
          company_name: data.companyName,
          feed_type: 'lever',
          lever_slug: data.slug,
        })
        return response.data
      }
      throw new Error(`Unknown type: ${type}`)
    },
    onSuccess: (_, { type }) => {
      if (type === 'rss') {
        queryClient.invalidateQueries({ queryKey: ['feeds'] })
      } else {
        queryClient.invalidateQueries({ queryKey: ['companies'] })
      }
    },
    onError: (error) => handleApiError(error),
  })
}

/**
 * Toggle a source on/off
 */
export function useToggleSource() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ type, id }) => {
      if (type === 'rss') {
        const response = await feedsApi.toggle(id)
        return response.data
      } else {
        const response = await companiesApi.toggle(id)
        return response.data
      }
    },
    onSuccess: (_, { type }) => {
      if (type === 'rss') {
        queryClient.invalidateQueries({ queryKey: ['feeds'] })
      } else {
        queryClient.invalidateQueries({ queryKey: ['companies'] })
      }
    },
    onError: (error) => handleApiError(error),
  })
}

/**
 * Delete a source
 */
export function useDeleteSource() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ type, id }) => {
      if (type === 'rss') {
        await feedsApi.delete(id)
        return id
      } else {
        await companiesApi.delete(id)
        return id
      }
    },
    onSuccess: (_, { type }) => {
      if (type === 'rss') {
        queryClient.invalidateQueries({ queryKey: ['feeds'] })
      } else {
        queryClient.invalidateQueries({ queryKey: ['companies'] })
      }
    },
    onError: (error) => handleApiError(error),
  })
}
