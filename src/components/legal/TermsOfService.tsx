import { Link } from 'react-router-dom';
import { useTheme, getGradientClasses } from '../../utils/theme';

const TermsOfService = () => {
  const { colorScheme } = useTheme();

  return (
    <div className="min-h-screen bg-dark-bg px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="card-dark backdrop-blur-md p-8" style={{ backgroundColor: 'rgba(26, 26, 46, 0.85)' }}>
          <div className="mb-8">
            <h1 className={`text-3xl font-bold bg-gradient-to-r ${getGradientClasses(colorScheme, 'text')} bg-clip-text text-transparent mb-4`}>
              Terms of Service
            </h1>
            <p className="text-gray-400 text-sm">Last updated: {new Date().toLocaleDateString()}</p>
          </div>

          <div className="prose prose-invert max-w-none space-y-6 text-gray-300">
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">1. Acceptance of Terms</h2>
              <p>
                By accessing and using this service, you accept and agree to be bound by the terms and provision of this agreement.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">2. Use License</h2>
              <p>
                Permission is granted to temporarily use this service for personal, non-commercial transitory viewing only.
                This is the grant of a license, not a transfer of title, and under this license you may not:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li>Modify or copy the materials</li>
                <li>Use the materials for any commercial purpose</li>
                <li>Attempt to reverse engineer any software contained in the service</li>
                <li>Remove any copyright or other proprietary notations from the materials</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">3. User Account</h2>
              <p>
                You are responsible for maintaining the confidentiality of your account and password. You agree to accept
                responsibility for all activities that occur under your account.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">4. Blockchain and NFT Services</h2>
              <p>
                Our service utilizes blockchain technology and NFTs for document encryption and management. By using this
                service, you acknowledge and agree to the inherent risks associated with blockchain technology.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">5. Limitation of Liability</h2>
              <p>
                In no event shall the service providers be liable for any damages arising out of the use or inability
                to use the service, even if the service provider has been notified of the possibility of such damage.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">6. Revisions</h2>
              <p>
                The materials appearing on the service could include technical, typographical, or photographic errors.
                We do not warrant that any of the materials on its website are accurate, complete, or current.
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

export default TermsOfService;

