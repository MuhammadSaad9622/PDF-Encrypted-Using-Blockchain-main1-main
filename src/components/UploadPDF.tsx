import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileUp, Upload, CheckCircle2, Loader2, AlertCircle, Lock } from 'lucide-react';
import { pdfApi, paymentApi } from '../utils/api';
import { cacheMetadata, fetchAndCacheMetadata } from '../utils/nftCache';

interface ProgressStep {
  name: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  percentage: number;
}

const UploadPDF = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [recipientAddress, setRecipientAddress] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('loading');
  const [subscriptionLoading, setSubscriptionLoading] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const steps: ProgressStep[] = [
    { name: 'Uploading PDF', status: 'pending', percentage: 0 },
    { name: 'Encrypting File', status: 'pending', percentage: 15 },
    { name: 'Calculating Price', status: 'pending', percentage: 30 },
    { name: 'Funding Bundlr', status: 'pending', percentage: 45 },
    { name: 'Uploading to Arweave', status: 'pending', percentage: 60 },
    { name: 'Uploading Metadata', status: 'pending', percentage: 75 },
    { name: 'Minting NFT', status: 'pending', percentage: 90 },
    { name: 'Complete', status: 'pending', percentage: 100 },
  ];

  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>(steps);

  // Fetch subscription status on component mount
  useEffect(() => {
    const fetchSubscriptionStatus = async () => {
      try {
        setSubscriptionLoading(true);
        const response = await paymentApi.getSubscriptionStatus();
        if (response?.success && response?.subscription) {
          setSubscriptionStatus(response.subscription.status || 'inactive');
        } else {
          setSubscriptionStatus('inactive');
        }
      } catch (error: any) {
        console.error('Error fetching subscription status:', error);
        setSubscriptionStatus('inactive');
      } finally {
        setSubscriptionLoading(false);
      }
    };

    fetchSubscriptionStatus();
  }, []);

  const handleLockClick = () => {
    navigate('/dashboard/invoices');
  };

  const isSubscriptionActive = subscriptionStatus === 'active';

  const updateProgress = (stepName: string, percentage: number) => {
    setCurrentStep(stepName);
    setProgressPercentage(percentage);
    
    setProgressSteps(prev => prev.map(step => {
      if (step.percentage <= percentage) {
        return { ...step, status: step.percentage === percentage ? 'active' : 'completed' as const };
      }
      return step;
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile);
        setError(null);
      } else {
        setError('Please upload a PDF file');
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a PDF file');
      return;
    }
    // Wallet connection is now optional - if not connected, backend will mint to its wallet
    // recipientAddress is also optional now

    setLoading(true);
    setError(null);
    setResult(null);
    setProgressSteps(steps.map(s => ({ ...s, status: 'pending' as const })));
    setProgressPercentage(0);

    // Declare isActive outside try-catch so it's accessible in both blocks
    let isActive = true;

    try {
      const formData = new FormData();
      formData.append('pdf', file);
      // Only include recipientAddress if provided (optional - backend will use its wallet if not provided)
      if (recipientAddress) {
        formData.append('recipientAddress', recipientAddress);
      }
      formData.append('name', `Encrypted PDF: ${file.name}`);
      formData.append('description', 'Encrypted PDF document with secure access');

      // Start progress simulation
      updateProgress('Uploading PDF...', 10);
      
      // Simulate progress updates while request is in flight
      const progressIntervals = [
        { step: 'Encrypting File...', percentage: 20, delay: 1000 },
        { step: 'Calculating Price...', percentage: 35, delay: 2000 },
        { step: 'Funding Bundlr...', percentage: 50, delay: 3000 },
        { step: 'Uploading to Arweave...', percentage: 65, delay: 5000 },
        { step: 'Uploading Metadata...', percentage: 80, delay: 7000 },
        { step: 'Minting NFT...', percentage: 90, delay: 9000 },
      ];

      // Start progress simulation
      progressIntervals.forEach((interval) => {
        setTimeout(() => {
          if (isActive) {
            updateProgress(interval.step, interval.percentage);
          }
        }, interval.delay);
      });

      // Use the automated endpoint
      const response = await pdfApi.automatedUploadAndMint(formData);

      // Cache metadata immediately after minting (backend now includes metadata in response)
      if (response.tokenId && response.metadata) {
        try {
          console.log('Caching metadata for newly minted NFT:', response.tokenId);
          updateProgress('Caching metadata...', 95);
          cacheMetadata(response.tokenId, response.metadata);
          console.log('Metadata cached successfully for token:', response.tokenId);
        } catch (metadataError) {
          console.warn('Failed to cache metadata immediately, but NFT was minted successfully:', metadataError);
          // Don't fail the whole process if metadata caching fails
          // The metadata can still be fetched later from Arweave
        }
      } else if (response.tokenId && response.metadataArweaveUrl) {
        // Fallback: fetch from Arweave if metadata not included in response
        try {
          console.log('Fetching and caching metadata from Arweave for newly minted NFT:', response.tokenId);
          updateProgress('Caching metadata...', 95);
          await fetchAndCacheMetadata(response.tokenId, response.metadataArweaveUrl);
          console.log('Metadata cached successfully for token:', response.tokenId);
        } catch (metadataError) {
          console.warn('Failed to cache metadata immediately, but NFT was minted successfully:', metadataError);
        }
      }

      // Final completion
      isActive = false;
      updateProgress('Complete!', 100);
      setResult(response);
      setLoading(false);
    } catch (err: any) {
      isActive = false;
      
      // Handle 403 errors (subscription required) with a more user-friendly message
      let errorMessage = err.message || 'Error processing PDF';
      if (err.status === 403 || err.requiresSubscription) {
        if (err.message?.includes('expired')) {
          errorMessage = 'Your subscription has expired. Please renew your subscription to continue uploading files.';
        } else {
          errorMessage = 'Active subscription required. Please subscribe to upload and mint PDF files.';
        }
      } else if (err.status === 401) {
        errorMessage = 'Authentication required. Please sign in again.';
      }
      
      setError(errorMessage);
      setLoading(false);
      setProgressSteps(prev => prev.map(step => 
        step.status === 'active' ? { ...step, status: 'error' as const } : step
      ));
    }
  };

  const resetForm = () => {
    setFile(null);
    setRecipientAddress('');
    setError(null);
    setResult(null);
    setLoading(false);
    setCurrentStep('');
    setProgressPercentage(0);
    setProgressSteps(steps.map(s => ({ ...s, status: 'pending' as const })));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getStepIcon = (step: ProgressStep) => {
    if (step.status === 'completed') {
      return <CheckCircle2 className="h-5 w-5 text-green-400" />;
    } else if (step.status === 'active') {
      return <Loader2 className="h-5 w-5 text-purple-400 animate-spin" />;
    } else if (step.status === 'error') {
      return <AlertCircle className="h-5 w-5 text-red-400" />;
    }
    return <div className="h-5 w-5 rounded-full border-2 border-gray-600" />;
  };

  return (
    <div className="card-dark">
      <h2 className="text-2xl font-bold text-white mb-6">Upload PDF</h2>

      {!result ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload */}
          <div>
            <label className="block text-gray-300 text-sm font-bold mb-2">
              Select PDF File
            </label>
            <div className="relative">
              <div
                onDrop={isSubscriptionActive ? handleDrop : undefined}
                onDragOver={isSubscriptionActive ? handleDragOver : undefined}
                className={`border-2 border-dashed border-gray-600 rounded-lg p-12 text-center transition-colors bg-dark-card/50 ${
                  isSubscriptionActive 
                    ? 'hover:border-purple-500 cursor-pointer' 
                    : 'cursor-not-allowed opacity-60'
                }`}
                onClick={isSubscriptionActive ? () => fileInputRef.current?.click() : undefined}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="pdf-upload"
                  disabled={loading || !isSubscriptionActive}
                />
                <FileUp className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-sm text-gray-300 mb-2">
                  {file ? file.name : 'Drag & drop your PDF here or click to browse'}
                </p>
                <p className="text-xs text-gray-500">
                  {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'PDF files only'}
                </p>
              </div>
              
              {/* Lock Overlay */}
              {!subscriptionLoading && !isSubscriptionActive && (
                <div 
                  className="absolute inset-0 bg-black/70 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-black/80 transition-colors z-10"
                  onClick={handleLockClick}
                >
                  <Lock className="text-yellow-400 mb-3" size={48} />
                  <p className="text-white font-semibold text-lg mb-1">
                    Subscription Required
                  </p>
                  <p className="text-gray-300 text-sm">
                    Click to view subscription plans
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Recipient Address - Optional (Hidden - always uses backend wallet) */}
          {/* Address input removed - always uses backend wallet now */}

          {/* Progress Bar */}
          {loading && (
            <div className="space-y-4">
              <div className="bg-gray-800 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-600 to-pink-500 transition-all duration-500 ease-out"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              
              <div className="space-y-2">
                {progressSteps.map((step, index) => (
                  <div
                    key={index}
                    className={`flex items-center space-x-3 p-3 rounded-lg transition-all ${
                      step.status === 'active'
                        ? 'bg-purple-500/20 border border-purple-500/50'
                        : step.status === 'completed'
                        ? 'bg-green-500/10 border border-green-500/30'
                        : step.status === 'error'
                        ? 'bg-red-500/10 border border-red-500/30'
                        : 'bg-gray-800/50 border border-gray-700'
                    }`}
                  >
                    {getStepIcon(step)}
                    <span
                      className={`text-sm flex-1 ${
                        step.status === 'active'
                          ? 'text-purple-300 font-medium'
                          : step.status === 'completed'
                          ? 'text-green-300'
                          : step.status === 'error'
                          ? 'text-red-300'
                          : 'text-gray-400'
                      }`}
                    >
                      {step.name}
                    </span>
                    {step.status === 'active' && (
                      <span className="text-xs text-purple-400">{progressPercentage}%</span>
                    )}
                  </div>
                ))}
              </div>

              {currentStep && (
                <p className="text-sm text-purple-400 text-center animate-pulse">
                  {currentStep}
                </p>
              )}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-lg flex items-center space-x-2">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !file || !isSubscriptionActive}
            className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center space-x-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Processing...</span>
              </span>
            ) : (
              <span className="flex items-center justify-center space-x-2">
                <Upload className="h-5 w-5" />
                <span>Upload & Mint NFT</span>
              </span>
            )}
          </button>
        </form>
      ) : (
        <div className="space-y-6">
          {/* Success Message */}
          <div className="bg-green-500/10 border border-green-500/50 text-green-400 p-6 rounded-lg">
            <div className="flex items-center space-x-3 mb-4">
              <CheckCircle2 className="h-8 w-8" />
              <h3 className="font-bold text-lg">NFT Successfully Minted! 🎉</h3>
            </div>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">File:</span> {result.originalName}</p>
              {/* <p><span className="font-medium">Token ID:</span> {result.tokenId || 'N/A'}</p>
              <p><span className="font-medium">Recipient:</span> {result.recipientAddress}</p> */}
              <p>
                <span className="font-medium">Transaction:</span>{' '}
                <a
                  href={`https://polygonscan.com/tx/${result.transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-green-300"
                >
                  View on PolygonScan
                </a>
              </p>
              {/* <p>
                <span className="font-medium">Arweave File:</span>{' '}
                <a
                  href={result.arweaveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-green-300"
                >
                  View on Arweave
                </a>
              </p> */}
              {/* <p>
                <span className="font-medium">Metadata:</span>{' '}
                <a
                  href={result.metadataArweaveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-green-300"
                >
                  View Metadata
                </a>
              </p> */}
            </div>
          </div>

          {/* Important Notice */}
          <div className="bg-blue-500/10 border border-blue-500/50 p-4 rounded-lg text-blue-400 text-sm">
            <p className="font-medium mb-2">Important:</p>
            <p>
              The encryption key is stored in the NFT metadata. Only the NFT owner should have access to this key to decrypt the document.
            </p>
          </div>

          {/* Reset Button */}
          <button
            onClick={resetForm}
            className="btn-primary w-full py-3"
          >
            Upload Another PDF
          </button>
        </div>
      )}
    </div>
  );
};

export default UploadPDF;
