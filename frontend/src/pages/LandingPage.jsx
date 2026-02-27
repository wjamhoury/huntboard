import { Link } from 'react-router-dom'
import {
  Briefcase,
  Rss,
  Sparkles,
  Layers,
  LayoutDashboard,
  Upload,
  Building2,
  Target,
  ArrowRight,
  Github
} from 'lucide-react'

function FeatureCard({ icon: Icon, title, description }) {
  return (
    <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-colors">
      <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-blue-400" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
    </div>
  )
}

function StepCard({ number, title, description }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl mb-4">
        {number}
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-slate-400 text-sm">{description}</p>
    </div>
  )
}

function KanbanMockup() {
  const columns = [
    { name: 'New', color: 'bg-slate-500', jobs: ['Senior Engineer', 'Staff SWE'] },
    { name: 'Reviewing', color: 'bg-blue-500', jobs: ['ML Engineer'] },
    { name: 'Applied', color: 'bg-purple-500', jobs: ['Platform Lead', 'Infra Eng'] },
    { name: 'Interview', color: 'bg-amber-500', jobs: ['Eng Manager'] },
  ]

  return (
    <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/50 shadow-2xl">
      <div className="flex gap-3 overflow-x-auto pb-2">
        {columns.map((col) => (
          <div key={col.name} className="min-w-[140px] flex-shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-2 h-2 rounded-full ${col.color}`} />
              <span className="text-xs font-medium text-slate-300">{col.name}</span>
              <span className="text-xs text-slate-500">{col.jobs.length}</span>
            </div>
            <div className="space-y-2">
              {col.jobs.map((job) => (
                <div
                  key={job}
                  className="bg-slate-700/50 rounded-lg p-3 border border-slate-600/50"
                >
                  <div className="text-sm font-medium text-white truncate">{job}</div>
                  <div className="text-xs text-slate-400 mt-1">Tech Company</div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-green-400">92% match</span>
                    <span className="text-xs text-slate-500">Remote</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Briefcase className="text-blue-500" size={28} />
              <span className="text-xl font-bold text-white">HuntBoard</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <Link
                to="/login"
                className="text-slate-300 hover:text-white transition-colors text-sm font-medium px-3 py-2"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4 sm:mb-6">
                Your AI-Powered Job Search{' '}
                <span className="text-blue-500">Command Center</span>
              </h1>
              <p className="text-base sm:text-lg text-slate-400 mb-6 sm:mb-8 leading-relaxed">
                Track applications, auto-import jobs from 60+ companies, and let AI score your best
                matches — all in one place.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 sm:py-3 rounded-lg font-medium transition-colors text-base"
                >
                  Get Started Free
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white px-6 py-3.5 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base"
                >
                  <span className="hidden sm:inline">Already have an account?</span> Log in
                </Link>
              </div>
            </div>
            <div className="lg:pl-8 mt-4 lg:mt-0">
              <KanbanMockup />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-800/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Everything you need to land your next role
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Stop juggling spreadsheets and browser tabs. HuntBoard brings your entire job search into one streamlined workflow.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={Rss}
              title="Auto-Import Jobs"
              description="Connect to Greenhouse, Workday, Lever, and RSS feeds. New jobs appear on your board automatically every night."
            />
            <FeatureCard
              icon={Sparkles}
              title="AI Match Scoring"
              description="Upload your resume and get instant match scores for every job. Focus your energy on the best fits."
            />
            <FeatureCard
              icon={Layers}
              title="Swipe to Triage"
              description="Tinder-style swiping to quickly sort through hundreds of jobs. Keep the good ones, archive the rest."
            />
            <FeatureCard
              icon={LayoutDashboard}
              title="Track Everything"
              description="Kanban board, application tracking, notes, and analytics. Know where every opportunity stands."
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Get started in 3 simple steps
            </h2>
            <p className="text-slate-400">
              From signup to your first scored jobs in under 5 minutes.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              number="1"
              title="Upload your resume"
              description="Drop in your PDF and our AI extracts your skills, experience, and preferences."
            />
            <StepCard
              number="2"
              title="Add your target companies"
              description="Browse our catalog of 60+ companies or add custom career pages and RSS feeds."
            />
            <StepCard
              number="3"
              title="Let HuntBoard work"
              description="We'll sync jobs nightly and score each one against your resume. The best matches rise to the top."
            />
          </div>
        </div>
      </section>

      {/* Companies Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-800/30">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-slate-500 text-sm uppercase tracking-wider mb-6">
            Import jobs from top companies
          </p>
          <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-4">
            {['Anthropic', 'OpenAI', 'Stripe', 'Figma', 'Notion', 'Vercel', 'Linear', 'Supabase'].map((company) => (
              <div key={company} className="flex items-center gap-2 text-slate-400">
                <Building2 className="w-4 h-4" />
                <span className="text-sm font-medium">{company}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl p-8 sm:p-12 border border-slate-700/50">
            <Target className="w-12 h-12 text-blue-500 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to streamline your job search?
            </h2>
            <p className="text-slate-400 mb-8">
              Join HuntBoard today and let AI help you find your next opportunity.
            </p>
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
            >
              <Upload className="w-4 h-4" />
              Get Started Free
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-slate-800">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Briefcase className="text-blue-500" size={24} />
              <span className="text-lg font-semibold text-white">HuntBoard</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-400">
              <Link to="/privacy" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="hover:text-white transition-colors">
                Terms of Service
              </Link>
              <a
                href="https://github.com/williamjamhoury"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-slate-800 text-center">
            <p className="text-slate-500 text-sm">
              Built by William Jamhoury
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
