import { useState, useEffect, useRef } from 'react';
import { Receipt, Download, CheckCircle, Clock, DollarSign, ChevronLeft, ChevronRight, FileText, CreditCard, AlertCircle, HardDrive, Zap, X, Sparkles, Shield, Calendar, TrendingUp } from 'lucide-react';
import { authApi, paymentApi } from '../utils/api';
import { useTheme, getGradientClasses } from '../utils/theme';

// Declare Square types
declare global {
  interface Window {
    Square?: any;
  }
}

interface Invoice {
  id: string;
  subscriptionPlan?: string;
  amount: string;
  currency: string;
  status: string;
  type: string;
  createdAt: string;
  transactionHash?: string;
  description?: string;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
}

interface SubscriptionStatus {
  status: 'active' | 'expired' | 'inactive';
  startDate: string | null;
  endDate: string | null;
  fileSizeLimit: {
    total: number;
    used: number;
    remaining: number;
    unit: string;
  };
}

const UserInvoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState<any>(null);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [squareConfig, setSquareConfig] = useState<any>(null);
  const [squareLoaded, setSquareLoaded] = useState(false);
  const [paymentForm, setPaymentForm] = useState<any>(null);
  const paymentFormRef = useRef<HTMLDivElement>(null);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'failed' | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelSubscriptionModal, setShowCancelSubscriptionModal] = useState(false);
  const { colorScheme } = useTheme();

  useEffect(() => {
    fetchInvoices();
    fetchSubscriptionStatus();
    loadSquareConfig();
  }, [page]);

  useEffect(() => {
    // Initialize Square when config is loaded and modal is shown
    if (showSubscribeModal && squareConfig && squareLoaded && paymentFormRef.current && !paymentForm) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        initializeSquarePayment();
      }, 100);
      return () => clearTimeout(timer);
    }
    
    // Cleanup when modal closes
    if (!showSubscribeModal && paymentForm) {
      // Square forms clean up automatically when detached
      setPaymentForm(null);
    }
  }, [showSubscribeModal, squareConfig, squareLoaded, paymentForm]);

  const loadSquareConfig = async () => {
    try {
      const response = await paymentApi.getSquareConfig();
      if (response?.success && response?.config) {
        setSquareConfig(response.config);
        // Load Square SDK dynamically based on environment
        loadSquareSDK(response.config.sdkUrl);
      }
    } catch (error: any) {
      console.error('Error loading Square config:', error);
    }
  };

  const loadSquareSDK = (sdkUrl: string) => {
    // Check if Square is already loaded
    if (window.Square && window.Square.payments) {
      console.log('Square SDK already loaded');
      setSquareLoaded(true);
      return;
    }

    // Check if script already exists
    const existingScript = document.querySelector(`script[src="${sdkUrl}"]`);
    if (existingScript) {
      // Wait a bit for it to load
      const checkInterval = setInterval(() => {
        if (window.Square && window.Square.payments) {
          setSquareLoaded(true);
          clearInterval(checkInterval);
        }
      }, 100);
      
      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!window.Square || !window.Square.payments) {
          console.error('Square SDK script exists but Square object not available');
        }
      }, 5000);
      return;
    }

    // Load Square SDK
    const script = document.createElement('script');
    script.src = sdkUrl;
    script.type = 'text/javascript';
    script.onload = () => {
      // Wait a moment for Square to initialize
      setTimeout(() => {
        if (window.Square && window.Square.payments) {
          console.log('Square SDK loaded successfully');
          setSquareLoaded(true);
        } else {
          console.error('Square SDK script loaded but Square.payments not available');
          console.log('Available Square properties:', window.Square ? Object.keys(window.Square) : 'Square not found');
        }
      }, 100);
    };
    script.onerror = () => {
      console.error('Failed to load Square SDK from:', sdkUrl);
    };
    document.head.appendChild(script);
  };

  const initializeSquarePayment = async () => {
    if (!window.Square) {
      console.error('Square SDK not loaded');
      return;
    }

    if (!window.Square.payments) {
      console.error('Square.payments is not available. Square object:', window.Square);
      return;
    }

    if (!squareConfig || !squareConfig.applicationId || !squareConfig.locationId) {
      console.error('Square config missing:', squareConfig);
      return;
    }

    if (!paymentFormRef.current) {
      console.error('Payment form ref not available');
      return;
    }

    try {
      console.log('Initializing Square payments with:', {
        applicationId: squareConfig.applicationId,
        locationId: squareConfig.locationId
      });

      // Initialize Square payments
      const payments = window.Square.payments(squareConfig.applicationId, squareConfig.locationId);
      
      if (!payments || typeof payments.card !== 'function') {
        console.error('payments.card is not a function. Payments object:', payments);
        return;
      }

      // Create card payment method (this is async)
      const card = await payments.card();
      
      if (!card || typeof card.attach !== 'function') {
        console.error('card.attach is not a function. Card object:', card);
        return;
      }
      
      // Attach card to DOM element (this is also async)
      await card.attach(paymentFormRef.current);
      
      setPaymentForm(card);
      console.log('✅ Square payment form initialized successfully');
    } catch (error: any) {
      console.error('Error initializing Square payment:', error);
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack,
        squareConfig: squareConfig ? 'present' : 'missing',
        hasSquare: !!window.Square,
        hasPayments: !!(window.Square && window.Square.payments)
      });
    }
  };

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await authApi.getUserInvoices(page, 20);
      
      setInvoices(response?.invoices || []);
      setTotalPages(response?.pagination?.pages || 1);
      setSummary(response?.summary || {
        totalInvoices: 0,
        paidInvoices: 0,
        pendingInvoices: 0
      });
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
      setInvoices([]);
      setSummary({
        totalInvoices: 0,
        paidInvoices: 0,
        pendingInvoices: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscriptionStatus = async () => {
    try {
      setSubscriptionLoading(true);
      const response = await paymentApi.getSubscriptionStatus();
      if (response?.success && response?.subscription) {
        setSubscription(response.subscription);
      }
    } catch (error: any) {
      console.error('Error fetching subscription status:', error);
      setSubscription({
        status: 'inactive',
        startDate: null,
        endDate: null,
        fileSizeLimit: {
          total: 250,
          used: 0,
          remaining: 250,
          unit: 'MB'
        }
      });
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const handleSubscribe = async () => {
    setShowSubscribeModal(true);
  };

  const handleCancelSubscription = async () => {
    if (!subscription || subscription.status !== 'active') return;

    try {
      setCancelling(true);
      await paymentApi.cancelSubscription();
      await fetchSubscriptionStatus();
      await fetchInvoices();
      setShowCancelSubscriptionModal(false);
      alert('Your subscription has been cancelled.');
    } catch (error: any) {
      console.error('Error cancelling subscription:', error);
      alert(error?.message || 'Failed to cancel subscription. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  const handlePayment = async () => {
    if (!paymentForm || !squareConfig) {
      alert('Payment form is not ready. Please wait a moment and try again.');
      return;
    }

    try {
      setPaymentProcessing(true);

      // Step 1: Create subscription payment (creates invoice and order)
      const createResponse = await paymentApi.createSubscriptionPayment();
      
      if (!createResponse?.success || !createResponse?.orderId || !createResponse?.invoiceId) {
        throw new Error(createResponse?.error || 'Failed to create payment order');
      }

      const { orderId, invoiceId, paymentRequest } = createResponse;

      // Step 2: Tokenize the card
      const tokenResult = await paymentForm.tokenize();
      
      if (tokenResult.status === 'OK') {
        // Step 3: Process the payment with the token
        // Generate idempotency key
        const idempotencyKey = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
        
        const processResponse = await paymentApi.processSubscriptionPayment({
          sourceId: tokenResult.token,
          orderId: orderId,
          invoiceId: invoiceId,
          idempotencyKey: idempotencyKey
        });

        if (processResponse?.success) {
          // Payment successful
          setShowSubscribeModal(false);
          // Refresh subscription status and invoices
          await fetchSubscriptionStatus();
          await fetchInvoices();
          
          // Show success modal
          setPaymentStatus('success');
          // Auto-close after 3 seconds
          setTimeout(() => {
            setPaymentStatus(null);
          }, 3000);
        } else {
          throw new Error(processResponse?.error || 'Payment processing failed');
        }
      } else {
        let errorMessage = 'Failed to tokenize card';
        if (tokenResult.errors && tokenResult.errors.length > 0) {
          errorMessage = tokenResult.errors.map((e: any) => e.detail).join(', ');
        }
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      
      // Show failed status modal
      setPaymentStatus('failed');
      // Auto-close after 4 seconds
      setTimeout(() => {
        setPaymentStatus(null);
      }, 4000);
    } finally {
      setPaymentProcessing(false);
    }
  };

  if (loading && invoices.length === 0 && subscriptionLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-400">Loading subscription details...</p>
        </div>
      </div>
    );
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border-green-500/30';
      case 'Pending':
        return 'bg-gradient-to-r from-orange-500/20 to-amber-500/20 text-orange-400 border-orange-500/30';
      case 'Failed':
        return 'bg-gradient-to-r from-red-500/20 to-rose-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-3xl lg:text-4xl font-bold bg-gradient-to-r ${getGradientClasses(colorScheme, 'text')} bg-clip-text text-transparent mb-2`}>
            Invoices & Subscription
          </h1>
          <p className="text-gray-400 text-sm lg:text-base">Manage your subscription, billing, and payment history</p>
        </div>
      </div>

      {/* Premium Subscription Status Card */}
      {!subscriptionLoading && subscription && (
        <div className={`card-dark relative overflow-hidden border-2 ${
          subscription.status === 'active'
            ? 'bg-gradient-to-br from-green-900/20 via-gray-900/50 to-gray-900 border-green-500/30'
            : subscription.status === 'expired'
            ? 'bg-gradient-to-br from-orange-900/20 via-gray-900/50 to-gray-900 border-orange-500/30'
            : 'bg-gradient-to-br from-gray-900/50 via-gray-900/30 to-gray-900 border-gray-700'
        }`}>
          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-500/5 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-pink-500/5 to-transparent rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-6">
              <div className="flex items-start gap-4 flex-1">
                <div className={`p-4 rounded-xl ${
                  subscription.status === 'active'
                    ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30'
                    : subscription.status === 'expired'
                    ? 'bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-orange-500/30'
                    : 'bg-gradient-to-br from-gray-700/50 to-gray-800/50 border border-gray-600/30'
                }`}>
                  {subscription.status === 'active' ? (
                    <Shield className="h-8 w-8 text-green-400" />
                  ) : subscription.status === 'expired' ? (
                    <AlertCircle className="h-8 w-8 text-orange-400" />
                  ) : (
                    <Zap className="h-8 w-8 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl font-bold text-white">Subscription Status</h3>
              {subscription.status === 'active' && (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Active
                      </span>
                    )}
                  </div>
                  <p className={`text-lg font-medium ${
                    subscription.status === 'active'
                      ? 'text-green-400'
                      : subscription.status === 'expired'
                      ? 'text-orange-400'
                      : 'text-gray-400'
                  }`}>
                    {subscription.status === 'active'
                      ? 'Your subscription is active and ready to use'
                      : subscription.status === 'expired'
                      ? 'Your subscription has expired'
                      : 'No active subscription'}
                  </p>
                </div>
              </div>

              {subscription.status === 'active' && (
                <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <p className="text-xs sm:text-sm text-gray-400 max-w-md">
                    You can cancel your subscription at any time. You will retain access until the end of the current billing period.
                  </p>
                  <button
                    onClick={() => setShowCancelSubscriptionModal(true)}
                    className="px-4 py-2 rounded-lg text-xs sm:text-sm font-medium border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    Cancel Subscription
                  </button>
                </div>
              )}
              {subscription.status !== 'active' && (
                <button
                  onClick={handleSubscribe}
                  className={`px-6 py-3 rounded-xl font-semibold bg-gradient-to-r ${getGradientClasses(colorScheme, 'bg')} text-white hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg shadow-purple-500/25 flex items-center gap-2 whitespace-nowrap`}
                >
                  <CreditCard className="h-5 w-5" />
                  Subscribe Now
                </button>
              )}
            </div>

            {subscription.status === 'active' && (
              <div className="space-y-6">
                {/* Subscription Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                    <div className="flex items-center gap-3 mb-2">
                      <Calendar className="h-5 w-5 text-blue-400" />
                      <p className="text-sm text-gray-400 font-medium">Start Date</p>
                    </div>
                    <p className="text-lg font-semibold text-white">
                      {subscription.startDate
                        ? new Date(subscription.startDate).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })
                        : 'N/A'}
                    </p>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                    <div className="flex items-center gap-3 mb-2">
                      <TrendingUp className="h-5 w-5 text-purple-400" />
                      <p className="text-sm text-gray-400 font-medium">Expires On</p>
                    </div>
                    <p className="text-lg font-semibold text-white">
                      {subscription.endDate
                        ? new Date(subscription.endDate).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })
                        : 'Never'}
                    </p>
                  </div>
                </div>

                {/* Enhanced File Size Usage */}
                <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-xl p-6 border border-blue-500/20">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-500/30">
                        <HardDrive className="h-5 w-5 text-blue-400" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-white">Storage Usage</h4>
                        <p className="text-sm text-gray-400">Track your file storage consumption</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-white">
                        {subscription.fileSizeLimit.used.toFixed(2)}
                        <span className="text-lg text-gray-400"> / {subscription.fileSizeLimit.total}</span>
                      </p>
                      <p className="text-sm text-gray-400">{subscription.fileSizeLimit.unit}</p>
                    </div>
                  </div>
                  <div className="relative w-full bg-gray-800 rounded-full h-4 overflow-hidden border border-gray-700">
                    <div
                      className={`h-full bg-gradient-to-r ${getGradientClasses(colorScheme, 'bg')} transition-all duration-500 ease-out relative`}
                      style={{
                        width: `${Math.min(
                          (subscription.fileSizeLimit.used / subscription.fileSizeLimit.total) * 100,
                          100
                        )}%`
                      }}
                    >
                      <div className="absolute inset-0 bg-white/20 animate-shimmer"></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-sm text-gray-400">
                      <span className="text-green-400 font-semibold">
                        {subscription.fileSizeLimit.remaining.toFixed(2)} {subscription.fileSizeLimit.unit}
                      </span>
                      {' '}remaining
                    </p>
                    <p className="text-sm text-gray-400">
                      {((subscription.fileSizeLimit.used / subscription.fileSizeLimit.total) * 100).toFixed(1)}% used
                    </p>
                  </div>
                </div>
              </div>
            )}

            {subscription.status !== 'active' && (
              <div className="mt-6 p-5 bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/30 rounded-xl">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-orange-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-orange-300 mb-1">Subscription Required</p>
                    <p className="text-sm text-orange-400/80">
                      You need an active subscription to upload files. Subscribe now to get 250MB of storage space and start uploading your encrypted PDFs.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Enhanced Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          <div className="card-dark bg-gradient-to-br from-gray-900/80 to-gray-900/50 border-gray-700 hover:border-green-500/30 transition-all duration-300 hover:scale-[1.02] group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 group-hover:scale-110 transition-transform">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
            </div>
            <h3 className="text-gray-400 text-sm font-medium mb-1">Paid Invoices</h3>
            <p className="text-4xl font-bold text-white mb-2">{summary.paidInvoices}</p>
            <p className="text-xs text-gray-500">Successfully processed</p>
          </div>

          <div className="card-dark bg-gradient-to-br from-gray-900/80 to-gray-900/50 border-gray-700 hover:border-orange-500/30 transition-all duration-300 hover:scale-[1.02] group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-orange-500/30 group-hover:scale-110 transition-transform">
                <Clock className="h-6 w-6 text-orange-400" />
              </div>
            </div>
            <h3 className="text-gray-400 text-sm font-medium mb-1">Pending Invoices</h3>
            <p className="text-4xl font-bold text-white mb-2">{summary.pendingInvoices}</p>
            <p className="text-xs text-gray-500">Awaiting payment</p>
          </div>

          <div className="card-dark bg-gradient-to-br from-gray-900/80 to-gray-900/50 border-gray-700 hover:border-purple-500/30 transition-all duration-300 hover:scale-[1.02] group sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 group-hover:scale-110 transition-transform">
                <Receipt className="h-6 w-6 text-purple-400" />
              </div>
            </div>
            <h3 className="text-gray-400 text-sm font-medium mb-1">Total Invoices</h3>
            <p className="text-4xl font-bold text-white mb-2">{summary.paidInvoices + summary.pendingInvoices}</p>
            <p className="text-xs text-gray-500">All time</p>
          </div>
        </div>
      )}

      {/* Enhanced Invoices List */}
      {invoices.length > 0 ? (
        <div className="card-dark bg-gradient-to-br from-gray-900/80 to-gray-900/50 border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/30">
                <FileText className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Invoice History</h3>
                <p className="text-sm text-gray-400">View all your payment transactions</p>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto -mx-4 lg:mx-0">
            <div className="min-w-full inline-block align-middle">
              {/* Mobile Card View */}
              <div className="lg:hidden space-y-4 p-4">
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="card-dark bg-gray-800/50 border border-gray-700/50 p-5 space-y-4 hover:border-gray-600 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 mb-1 font-medium">Invoice ID</p>
                        <p className="text-sm text-white font-mono truncate font-semibold">{invoice.id}</p>
                      </div>
                      <span
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border ${getStatusBadgeClass(invoice.status)} whitespace-nowrap ml-3`}
                      >
                        {invoice.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-700">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Plan</p>
                        <p className="text-sm text-white font-semibold capitalize">{invoice.subscriptionPlan || invoice.type}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Amount</p>
                        <p className="text-lg text-white font-bold">{invoice.amount} <span className="text-sm text-gray-400">{invoice.currency}</span></p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500 mb-1">Date</p>
                        <p className="text-sm text-gray-300">{new Date(invoice.createdAt).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}</p>
                      </div>
                    </div>
                    <div className="flex justify-end pt-4 border-t border-gray-700">
                      <button
                        className="px-4 py-2 rounded-lg text-sm font-medium text-blue-400 hover:bg-blue-500/10 border border-blue-500/20 transition-all"
                        title="Download Invoice"
                      >
                        <Download className="h-4 w-4 inline mr-2" />
                        Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Enhanced Desktop Table View */}
              <div className="hidden lg:block overflow-hidden rounded-lg border border-gray-700">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 border-b border-gray-700">
                      <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Invoice ID</th>
                      <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Subscription Plan</th>
                      <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Amount</th>
                      <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Status</th>
                      <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Date</th>
                      <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice, index) => (
                      <tr
                        key={invoice.id}
                        className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-all duration-200"
                      >
                        <td className="py-5 px-6">
                          <span className="text-white font-mono text-sm font-medium">{invoice.id}</span>
                        </td>
                        <td className="py-5 px-6">
                          <span className="text-white font-semibold capitalize">{invoice.subscriptionPlan || invoice.type}</span>
                        </td>
                        <td className="py-5 px-6">
                          <span className="text-white font-bold text-lg">{invoice.amount}</span>
                          <span className="text-gray-400 text-sm ml-1">{invoice.currency}</span>
                        </td>
                        <td className="py-5 px-6">
                          <span
                            className={`px-4 py-1.5 rounded-full text-xs font-bold border ${getStatusBadgeClass(invoice.status)} inline-flex items-center gap-1`}
                          >
                            {invoice.status === 'Paid' && <CheckCircle className="h-3 w-3" />}
                            {invoice.status === 'Pending' && <Clock className="h-3 w-3" />}
                            {invoice.status}
                          </span>
                        </td>
                        <td className="py-5 px-6 text-gray-300 text-sm">
                          {new Date(invoice.createdAt).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </td>
                        <td className="py-5 px-6">
                          <button
                            className="p-2 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 rounded-lg transition-all border border-transparent hover:border-blue-500/20"
                            title="Download Invoice"
                          >
                            <Download className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
              </div>
            </div>
          </div>

          {/* Enhanced Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-5 border-t border-gray-700 mt-6">
              <p className="text-sm text-gray-400">
                Showing page <span className="text-white font-semibold">{page}</span> of <span className="text-white font-semibold">{totalPages}</span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-gray-700 disabled:border-gray-800 hover:border-gray-600"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="px-4 py-2.5 text-sm font-medium text-white bg-gray-800 rounded-lg border border-gray-700">
                  {page}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-gray-700 disabled:border-gray-800 hover:border-gray-600"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card-dark bg-gradient-to-br from-gray-900/80 to-gray-900/50 border-gray-700 text-center py-16">
          <div className="max-w-md mx-auto">
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`w-24 h-24 rounded-full bg-gradient-to-r ${getGradientClasses(colorScheme, 'bg')} opacity-10 blur-2xl`}></div>
              </div>
              <div className={`relative w-20 h-20 mx-auto rounded-2xl bg-gradient-to-r ${getGradientClasses(colorScheme, 'bg')} bg-opacity-10 border-2 border-purple-500/20 flex items-center justify-center`}>
                <Receipt className="h-10 w-10 text-gray-400" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">No Invoices Found</h3>
            <p className="text-gray-400 mb-6 leading-relaxed">
              You don't have any subscription invoices yet. Invoices will appear here after you subscribe to the platform and make your first payment.
            </p>
            {subscription?.status !== 'active' && (
              <button
                onClick={handleSubscribe}
                className={`px-8 py-4 rounded-xl font-semibold bg-gradient-to-r ${getGradientClasses(colorScheme, 'bg')} text-white hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg shadow-purple-500/25 inline-flex items-center gap-2`}
              >
                <CreditCard className="h-5 w-5" />
                <span>Subscribe Now - $10</span>
                <Sparkles className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Enhanced Subscribe Modal */}
      {showSubscribeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="card-dark max-w-lg w-full bg-gradient-to-br from-gray-900/95 to-gray-900/80 border-2 border-purple-500/30 relative overflow-hidden animate-in zoom-in-95 duration-200 my-8 max-h-[90vh] flex flex-col">
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-pink-500/10 to-transparent rounded-full blur-2xl"></div>
            
            <div className="relative z-10 flex flex-col flex-1 min-h-0">
              {/* Header - Fixed */}
              <div className="flex items-center justify-between mb-6 flex-shrink-0 px-6 pt-6">
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-purple-400" />
                  Subscribe to Platform
                </h3>
                <button
                  onClick={() => setShowSubscribeModal(false)}
                  className="text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg p-2 transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {/* Scrollable Content */}
              <div className="space-y-6 px-6 pb-6 overflow-y-auto flex-1">
                {/* Premium Plan Card */}
                <div className={`p-6 rounded-xl bg-gradient-to-br ${getGradientClasses(colorScheme, 'bg')} bg-opacity-10 border-2 border-purple-500/30 relative overflow-hidden`}>
                  <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full blur-xl"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xl font-bold text-white">Basic Subscription</h4>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white border border-white/20">
                        POPULAR
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-5xl font-bold text-white">$10</span>
                      <span className="text-gray-300">/ month</span>
                    </div>
                    <p className="text-sm text-gray-300 mb-6">Monthly subscription with automatic renewal</p>
                    
                    <ul className="space-y-3">
                      {[
                        '250MB file upload limit',
                        'Unlimited file uploads (within limit)',
                        '1 month subscription access',
                        'Priority support',
                        'Secure encryption & storage'
                      ].map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-3">
                          <div className="p-1 rounded-full bg-green-500/20 border border-green-500/30 flex-shrink-0">
                            <CheckCircle className="h-4 w-4 text-green-400" />
                          </div>
                          <span className="text-sm text-gray-200">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                {/* Payment Form */}
                <div className="space-y-4">
                  <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                    <div className="flex items-start gap-3">
                      <Shield className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-blue-300 mb-1">Secure Payment</p>
                        <p className="text-sm text-blue-400/80">
                          Your payment is processed securely through Square. Card details are encrypted and never stored on our servers.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Square Card Form Container */}
                  <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      Card Information
                    </label>
                    <div 
                      id="square-card-container" 
                      ref={paymentFormRef}
                      className="min-h-[120px]"
                    >
                      {!squareLoaded && (
                        <div className="flex items-center justify-center h-32">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent mx-auto mb-2"></div>
                            <p className="text-sm text-gray-400">Loading payment form...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Payment Button */}
                  <button
                    onClick={handlePayment}
                    disabled={paymentProcessing || !paymentForm || !squareLoaded}
                    className={`w-full px-6 py-4 rounded-xl font-bold text-lg bg-gradient-to-r ${getGradientClasses(colorScheme, 'bg')} text-white hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-lg shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3`}
                  >
                    {paymentProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-6 w-6 border-3 border-white border-t-transparent"></div>
                        <span>Processing Payment...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-6 w-6" />
                        <span>Pay with Square - $10.00</span>
                        <Sparkles className="h-5 w-5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Subscription Modal */}
      {showCancelSubscriptionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="card-dark max-w-md w-full bg-gradient-to-br from-gray-900/95 to-gray-900/80 border-2 border-red-500/30 relative overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-500/10 to-transparent rounded-full blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-orange-500/10 to-transparent rounded-full blur-2xl"></div>
            
            <div className="relative z-10 p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 rounded-lg bg-red-500/20 border border-red-500/30">
                  <AlertCircle className="h-6 w-6 text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Cancel Subscription</h3>
              </div>
              <div className="space-y-4">
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <p className="text-red-300 text-sm mb-2 font-semibold">Warning</p>
                  <p className="text-gray-300 text-sm">
                    Are you sure you want to cancel your subscription? You will lose access when the current period ends.
                  </p>
                </div>
                <div className="flex space-x-3 pt-2">
                  <button
                    onClick={handleCancelSubscription}
                    disabled={cancelling}
                    className="btn-primary flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {cancelling ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        <span>Cancelling...</span>
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4" />
                        <span>Yes, Cancel Subscription</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowCancelSubscriptionModal(false)}
                    disabled={cancelling}
                    className="btn-secondary flex-1 disabled:opacity-50"
                  >
                    No, Keep Active
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Status Modal */}
      {paymentStatus && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className={`card-dark max-w-md w-full bg-gradient-to-br from-gray-900/95 to-gray-900/80 border-2 ${
            paymentStatus === 'success' 
              ? 'border-green-500/30' 
              : 'border-red-500/30'
          } relative overflow-hidden animate-in zoom-in-95 duration-300`}>
            {/* Decorative Elements */}
            {paymentStatus === 'success' ? (
              <>
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/10 to-transparent rounded-full blur-2xl animate-pulse"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-emerald-500/10 to-transparent rounded-full blur-2xl animate-pulse"></div>
              </>
            ) : (
              <>
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-500/10 to-transparent rounded-full blur-2xl animate-pulse"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-orange-500/10 to-transparent rounded-full blur-2xl animate-pulse"></div>
              </>
            )}
            
            <div className="relative z-10 p-8 text-center">
              {/* Icon with animation */}
              <div className="mb-6 flex justify-center">
                {paymentStatus === 'success' ? (
                  <div className="relative">
                    <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-ping"></div>
                    <div className="relative w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500/30 flex items-center justify-center animate-in zoom-in-95 duration-300">
                      <CheckCircle className="h-12 w-12 text-green-400 animate-in zoom-in duration-500" />
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl animate-ping"></div>
                    <div className="relative w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500/30 flex items-center justify-center animate-in zoom-in-95 duration-300">
                      <X className="h-12 w-12 text-red-400 animate-in zoom-in duration-500" />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Status Text */}
              <h3 className={`text-3xl font-bold mb-3 ${
                paymentStatus === 'success' ? 'text-green-400' : 'text-red-400'
              } animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                {paymentStatus === 'success' ? 'Transaction Successful!' : 'Transaction Failed'}
              </h3>
              
              {paymentStatus === 'success' && (
                <p className="text-gray-300 text-sm animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
                  Your subscription has been activated successfully.
                </p>
              )}
              
              {paymentStatus === 'failed' && (
                <p className="text-gray-300 text-sm animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
                  Please try again or use a different payment method.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserInvoices;
