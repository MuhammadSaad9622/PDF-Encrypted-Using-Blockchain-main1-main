import { useState, useEffect } from 'react';
import { Search, Edit, Trash2, Mail, User, Wallet, Calendar, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { adminApi } from '../../utils/api';

interface User {
  id: string;
  email: string;
  name: string;
  walletAddress: string | null;
  createdAt: string;
  updatedAt: string;
  role?: string;
}

interface UserManagementProps {
  onViewUserDetails?: (userId: string) => void;
}

const UserManagement = ({ onViewUserDetails }: UserManagementProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', walletAddress: '' });

  useEffect(() => {
    fetchUsers();
  }, [page, searchQuery]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getAllUsers(page, 10, searchQuery);
      setUsers(response.users || []);
      setTotalPages(response.pagination?.pages || 1);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      if (error.message?.includes('401') || error.message?.includes('403')) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        window.location.href = '/signin';
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      walletAddress: user.walletAddress || ''
    });
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;

    try {
      await adminApi.updateUser(editingUser.id, editForm);
      setEditingUser(null);
      await fetchUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      alert(error.message || 'Failed to update user');
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      await adminApi.deleteUser(userId);
      await fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      alert(error.message || 'Failed to delete user');
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="card-dark">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="input-dark w-full pl-10"
              placeholder="Search by email, name, or wallet address..."
            />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card-dark overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold">User</th>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold">Email</th>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold">Wallet</th>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold">Joined</th>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors"
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-white font-medium">{user.name || 'No name'}</p>
                        {user.role === 'admin' && (
                          <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">
                            Admin
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-300">{user.email}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    {user.walletAddress ? (
                      <div className="flex items-center space-x-2">
                        <Wallet className="h-4 w-4 text-green-400" />
                        <span className="text-green-400 text-sm font-mono">
                          {user.walletAddress.slice(0, 8)}...{user.walletAddress.slice(-6)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-500 text-sm">Not connected</span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-2 text-gray-400 text-sm">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(user.createdAt).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-2">
                      {onViewUserDetails && (
                        <button
                          onClick={() => onViewUserDetails(user.id)}
                          className="p-2 text-purple-400 hover:bg-purple-500/20 rounded-lg transition-colors"
                          title="View user details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(user)}
                        className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                        title="Edit user"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      {user.role !== 'admin' && (
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                          title="Delete user"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800">
            <p className="text-sm text-gray-400">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card-dark max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Edit User</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2">Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="input-dark w-full"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="input-dark w-full"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2">Wallet Address</label>
                <input
                  type="text"
                  value={editForm.walletAddress}
                  onChange={(e) => setEditForm({ ...editForm, walletAddress: e.target.value })}
                  className="input-dark w-full"
                  placeholder="0x..."
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleSaveEdit}
                  className="btn-primary flex-1"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingUser(null)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;

