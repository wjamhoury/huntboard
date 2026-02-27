import { useState, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Briefcase, Upload, FileText, Building2, Rss, Check, ChevronRight,
  ChevronLeft, Loader2, Sparkles, Rocket
} from 'lucide-react'
import { useResumes, useUploadResume } from '../hooks/useResumes'
import { useSourceTemplates, useAddFromTemplate, useMyFeeds } from '../hooks/useSources'
import { usersApi, batchApi } from '../services/api'

const PLATFORM_CONFIG = {
  rss: { icon: Rss, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300', label: 'RSS' },
  greenhouse: { icon: Building2, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', badge: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300', label: 'Greenhouse' },
  workday: { icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300', label: 'Workday' },
  lever: { icon: Building2, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300', label: 'Lever' },
}

function PlatformBadge({ platform }) {
  const config = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.rss
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded ${config.badge}`}>
      {config.label}
    </span>
  )
}

// Step 1: Welcome
function WelcomeStep({ onNext }) {
  return (
    <div className="text-center">
      <div className="w-16 md:w-20 h-16 md:h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
        <Briefcase size={32} className="md:w-10 md:h-10 text-blue-600" />
      </div>
      <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-3 md:mb-4">
        Welcome to HuntBoard
      </h1>
      <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 mb-6 md:mb-8 max-w-md mx-auto">
        HuntBoard helps you track your job search with AI-powered scoring and automated imports from company career pages.
      </p>
      <p className="text-slate-500 dark:text-slate-400 mb-6 md:mb-8 text-sm md:text-base">
        Let's set up your board in 2 minutes
      </p>
      <button
        onClick={onNext}
        className="inline-flex items-center gap-2 px-6 py-3.5 md:py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-base w-full md:w-auto justify-center"
      >
        Get Started
        <ChevronRight size={20} />
      </button>
    </div>
  )
}

// Step 2: Resume Upload
function ResumeStep({ onNext, onSkip }) {
  const fileInputRef = useRef(null)
  const { data: resumes = [], isLoading: resumesLoading } = useResumes()
  const uploadResume = useUploadResume()
  const [uploaded, setUploaded] = useState(false)

  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Only PDF files are allowed')
      return
    }

    try {
      await uploadResume.mutateAsync(file)
      toast.success('Resume uploaded successfully!')
      setUploaded(true)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed')
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const hasResume = resumes.length > 0 || uploaded

  return (
    <div className="text-center">
      <div className="w-14 md:w-16 h-14 md:h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
        <FileText size={28} className="md:w-8 md:h-8 text-purple-600" />
      </div>
      <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-3 md:mb-4">
        Upload Your Resume
      </h2>
      <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 mb-6 md:mb-8 max-w-md mx-auto">
        Your resume helps us score job matches and suggest relevant sources to track.
      </p>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".pdf"
        className="hidden"
      />

      {hasResume ? (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6 max-w-sm mx-auto">
          <div className="flex items-center justify-center gap-3 text-green-700 dark:text-green-300">
            <Check size={24} />
            <span className="font-medium">Resume uploaded!</span>
          </div>
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadResume.isPending}
          className="inline-flex items-center justify-center gap-2 px-6 py-3.5 md:py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors mb-6 disabled:opacity-50 w-full md:w-auto"
        >
          {uploadResume.isPending ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload size={20} />
              Upload PDF Resume
            </>
          )}
        </button>
      )}

      <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-4 mt-6 md:mt-8">
        <button
          onClick={onSkip}
          className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 order-2 md:order-1 py-2"
        >
          Skip for now
        </button>
        <button
          onClick={onNext}
          className="inline-flex items-center justify-center gap-2 px-6 py-3.5 md:py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors order-1 md:order-2 w-full md:w-auto"
        >
          Next
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  )
}

// Step 3: Add Sources
function SourcesStep({ onNext, onBack }) {
  const { data: templatesData, isLoading: templatesLoading } = useSourceTemplates()
  const { data: existingSources = [] } = useMyFeeds()
  const addFromTemplate = useAddFromTemplate()
  const [selectedTemplates, setSelectedTemplates] = useState(new Set())
  const [addedTemplates, setAddedTemplates] = useState(new Set())
  const [isAdding, setIsAdding] = useState(false)

  // Popular default templates to pre-select
  const popularSlugs = ['anthropic', 'openai', 'stripe', 'figma', 'notion', 'linear']

  // Flatten all templates for selection
  const allTemplates = useMemo(() => {
    if (!templatesData?.templates) return []
    const templates = templatesData.templates
    return [
      ...(templates.greenhouse || []).map(t => ({ ...t, platform: 'greenhouse' })),
      ...(templates.lever || []).map(t => ({ ...t, platform: 'lever' })),
      ...(templates.workday || []).map(t => ({ ...t, platform: 'workday' })),
      ...(templates.rss || []).map(t => ({ ...t, platform: 'rss' })),
    ]
  }, [templatesData])

  // Create unique key for template
  const getTemplateKey = (t) => `${t.platform}:${t.slug || t.url}`

  // Check if template is already added (as source)
  const isAlreadyAdded = (template) => {
    return existingSources.some(source => {
      if (template.platform === 'rss') return source.url === template.url
      if (template.platform === 'greenhouse') return source.slug === template.slug
      if (template.platform === 'workday') return source.url === template.url
      if (template.platform === 'lever') return source.slug === template.slug
      return false
    })
  }

  const toggleTemplate = (template) => {
    const key = getTemplateKey(template)
    const newSelected = new Set(selectedTemplates)
    if (newSelected.has(key)) {
      newSelected.delete(key)
    } else {
      newSelected.add(key)
    }
    setSelectedTemplates(newSelected)
  }

  const handleAddSelected = async () => {
    const templatesToAdd = allTemplates.filter(
      t => selectedTemplates.has(getTemplateKey(t)) && !addedTemplates.has(getTemplateKey(t))
    )
    if (templatesToAdd.length === 0) {
      onNext()
      return
    }

    setIsAdding(true)
    const newAdded = new Set(addedTemplates)

    for (const template of templatesToAdd) {
      try {
        await addFromTemplate.mutateAsync(template)
        newAdded.add(getTemplateKey(template))
      } catch (err) {
        toast.error(`Failed to add ${template.name}`)
      }
    }

    setAddedTemplates(newAdded)
    setIsAdding(false)
    toast.success(`Added ${templatesToAdd.length} sources!`)
    onNext()
  }

  // Group templates by category for display
  const groupedTemplates = useMemo(() => {
    return {
      greenhouse: allTemplates.filter(t => t.platform === 'greenhouse').slice(0, 12),
      lever: allTemplates.filter(t => t.platform === 'lever').slice(0, 6),
      workday: allTemplates.filter(t => t.platform === 'workday').slice(0, 6),
      rss: allTemplates.filter(t => t.platform === 'rss').slice(0, 4),
    }
  }, [allTemplates])

  return (
    <div>
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <Building2 size={32} className="text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
          Add Job Sources
        </h2>
        <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
          Select companies to track. HuntBoard will check their career pages daily for new jobs.
        </p>
      </div>

      {templatesLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-slate-400" size={32} />
        </div>
      ) : (
        <div className="space-y-6 max-h-96 overflow-y-auto px-2">
          {Object.entries(groupedTemplates).map(([platform, templates]) => (
            templates.length > 0 && (
              <div key={platform}>
                <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                  {PLATFORM_CONFIG[platform]?.label || platform}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {templates.map((template, index) => {
                    const key = getTemplateKey(template)
                    const isSelected = selectedTemplates.has(key)
                    const alreadyAdded = isAlreadyAdded(template) || addedTemplates.has(key)
                    const config = PLATFORM_CONFIG[template.platform]
                    const Icon = config?.icon || Building2

                    return (
                      <button
                        key={`${key}-${index}`}
                        onClick={() => !alreadyAdded && toggleTemplate(template)}
                        disabled={alreadyAdded}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          alreadyAdded
                            ? 'border-green-300 bg-green-50 dark:bg-green-900/20 cursor-default'
                            : isSelected
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500'
                            : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded flex items-center justify-center ${config?.bg || 'bg-slate-100'}`}>
                            {alreadyAdded ? (
                              <Check size={14} className="text-green-600" />
                            ) : (
                              <Icon size={14} className={config?.color || 'text-slate-500'} />
                            )}
                          </div>
                          <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                            {template.name}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-8 pt-4 border-t border-slate-200 dark:border-slate-700">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ChevronLeft size={20} />
          Back
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {selectedTemplates.size} selected
          </span>
          <button
            onClick={handleAddSelected}
            disabled={isAdding}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {isAdding ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Adding...
              </>
            ) : selectedTemplates.size > 0 ? (
              <>
                Add {selectedTemplates.size} Sources
                <ChevronRight size={20} />
              </>
            ) : (
              <>
                Skip
                <ChevronRight size={20} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// Step 4: Complete
function CompleteStep({ sourceCount, onComplete, isCompleting }) {
  return (
    <div className="text-center">
      <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
        <Sparkles size={40} className="text-green-600" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
        You're All Set!
      </h2>
      {sourceCount > 0 ? (
        <p className="text-slate-600 dark:text-slate-400 mb-4 max-w-md mx-auto">
          You added <span className="font-semibold text-blue-600">{sourceCount} sources</span>. HuntBoard will check these daily for new jobs.
        </p>
      ) : (
        <p className="text-slate-600 dark:text-slate-400 mb-4 max-w-md mx-auto">
          You can add job sources anytime from the Import page.
        </p>
      )}
      <p className="text-slate-500 dark:text-slate-400 mb-8">
        We'll run your first scan now to find matching jobs.
      </p>
      <button
        onClick={onComplete}
        disabled={isCompleting}
        className="inline-flex items-center gap-2 px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors text-lg disabled:opacity-50"
      >
        {isCompleting ? (
          <>
            <Loader2 size={24} className="animate-spin" />
            Starting...
          </>
        ) : (
          <>
            <Rocket size={24} />
            Go to Your Board
          </>
        )}
      </button>
    </div>
  )
}

// Progress indicator
function StepIndicator({ currentStep, totalSteps }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: totalSteps }, (_, i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full transition-colors ${
            i <= currentStep
              ? 'bg-blue-600'
              : 'bg-slate-300 dark:bg-slate-600'
          }`}
        />
      ))}
    </div>
  )
}

export default function OnboardingPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [step, setStep] = useState(0)
  const [isCompleting, setIsCompleting] = useState(false)
  const { data: sources = [] } = useMyFeeds()

  const handleComplete = async () => {
    setIsCompleting(true)
    try {
      // Mark onboarding as complete
      await usersApi.updateMe({ onboarding_complete: true })

      // Trigger initial sync if user has sources
      if (sources.length > 0) {
        try {
          await batchApi.trigger()
          toast.success('First sync started! Jobs will appear shortly.')
        } catch (err) {
          // Ignore sync errors, they can try again later
        }
      }

      // Invalidate user profile cache
      queryClient.invalidateQueries({ queryKey: ['userProfile'] })

      // Redirect to board
      navigate('/board', { replace: true })
    } catch (err) {
      toast.error('Failed to complete setup. Please try again.')
      setIsCompleting(false)
    }
  }

  const nextStep = () => setStep(s => Math.min(s + 1, 3))
  const prevStep = () => setStep(s => Math.max(s - 1, 0))

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-5 md:p-8">
        <StepIndicator currentStep={step} totalSteps={4} />

        {step === 0 && <WelcomeStep onNext={nextStep} />}
        {step === 1 && <ResumeStep onNext={nextStep} onSkip={nextStep} />}
        {step === 2 && <SourcesStep onNext={nextStep} onBack={prevStep} />}
        {step === 3 && (
          <CompleteStep
            sourceCount={sources.length}
            onComplete={handleComplete}
            isCompleting={isCompleting}
          />
        )}
      </div>
    </div>
  )
}
