import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTriageJobs, useUpdateJobStatus } from '../hooks/useTriageJobs'
import { useJobFilters } from '../hooks/useJobFilters'
import { X, Check, Star, Undo2, MapPin, Building2, DollarSign, Loader2, Wifi, ChevronDown, ChevronUp, ExternalLink, Target } from 'lucide-react'
import toast from 'react-hot-toast'
import FilterBar from '../components/FilterBar'
import { getScoreTextClasses, getScoreBadgeClasses } from '../utils/scoreColors'

const SOURCE_COLORS = {
  greenhouse: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  lever: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  workday: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  manual: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  import_url: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  rss: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
}

function SourceBadge({ source }) {
  const colorClass = SOURCE_COLORS[source] || SOURCE_COLORS.manual
  const label = source === 'import_url' ? 'URL Import' : source?.charAt(0).toUpperCase() + source?.slice(1)
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${colorClass}`}>
      {label}
    </span>
  )
}

function MatchScore({ score }) {
  if (score == null) return null

  return (
    <div className="flex items-center gap-3">
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${getScoreBadgeClasses(score)}`}>
        <Target size={18} />
        <span className="text-xl font-bold">{score}%</span>
      </div>
      <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            score >= 80 ? 'bg-green-500' :
            score >= 60 ? 'bg-yellow-500' :
            score >= 40 ? 'bg-orange-500' :
            'bg-red-500'
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  )
}

function formatSalary(min, max) {
  const format = (n) => {
    if (n >= 1000) return `$${Math.round(n / 1000)}k`
    return `$${n}`
  }
  if (min && max) return `${format(min)} - ${format(max)}`
  if (min) return `${format(min)}+`
  if (max) return `Up to ${format(max)}`
  return null
}

function getDescriptionSnippet(description, maxLength = 200) {
  if (!description) return ''
  const cleaned = description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  if (cleaned.length <= maxLength) return cleaned
  return cleaned.substring(0, maxLength).trim() + '...'
}

