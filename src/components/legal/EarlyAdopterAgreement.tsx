import { Link } from 'react-router-dom';
import { useTheme, getGradientClasses } from '../../utils/theme';

const EarlyAdopterAgreement = () => {
  const { colorScheme } = useTheme();

  return (
    <div className="min-h-screen bg-dark-bg px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="card-dark backdrop-blur-md p-8" style={{ backgroundColor: 'rgba(26, 26, 46, 0.85)' }}>
          <div className="mb-8">
            <h1 className={`text-3xl font-bold bg-gradient-to-r ${getGradientClasses(colorScheme, 'text')} bg-clip-text text-transparent mb-4`}>
              Early Adopter Access Agreement
            </h1>
            <p className="text-gray-400 text-sm">Last updated: {new Date().toLocaleDateString()}</p>
          </div>

          <div className="prose prose-invert max-w-none space-y-6 text-gray-300">
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">1. Early Access Program</h2>
              <p>
                By agreeing to this Early Adopter Access Agreement, you acknowledge that you are participating in an
                early access program for a service that is still in development. The service may contain bugs, errors,
                and may not function as intended.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">2. Acknowledgment of Risks</h2>
              <p>You acknowledge and agree that:</p>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li>The service is provided "as is" and may not be fully functional</li>
                <li>Data loss or corruption may occur</li>
                <li>The service may be unavailable at times</li>
                <li>Features may change or be removed without notice</li>
                <li>There may be security vulnerabilities</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">3. Feedback and Testing</h2>
              <p>
                As an early adopter, you may be asked to provide feedback, report bugs, and participate in testing.
                Your feedback helps us improve the service. By participating, you grant us the right to use your
                feedback for any purpose without compensation.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">4. Service Limitations</h2>
              <p>
                During the early access period, the service may have limitations including but not limited to:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li>Limited storage capacity</li>
                <li>Reduced feature set</li>
                <li>Potential service interruptions</li>
                <li>Limited customer support</li>
                <li>Changes to pricing or terms</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">5. No Warranty</h2>
              <p>
                THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT
                LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NONINFRINGEMENT.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">6. Limitation of Liability</h2>
              <p>
                IN NO EVENT SHALL WE BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
                PUNITIVE DAMAGES ARISING OUT OF YOUR USE OF OR INABILITY TO USE THE SERVICE, EVEN IF WE HAVE BEEN
                ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">7. Termination</h2>
              <p>
                We reserve the right to terminate or suspend your early access at any time, with or without cause or
                notice. You may also terminate your participation at any time.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">8. Changes to Agreement</h2>
              <p>
                We reserve the right to modify this agreement at any time. Continued use of the service after changes
                constitutes acceptance of the modified agreement.
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

export default EarlyAdopterAgreement;

