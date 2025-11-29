import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, ArrowLeft } from 'lucide-react';
import { pdfApi } from '../utils/api';

const ViewPDF = () => {
  // Wallet connection is no longer required - ownership is verified via user account
  const { tokenId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [decryptProgress, setDecryptProgress] = useState<number>(0);
  const [decryptStatus, setDecryptStatus] = useState<string>('Preparing...');

  useEffect(() => {
    const fetchNFTData = async () => {
      if (!tokenId) return;

      try {
        // Fetch metadata (ownership verification happens on backend via user account)
        console.log('fetchNFTData: Fetching metadata for token ID:', tokenId);
        setDecryptStatus('Fetching metadata...');
        setDecryptProgress(5);
        
        const metadata = await pdfApi.getNftMetadata(tokenId);
        console.log('fetchNFTData: Metadata received:', metadata);
        setMetadata(metadata);

        // Fetch and decrypt PDF with progress tracking (no wallet needed)
        setDecryptStatus('Connecting to Arweave...');
        setDecryptProgress(10);
        
        const decryptResponse = await pdfApi.decryptFile(tokenId, undefined, (progress, status) => {
          setDecryptProgress(progress);
          setDecryptStatus(status);
        });

        console.log('Decryption response received:', decryptResponse);
        console.log('Decrypted data type (should be Blob):', typeof decryptResponse);
        if (decryptResponse instanceof Blob) {
          console.log('Decrypted data is a Blob, size:', decryptResponse.size);
          console.log('Decrypted data Blob type:', decryptResponse.type);

          // Read the first few bytes of the Blob to check for PDF signature
          const reader = new FileReader();
          reader.onload = function(event) {
            if (event.target?.result) {
              const arrayBuffer = event.target.result as ArrayBuffer;
              const uint8Array = new Uint8Array(arrayBuffer);
              const pdfSignature = String.fromCharCode(...uint8Array.slice(0, 4));
              console.log('First 4 bytes of decrypted data (should be %PDF-):', pdfSignature);
            }
          };
          reader.readAsArrayBuffer(decryptResponse.slice(0, 4));

        }

        // Create Blob from response data, ensuring correct type
        const pdfBlob = new Blob([decryptResponse], { type: 'application/pdf' });
        const pdfUrl = URL.createObjectURL(pdfBlob);
        setPdfUrl(pdfUrl);
      } catch (err: any) {
        setError(err.message || 'Error fetching NFT data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchNFTData();
  }, [tokenId]);

  // Wallet connection is no longer required - ownership is verified via user account

  if (loading) {
    return (
      <div className="card-dark">
      <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-sm text-gray-400 mb-4">{decryptStatus}</p>
          
          {/* Progress Bar */}
          <div className="max-w-md mx-auto">
            <div className="bg-gray-800 rounded-full h-4 overflow-hidden mb-2 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 transition-all duration-200 ease-linear relative overflow-hidden"
                style={{ width: `${decryptProgress}%` }}
              >
                {/* Animated shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-400">{decryptStatus}</p>
              <p className="text-sm font-semibold text-purple-400">{Math.round(decryptProgress)}%</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-lg">
          {error}
        </div>
        <button
          onClick={() => navigate('/dashboard/my-nfts')}
          className="btn-primary mt-4 inline-flex items-center"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to My NFTs
        </button>
      </div>
    );
  }

  return (
    <div className="card-dark">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">{metadata?.name}</h2>
        <button
          onClick={() => navigate('/dashboard/my-nfts')}
          className="btn-secondary inline-flex items-center"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to My NFTs
        </button>
      </div>

      <div className="mb-6">
        <p className="text-gray-400">{metadata?.description}</p>
        <div className="mt-4 space-y-2">
          <div className="text-sm">
            <span className="font-medium text-gray-400">File:</span>{' '}
            <span className="text-white">{metadata?.properties.file.name}</span>
          </div>
        </div>
      </div>

      {pdfUrl && (
        <div className="mt-6">
          <div className="aspect-w-16 aspect-h-9 bg-gray-800 rounded-lg overflow-hidden">
            <iframe
              src={pdfUrl}
              className="w-full h-full"
              title="PDF Viewer"
            />
          </div>
          <div className="mt-4">
            <a
              href={pdfUrl}
              download={`${metadata?.properties.file.name}`}
              className="btn-primary inline-flex items-center"
            >
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewPDF; 