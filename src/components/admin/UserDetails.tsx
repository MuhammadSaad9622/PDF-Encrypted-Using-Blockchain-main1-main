import { useState, useEffect } from 'react';
import { User, FileText, Wallet, ArrowLeft, ExternalLink, CheckCircle, Key, Users, Shield, XCircle, Edit2, Save, X, AlertTriangle, MessageSquare } from 'lucide-react';
import { adminApi } from '../../utils/api';

interface UserDetailsProps {
  userId: string;
  onBack?: () => void;
}

interface UserDetails {
  id: string;
  email: string;
  name: string;
  walletAddress: string | null;
  createdAt: string;
  accessCode?: string | null;
  referralCode?: string | null;
  referredBy?: {
    id: string;
    name: string;
    email: string;
    referralCode: string;
  } | null;
  referredUsers?: Array<{
    id: string;
    name: string;
    email: string;
    createdAt: string;
  }>;
  subscriptionPlan?: string | null;
  subscriptionStatus?: string;
  isSuspended?: boolean;
  suspendedAt?: string | null;
  suspendedReason?: string;
  adminNotes?: string;
  totalFileSizeUsed?: number;
  fileSizeLimit?: number;
}

interface NFT {
  tokenId: string;
  tokenURI: string;
}

interface PDFReport {
  id: string;
  tokenId: string;
  name: string;
  mintedAt: string;
  fileSize: string;
  status: string;
  metadataUrl: string;
}

