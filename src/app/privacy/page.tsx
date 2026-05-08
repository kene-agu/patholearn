import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "PathoLearn's privacy policy. Learn how we collect, use, and protect your data.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto prose dark:prose-invert">
        <h1>Privacy Policy</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">Last updated: May 8, 2026</p>

        <h2>Introduction</h2>
        <p>
          PathoLearn ("we," "us," "our," or "Company") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and mobile application, including any other media form, media channel, mobile website, or mobile application relating or connected thereto (collectively, the "Site").
        </p>
        <p>
          <strong>Please read this Privacy Policy carefully.</strong> If you do not agree with our policies and practices, please do not use our Site.
        </p>

        <h2>1. Information We Collect</h2>

        <h3>1.1 Information You Provide Directly</h3>
        <ul>
          <li>
            <strong>Account Registration:</strong> Email address, full name, and password when you create an account
          </li>
          <li>
            <strong>Uploads:</strong> Histopathology slides and images you upload for analysis
          </li>
          <li>
            <strong>Activity Data:</strong> Your quiz answers, flashcard reviews, notes, and annotations
          </li>
          <li>
            <strong>Payment Information:</strong> Billing details (processed by Flutterwave; we do not store credit card numbers)
          </li>
          <li>
            <strong>Communication:</strong> Feedback, support tickets, and survey responses
          </li>
        </ul>

        <h3>1.2 Information Collected Automatically</h3>
        <ul>
          <li>
            <strong>Device Information:</strong> Device type, operating system, browser type, IP address, and device identifiers
          </li>
          <li>
            <strong>Usage Data:</strong> Pages viewed, time spent, clicks, features used, and interactions with content
          </li>
          <li>
            <strong>Location Data:</strong> Approximate location based on IP address (not precise GPS)
          </li>
          <li>
            <strong>Cookies & Analytics:</strong> Vercel Analytics and browser cookies for site performance and user experience
          </li>
        </ul>

        <h3>1.3 Third-Party Information</h3>
        <p>If you sign in with Google OAuth, we receive your Google account email and name.</p>

        <h2>2. How We Use Your Information</h2>
        <p>We use collected information for:</p>
        <ul>
          <li>Creating and managing your account</li>
          <li>Providing AI-powered slide analysis and learning features</li>
          <li>Processing subscriptions and payments</li>
          <li>Tracking your progress and study history</li>
          <li>Improving our Site and features</li>
          <li>Sending transactional emails (receipts, password resets, trial expiry reminders)</li>
          <li>Responding to support requests</li>
          <li>Complying with legal obligations</li>
          <li>Preventing fraud and ensuring security</li>
        </ul>
        <p>
          <strong>We do NOT use your email for marketing or promotional content without explicit consent.</strong>
        </p>

        <h2>3. Data Sharing & Third-Party Services</h2>
        <p>We share data with the following third parties:</p>
        <ul>
          <li>
            <strong>Supabase:</strong> Stores your account data, slides, quiz answers, and flashcard reviews. Supabase uses industry-standard encryption and security practices.
          </li>
          <li>
            <strong>Flutterwave:</strong> Processes payments. We never store your credit card details. Your payment data is handled by Flutterwave's secure payment gateway.
          </li>
          <li>
            <strong>Vercel:</strong> Hosts our Site. Your interactions with the Site generate analytics data processed by Vercel Analytics.
          </li>
          <li>
            <strong>OpenAI / Claude API:</strong> Your slide images and quiz data are sent to AI models to generate analyses. We only send the minimum data necessary for AI analysis.
          </li>
        </ul>
        <p>
          <strong>We do not sell your personal data to third parties.</strong> We do not share your data with advertisers, data brokers, or marketing companies.
        </p>

        <h2>4. Data Security</h2>
        <p>We implement industry-standard security measures:</p>
        <ul>
          <li>HTTPS encryption for all data in transit</li>
          <li>Password hashing and secure authentication</li>
          <li>Access controls limiting employee data access</li>
          <li>Regular security monitoring</li>
        </ul>
        <p>
          <strong>No method of transmission over the internet is 100% secure.</strong> While we strive to protect your personal data, we cannot guarantee absolute security. You use the Site at your own risk.
        </p>

        <h2>5. Data Retention</h2>
        <ul>
          <li>
            <strong>Active Accounts:</strong> Your data is retained as long as your account is active
          </li>
          <li>
            <strong>Deleted Accounts:</strong> Upon account deletion, personal data is removed within 30 days. Anonymized usage data may be retained for analytics.
          </li>
          <li>
            <strong>Payment Records:</strong> Retained for 7 years for tax and legal compliance
          </li>
          <li>
            <strong>Backups:</strong> Data may exist in backups for up to 90 days
          </li>
        </ul>

        <h2>6. Your Rights (GDPR & CCPA)</h2>
        <p>Depending on your location, you may have the following rights:</p>
        <ul>
          <li>
            <strong>Right to Access:</strong> Request a copy of your personal data
          </li>
          <li>
            <strong>Right to Correction:</strong> Update or correct inaccurate data
          </li>
          <li>
            <strong>Right to Deletion:</strong> Request deletion of your account and personal data
          </li>
          <li>
            <strong>Right to Portability:</strong> Request your data in a portable format
          </li>
          <li>
            <strong>Right to Opt-Out:</strong> Opt out of analytics and non-essential cookies
          </li>
        </ul>
        <p>
          To exercise these rights, email <strong>support@getpatholearn.com</strong> with your request.
        </p>

        <h2>7. Cookies & Tracking</h2>
        <p>
          PathoLearn uses cookies for:
        </p>
        <ul>
          <li>Session management (keeping you logged in)</li>
          <li>Site analytics (Vercel Analytics)</li>
          <li>Dark mode preference</li>
          <li>iOS install prompt dismissal</li>
        </ul>
        <p>
          You can disable cookies in your browser settings, but this may affect Site functionality.
        </p>

        <h2>8. Children's Privacy</h2>
        <p>
          PathoLearn is intended for medical students and healthcare professionals (ages 18+). We do not knowingly collect data from children under 13. If we become aware of such collection, we will delete the data immediately. If you believe we have collected a child's data, email <strong>support@getpatholearn.com</strong>.
        </p>

        <h2>9. Educational Use & Disclaimer</h2>
        <p>
          <strong>PathoLearn is for educational purposes only and not for clinical diagnosis.</strong> Your uploaded slides and analyses should not be used for clinical decision-making. We are not liable for any clinical decisions made based on PathoLearn content.
        </p>

        <h2>10. International Data Transfers</h2>
        <p>
          Your data is processed and stored on servers in the United States (via Supabase and Vercel). By using PathoLearn, you consent to the transfer of your data to the US, which may have different data protection laws than your country.
        </p>

        <h2>11. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of material changes by updating the "Last updated" date and, if significant, by email. Continued use of the Site after changes constitutes acceptance of the updated policy.
        </p>

        <h2>12. Contact Us</h2>
        <p>For privacy questions, data requests, or concerns, please contact:</p>
        <p>
          <strong>Email:</strong> support@getpatholearn.com<br />
          <strong>Website:</strong> www.getpatholearn.com
        </p>
        <p>
          We will respond to privacy requests within 30 days.
        </p>

        <hr />
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-8">
          This Privacy Policy is provided for informational purposes. It is not legal advice. For specific legal compliance questions (GDPR, CCPA, HIPAA), consult with a privacy attorney.
        </p>
      </div>
    </div>
  );
}
