import { useState } from 'react';
import { Key, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { adminApi } from '../../utils/api';

const AdminSettings = () => {
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordChanging, setPasswordChanging] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'All fields are required' });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 6 characters long' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordMessage({ type: 'error', text: 'New password must be different from current password' });
      return;
    }

    try {
      setPasswordChanging(true);
      await adminApi.changeAdminPassword(currentPassword, newPassword);
      setPasswordMessage({ type: 'success', text: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setPasswordMessage({ 
        type: 'error', 
        text: error.message || 'Failed to change password. Please try again.' 
      });
    } finally {
      setPasswordChanging(false);
    }
  };


  return (
    <div className="space-y-6">
      {/* Change Password Section */}
      <div className="card-dark">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500">
            <Key className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Change Password</h2>
            <p className="text-gray-400 text-sm">Update your admin account password</p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input-dark w-full pr-10"
                placeholder="Enter current password"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-dark w-full pr-10"
                placeholder="Enter new password (min 6 characters)"
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-dark w-full pr-10"
                placeholder="Confirm new password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {passwordMessage && (
            <div className={`p-4 rounded-lg flex items-start space-x-3 ${
              passwordMessage.type === 'success' 
                ? 'bg-green-500/10 border border-green-500/30' 
                : 'bg-red-500/10 border border-red-500/30'
            }`}>
              {passwordMessage.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <p className={`text-sm ${passwordMessage.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                {passwordMessage.text}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={passwordChanging}
            className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {passwordChanging ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Changing Password...</span>
              </>
            ) : (
              <>
                <Key className="h-5 w-5" />
                <span>Change Password</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminSettings;

