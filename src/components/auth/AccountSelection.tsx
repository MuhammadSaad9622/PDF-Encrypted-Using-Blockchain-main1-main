import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, User, ArrowRight } from 'lucide-react';
import { useTheme, getGradientClasses } from '../../utils/theme';

interface AccountSelectionProps {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  token: string;
}

const AccountSelection = ({ user, token }: AccountSelectionProps) => {
  const navigate = useNavigate();
  const { colorScheme } = useTheme();

  const handleSelectAdmin = () => {
    localStorage.setItem('adminToken', token);
    localStorage.setItem('adminUser', JSON.stringify(user));
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    navigate('/admin/dashboard');
  };

  const handleSelectUser = () => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg px-4 relative overflow-hidden">
      <div className="card-dark max-w-2xl w-full relative z-10">
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r ${getGradientClasses(colorScheme, 'bg')} rounded-full mb-4`}>
            <Shield className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome, {user.name || user.email.split('@')[0]}!</h1>
          <p className="text-gray-400">You have access to both admin and user accounts. Please choose which panel you'd like to access:</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Admin Panel Option */}
          <button
            onClick={handleSelectAdmin}
            className={`card-dark p-8 text-left hover:scale-105 transition-transform border-2 border-purple-500/30 hover:border-purple-500 cursor-pointer group ${getGradientClasses(colorScheme, 'border')}`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-4 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 ${getGradientClasses(colorScheme, 'bg')}`}>
                <Shield className="h-8 w-8 text-white" />
              </div>
              <ArrowRight className="h-6 w-6 text-gray-400 group-hover:text-purple-400 transition-colors" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Admin Panel</h3>
            <p className="text-gray-400 text-sm mb-4">
              Access the admin dashboard to manage users, invoices, analytics, and system settings.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs font-semibold">
                User Management
              </span>
              <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs font-semibold">
                Analytics
              </span>
              <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs font-semibold">
                Settings
              </span>
            </div>
          </button>

          {/* User Panel Option */}
          <button
            onClick={handleSelectUser}
            className={`card-dark p-8 text-left hover:scale-105 transition-transform border-2 border-blue-500/30 hover:border-blue-500 cursor-pointer group ${getGradientClasses(colorScheme, 'border')}`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-4 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500">
                <User className="h-8 w-8 text-white" />
              </div>
              <ArrowRight className="h-6 w-6 text-gray-400 group-hover:text-blue-400 transition-colors" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">User Dashboard</h3>
            <p className="text-gray-400 text-sm mb-4">
              Access your personal dashboard to upload PDFs, view your NFTs, manage subscriptions, and more.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-semibold">
                Upload PDFs
              </span>
              <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-semibold">
                My NFTs
              </span>
              <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-semibold">
                Subscription
              </span>
            </div>
          </button>
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            You can switch between panels at any time by logging out and signing in again.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AccountSelection;

