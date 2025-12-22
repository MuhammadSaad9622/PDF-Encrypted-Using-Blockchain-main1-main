import { useState, useEffect } from 'react';
import { Key, Plus, Edit, Trash2, Search, ChevronLeft, ChevronRight, CheckCircle, XCircle, Calendar, Users, Filter } from 'lucide-react';
import { adminApi } from '../../utils/api';

interface AccessCode {
  id: string;
  code: string;
  isActive: boolean;
  maxUses: number | null;
  usedCount: number;
  remainingUses: number | null;
  expiresAt: string | null;
  description: string;
  subscriptionPlan: string | null;
  subscriptionDuration: number | null;
  createdAt: string;
  updatedAt: string;
}

const AccessCodeManagement = () => {
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCode, setEditingCode] = useState<AccessCode | null>(null);
  
  // Create form state
  const [createForm, setCreateForm] = useState({
    code: '',
    maxUses: '',
    expiresAt: '',
    description: '',
    subscriptionPlan: '',
    subscriptionDuration: ''
  });

  // Edit form state
  const [editForm, setEditForm] = useState({
    isActive: true,
    maxUses: '',
    expiresAt: '',
    description: '',
    subscriptionPlan: '',
    subscriptionDuration: ''
  });

  useEffect(() => {
    fetchAccessCodes();
  }, [page, filterActive]);

  const fetchAccessCodes = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getAccessCodes(page, 20, filterActive);
      setAccessCodes(response.accessCodes || []);
      setTotalPages(response.pagination?.pages || 1);
    } catch (error: any) {
      console.error('Error fetching access codes:', error);
      if (error.message?.includes('401') || error.message?.includes('403')) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        window.location.href = '/signin';
      } else {
        alert(error.message || 'Failed to fetch access codes');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!createForm.code.trim()) {
      alert('Access code is required');
      return;
    }

    try {
      await adminApi.createAccessCode({
        code: createForm.code,
        maxUses: createForm.maxUses ? parseInt(createForm.maxUses) : undefined,
        expiresAt: createForm.expiresAt || undefined,
        description: createForm.description,
        subscriptionPlan: createForm.subscriptionPlan || undefined,
        subscriptionDuration: createForm.subscriptionDuration ? parseInt(createForm.subscriptionDuration) : undefined
      });
      setShowCreateModal(false);
      setCreateForm({ code: '', maxUses: '', expiresAt: '', description: '', subscriptionPlan: '', subscriptionDuration: '' });
      await fetchAccessCodes();
    } catch (error: any) {
      alert(error.message || 'Failed to create access code');
    }
  };

  const handleEdit = (code: AccessCode) => {
    setEditingCode(code);
    setEditForm({
      isActive: code.isActive,
      maxUses: code.maxUses?.toString() || '',
      expiresAt: code.expiresAt ? new Date(code.expiresAt).toISOString().split('T')[0] : '',
      description: code.description,
      subscriptionPlan: code.subscriptionPlan || '',
      subscriptionDuration: code.subscriptionDuration?.toString() || ''
    });
  };

  const handleSaveEdit = async () => {
    if (!editingCode) return;

    try {
      await adminApi.updateAccessCode(editingCode.id, {
        isActive: editForm.isActive,
        maxUses: editForm.maxUses ? parseInt(editForm.maxUses) : undefined,
        expiresAt: editForm.expiresAt || undefined,
        description: editForm.description,
        subscriptionPlan: editForm.subscriptionPlan || undefined,
        subscriptionDuration: editForm.subscriptionDuration ? parseInt(editForm.subscriptionDuration) : undefined
      });
      setEditingCode(null);
      await fetchAccessCodes();
    } catch (error: any) {
      alert(error.message || 'Failed to update access code');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this access code? This action cannot be undone.')) return;

    try {
      await adminApi.deleteAccessCode(id);
      await fetchAccessCodes();
    } catch (error: any) {
      alert(error.message || 'Failed to delete access code');
    }
  };

  const filteredCodes = accessCodes.filter(code =>
    code.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    code.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && accessCodes.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Access Code Management</h2>
          <p className="text-gray-400 text-sm mt-1">Manage registration access codes</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Create Access Code</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="card-dark">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-dark w-full pl-10"
              placeholder="Search by code or description..."
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <button
              onClick={() => setFilterActive(undefined)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterActive === undefined
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterActive(true)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterActive === true
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilterActive(false)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterActive === false
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Inactive
            </button>
          </div>
        </div>
      </div>

      {/* Access Codes Table */}
      <div className="card-dark overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold">Code</th>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold">Status</th>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold">Subscription</th>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold">Usage</th>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold">Expires</th>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold">Description</th>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold">Created</th>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCodes.length > 0 ? (
                filteredCodes.map((code) => (
                  <tr
                    key={code.id}
                    className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        <Key className="h-4 w-4 text-purple-400" />
                        <span className="text-white font-mono font-semibold">{code.code}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        {code.isActive ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-400" />
                            <span className="text-green-400 text-sm font-medium">Active</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 text-red-400" />
                            <span className="text-red-400 text-sm font-medium">Inactive</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {code.subscriptionPlan ? (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-400 capitalize">
                          {code.subscriptionPlan}
                          {code.subscriptionDuration && ` (${code.subscriptionDuration} days)`}
                        </span>
                      ) : (
                        <span className="text-gray-500 text-sm">None</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <div>
                          <span className="text-white font-semibold">{code.usedCount}</span>
                          {code.maxUses !== null && (
                            <span className="text-gray-400"> / {code.maxUses}</span>
                          )}
                          {code.maxUses === null && (
                            <span className="text-gray-400"> / ∞</span>
                          )}
                        </div>
                        {code.remainingUses !== null && (
                          <span className="text-xs text-gray-500">
                            ({code.remainingUses} remaining)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {code.expiresAt ? (
                        <div className="flex items-center space-x-2 text-gray-400 text-sm">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {new Date(code.expiresAt).toLocaleDateString()}
                            {new Date(code.expiresAt) < new Date() && (
                              <span className="text-red-400 ml-2">(Expired)</span>
                            )}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">Never</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-gray-300 text-sm">
                        {code.description || <span className="text-gray-500 italic">No description</span>}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-400 text-sm">
                      {new Date(code.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(code)}
                          className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                          title="Edit access code"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(code.id)}
                          className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                          title="Delete access code"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-400">
                    No access codes found
                  </td>
                </tr>
              )}
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

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card-dark max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Create Access Code</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Access Code <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={createForm.code}
                  onChange={(e) => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })}
                  className="input-dark w-full"
                  placeholder="ABC12345"
                  maxLength={20}
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Max Uses (leave empty for unlimited)
                </label>
                <input
                  type="number"
                  value={createForm.maxUses}
                  onChange={(e) => setCreateForm({ ...createForm, maxUses: e.target.value })}
                  className="input-dark w-full"
                  placeholder="e.g., 100"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Expiration Date (optional)
                </label>
                <input
                  type="date"
                  value={createForm.expiresAt}
                  onChange={(e) => setCreateForm({ ...createForm, expiresAt: e.target.value })}
                  className="input-dark w-full"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Subscription Plan (optional)
                </label>
                <select
                  value={createForm.subscriptionPlan}
                  onChange={(e) => setCreateForm({ ...createForm, subscriptionPlan: e.target.value })}
                  className="input-dark w-full"
                >
                  <option value="">No subscription</option>
                  <option value="basic">Basic</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="lifetime">Lifetime</option>
                </select>
                <p className="text-gray-500 text-xs mt-1">Users registering with this code will receive this subscription</p>
              </div>
              {createForm.subscriptionPlan && createForm.subscriptionPlan !== 'lifetime' && (
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Subscription Duration (days, optional)
                  </label>
                  <input
                    type="number"
                    value={createForm.subscriptionDuration}
                    onChange={(e) => setCreateForm({ ...createForm, subscriptionDuration: e.target.value })}
                    className="input-dark w-full"
                    placeholder="e.g., 30 for monthly, 365 for yearly"
                    min="1"
                  />
                  <p className="text-gray-500 text-xs mt-1">Leave empty to use default duration for the plan</p>
                </div>
              )}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="input-dark w-full"
                  rows={3}
                  placeholder="e.g., Early access for beta testers"
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleCreate}
                  className="btn-primary flex-1"
                >
                  Create Code
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateForm({ code: '', maxUses: '', expiresAt: '', description: '', subscriptionPlan: '', subscriptionDuration: '' });
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingCode && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card-dark max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Edit Access Code: {editingCode.code}</h3>
            <div className="space-y-4">
              <div>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-300 text-sm font-medium">Active</span>
                </label>
                <p className="text-gray-500 text-xs mt-1">Inactive codes cannot be used for registration</p>
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Max Uses (leave empty for unlimited)
                </label>
                <input
                  type="number"
                  value={editForm.maxUses}
                  onChange={(e) => setEditForm({ ...editForm, maxUses: e.target.value })}
                  className="input-dark w-full"
                  placeholder="e.g., 100"
                  min="1"
                />
                <p className="text-gray-500 text-xs mt-1">Current usage: {editingCode.usedCount}</p>
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Expiration Date (optional)
                </label>
                <input
                  type="date"
                  value={editForm.expiresAt}
                  onChange={(e) => setEditForm({ ...editForm, expiresAt: e.target.value })}
                  className="input-dark w-full"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Subscription Plan
                </label>
                <select
                  value={editForm.subscriptionPlan}
                  onChange={(e) => setEditForm({ ...editForm, subscriptionPlan: e.target.value })}
                  className="input-dark w-full"
                >
                  <option value="">No subscription</option>
                  <option value="basic">Basic</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="lifetime">Lifetime</option>
                </select>
              </div>
              {editForm.subscriptionPlan && editForm.subscriptionPlan !== 'lifetime' && (
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Subscription Duration (days, optional)
                  </label>
                  <input
                    type="number"
                    value={editForm.subscriptionDuration}
                    onChange={(e) => setEditForm({ ...editForm, subscriptionDuration: e.target.value })}
                    className="input-dark w-full"
                    placeholder="e.g., 30 for monthly, 365 for yearly"
                    min="1"
                  />
                </div>
              )}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Description
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="input-dark w-full"
                  rows={3}
                  placeholder="Description for this access code"
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
                  onClick={() => setEditingCode(null)}
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

export default AccessCodeManagement;

