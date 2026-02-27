import { Link } from 'react-router-dom'
import { Briefcase, ArrowLeft } from 'lucide-react'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <Briefcase className="text-blue-500" size={28} />
              <span className="text-xl font-bold text-white">HuntBoard</span>
            </Link>
            <Link
              to="/"
              className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to home
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
          <p className="text-slate-400 mb-8">Last updated: February 2025</p>

          <div className="prose prose-invert prose-slate max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">1. Acceptance of Terms</h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                By accessing or using HuntBoard ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">2. Description of Service</h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                HuntBoard is a job search tracking application that provides:
              </p>
              <ul className="list-disc list-inside text-slate-300 space-y-2 mb-4">
                <li>Job application tracking via a Kanban board interface</li>
                <li>Automatic job import from company career pages and RSS feeds</li>
                <li>AI-powered job matching based on uploaded resumes</li>
                <li>Swipe-based job triage functionality</li>
                <li>Analytics and reporting on your job search progress</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">3. User Accounts</h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                To use the Service, you must create an account. You agree to:
              </p>
              <ul className="list-disc list-inside text-slate-300 space-y-2 mb-4">
                <li>Provide accurate and complete information when creating your account</li>
                <li>Maintain the security of your password and account</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
                <li>Accept responsibility for all activities that occur under your account</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">4. Acceptable Use</h2>
              <p className="text-slate-300 leading-relaxed mb-4">You agree not to:</p>
              <ul className="list-disc list-inside text-slate-300 space-y-2 mb-4">
                <li>Use the Service for any unlawful purpose</li>
                <li>Attempt to gain unauthorized access to the Service or its systems</li>
                <li>Interfere with or disrupt the Service or servers</li>
                <li>Upload malicious content or viruses</li>
                <li>Scrape or harvest data from the Service</li>
                <li>Use the Service to violate any third party's rights</li>
                <li>Share your account credentials with others</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">5. User Content</h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                You retain ownership of any content you upload to the Service (including resumes and job notes). By uploading content, you grant us a limited license to:
              </p>
              <ul className="list-disc list-inside text-slate-300 space-y-2 mb-4">
                <li>Store and process your content to provide the Service</li>
                <li>Use your resume content to generate AI match scores</li>
                <li>Create backups of your data for disaster recovery</li>
              </ul>
              <p className="text-slate-300 leading-relaxed">
                We will not share your content with third parties except as necessary to provide the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">6. Third-Party Job Sources</h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                The Service imports job listings from third-party sources (company career pages, job boards, RSS feeds). We are not responsible for:
              </p>
              <ul className="list-disc list-inside text-slate-300 space-y-2 mb-4">
                <li>The accuracy or completeness of job listings from external sources</li>
                <li>Changes to job listings or their availability</li>
                <li>Any interactions you have with employers or job platforms</li>
                <li>Hiring decisions made by companies</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">7. AI Features</h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                The Service uses AI to provide job matching and scoring features. You acknowledge that:
              </p>
              <ul className="list-disc list-inside text-slate-300 space-y-2 mb-4">
                <li>AI-generated match scores are estimates and may not perfectly reflect your fit for a job</li>
                <li>AI recommendations should not be the sole factor in your job search decisions</li>
                <li>We continuously improve our AI but cannot guarantee accuracy</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">8. Service Availability</h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                We strive to maintain high availability but do not guarantee uninterrupted access. The Service may be temporarily unavailable due to:
              </p>
              <ul className="list-disc list-inside text-slate-300 space-y-2 mb-4">
                <li>Scheduled maintenance</li>
                <li>Technical issues or outages</li>
                <li>Force majeure events</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">9. Free Service</h2>
              <p className="text-slate-300 leading-relaxed">
                HuntBoard is currently provided free of charge. We reserve the right to introduce paid features or subscription tiers in the future, with reasonable notice to users.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">10. Limitation of Liability</h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, HUNTBOARD AND ITS CREATOR SHALL NOT BE LIABLE FOR:
              </p>
              <ul className="list-disc list-inside text-slate-300 space-y-2 mb-4">
                <li>Any indirect, incidental, special, or consequential damages</li>
                <li>Loss of profits, data, or business opportunities</li>
                <li>Damages arising from your use or inability to use the Service</li>
                <li>Any job-related outcomes or employment decisions</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">11. Disclaimer of Warranties</h2>
              <p className="text-slate-300 leading-relaxed">
                THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">12. Account Termination</h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                You may delete your account at any time through the Settings page. We may also terminate or suspend your account if you violate these Terms or for other reasons at our discretion, with or without notice.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">13. Changes to Terms</h2>
              <p className="text-slate-300 leading-relaxed">
                We may modify these Terms at any time. We will notify you of material changes by posting the updated Terms and changing the "Last updated" date. Your continued use of the Service after changes constitutes acceptance of the new Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">14. Governing Law</h2>
              <p className="text-slate-300 leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to conflict of law principles.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">15. Contact</h2>
              <p className="text-slate-300 leading-relaxed">
                If you have questions about these Terms, please contact us by opening an issue on our GitHub repository or reaching out through the application.
              </p>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t border-slate-800">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-6 text-sm text-slate-400">
            <Link to="/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-blue-400">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
