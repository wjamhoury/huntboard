import { useState } from 'react'
import toast from 'react-hot-toast'
import { useJobs, useUpdateJob, useDeleteJob } from '../hooks/useJobs'
import { useResumes } from '../hooks/useResumes'
import { useJobFilters } from '../hooks/useJobFilters'
import ListView from '../components/ListView'
import { JobDetailPanel } from '../components/kanban'
import FilterBar from '../components/FilterBar'

export default function ListPage() {
  const [selectedJob, setSelectedJob] = useState(null)

  // Get filters from URL params
  const { apiParams } = useJobFilters()

  const { data: jobs = [], isLoading } = useJobs(apiParams)
  const { data: resumes = [] } = useResumes()
  const updateJob = useUpdateJob()
  const deleteJob = useDeleteJob()

  const handleUpdateJob = async (id, updates) => {
    try {
      const result = await updateJob.mutateAsync({ id, data: updates })
      if (selectedJob?.id === id) {
        setSelectedJob(result)
      }
    } catch (err) {
      toast.error('Failed to update job')
    }
  }

  const handleDeleteJob = async (id) => {
    try {
      await deleteJob.mutateAsync(id)
      setSelectedJob(null)
      toast.success('Job deleted')
    } catch (err) {
      toast.error('Failed to delete job')
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="p-4 pb-20 md:pb-4">
      {/* Filter Bar */}
      <FilterBar showQuickFilters={true} />

      <ListView
        jobs={jobs}
        onJobClick={setSelectedJob}
        onUpdateJob={handleUpdateJob}
      />

      {selectedJob && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setSelectedJob(null)} />
          <JobDetailPanel
            job={selectedJob}
            onClose={() => setSelectedJob(null)}
            onUpdate={handleUpdateJob}
            onDelete={handleDeleteJob}
            resumes={resumes}
          />
        </>
      )}
    </div>
  )
}
