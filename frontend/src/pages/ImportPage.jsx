import { useState, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Rss, Building2, Search, RefreshCw, Loader2,
  Plus, Trash2, Power, PowerOff, X, Check,
  Clock, ChevronDown, ChevronUp, ExternalLink, Sparkles, FileText
} from 'lucide-react'
import {
  useSourceTemplates,
  useSourceSuggestions,
  useMyFeeds,
  useAddFromTemplate,
  useAddCustomSource,
  useToggleSource,
  useDeleteSource,
} from '../hooks/useSources'
import { ConfirmModal } from '../components/ui'
import ResumeManager from '../components/ResumeManager'
import SyncScheduleManager from '../components/SyncScheduleManager'

const PLATFORM_CONFIG = {
  rss: { icon: Rss, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300', label: 'RSS' },
  greenhouse: { icon: Building2, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800', badge: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300', label: 'Greenhouse' },
  workday: { icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300', label: 'Workday' },
  lever: { icon: Building2, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800', badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300', label: 'Lever' },
}

function PlatformBadge({ platform }) {
  const config = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.rss
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded ${config.badge}`}>
      {config.label}
    </span>
  )
}

function formatTimeAgo(dateString) {
  if (!dateString) return 'Never synced'
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

// Section 1: My Active Sources
function MyActiveSources({ sources, onToggle, onDelete, isLoading }) {
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const toggleMutation = useToggleSource()
  const deleteMutation = useDeleteSource()

  const handleToggle = async (source) => {
    try {
      await toggleMutation.mutateAsync({
        type: source.type === 'rss' ? 'rss' : 'company',
        id: source.dbId,
      })
      toast.success(`${source.name} ${source.enabled ? 'disabled' : 'enabled'}`)
    } catch (err) {
      toast.error('Failed to toggle source')
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    setIsDeleting(true)
    try {
      await deleteMutation.mutateAsync({
        type: deleteConfirm.type === 'rss' ? 'rss' : 'company',
        id: deleteConfirm.dbId,
      })
      toast.success(`Removed ${deleteConfirm.name}`)
    } catch (err) {
      toast.error('Failed to remove source')
    } finally {
      setIsDeleting(false)
      setDeleteConfirm(null)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-slate-400" size={24} />
        </div>
      </div>
    )
  }

  const enabledCount = sources.filter(s => s.enabled).length

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <RefreshCw size={20} className="text-blue-600" />
          My Active Sources
          <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
            ({enabledCount} active / {sources.length} total)
          </span>
        </h2>
      </div>

      {sources.length === 0 ? (
        <div className="p-8 text-center">
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
            <Rss size={24} className="text-slate-400" />
          </div>
          <p className="text-slate-600 dark:text-slate-300 font-medium">No job sources yet</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Browse the catalog below or add a custom source to get started.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {sources.map(source => {
            const config = PLATFORM_CONFIG[source.platform] || PLATFORM_CONFIG.rss
            const Icon = config.icon

            return (
              <div
                key={`${source.type}-${source.id}`}
                className={`px-4 py-3 flex items-center justify-between ${
                  source.enabled ? '' : 'opacity-60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.bg}`}>
                    <Icon size={16} className={config.color} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 dark:text-white truncate">
                        {source.name}
                      </span>
                      <PlatformBadge platform={source.platform} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {formatTimeAgo(source.lastSynced)}
                      </span>
                      {source.jobCount > 0 && (
                        <span>{source.jobCount} jobs</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={() => handleToggle(source)}
                    disabled={toggleMutation.isPending}
                    className={`p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${
                      source.enabled ? 'text-green-600' : 'text-slate-400'
                    }`}
                    title={source.enabled ? 'Disable' : 'Enable'}
                  >
                    {source.enabled ? <Power size={16} /> : <PowerOff size={16} />}
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(source)}
                    className="p-1.5 text-slate-400 hover:text-red-500 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    title="Remove"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Remove source?"
        message={`Are you sure you want to remove "${deleteConfirm?.name}"? This will not delete any existing jobs from this source.`}
        confirmText="Remove"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  )
}

// Section: Suggested Sources (based on resume)
function SuggestedSources({ existingSources }) {
  const { data: suggestionsData, isLoading } = useSourceSuggestions()
  const addFromTemplate = useAddFromTemplate()

  // Create a set of already-added source identifiers
  const addedSourceKeys = useMemo(() => {
    const keys = new Set()
    existingSources.forEach(source => {
      if (source.platform === 'rss') {
        keys.add(`rss:${source.url}`)
      } else if (source.platform === 'greenhouse') {
        keys.add(`greenhouse:${source.slug}`)
      } else if (source.platform === 'workday') {
        keys.add(`workday:${source.url}`)
      } else if (source.platform === 'lever') {
        keys.add(`lever:${source.slug}`)
      }
    })
    return keys
  }, [existingSources])

  const isTemplateAdded = (template) => {
    if (template.platform === 'rss') {
      return addedSourceKeys.has(`rss:${template.url}`)
    } else if (template.platform === 'greenhouse') {
      return addedSourceKeys.has(`greenhouse:${template.slug}`)
    } else if (template.platform === 'workday') {
      return addedSourceKeys.has(`workday:${template.url}`)
    } else if (template.platform === 'lever') {
      return addedSourceKeys.has(`lever:${template.slug}`)
    }
    return false
  }

  const handleAddTemplate = async (template) => {
    try {
      await addFromTemplate.mutateAsync(template)
      toast.success(`Added ${template.name} (${PLATFORM_CONFIG[template.platform]?.label || template.platform})`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add source')
    }
  }

  // Don't show section if no resume uploaded
  if (!isLoading && !suggestionsData?.has_resume) {
    return null
  }

  // Don't show section if no suggestions
  if (!isLoading && suggestionsData?.suggestions?.length === 0) {
    return null
  }

  return (
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
      <div className="px-4 py-3 border-b border-purple-200 dark:border-purple-800">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Sparkles size={20} className="text-purple-600" />
          Suggested Sources
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-1.5">
          <FileText size={14} />
          Based on your resume: {suggestionsData?.resume_name}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-purple-400" size={24} />
        </div>
      ) : (
        <div className="divide-y divide-purple-100 dark:divide-purple-800/50">
          {suggestionsData?.suggestions?.map((template, index) => {
            const added = isTemplateAdded(template)
            const config = PLATFORM_CONFIG[template.platform]
            const Icon = config?.icon || Building2

            return (
              <div
                key={`${template.platform}-${template.slug || template.url}-${index}`}
                className="px-4 py-3 flex items-center justify-between hover:bg-purple-100/50 dark:hover:bg-purple-900/30"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config?.bg || 'bg-slate-100'}`}>
                    <Icon size={16} className={config?.color || 'text-slate-500'} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 dark:text-white">
                        {template.name}
                      </span>
                      <PlatformBadge platform={template.platform} />
                    </div>
                    <div className="text-xs text-purple-600 dark:text-purple-400 mt-0.5">
                      Relevance score: {template.relevance_score}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => !added && handleAddTemplate(template)}
                  disabled={added || addFromTemplate.isPending}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    added
                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 cursor-default'
                      : 'bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50'
                  }`}
                >
                  {added ? (
                    <>
                      <Check size={14} />
                      Added
                    </>
                  ) : addFromTemplate.isPending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <>
                      <Plus size={14} />
                      Add
                    </>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Section 2: Source Catalog
function SourceCatalog({ existingSources }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('greenhouse')
  const { data: templatesData, isLoading } = useSourceTemplates()
  const addFromTemplate = useAddFromTemplate()

  // Create a set of already-added source identifiers
  const addedSourceKeys = useMemo(() => {
    const keys = new Set()
    existingSources.forEach(source => {
      if (source.platform === 'rss') {
        keys.add(`rss:${source.url}`)
      } else if (source.platform === 'greenhouse') {
        keys.add(`greenhouse:${source.slug}`)
      } else if (source.platform === 'workday') {
        keys.add(`workday:${source.url}`)
      } else if (source.platform === 'lever') {
        keys.add(`lever:${source.slug}`)
      }
    })
    return keys
  }, [existingSources])

  const isTemplateAdded = (template) => {
    if (template.platform === 'rss') {
      return addedSourceKeys.has(`rss:${template.url}`)
    } else if (template.platform === 'greenhouse') {
      return addedSourceKeys.has(`greenhouse:${template.slug}`)
    } else if (template.platform === 'workday') {
      return addedSourceKeys.has(`workday:${template.url}`)
    } else if (template.platform === 'lever') {
      return addedSourceKeys.has(`lever:${template.slug}`)
    }
    return false
  }

  const handleAddTemplate = async (template) => {
    try {
      await addFromTemplate.mutateAsync(template)
      toast.success(`Added ${template.name} (${PLATFORM_CONFIG[template.platform]?.label || template.platform})`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add source')
    }
  }

  // Filter templates by search
  const filteredTemplates = useMemo(() => {
    if (!templatesData?.templates) return { greenhouse: [], workday: [], lever: [], rss: [] }

    const templates = templatesData.templates
    if (!searchQuery) return templates

    const query = searchQuery.toLowerCase()
    return {
      greenhouse: (templates.greenhouse || []).filter(t =>
        t.name.toLowerCase().includes(query) || t.slug.toLowerCase().includes(query)
      ),
      workday: (templates.workday || []).filter(t =>
        t.name.toLowerCase().includes(query) || t.slug.toLowerCase().includes(query)
      ),
      lever: (templates.lever || []).filter(t =>
        t.name.toLowerCase().includes(query) || t.slug.toLowerCase().includes(query)
      ),
      rss: (templates.rss || []).filter(t =>
        t.name.toLowerCase().includes(query) || t.url.toLowerCase().includes(query)
      ),
    }
  }, [templatesData, searchQuery])

  const tabs = [
    { id: 'greenhouse', label: 'Greenhouse', count: filteredTemplates.greenhouse?.length || 0 },
    { id: 'workday', label: 'Workday', count: filteredTemplates.workday?.length || 0 },
    { id: 'lever', label: 'Lever', count: filteredTemplates.lever?.length || 0 },
    { id: 'rss', label: 'RSS Feeds', count: filteredTemplates.rss?.length || 0 },
  ]

  const currentTemplates = filteredTemplates[activeTab] || []

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Building2 size={20} className="text-purple-600" />
          Source Catalog
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Browse curated job sources and add them to your account
        </p>
      </div>

      {/* Search Bar */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search companies and feeds..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-xs text-slate-400">({tab.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Template List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-slate-400" size={24} />
        </div>
      ) : currentTemplates.length === 0 ? (
        <div className="p-8 text-center text-slate-500 dark:text-slate-400">
          {searchQuery ? 'No templates match your search' : 'No templates available'}
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-96 overflow-y-auto">
          {currentTemplates.map((template, index) => {
            const added = isTemplateAdded(template)
            const config = PLATFORM_CONFIG[template.platform]
            const Icon = config?.icon || Building2

            return (
              <div
                key={`${template.platform}-${template.slug || template.url}-${index}`}
                className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-750"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config?.bg || 'bg-slate-100'}`}>
                    <Icon size={16} className={config?.color || 'text-slate-500'} />
                  </div>
                  <div className="min-w-0">
                    <span className="font-medium text-slate-900 dark:text-white">
                      {template.name}
                    </span>
                    {template.platform === 'rss' && template.category && (
                      <span className="ml-2 text-xs text-slate-400">
                        {template.category.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => !added && handleAddTemplate(template)}
                  disabled={added || addFromTemplate.isPending}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    added
                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 cursor-default'
                      : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50'
                  }`}
                >
                  {added ? (
                    <>
                      <Check size={14} />
                      Added
                    </>
                  ) : addFromTemplate.isPending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <>
                      <Plus size={14} />
                      Add
                    </>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Section 3: Add Custom Source
function AddCustomSource() {
  const [expanded, setExpanded] = useState(false)
  const [sourceType, setSourceType] = useState('greenhouse')
  const [formData, setFormData] = useState({
    companyName: '',
    slug: '',
    url: '',
    feedName: '',
  })
  const [errors, setErrors] = useState({})

  const addCustomSource = useAddCustomSource()

  const validateForm = () => {
    const newErrors = {}

    if (sourceType === 'rss') {
      if (!formData.feedName.trim()) {
        newErrors.feedName = 'Feed name is required'
      }
      if (!formData.url.trim()) {
        newErrors.url = 'URL is required'
      } else {
        try {
          new URL(formData.url)
        } catch {
          newErrors.url = 'Invalid URL format'
        }
      }
    } else if (sourceType === 'greenhouse') {
      if (!formData.companyName.trim()) {
        newErrors.companyName = 'Company name is required'
      }
      if (!formData.slug.trim()) {
        newErrors.slug = 'Board token is required'
      } else if (!/^[a-z0-9-]+$/i.test(formData.slug)) {
        newErrors.slug = 'Board token should only contain letters, numbers, and hyphens'
      }
    } else if (sourceType === 'workday') {
      if (!formData.companyName.trim()) {
        newErrors.companyName = 'Company name is required'
      }
      if (!formData.url.trim()) {
        newErrors.url = 'Workday URL is required'
      } else {
        try {
          const url = new URL(formData.url)
          if (!url.hostname.includes('myworkdayjobs.com')) {
            newErrors.url = 'URL should be a Workday careers URL (*.myworkdayjobs.com)'
          }
        } catch {
          newErrors.url = 'Invalid URL format'
        }
      }
    } else if (sourceType === 'lever') {
      if (!formData.companyName.trim()) {
        newErrors.companyName = 'Company name is required'
      }
      if (!formData.slug.trim()) {
        newErrors.slug = 'Lever slug is required'
      } else if (!/^[a-z0-9-]+$/i.test(formData.slug)) {
        newErrors.slug = 'Lever slug should only contain letters, numbers, and hyphens'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    try {
      if (sourceType === 'rss') {
        await addCustomSource.mutateAsync({
          type: 'rss',
          data: { name: formData.feedName, url: formData.url },
        })
        toast.success(`Added ${formData.feedName} (RSS)`)
      } else if (sourceType === 'greenhouse') {
        await addCustomSource.mutateAsync({
          type: 'greenhouse',
          data: { companyName: formData.companyName, slug: formData.slug },
        })
        toast.success(`Added ${formData.companyName} (Greenhouse)`)
      } else if (sourceType === 'workday') {
        await addCustomSource.mutateAsync({
          type: 'workday',
          data: { companyName: formData.companyName, url: formData.url },
        })
        toast.success(`Added ${formData.companyName} (Workday)`)
      } else if (sourceType === 'lever') {
        await addCustomSource.mutateAsync({
          type: 'lever',
          data: { companyName: formData.companyName, slug: formData.slug },
        })
        toast.success(`Added ${formData.companyName} (Lever)`)
      }

      // Reset form
      setFormData({ companyName: '', slug: '', url: '', feedName: '' })
      setErrors({})
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add source')
    }
  }

  const resetForm = () => {
    setFormData({ companyName: '', slug: '', url: '', feedName: '' })
    setErrors({})
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Plus size={20} className="text-green-600" />
          <span className="font-semibold text-slate-900 dark:text-white">Add Custom Source</span>
        </div>
        {expanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-200 dark:border-slate-700 pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Source Type Selector */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Source Type
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'greenhouse', label: 'Greenhouse', icon: Building2 },
                  { id: 'workday', label: 'Workday', icon: Building2 },
                  { id: 'lever', label: 'Lever', icon: Building2 },
                  { id: 'rss', label: 'RSS Feed', icon: Rss },
                ].map(type => {
                  const Icon = type.icon
                  const config = PLATFORM_CONFIG[type.id]
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => {
                        setSourceType(type.id)
                        resetForm()
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                        sourceType === type.id
                          ? `${config.border} ${config.bg} ${config.color}`
                          : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <Icon size={16} />
                      {type.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* RSS Form */}
            {sourceType === 'rss' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Feed Name
                  </label>
                  <input
                    type="text"
                    value={formData.feedName}
                    onChange={(e) => setFormData({ ...formData, feedName: e.target.value })}
                    placeholder="e.g., Tech Jobs RSS"
                    className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white ${
                      errors.feedName ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'
                    }`}
                  />
                  {errors.feedName && <p className="mt-1 text-xs text-red-500">{errors.feedName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    RSS Feed URL
                  </label>
                  <input
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder="https://example.com/jobs.rss"
                    className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white ${
                      errors.url ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'
                    }`}
                  />
                  {errors.url && <p className="mt-1 text-xs text-red-500">{errors.url}</p>}
                </div>
              </>
            )}

            {/* Greenhouse Form */}
            {sourceType === 'greenhouse' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="e.g., CrowdStrike"
                    className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white ${
                      errors.companyName ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'
                    }`}
                  />
                  {errors.companyName && <p className="mt-1 text-xs text-red-500">{errors.companyName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Board Token
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="e.g., crowdstrike"
                    className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white ${
                      errors.slug ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'
                    }`}
                  />
                  <p className="mt-1 text-xs text-slate-400 flex items-center gap-1">
                    <ExternalLink size={10} />
                    From URL: boards.greenhouse.io/<strong>token</strong>
                  </p>
                  {errors.slug && <p className="mt-1 text-xs text-red-500">{errors.slug}</p>}
                </div>
              </>
            )}

            {/* Workday Form */}
            {sourceType === 'workday' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="e.g., Cisco"
                    className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white ${
                      errors.companyName ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'
                    }`}
                  />
                  {errors.companyName && <p className="mt-1 text-xs text-red-500">{errors.companyName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Workday Careers URL
                  </label>
                  <input
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder="https://cisco.wd5.myworkdayjobs.com/Cisco_Careers"
                    className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white ${
                      errors.url ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'
                    }`}
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    Full URL from company's Workday careers page
                  </p>
                  {errors.url && <p className="mt-1 text-xs text-red-500">{errors.url}</p>}
                </div>
              </>
            )}

            {/* Lever Form */}
            {sourceType === 'lever' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="e.g., Tailscale"
                    className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white ${
                      errors.companyName ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'
                    }`}
                  />
                  {errors.companyName && <p className="mt-1 text-xs text-red-500">{errors.companyName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Lever Slug
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="e.g., tailscale"
                    className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white ${
                      errors.slug ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'
                    }`}
                  />
                  <p className="mt-1 text-xs text-slate-400 flex items-center gap-1">
                    <ExternalLink size={10} />
                    From URL: jobs.lever.co/<strong>slug</strong>
                  </p>
                  {errors.slug && <p className="mt-1 text-xs text-red-500">{errors.slug}</p>}
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={addCustomSource.isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
            >
              {addCustomSource.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Add Source
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

// Main Page Component
export default function ImportPage() {
  const queryClient = useQueryClient()
  const { data: sources, isLoading } = useMyFeeds()

  const handleSyncComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['jobs'] })
    queryClient.invalidateQueries({ queryKey: ['feeds'] })
    queryClient.invalidateQueries({ queryKey: ['companies'] })
  }

  return (
    <div className="p-4 pb-20 md:pb-4 space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Import Sources</h1>

      {/* Section 1: My Active Sources */}
      <MyActiveSources
        sources={sources || []}
        isLoading={isLoading}
      />

      {/* Suggested Sources (based on resume) */}
      <SuggestedSources existingSources={sources || []} />

      {/* Section 2: Source Catalog */}
      <SourceCatalog existingSources={sources || []} />

      {/* Section 3: Add Custom Source */}
      <AddCustomSource />

      {/* Resume Manager */}
      <ResumeManager />

      {/* Sync Schedule Manager */}
      <SyncScheduleManager onSyncComplete={handleSyncComplete} />
    </div>
  )
}
