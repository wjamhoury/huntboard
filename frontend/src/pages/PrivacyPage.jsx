import { Link } from 'react-router-dom'
import { Briefcase, ArrowLeft } from 'lucide-react'

export default function PrivacyPage() {
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
          <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
          <p className="text-slate-400 mb-8">Last updated: February 2025</p>

          <div className="prose prose-invert prose-slate max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">1. Introduction</h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                HuntBoard ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our job search tracking application.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">2. Information We Collect</h2>
              <p className="text-slate-300 leading-relaxed mb-4">We collect information that you provide directly to us:</p>
              <ul className="list-disc list-inside text-slate-300 space-y-2 mb-4">
                <li><strong className="text-white">Account Information:</strong> Email address, name, and password when you create an account</li>
                <li><strong className="text-white">Resume Data:</strong> Resume files you upload for AI matching, which are stored securely and used only for providing match scores</li>
                <li><strong className="text-white">Job Data:</strong> Information about jobs you track, including job titles, companies, notes, and application status</li>
                <li><strong className="text-white">Usage Data:</strong> Information about how you interact with our service, including features used and preferences set</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">3. How We Use Your Information</h2>
              <p className="text-slate-300 leading-relaxed mb-4">We use the information we collect to:</p>
              <ul className="list-disc list-inside text-slate-300 space-y-2 mb-4">
                <li>Provide, maintain, and improve our services</li>
                <li>Generate AI-powered job match scores based on your resume</li>
                <li>Sync job listings from your configured sources</li>
                <li>Send you service-related communications</li>
                <li>Protect against fraudulent or unauthorized activity</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">4. Data Storage and Security</h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                Your data is stored securely using industry-standard practices:
              </p>
              <ul className="list-disc list-inside text-slate-300 space-y-2 mb-4">
                <li>All data is encrypted in transit using TLS/SSL</li>
                <li>Resumes are stored in secure cloud storage (AWS S3)</li>
                <li>Database access is restricted and monitored</li>
                <li>We do not sell or share your personal data with third parties for marketing purposes</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">5. Third-Party Services</h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                We use the following third-party services to provide our application:
              </p>
              <ul className="list-disc list-inside text-slate-300 space-y-2 mb-4">
                <li><strong className="text-white">AWS (Amazon Web Services):</strong> Cloud infrastructure and storage</li>
                <li><strong className="text-white">Anthropic:</strong> AI services for resume matching and scoring</li>
                <li><strong className="text-white">AWS Cognito:</strong> Authentication services</li>
              </ul>
              <p className="text-slate-300 leading-relaxed">
                These services have their own privacy policies and data handling practices.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">6. Data Retention</h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                We retain your data for as long as your account is active or as needed to provide you services. You can delete your account at any time through the Settings page, which will permanently remove all your data including:
              </p>
              <ul className="list-disc list-inside text-slate-300 space-y-2 mb-4">
                <li>Your user account and profile</li>
                <li>All uploaded resumes</li>
                <li>All tracked jobs and application data</li>
                <li>All configured job sources</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">7. Your Rights</h2>
              <p className="text-slate-300 leading-relaxed mb-4">You have the right to:</p>
              <ul className="list-disc list-inside text-slate-300 space-y-2 mb-4">
                <li>Access and export your data (via the Settings page)</li>
                <li>Update or correct your information</li>
                <li>Delete your account and all associated data</li>
                <li>Object to certain processing of your data</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">8. Children's Privacy</h2>
              <p className="text-slate-300 leading-relaxed">
                HuntBoard is not intended for use by children under 16 years of age. We do not knowingly collect personal information from children under 16.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">9. Changes to This Policy</h2>
              <p className="text-slate-300 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">10. Contact Us</h2>
              <p className="text-slate-300 leading-relaxed">
                If you have any questions about this Privacy Policy, please contact us by opening an issue on our GitHub repository or reaching out through the application.
              </p>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t border-slate-800">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-6 text-sm text-slate-400">
            <Link to="/privacy" className="text-blue-400">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-white transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