const UserDetails = ({ userId, onBack }: UserDetailsProps) => {
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [nftCount, setNftCount] = useState(0);
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [pdfReports, setPdfReports] = useState<PDFReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [suspending, setSuspending] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      fetchUserDetails();
    } else {
      console.error('🔴 UserDetails: No userId provided');
      setError('No user ID provided');
      setLoading(false);
    }
  }, [userId]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      
      if (!userId) {
        alert('User ID is missing. Please try again.');
        setLoading(false);
        return;
      }
      
      // Fetch both user details and NFT details
      let userResponse: any = null;
      let nftResponse: any = null;
      
      try {
        userResponse = await adminApi.getUserById(userId);
      } catch (err: any) {
        console.error('Error fetching user by ID:', err);
        userResponse = { success: false, user: null, error: err?.message || 'Failed to fetch user' };
      }
      
      try {
        nftResponse = await adminApi.getUserNFTDetails(userId);
      } catch (err: any) {
        console.error('Error fetching NFT details:', err);
        nftResponse = { success: false, nftCount: 0, nfts: [], pdfReports: [], user: null, error: err?.message || 'Failed to fetch NFT details' };
      }
      
      // Merge user data from both responses - prioritize getUserById response
      let userData = null;
      
      if (userResponse && userResponse.success && userResponse.user) {
        userData = userResponse.user;
        console.log('Using user data from getUserById');
      } else if (nftResponse && nftResponse.success && nftResponse.user) {
        userData = nftResponse.user;
        console.log('Using user data from getUserNFTDetails');
      }
      
      if (!userData) {
        console.error('No user data found. UserResponse:', userResponse, 'NFTResponse:', nftResponse);
        const errorMsg = userResponse?.error || nftResponse?.error || 'Unknown error';
        console.error('Error details:', { userResponse, nftResponse, errorMsg });
        setError(`Failed to load user data: ${errorMsg}`);
        
        // Set minimal user data to prevent blank screen
        userData = {
          id: userId,
          email: 'Error loading',
          name: 'Error loading user',
          walletAddress: null,
          createdAt: new Date().toISOString(),
          accessCode: null,
          referralCode: null,
          subscriptionPlan: null,
          subscriptionStatus: 'inactive',
          isSuspended: false,
          suspendedAt: null,
          suspendedReason: '',
          adminNotes: ''
        };
        
        // Show error but don't block rendering
        console.warn('Using fallback user data due to API error');
      } else {
        setError(null); // Clear error if data loaded successfully
      }
      
      // Merge all user fields with proper fallbacks
      const mergedUserData: UserDetails = {
        id: userData.id || userData._id?.toString() || userId,
        email: userData.email || '',
        name: userData.name || '',
        walletAddress: userData.walletAddress || null,
        createdAt: userData.createdAt || new Date().toISOString(),
        accessCode: userData.accessCode || null,
        referralCode: userData.referralCode || null,
        referredBy: userData.referredBy ? (typeof userData.referredBy === 'object' && !Array.isArray(userData.referredBy) ? userData.referredBy : null) : null,
        referredUsers: Array.isArray(userData.referredUsers) ? userData.referredUsers : [],
        subscriptionPlan: userData.subscriptionPlan || null,
        subscriptionStatus: userData.subscriptionStatus || 'inactive',
        isSuspended: userData.isSuspended === true || userData.isSuspended === 'true',
        suspendedAt: userData.suspendedAt || null,
        suspendedReason: userData.suspendedReason || '',
        adminNotes: userData.adminNotes || '',
        totalFileSizeUsed: userData.totalFileSizeUsed !== undefined ? userData.totalFileSizeUsed : (nftResponse?.user?.totalFileSizeUsed !== undefined ? nftResponse.user.totalFileSizeUsed : 0),
        fileSizeLimit: userData.fileSizeLimit !== undefined ? userData.fileSizeLimit : (nftResponse?.user?.fileSizeLimit !== undefined ? nftResponse.user.fileSizeLimit : (250 * 1024 * 1024))
      };
      
      console.log('User details loaded:', mergedUserData);
      console.log('Access Code:', mergedUserData.accessCode);
      console.log('Referral Code:', mergedUserData.referralCode);
      console.log('Referred By:', mergedUserData.referredBy);
      console.log('Referred Users:', mergedUserData.referredUsers);
      console.log('Admin Notes:', mergedUserData.adminNotes);
      console.log('Is Suspended:', mergedUserData.isSuspended);
      console.log('Subscription Plan:', mergedUserData.subscriptionPlan);
      
      // Log NFT data
      const nftCountValue = nftResponse?.nftCount || 0;
      const nftsValue = nftResponse?.nfts || [];
      const pdfReportsValue = nftResponse?.pdfReports || [];
      
      console.log('NFT Count:', nftCountValue);
      console.log('NFTs:', nftsValue);
      console.log('PDF Reports:', pdfReportsValue);
      
      setUserDetails(mergedUserData);
      setNftCount(nftCountValue);
      setNfts(nftsValue);
      setPdfReports(pdfReportsValue);
      setNotesValue(mergedUserData.adminNotes || '');
    } catch (error: any) {
      console.error('Unexpected error fetching user details:', error);
      console.error('Error details:', error.message, error.stack);
      
      const errorMsg = error?.message || 'Unknown error occurred';
      setError(`Failed to load user details: ${errorMsg}`);
      
      // Set fallback data to prevent blank screen
      const fallbackData: UserDetails = {
        id: userId || 'unknown',
        email: 'Error loading',
        name: 'Error loading user',
        walletAddress: null,
        createdAt: new Date().toISOString(),
        accessCode: null,
        referralCode: null,
        subscriptionPlan: null,
        subscriptionStatus: 'inactive',
        isSuspended: false,
        suspendedAt: null,
        suspendedReason: '',
        adminNotes: ''
      };
      
      setUserDetails(fallbackData);
      setNftCount(0);
      setNfts([]);
      setPdfReports([]);
      setNotesValue('');
      
      if (error.message?.includes('401') || error.message?.includes('403')) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        window.location.href = '/signin';
      } else {
        console.error('Failed to load user details:', error.message || 'Unknown error');
        // Error is shown in the UI via error state
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    try {
      await adminApi.updateUserNotes(userId, notesValue);
      setEditingNotes(false);
      await fetchUserDetails();
    } catch (error: any) {
      alert(error.message || 'Failed to update notes');
    }
  };

  const handleSuspend = async () => {
    if (!suspendReason.trim()) {
      alert('Please provide a reason for suspension');
      return;
    }

    try {
      setSuspending(true);
      await adminApi.suspendUser(userId, suspendReason);
      setShowSuspendModal(false);
      setSuspendReason('');
      await fetchUserDetails();
    } catch (error: any) {
      alert(error.message || 'Failed to suspend user');
    } finally {
      setSuspending(false);
    }
  };

  const handleUnsuspend = async () => {
    if (!confirm('Are you sure you want to unsuspend this user?')) return;

    try {
      await adminApi.unsuspendUser(userId);
      await fetchUserDetails();
    } catch (error: any) {
      alert(error.message || 'Failed to unsuspend user');
    }
  };

  // ALWAYS render something visible - never return null or empty
  if (loading) {
    return (
      <div className="w-full min-h-[400px] flex flex-col items-center justify-center py-12 space-y-4 bg-gray-800/30 rounded-lg border border-gray-700">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        <p className="text-white text-lg font-medium">Loading user details...</p>
        <p className="text-gray-400 text-sm">User ID: {userId || 'Not provided'}</p>
      </div>
    );
  }

  if (!userDetails) {
    return (
      <div className="w-full min-h-[400px] card-dark text-center py-12 bg-red-900/10 border-2 border-red-500/30">
        <h3 className="text-xl font-bold text-white mb-4">⚠️ User Not Found</h3>
        <p className="text-gray-300 mb-2">Failed to load user data</p>
        <p className="text-gray-500 text-sm mb-4">User ID: <span className="font-mono text-white">{userId || 'Not provided'}</span></p>
        <div className="flex items-center justify-center space-x-3 mt-6">
          {onBack && (
            <button
              onClick={onBack}
              className="btn-secondary"
            >
              ← Back to User Management
            </button>
          )}
          <button
            onClick={() => {
              console.log('🔄 Retry button clicked');
              if (userId) {
                setLoading(true);
                fetchUserDetails();
              }
            }}
            className="btn-primary"
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }


  return (
    <div className="w-full space-y-6">
      {/* Error Banner */}
      {error && (
        <div className="card-dark p-4 bg-red-900/30 border-2 border-red-500/50">
          <p className="text-red-300 font-semibold mb-2">❌ Error</p>
          <p className="text-red-200 text-sm mb-3">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setLoading(true);
              if (userId) fetchUserDetails();
            }}
            className="btn-secondary text-sm"
          >
            🔄 Retry
          </button>
        </div>
      )}

      {/* Back Button */}
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to User Management</span>
        </button>
      )}

      {/* User Info Card */}
      <div className="card-dark">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 flex items-center justify-center">
              <User className="h-8 w-8 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h2 className="text-2xl font-bold text-white">{userDetails.name || 'No name'}</h2>
                {userDetails.isSuspended && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 flex items-center space-x-1">
                    <XCircle className="h-3 w-3" />
                    <span>Suspended</span>
                  </span>
                )}
                {userDetails.subscriptionStatus === 'active' && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400">
                    Active Subscription
                  </span>
                )}
              </div>
              <p className="text-gray-400">{userDetails.email}</p>
              {userDetails.walletAddress && (
                <div className="flex items-center space-x-2 mt-2">
                  <Wallet className="h-4 w-4 text-green-400" />
                  <span className="text-green-400 text-sm font-mono">
                    {userDetails.walletAddress.slice(0, 10)}...{userDetails.walletAddress.slice(-8)}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-gray-400 text-sm">Member since</p>
            <p className="text-white font-semibold">
              {new Date(userDetails.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Suspension Info */}
        {userDetails.isSuspended && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-400 font-semibold mb-1">Account Suspended</p>
                {userDetails.suspendedReason && (
                  <p className="text-red-300 text-sm mb-2">Reason: {userDetails.suspendedReason}</p>
                )}
                {userDetails.suspendedAt && (
                  <p className="text-red-300 text-xs">Suspended on: {new Date(userDetails.suspendedAt).toLocaleString()}</p>
                )}
              </div>
              <button
                onClick={handleUnsuspend}
                className="btn-secondary text-sm px-4 py-2"
              >
                Unsuspend
              </button>
            </div>
          </div>
        )}

        {/* Admin Actions */}
        <div className="flex items-center space-x-3 pt-4 border-t border-gray-800">
          {!userDetails.isSuspended && (
            <button
              onClick={() => setShowSuspendModal(true)}
              className="btn-secondary flex items-center space-x-2 text-red-400 hover:bg-red-500/20"
            >
              <Shield className="h-4 w-4" />
              <span>Suspend User</span>
            </button>
          )}
        </div>
      </div>

      {/* Admin Notes */}
      <div className="card-dark">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5 text-blue-400" />
            <h3 className="text-lg font-bold text-white">Admin Notes</h3>
          </div>
          {!editingNotes ? (
            <button
              onClick={() => setEditingNotes(true)}
              className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
            >
              <Edit2 className="h-4 w-4" />
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSaveNotes}
                className="p-2 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors"
              >
                <Save className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setEditingNotes(false);
                  setNotesValue(userDetails.adminNotes || '');
                }}
                className="p-2 text-gray-400 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
        {editingNotes ? (
          <textarea
            value={notesValue}
            onChange={(e) => setNotesValue(e.target.value)}
            className="input-dark w-full"
            rows={4}
            placeholder="Add notes about this user..."
          />
        ) : (
          <div className="text-gray-300 text-sm whitespace-pre-wrap min-h-[100px] p-3 bg-gray-800/50 rounded-lg">
            {userDetails.adminNotes || <span className="text-gray-500 italic">No notes added</span>}
          </div>
        )}
      </div>

      {/* Referral & Access Code Tracking */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Access Code Info */}
        <div className="card-dark">
          <div className="flex items-center space-x-2 mb-4">
            <Key className="h-5 w-5 text-purple-400" />
            <h3 className="text-lg font-bold text-white">Access Code</h3>
          </div>
          {userDetails.accessCode ? (
            <div>
              <p className="text-white font-mono font-semibold text-lg mb-2">{userDetails.accessCode}</p>
              {userDetails.subscriptionPlan ? (
                <div className="mt-2">
                  <p className="text-gray-400 text-sm mb-1">
                    Subscription: <span className="text-purple-400 capitalize font-semibold">{userDetails.subscriptionPlan}</span>
                  </p>
                  {userDetails.subscriptionStatus && (
                    <p className="text-gray-400 text-xs">
                      Status: <span className={`capitalize ${
                        userDetails.subscriptionStatus === 'active' ? 'text-green-400' : 
                        userDetails.subscriptionStatus === 'expired' ? 'text-red-400' : 
                        'text-gray-400'
                      }`}>
                        {userDetails.subscriptionStatus}
                      </span>
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-sm mt-2">No subscription assigned</p>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No access code recorded</p>
          )}
        </div>

        {/* Referral Info */}
        <div className="card-dark">
          <div className="flex items-center space-x-2 mb-4">
            <Users className="h-5 w-5 text-blue-400" />
            <h3 className="text-lg font-bold text-white">Referral Information</h3>
          </div>
          {userDetails.referralCode ? (
            <div className="mb-4">
              <p className="text-gray-400 text-sm mb-1">User's Referral Code:</p>
              <p className="text-white font-mono font-semibold text-lg">{userDetails.referralCode}</p>
            </div>
          ) : (
            <p className="text-gray-500 text-sm mb-4">No referral code assigned</p>
          )}
          {userDetails.referredBy ? (
            <div className="mb-4 p-3 bg-gray-800/50 rounded-lg">
              <p className="text-gray-400 text-sm mb-1">Referred By:</p>
              <p className="text-white font-medium">{userDetails.referredBy.name || userDetails.referredBy.email || 'Unknown User'}</p>
              {userDetails.referredBy.referralCode && (
                <p className="text-gray-500 text-xs mt-1">Code: {userDetails.referredBy.referralCode}</p>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-sm mb-4">Not referred by anyone</p>
          )}
          {userDetails.referredUsers && userDetails.referredUsers.length > 0 ? (
            <div>
              <p className="text-gray-400 text-sm mb-2 font-semibold">Users Referred ({userDetails.referredUsers.length}):</p>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {userDetails.referredUsers.map((ref) => (
                  <div key={ref.id} className="text-sm border-b border-gray-700 pb-2">
                    <p className="text-white font-medium">{ref.name || ref.email || 'Unknown'}</p>
                    <p className="text-gray-500 text-xs">{new Date(ref.createdAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No users referred yet</p>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-dark">
          <div className="flex items-center justify-between mb-4">
            <FileText className="h-6 w-6 text-purple-400" />
          </div>
          <h3 className="text-gray-400 text-sm font-medium mb-2">Minted NFTs</h3>
          <p className="text-3xl font-bold text-white">{nftCount}</p>
          <p className="text-sm text-gray-500 mt-2">Total PDFs encrypted</p>
        </div>

        <div className="card-dark">
          <div className="flex items-center justify-between mb-4">
            <CheckCircle className="h-6 w-6 text-green-400" />
          </div>
          <h3 className="text-gray-400 text-sm font-medium mb-2">Active PDFs</h3>
          <p className="text-3xl font-bold text-white">{pdfReports.length}</p>
          <p className="text-sm text-gray-500 mt-2">Currently active</p>
        </div>

        <div className="card-dark">
          <div className="flex items-center justify-between mb-4">
            <FileText className="h-6 w-6 text-purple-400" />
          </div>
          <h3 className="text-gray-400 text-sm font-medium mb-2">File Size Used</h3>
          {userDetails.totalFileSizeUsed !== undefined && userDetails.fileSizeLimit !== undefined ? (
            <>
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold text-white">
                    {((userDetails.totalFileSizeUsed / (1024 * 1024))).toFixed(2)} MB
                  </span>
                  <span className="text-sm text-gray-400">
                    of {((userDetails.fileSizeLimit / (1024 * 1024))).toFixed(0)} MB
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all ${
                      (userDetails.totalFileSizeUsed / userDetails.fileSizeLimit) > 0.9
                        ? 'bg-gradient-to-r from-red-500 to-red-600'
                        : (userDetails.totalFileSizeUsed / userDetails.fileSizeLimit) > 0.7
                        ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                        : 'bg-gradient-to-r from-purple-500 to-pink-500'
                    }`}
                    style={{
                      width: `${Math.min((userDetails.totalFileSizeUsed / userDetails.fileSizeLimit) * 100, 100)}%`
                    }}
                  />
                </div>
              </div>
              <p className="text-sm text-gray-500">
                {((userDetails.fileSizeLimit - userDetails.totalFileSizeUsed) / (1024 * 1024)).toFixed(2)} MB remaining
              </p>
            </>
          ) : (
            <p className="text-lg font-bold text-white">0 MB</p>
          )}
        </div>
      </div>

      {/* PDF Reports */}
      <div className="card-dark">
        <h3 className="text-xl font-bold text-white mb-4">PDF Reports</h3>
        {pdfReports.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-400 font-semibold">Token ID</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-semibold">Name</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-semibold">File Size</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-semibold">Minted At</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-semibold">Status</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pdfReports.map((report) => (
                  <tr key={report.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="py-3 px-4">
                      <span className="text-purple-400 font-mono text-sm">#{report.tokenId}</span>
                    </td>
                    <td className="py-3 px-4 text-white">{report.name}</td>
                    <td className="py-3 px-4 text-gray-300">{report.fileSize}</td>
                    <td className="py-3 px-4 text-gray-400 text-sm">
                      {new Date(report.mintedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400">
                        {report.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <a
                        href={report.metadataUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 flex items-center space-x-1"
                      >
                        <span className="text-sm">View</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">No PDF reports available</p>
        )}
      </div>

      {/* NFTs List */}
      {nfts.length > 0 && (
        <div className="card-dark">
          <h3 className="text-xl font-bold text-white mb-4">NFT Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {nfts.map((nft) => (
              <div
                key={nft.tokenId}
                className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-purple-500 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-purple-400 font-mono text-sm">Token #{nft.tokenId}</span>
                  <a
                    href={nft.tokenURI}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
                <p className="text-gray-400 text-xs truncate">{nft.tokenURI}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suspend Modal */}
      {showSuspendModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card-dark max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Suspend User</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Reason for Suspension <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  className="input-dark w-full"
                  rows={4}
                  placeholder="Enter the reason for suspending this user..."
                  required
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleSuspend}
                  disabled={suspending || !suspendReason.trim()}
                  className="btn-primary flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50"
                >
                  {suspending ? 'Suspending...' : 'Suspend User'}
                </button>
                <button
                  onClick={() => {
                    setShowSuspendModal(false);
                    setSuspendReason('');
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
    </div>
  );
};

export default UserDetails;