function SwipeCard({ job, onSwipe, isTop, stackIndex }) {
  const cardRef = useRef(null)
  const contentRef = useRef(null)
  const [dragState, setDragState] = useState({ x: 0, y: 0, isDragging: false })
  const [swipeDirection, setSwipeDirection] = useState(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const startPos = useRef({ x: 0, y: 0 })
  const isScrolling = useRef(false)

  const SWIPE_THRESHOLD = 80 // Reduced for easier mobile swiping
  const SWIPE_UP_THRESHOLD = 60

  const handleDragStart = useCallback((clientX, clientY) => {
    startPos.current = { x: clientX, y: clientY }
    isScrolling.current = false
    setDragState(prev => ({ ...prev, isDragging: true }))
  }, [])

  const handleDragMove = useCallback((clientX, clientY) => {
    if (!dragState.isDragging) return

    const deltaX = clientX - startPos.current.x
    const deltaY = clientY - startPos.current.y

    // Detect if user is scrolling the card content vertically
    if (!isScrolling.current && Math.abs(deltaY) > 10 && Math.abs(deltaY) > Math.abs(deltaX)) {
      // If content is scrollable and user is scrolling down, allow it
      const content = contentRef.current
      if (content && content.scrollHeight > content.clientHeight) {
        const canScrollDown = content.scrollTop < content.scrollHeight - content.clientHeight
        const canScrollUp = content.scrollTop > 0
        if ((deltaY < 0 && canScrollDown) || (deltaY > 0 && canScrollUp)) {
          isScrolling.current = true
          setDragState({ x: 0, y: 0, isDragging: false })
          setSwipeDirection(null)
          return
        }
      }
    }

    if (isScrolling.current) return

    setDragState(prev => ({ ...prev, x: deltaX, y: deltaY }))

    if (deltaY < -SWIPE_UP_THRESHOLD && Math.abs(deltaX) < SWIPE_THRESHOLD) {
      setSwipeDirection('up')
    } else if (deltaX > SWIPE_THRESHOLD) {
      setSwipeDirection('right')
    } else if (deltaX < -SWIPE_THRESHOLD) {
      setSwipeDirection('left')
    } else {
      setSwipeDirection(null)
    }
  }, [dragState.isDragging])

  const handleDragEnd = useCallback(() => {
    if (!dragState.isDragging || isScrolling.current) {
      setDragState({ x: 0, y: 0, isDragging: false })
      setSwipeDirection(null)
      isScrolling.current = false
      return
    }

    const { x, y } = dragState

    if (y < -SWIPE_UP_THRESHOLD && Math.abs(x) < SWIPE_THRESHOLD) {
      onSwipe('up')
    } else if (x > SWIPE_THRESHOLD) {
      onSwipe('right')
    } else if (x < -SWIPE_THRESHOLD) {
      onSwipe('left')
    } else {
      setDragState({ x: 0, y: 0, isDragging: false })
      setSwipeDirection(null)
    }
    isScrolling.current = false
  }, [dragState, onSwipe])

  // Mouse events
  const onMouseDown = (e) => {
    if (!isTop) return
    e.preventDefault()
    handleDragStart(e.clientX, e.clientY)
  }

  useEffect(() => {
    if (!dragState.isDragging) return

    const onMouseMove = (e) => handleDragMove(e.clientX, e.clientY)
    const onMouseUp = () => handleDragEnd()

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [dragState.isDragging, handleDragMove, handleDragEnd])

  // Touch events with improved handling
  const onTouchStart = (e) => {
    if (!isTop) return
    const touch = e.touches[0]
    handleDragStart(touch.clientX, touch.clientY)
  }

  const onTouchMove = (e) => {
    if (!isTop || isScrolling.current) return
    const touch = e.touches[0]
    handleDragMove(touch.clientX, touch.clientY)
    // Prevent page scroll while swiping (but not while scrolling content)
    if (dragState.isDragging && !isScrolling.current && (Math.abs(dragState.x) > 10 || Math.abs(dragState.y) > 10)) {
      e.preventDefault()
    }
  }

  const onTouchEnd = () => handleDragEnd()

  const rotation = dragState.x * 0.05
  const scale = isTop ? 1 : 0.95 - stackIndex * 0.02
  const yOffset = isTop ? dragState.y : stackIndex * 8
  const opacity = isTop ? 1 : 0.7 - stackIndex * 0.2

  const salary = formatSalary(job.salary_min, job.salary_max)

  return (
    <div
      ref={cardRef}
      className={`absolute inset-x-4 md:inset-x-auto md:w-full md:max-w-md mx-auto select-none touch-pan-y ${isTop ? 'cursor-grab active:cursor-grabbing z-30' : ''}`}
      style={{
        transform: `translateX(${isTop ? dragState.x : 0}px) translateY(${yOffset}px) rotate(${isTop ? rotation : 0}deg) scale(${scale})`,
        transition: dragState.isDragging ? 'none' : 'transform 0.3s ease-out',
        opacity,
        zIndex: 30 - stackIndex,
      }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className={`relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden border-2 transition-colors ${
        swipeDirection === 'right' ? 'border-green-500' :
        swipeDirection === 'left' ? 'border-red-500' :
        swipeDirection === 'up' ? 'border-blue-500' :
        'border-transparent'
      }`}>
        {/* Swipe overlays - enhanced with icons and animations */}
        {swipeDirection === 'right' && (
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/30 to-green-500/10 flex items-center justify-center z-10 pointer-events-none animate-pulse">
            <div className="bg-green-500 text-white px-8 py-4 rounded-2xl font-bold text-2xl transform -rotate-12 shadow-lg flex items-center gap-3">
              <Check size={28} strokeWidth={3} />
              KEEP
            </div>
          </div>
        )}
        {swipeDirection === 'left' && (
          <div className="absolute inset-0 bg-gradient-to-l from-red-500/30 to-red-500/10 flex items-center justify-center z-10 pointer-events-none animate-pulse">
            <div className="bg-red-500 text-white px-8 py-4 rounded-2xl font-bold text-2xl transform rotate-12 shadow-lg flex items-center gap-3">
              <X size={28} strokeWidth={3} />
              ARCHIVE
            </div>
          </div>
        )}
        {swipeDirection === 'up' && (
          <div className="absolute inset-0 bg-gradient-to-t from-blue-500/30 to-blue-500/10 flex items-center justify-center z-10 pointer-events-none animate-pulse">
            <div className="bg-blue-500 text-white px-8 py-4 rounded-2xl font-bold text-2xl shadow-lg flex items-center gap-3">
              <Star size={28} strokeWidth={3} />
              SAVE
            </div>
          </div>
        )}

        {/* Card content - scrollable on mobile for long descriptions */}
        <div ref={contentRef} className={`p-5 md:p-6 overflow-y-auto transition-all ${isExpanded ? 'max-h-[70vh]' : 'max-h-[50vh] md:max-h-none'}`}>
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white line-clamp-2">
                {job.title}
              </h2>
              <div className="flex items-center gap-2 mt-1 text-slate-600 dark:text-slate-400">
                <Building2 size={16} className="flex-shrink-0" />
                <span className="font-medium truncate">{job.company}</span>
              </div>
            </div>
            <SourceBadge source={job.source} />
          </div>

          {/* Match score with progress bar */}
          <div className="mb-4">
            <MatchScore score={job.match_score} />
          </div>

          {/* Meta info - enhanced with remote type */}
          <div className="flex flex-wrap gap-2 mb-4 text-sm">
            {job.location && (
              <div className="flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300">
                <MapPin size={14} className="flex-shrink-0" />
                <span className="truncate max-w-[120px]">{job.location}</span>
              </div>
            )}
            {job.remote_type && job.remote_type !== 'unknown' && (
              <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
                <Wifi size={14} className="flex-shrink-0" />
                <span>{job.remote_type === 'remote' ? 'Remote' : job.remote_type === 'hybrid' ? 'Hybrid' : 'On-site'}</span>
              </div>
            )}
            {salary && (
              <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400">
                <DollarSign size={14} className="flex-shrink-0" />
                <span>{salary}</span>
              </div>
            )}
          </div>

          {/* Description with expand/collapse */}
          <div className="relative">
            <p className={`text-sm text-slate-600 dark:text-slate-400 leading-relaxed ${isExpanded ? '' : 'line-clamp-3'}`}>
              {isExpanded ? job.description?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : getDescriptionSnippet(job.description, 200)}
            </p>
            {job.description && job.description.length > 200 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIsExpanded(!isExpanded)
                }}
                className="flex items-center gap-1 mt-2 text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp size={14} />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown size={14} />
                    Read more
                  </>
                )}
              </button>
            )}
          </div>

          {/* View full listing link */}
          {job.url && (
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 mt-3 text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline"
            >
              <ExternalLink size={12} />
              View full listing
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function ActionButton({ onClick, icon: Icon, label, variant, disabled, showPulse }) {
  const variants = {
    archive: 'bg-red-100 hover:bg-red-200 text-red-600 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 active:bg-red-200 dark:active:bg-red-900/60',
    keep: 'bg-green-100 hover:bg-green-200 text-green-600 dark:bg-green-900/30 dark:hover:bg-green-900/50 dark:text-green-400 active:bg-green-200 dark:active:bg-green-900/60',
    save: 'bg-blue-100 hover:bg-blue-200 text-blue-600 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400 active:bg-blue-200 dark:active:bg-blue-900/60',
    undo: 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300',
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative flex flex-col items-center gap-1 p-4 md:p-4 min-w-[72px] min-h-[72px] md:min-w-[64px] md:min-h-[64px] rounded-full transition-all ${variants[variant]} disabled:opacity-50 disabled:cursor-not-allowed active:scale-95`}
      title={label}
    >
      {showPulse && (
        <span className="absolute inset-0 rounded-full animate-ping bg-current opacity-20" />
      )}
      <Icon size={28} strokeWidth={2.5} />
      <span className="text-xs font-semibold">{label}</span>
    </button>
  )
}

function CompletionScreen({ stats, onNavigateToBoard }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-8 px-6 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
      <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mb-4 shadow-lg">
        <Check size={40} className="text-white" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
        All caught up!
      </h2>
      <p className="text-slate-600 dark:text-slate-400 mb-6">
        You reviewed {stats.total} job{stats.total !== 1 ? 's' : ''} in this session
      </p>
      <div className="grid grid-cols-3 gap-3 w-full max-w-sm mb-6">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-100 dark:border-green-800">
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.kept}</div>
          <div className="text-sm text-green-600 dark:text-green-400 font-medium">Kept</div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.saved}</div>
          <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">Saved</div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-100 dark:border-red-800">
          <div className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.archived}</div>
          <div className="text-sm text-red-600 dark:text-red-400 font-medium">Archived</div>
        </div>
      </div>
      <button
        onClick={onNavigateToBoard}
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
      >
        View Your Board
      </button>
    </div>
  )
}

function EmptyState({ onNavigateToSources }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
      <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
        <Star size={40} className="text-slate-400" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
        No new jobs to triage
      </h2>
      <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-sm">
        All caught up! New jobs will appear here when your sources sync.
      </p>
      <button
        onClick={onNavigateToSources}
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
      >
        Add More Sources
      </button>
    </div>
  )
}

export default function TriagePage() {
  const navigate = useNavigate()

  // Get filters from URL params (status is always 'new' for triage)
  const { apiParams, hasActiveFilters } = useJobFilters()

  const { data: jobs, isLoading, error } = useTriageJobs(apiParams)
  const updateStatus = useUpdateJobStatus()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [lastAction, setLastAction] = useState(null)
  const [showUndo, setShowUndo] = useState(false)
  const [stats, setStats] = useState({ total: 0, kept: 0, saved: 0, archived: 0 })
  const [isExiting, setIsExiting] = useState(false)
  const [exitDirection, setExitDirection] = useState(null)

  const undoTimeoutRef = useRef(null)

  // Reset state when jobs change
  useEffect(() => {
    if (jobs?.length) {
      setCurrentIndex(0)
      setStats({ total: 0, kept: 0, saved: 0, archived: 0 })
    }
  }, [jobs?.length])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isLoading || !jobs?.length || currentIndex >= jobs.length) return

      // Prevent default for our shortcuts
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'h', 'l', 'k'].includes(e.key)) {
        e.preventDefault()
      }

      switch (e.key) {
        case 'ArrowRight':
        case 'l':
          handleSwipe('right')
          break
        case 'ArrowLeft':
        case 'h':
          handleSwipe('left')
          break
        case 'ArrowUp':
        case 'k':
          handleSwipe('up')
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isLoading, jobs, currentIndex])

  const handleSwipe = useCallback((direction) => {
    if (!jobs || currentIndex >= jobs.length || isExiting) return

    const job = jobs[currentIndex]
    let newStatus
    let statKey

    switch (direction) {
      case 'right':
        newStatus = 'reviewing'
        statKey = 'kept'
        break
      case 'left':
        newStatus = 'archived'
        statKey = 'archived'
        break
      case 'up':
        newStatus = 'saved'
        statKey = 'saved'
        break
      default:
        return
    }

    // Animate exit
    setExitDirection(direction)
    setIsExiting(true)

    setTimeout(() => {
      // Save last action for undo
      setLastAction({ job, previousStatus: 'new', newStatus, index: currentIndex })

      // Update stats
      setStats(prev => ({
        ...prev,
        total: prev.total + 1,
        [statKey]: prev[statKey] + 1,
      }))

      // Move to next card
      setCurrentIndex(prev => prev + 1)
      setIsExiting(false)
      setExitDirection(null)

      // Show undo button
      setShowUndo(true)
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current)
      undoTimeoutRef.current = setTimeout(() => {
        setShowUndo(false)
        setLastAction(null)
      }, 5000)

      // Update status in backend
      updateStatus.mutate({ jobId: job.id, status: newStatus })

      toast.success(
        direction === 'right' ? 'Moved to Reviewing' :
        direction === 'up' ? 'Saved for later' :
        'Archived',
        { duration: 1500 }
      )
    }, 200)
  }, [jobs, currentIndex, isExiting, updateStatus])

  const handleUndo = useCallback(() => {
    if (!lastAction) return

    // Revert the status
    updateStatus.mutate({ jobId: lastAction.job.id, status: 'new' })

    // Revert stats
    const statKey = lastAction.newStatus === 'reviewing' ? 'kept' :
                    lastAction.newStatus === 'saved' ? 'saved' : 'archived'
    setStats(prev => ({
      ...prev,
      total: prev.total - 1,
      [statKey]: prev[statKey] - 1,
    }))

    // Move back to previous card
    setCurrentIndex(lastAction.index)

    // Clear undo state
    setShowUndo(false)
    setLastAction(null)
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current)

    toast.success('Undone')
  }, [lastAction, updateStatus])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-red-500 mb-2">Failed to load jobs</p>
          <button
            onClick={() => window.location.reload()}
            className="text-blue-500 hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const remainingJobs = jobs ? jobs.slice(currentIndex) : []
  const isComplete = jobs && currentIndex >= jobs.length && stats.total > 0
  const isEmpty = !jobs?.length && stats.total === 0

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 pb-24 md:pb-4 overflow-hidden">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-3 md:mb-4">
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-1">
            Triage
          </h1>
          {jobs && jobs.length > 0 && !isComplete && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {remainingJobs.length} of {jobs.length} jobs remaining
              {hasActiveFilters && ' (filtered)'}
            </p>
          )}
        </div>

        {/* Compact Filter Bar for Triage */}
        <FilterBar showQuickFilters={false} compact={true} />

        {/* Card stack - taller on mobile to use more screen space */}
        <div className="relative h-[55vh] md:h-[420px] mb-4 md:mb-8">
          {isEmpty && <EmptyState onNavigateToSources={() => navigate('/import')} />}
          {isComplete && <CompletionScreen stats={stats} onNavigateToBoard={() => navigate('/board')} />}

          {!isEmpty && !isComplete && remainingJobs.slice(0, 3).map((job, index) => {
            const isTop = index === 0
            return (
              <div
                key={job.id}
                style={{
                  transform: isTop && isExiting ?
                    `translateX(${exitDirection === 'right' ? 500 : exitDirection === 'left' ? -500 : 0}px) translateY(${exitDirection === 'up' ? -500 : 0}px) rotate(${exitDirection === 'right' ? 20 : exitDirection === 'left' ? -20 : 0}deg)` :
                    undefined,
                  transition: isExiting ? 'transform 0.2s ease-out' : undefined,
                  opacity: isTop && isExiting ? 0 : undefined,
                }}
              >
                <SwipeCard
                  job={job}
                  isTop={isTop && !isExiting}
                  stackIndex={index}
                  onSwipe={handleSwipe}
                />
              </div>
            )
          })}
        </div>

        {/* Action buttons - larger spacing on mobile for easier tapping */}
        {!isEmpty && !isComplete && (
          <div className="flex items-center justify-center gap-4 md:gap-6">
            <ActionButton
              icon={X}
              label="Archive"
              variant="archive"
              onClick={() => handleSwipe('left')}
              disabled={isExiting}
            />
            <ActionButton
              icon={Star}
              label="Save"
              variant="save"
              onClick={() => handleSwipe('up')}
              disabled={isExiting}
            />
            <ActionButton
              icon={Check}
              label="Keep"
              variant="keep"
              onClick={() => handleSwipe('right')}
              disabled={isExiting}
            />
          </div>
        )}

        {/* Undo button */}
        {showUndo && (
          <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-50">
            <button
              onClick={handleUndo}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-full shadow-lg hover:bg-slate-700 transition-colors animate-fade-in"
            >
              <Undo2 size={16} />
              <span className="text-sm font-medium">Undo</span>
            </button>
          </div>
        )}

        {/* Keyboard shortcuts hint */}
        <div className="hidden md:block text-center mt-6 text-xs text-slate-400 dark:text-slate-500">
          <span className="inline-flex items-center gap-4">
            <span><kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded">←</kbd> or <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded">H</kbd> Archive</span>
            <span><kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded">↑</kbd> or <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded">K</kbd> Save</span>
            <span><kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded">→</kbd> or <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded">L</kbd> Keep</span>
          </span>
        </div>
      </div>
    </div>
  )
}
