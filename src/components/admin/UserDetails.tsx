import { useState, useEffect } from 'react';
import { User, FileText, Wallet, Calendar, ArrowLeft, ExternalLink, CheckCircle } from 'lucide-react';
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

  useEffect(() => {
    if (userId) {
      fetchUserDetails();
    }
  }, [userId]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getUserNFTDetails(userId!);
      setUserDetails(response.user);
      setNftCount(response.nftCount || 0);
      setNfts(response.nfts || []);
      setPdfReports(response.pdfReports || []);
    } catch (error: any) {
      console.error('Error fetching user details:', error);
      if (error.message?.includes('401') || error.message?.includes('403')) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        window.location.href = '/signin';
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!userDetails) {
    return (
      <div className="card-dark text-center py-12">
        <p className="text-gray-400">User not found</p>
        {onBack && (
          <button
            onClick={onBack}
            className="btn-secondary mt-4"
          >
            Back to Dashboard
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
              <h2 className="text-2xl font-bold text-white">{userDetails.name || 'No name'}</h2>
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
            <Wallet className="h-6 w-6 text-blue-400" />
          </div>
          <h3 className="text-gray-400 text-sm font-medium mb-2">Wallet Status</h3>
          <p className="text-lg font-bold text-white">
            {userDetails.walletAddress ? 'Connected' : 'Not Connected'}
          </p>
          <p className="text-sm text-gray-500 mt-2">Blockchain wallet</p>
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
    </div>
  );
};

export default UserDetails;

