import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Eye, Search } from 'lucide-react';
import { pdfApi } from '../utils/api';

interface NFT {
  tokenId: string;
  name: string;
  description: string;
  image: string;
  properties: {
    file: {
      name: string;
      type: string;
      size: number;
    };
    encryption: {
      algorithm: string;
      iv: string;
    };
  };
}

const MyNFTs = () => {
  // Wallet connection is no longer required - NFTs are fetched from backend by user account
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNFTs = async () => {
      console.log('fetchNFTs: Starting fetch from backend API (no wallet required)');

      try {
        // Fetch NFTs from backend API (linked to user account)
        const response = await pdfApi.getUserNFTs();
        console.log('fetchNFTs: Response received:', response);
        
        if (response.success && response.nfts) {
          setNfts(response.nfts);
        } else {
          setNfts([]);
        }
      } catch (err: any) {
        console.error('fetchNFTs: Error fetching NFTs:', err);
        setError(err.message || 'Error fetching NFTs');
        setNfts([]);
      } finally {
        setLoading(false);
        console.log('fetchNFTs: Loading set to false');
      }
    };

    fetchNFTs();
  }, []); // No dependencies - fetch on mount

  // Wallet connection is no longer required - NFTs are linked to user account

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
        <p className="mt-4 text-sm text-gray-400">Loading your NFTs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  if (nfts.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-white">No NFTs found</h3>
        <p className="mt-1 text-sm text-gray-400">You haven't minted any PDF NFTs yet.</p>
      </div>
    );
  }

  const filteredNFTs = nfts.filter(nft => 
    nft.properties.file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          className="input-dark w-full pl-10 text-sm lg:text-base"
          placeholder="Search by file name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {filteredNFTs.length === 0 ? (
        <div className="text-center py-8 lg:py-12">
          <h3 className="text-base lg:text-lg font-medium text-white">No matching NFTs found</h3>
          <p className="mt-1 text-sm text-gray-400">Try adjusting your search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredNFTs.map((nft) => (
            <div key={nft.tokenId} className="card-dark">
              <h3 className="text-lg font-medium text-white truncate">{nft.name}</h3>
              <p className="mt-1 text-sm text-gray-400">{nft.description}</p>
              
              <div className="mt-4 space-y-2">
                <div className="text-sm">
                  <span className="font-medium text-gray-400">File:</span>{' '}
                  <span className="text-white">{nft.properties.file.name}</span>
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={() => navigate(`/dashboard/view/${nft.tokenId}`)}
                  className="btn-primary w-full inline-flex items-center justify-center"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Download PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyNFTs; 