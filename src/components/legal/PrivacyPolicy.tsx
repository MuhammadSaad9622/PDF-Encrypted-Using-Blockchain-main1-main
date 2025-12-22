import { Link } from 'react-router-dom';
import { useTheme, getGradientClasses } from '../../utils/theme';

const PrivacyPolicy = () => {
  const { colorScheme } = useTheme();

  return (
    <div className="min-h-screen bg-dark-bg px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="card-dark backdrop-blur-md p-8" style={{ backgroundColor: 'rgba(26, 26, 46, 0.85)' }}>
          <div className="mb-8">
            <h1 className={`text-3xl font-bold bg-gradient-to-r ${getGradientClasses(colorScheme, 'text')} bg-clip-text text-transparent mb-4`}>
              Privacy Policy
            </h1>
            <p className="text-gray-400 text-sm">Last updated: {new Date().toLocaleDateString()}</p>
          </div>

          <div className="prose prose-invert max-w-none space-y-6 text-gray-300">
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">1. Information We Collect</h2>
              <p>We collect information that you provide directly to us, including:</p>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li>Name, email address, and contact information</li>
                <li>Profile information and address details</li>
                <li>Payment and billing information</li>
                <li>Documents and files you upload to our service</li>
                <li>Usage data and interaction with our service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">2. How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li>Provide, maintain, and improve our services</li>
                <li>Process transactions and send related information</li>
                <li>Send technical notices and support messages</li>
                <li>Respond to your comments and questions</li>
                <li>Monitor and analyze trends and usage</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">3. Information Sharing</h2>
              <p>
                We do not sell, trade, or rent your personal information to third parties. We may share your information
                only in the following circumstances:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li>With your consent</li>
                <li>To comply with legal obligations</li>
                <li>To protect our rights and safety</li>
                <li>With service providers who assist us in operating our service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">4. Blockchain and Decentralized Storage</h2>
              <p>
                Our service uses blockchain technology and decentralized storage (Arweave) for document encryption and
                management. Information stored on the blockchain is immutable and publicly accessible. By using our
                service, you acknowledge that encrypted documents may be stored on public blockchains.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">5. Data Security</h2>
              <p>
                We implement appropriate technical and organizational measures to protect your personal information.
                However, no method of transmission over the Internet or electronic storage is 100% secure.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">6. Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li>Access your personal information</li>
                <li>Correct inaccurate information</li>
                <li>Request deletion of your information</li>
                <li>Object to processing of your information</li>
                <li>Data portability</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">7. Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy, please contact us through our support channels.
              </p>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-700">
            <Link
              to="/signup"
              className={`inline-flex items-center font-medium bg-gradient-to-r ${getGradientClasses(colorScheme, 'text')} bg-clip-text text-transparent hover:opacity-80`}
            >
              ← Back to Registration
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;

