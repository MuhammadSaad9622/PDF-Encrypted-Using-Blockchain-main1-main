import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi, paymentApi } from '../../utils/api';
import { Lock, Mail, User, Eye, EyeOff, Phone, MapPin, Building, Key, Users, CheckCircle, ChevronRight, ChevronLeft, CreditCard, Shield, AlertCircle } from 'lucide-react';
import { useTheme, getGradientClasses } from '../../utils/theme';
import Web3AnimatedBackground from './Web3AnimatedBackground';
import countries from '../../utils/countries';
import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Payment Form Component using Stripe Elements
interface PaymentFormComponentProps {
  onVerify: (stripe: Stripe | null, elements: StripeElements | null) => Promise<void>;
  paymentProcessing: boolean;
  error: string | null;
}

const PaymentFormComponent: React.FC<PaymentFormComponentProps> = ({ onVerify, paymentProcessing, error }) => {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) {
      return;
    }
    await onVerify(stripe, elements);
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#e5e7eb',
        '::placeholder': {
          color: '#6b7280',
        },
        fontFamily: 'system-ui, -apple-system, sans-serif',
      },
      invalid: {
        color: '#ef4444',
        iconColor: '#ef4444',
      },
    },
    hidePostalCode: false,
  };

  return (
    <div className="space-y-4">
      <div className="relative bg-gradient-to-br from-gray-800/90 to-gray-900/90 border-2 border-gray-700/50 rounded-xl p-6 shadow-xl backdrop-blur-sm hover:border-blue-500/50 transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-purple-500/5 rounded-xl pointer-events-none"></div>
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent pointer-events-none"></div>
        
        <div className="relative z-10">
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Card Information
          </label>
          <div className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-4">
            <CardElement options={cardElementOptions} />
          </div>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-500/10 border-2 border-red-500/50 text-red-400 px-5 py-4 rounded-xl text-sm flex items-start space-x-3 backdrop-blur-sm">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5 text-red-400" />
          <div className="flex-1">
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}
      
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          handleSubmit(e as any);
        }}
        disabled={!stripe || paymentProcessing}
        className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {paymentProcessing ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block mr-2"></div>
            Verifying Card...
          </>
        ) : (
          'Continue to Agreements'
        )}
      </button>
    </div>
  );
};

const SignUp = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [totalSteps, setTotalSteps] = useState(5);

  // Step 1: Access Code
  const [accessCode, setAccessCode] = useState('');
  const [accessCodeValid, setAccessCodeValid] = useState(false);
  const [validatingAccessCode, setValidatingAccessCode] = useState(false);
  const [accessCodeError, setAccessCodeError] = useState<string | null>(null);
  const [accessCodeInfo, setAccessCodeInfo] = useState<{ subscriptionPlan?: string; subscriptionDuration?: number; requiresPayment?: boolean } | null>(null);
  
  // Payment step (added if access code requires payment)
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [stripeLoaded, setStripeLoaded] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null);

  // Step 2: Basic Info
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 3: Profile Data
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [province, setProvince] = useState('');
  const [country, setCountry] = useState('');
  const [zipCode, setZipCode] = useState('');

  // Step 4: Referral
  const [referralCode, setReferralCode] = useState('');
  const [referralValid, setReferralValid] = useState(false);
  const [validatingReferral, setValidatingReferral] = useState(false);
  const [referralError, setReferralError] = useState<string | null>(null);
  const [referrerName, setReferrerName] = useState<string | null>(null);

  // Step 5: Agreements
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [agreedToEarlyAdopter, setAgreedToEarlyAdopter] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { colorScheme } = useTheme();

  // Load Stripe config on mount if needed or when payment step is reached
  useEffect(() => {
    if (accessCodeInfo?.requiresPayment || accessCodeInfo?.subscriptionPlan || currentStep === 5) {
      console.log('Loading Stripe config - accessCodeInfo:', accessCodeInfo, 'currentStep:', currentStep);
      loadStripeConfig();
    }
  }, [accessCodeInfo?.requiresPayment, accessCodeInfo?.subscriptionPlan, currentStep]);

  const loadStripeConfig = async () => {
    try {
      const response = await paymentApi.getStripeConfig();
      if (response?.success && response?.config?.publishableKey) {
        const stripe = loadStripe(response.config.publishableKey);
        setStripePromise(stripe);
        setStripeLoaded(true);
      }
    } catch (error: any) {
      console.error('Error loading Stripe config:', error);
      setError('Failed to load payment system. Please refresh the page.');
    }
  };

  // Validate access code
  const handleValidateAccessCode = async () => {
    if (!accessCode.trim()) {
      setAccessCodeError('Access code is required');
      return;
    }

    setValidatingAccessCode(true);
    setAccessCodeError(null);

    try {
      const response = await authApi.validateAccessCode(accessCode);
      console.log('Access code validation response:', response);
      if (response.valid) {
        setAccessCodeValid(true);
        setAccessCodeError(null);
        
        // Store access code info (including subscription details)
        // Check if payment is required: either requiresPayment flag or subscriptionPlan exists
        const hasSubscriptionPlan = !!(response.subscriptionPlan);
        const requiresPayment = response.requiresPayment !== undefined 
          ? response.requiresPayment 
          : hasSubscriptionPlan;
        
        const codeInfo = {
          subscriptionPlan: response.subscriptionPlan || undefined,
          subscriptionDuration: response.subscriptionDuration || undefined,
          requiresPayment: requiresPayment
        };
        console.log('Access code info:', codeInfo);
        console.log('hasSubscriptionPlan:', hasSubscriptionPlan, 'requiresPayment:', requiresPayment);
        setAccessCodeInfo(codeInfo);
        
        // Adjust total steps if payment is required (check both requiresPayment flag and subscriptionPlan)
        // Payment step is step 5, agreements is step 6 when payment is required
        if (requiresPayment || hasSubscriptionPlan) {
          console.log('Payment required - setting totalSteps to 6 (payment at step 5, agreements at step 6)');
          setTotalSteps(6); // Payment at step 5, agreements at step 6
        } else {
          console.log('No payment required - setting totalSteps to 5');
          setTotalSteps(5); // Normal flow (no payment step)
        }
      } else {
        setAccessCodeValid(false);
        setAccessCodeError(response.error || 'Invalid access code');
        setAccessCodeInfo(null);
        setTotalSteps(5);
      }
    } catch (err: any) {
      setAccessCodeValid(false);
      setAccessCodeError(err.message || 'Invalid access code');
      setAccessCodeInfo(null);
      setTotalSteps(5);
    } finally {
      setValidatingAccessCode(false);
    }
  };

  // Validate referral code
  const handleValidateReferralCode = async () => {
    if (!referralCode.trim()) {
      setReferralError('Please enter a referral code or leave blank');
      setReferralValid(false);
      return;
    }

    setValidatingReferral(true);
    setReferralError(null);

    try {
      const response = await authApi.validateReferralCode(referralCode);
      if (response.valid) {
        setReferralValid(true);
        setReferrerName(response.referrerName || null);
        setReferralError(null);
      } else {
        setReferralValid(false);
        setReferralError(response.error || 'Invalid referral code');
      }
    } catch (err: any) {
      setReferralValid(false);
      setReferralError(err.message || 'Invalid referral code');
    } finally {
      setValidatingReferral(false);
    }
  };

  // Navigate to next step
  const handleNext = () => {
    if (currentStep === 1) {
      if (!accessCodeValid) {
        setAccessCodeError('Please validate your access code first');
        return;
      }
    } else if (currentStep === 2) {
      if (!email || !password || !confirmPassword) {
        setError('Please fill in all required fields');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters long');
        return;
      }
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError('Please enter a valid email address');
        return;
      }
    } else if (currentStep === 3) {
      if (!name || !name.trim()) {
        setError('Name is required');
        return;
      }
      if (!phone || !phone.trim()) {
        setError('Phone number is required');
        return;
      }
      if (!address || !address.trim()) {
        setError('Address is required');
        return;
      }
      if (!city || !city.trim()) {
        setError('City is required');
        return;
      }
      if (!country || !country.trim()) {
        setError('Country is required');
        return;
      }
      if (!zipCode || !zipCode.trim()) {
        setError('Zip/Postal code is required');
        return;
      }
    } else if (currentStep === 4) {
      // Referral is optional, but if provided, it must be valid
      if (referralCode && referralCode.trim() && !referralValid) {
        setReferralError('Please validate your referral code or remove it');
        return;
      }
    } else if (currentStep === 5) {
      // Step 5: Payment (if required) or Agreements (if no payment)
      if (accessCodeInfo?.requiresPayment || accessCodeInfo?.subscriptionPlan) {
        // Payment step - verification is handled by PaymentFormComponent
        // This should not be reached if payment form is properly set up
        setError('Please verify your payment information using the button below.');
        return;
      } else {
        // No payment required - check agreements
        if (!agreedToTerms || !agreedToPrivacy || !agreedToEarlyAdopter) {
          setError('You must agree to all terms and policies');
          return;
        }
        handleSubmit();
        return;
      }
    } else if (currentStep === 6) {
      // Step 6: Agreements (only if payment was required) - Payment already verified on step 5
      if (!agreedToTerms || !agreedToPrivacy || !agreedToEarlyAdopter) {
        setError('You must agree to all terms and policies');
        return;
      }
      // Payment was already verified on step 5, so just submit
      handleSubmit();
      return;
    }

    setError(null);
    setCurrentStep(currentStep + 1);
  };

  // Navigate to previous step
  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };

  // Verify card before proceeding to agreements step (called from payment step)
  // This will be called from the PaymentFormComponent
  const handleVerifyCardBeforeAgreements = async (stripe: Stripe | null, elements: StripeElements | null) => {
    if (!stripe || !elements) {
      setError('Payment system is not ready. Please wait a moment and try again.');
      return;
    }

    setPaymentProcessing(true);
    setError(null);

    try {
      // Step 1: Get card element
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        setError('Card information is required');
        setPaymentProcessing(false);
        return;
      }

      // Step 2: Create payment method
      console.log('Creating payment method...');
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (pmError || !paymentMethod) {
        const errorMessage = pmError?.message || 'Please enter valid card information';
        console.error('Payment method creation failed:', pmError);
        setError(errorMessage);
        setPaymentProcessing(false);
        return;
      }

      console.log('Payment method created:', paymentMethod.id);

      // Step 3: Verify card using Setup Intent (no charge)
      try {
        console.log('Verifying card with backend...');
        const verificationResponse = await paymentApi.verifyCard(paymentMethod.id);
        
        console.log('Verification response:', verificationResponse);
        
        if (verificationResponse.success && verificationResponse.verified) {
          // Store the payment method ID for later use in handleSubmit
          setPaymentMethodId(paymentMethod.id);
          // Clear any previous errors
          setError(null);
          // Proceed to agreements step
          setCurrentStep(6);
          setPaymentProcessing(false);
        } else if (verificationResponse.requiresAction && verificationResponse.clientSecret) {
          // Handle 3D Secure authentication for Setup Intent
          console.log('Card requires 3D Secure authentication...');
          const { error: confirmError } = await stripe.confirmCardSetup(verificationResponse.clientSecret, {
            payment_method: {
              card: cardElement,
            }
          });

          if (confirmError) {
            console.error('3D Secure confirmation failed:', confirmError);
            setError(confirmError.message || 'Card verification failed. Please try again.');
            setPaymentProcessing(false);
          } else {
            // 3D Secure authentication successful, card is verified
            setPaymentMethodId(paymentMethod.id);
            setError(null);
            setCurrentStep(6);
            setPaymentProcessing(false);
          }
        } else {
          const errorMsg = verificationResponse.error || 'Card verification failed. Please check your card information.';
          console.error('Verification failed:', errorMsg);
          setError(errorMsg);
          setPaymentProcessing(false);
        }
      } catch (verifyError: any) {
        console.error('Verification error:', verifyError);
        const errorMsg = verifyError.error || verifyError.message || verifyError.detail || 'Card verification failed. Please check your card information.';
        setError(errorMsg);
        setPaymentProcessing(false);
      }
    } catch (err: any) {
      console.error('Unexpected error:', err);
      const errorMessage = err.message || 'Please enter valid card information';
      setError(errorMessage);
      setPaymentProcessing(false);
    }
  };


  // Submit form
  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      // If payment is required, use the already validated payment method ID (should already be set from step 5)
      let finalPaymentMethodId: string | null = null;
      if ((accessCodeInfo?.requiresPayment || accessCodeInfo?.subscriptionPlan) && currentStep === 6) {
        if (!paymentMethodId) {
          throw new Error('Payment method not found. Please go back and verify your card.');
        } else {
          finalPaymentMethodId = paymentMethodId;
        }
      }

      const signupData: any = {
        email,
        password,
        name,
        accessCode,
        referralCode: referralCode && referralValid ? referralCode : undefined,
        phone,
        address,
        city,
        state: state || undefined,
        province: province || undefined,
        country,
        zipCode,
        agreedToTerms,
        agreedToPrivacy,
        agreedToEarlyAdopter,
      };

      // Include payment method ID if provided
      if (finalPaymentMethodId) {
        signupData.paymentMethodId = finalPaymentMethodId;
      }

      const response = await authApi.signup(signupData);
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  // Step indicator
  const StepIndicator = () => {
    const stepsArray = Array.from({ length: totalSteps }, (_, i) => i + 1);
    return (
    <div className="flex items-center justify-center mb-8">
      {stepsArray.map((step) => (
        <div key={step} className="flex items-center">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
              step === currentStep
                ? `bg-gradient-to-r ${getGradientClasses(colorScheme, 'bg')} text-white`
                : step < currentStep
                ? 'bg-green-500 text-white'
                : 'bg-gray-700 text-gray-400'
            }`}
          >
            {step < currentStep ? <CheckCircle className="w-6 h-6" /> : step}
          </div>
          {step < totalSteps && (
            <div
              className={`w-12 h-1 mx-2 ${
                step < currentStep ? 'bg-green-500' : 'bg-gray-700'
              }`}
            />
          )}
        </div>
      ))}
    </div>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg px-4 relative overflow-hidden">
      <Web3AnimatedBackground />
      <div className="max-w-2xl w-full relative z-10">
        <div className="card-dark backdrop-blur-md" style={{ backgroundColor: 'rgba(26, 26, 46, 0.85)' }}>
          <div className="text-center mb-8">
            <h1 className={`text-3xl font-bold bg-gradient-to-r ${getGradientClasses(colorScheme, 'text')} bg-clip-text text-transparent mb-2`}>
              Create Your Account
            </h1>
            <p className="text-gray-400 text-sm">Protect and manage PDFs with blockchain security</p>
          </div>

          <StepIndicator />

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm mb-6">
              {error}
            </div>
          )}

          {/* Step 1: Access Code */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Access Code <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    value={accessCode}
                    onChange={(e) => {
                      setAccessCode(e.target.value.toUpperCase());
                      setAccessCodeValid(false);
                      setAccessCodeError(null);
                    }}
                    className="input-dark w-full pl-10"
                    placeholder="Enter your access code"
                    disabled={accessCodeValid}
                  />
                </div>
                {accessCodeError && (
                  <p className="text-red-400 text-sm mt-1">{accessCodeError}</p>
                )}
                {accessCodeValid && (
                  <p className="text-green-400 text-sm mt-1">✓ Access code validated</p>
                )}
              </div>
              <button
                type="button"
                onClick={handleValidateAccessCode}
                disabled={validatingAccessCode || accessCodeValid}
                className="btn-primary w-full py-3"
              >
                {validatingAccessCode ? 'Validating...' : accessCodeValid ? 'Validated ✓' : 'Validate Access Code'}
              </button>
            </div>
          )}

          {/* Step 2: Basic Info */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-dark w-full pl-10"
                    placeholder="your@email.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-dark w-full pl-10 pr-10"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <p className="text-gray-500 text-xs mt-1">Must be at least 6 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Confirm Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-dark w-full pl-10 pr-10"
                    placeholder="••••••••"
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
            </div>
          )}

          {/* Step 3: Profile Data */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-dark w-full pl-10"
                    placeholder="John Doe"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Phone Number <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="input-dark w-full pl-10"
                    placeholder="+1 234 567 8900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Street Address <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="input-dark w-full pl-10"
                    placeholder="123 Main Street"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    City <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="input-dark w-full"
                    placeholder="New York"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Country <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="input-dark w-full"
                    required
                  >
                    <option value="">Select Country</option>
                    {countries.map((c) => (
                      <option key={c.code} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {(country === 'United States' || country === 'Canada' || country === 'Australia') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {country === 'United States' ? 'State' : country === 'Canada' ? 'Province' : 'State/Province'}
                    </label>
                    <input
                      type="text"
                      value={country === 'Canada' ? province : state}
                      onChange={(e) => {
                        if (country === 'Canada') {
                          setProvince(e.target.value);
                        } else {
                          setState(e.target.value);
                        }
                      }}
                      className="input-dark w-full"
                      placeholder={country === 'United States' ? 'California' : 'Ontario'}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Zip/Postal Code <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    className="input-dark w-full"
                    placeholder="12345"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Referral */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Referral Code (Optional)
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    value={referralCode}
                    onChange={(e) => {
                      setReferralCode(e.target.value.toUpperCase());
                      setReferralValid(false);
                      setReferralError(null);
                      setReferrerName(null);
                    }}
                    className="input-dark w-full pl-10"
                    placeholder="Enter referral code (optional)"
                  />
                </div>
                {referralError && (
                  <p className="text-red-400 text-sm mt-1">{referralError}</p>
                )}
                {referralValid && referrerName && (
                  <p className="text-green-400 text-sm mt-1">✓ Referred by: {referrerName}</p>
                )}
              </div>
              {referralCode && (
                <button
                  type="button"
                  onClick={handleValidateReferralCode}
                  disabled={validatingReferral || referralValid}
                  className="btn-secondary w-full py-3"
                >
                  {validatingReferral ? 'Validating...' : referralValid ? 'Validated ✓' : 'Validate Referral Code'}
                </button>
              )}
              <p className="text-gray-500 text-sm text-center">
                If you were referred by someone, enter their referral code here. Otherwise, you can skip this step.
              </p>
            </div>
          )}

          {/* Step 5: Payment (if access code requires payment) OR Agreements (if no payment) */}
          {currentStep === 5 && (
            <>
              {/* Show payment if required */}
              {(accessCodeInfo?.requiresPayment || accessCodeInfo?.subscriptionPlan) ? (
                <div className="space-y-6">
                  {/* Enhanced Payment Info Banner */}
                  <div className="relative overflow-hidden bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 border border-blue-400/30 rounded-xl p-6 backdrop-blur-sm">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl"></div>
                    <div className="relative flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                          <Shield className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                          Payment Required
                          <span className="text-xs font-normal px-2 py-1 bg-blue-500/30 rounded-full text-blue-200">
                            Secure
                          </span>
                        </h3>
                        <p className="text-gray-200 text-sm leading-relaxed">
                          Your access code includes a <span className="font-semibold text-white">
                            {accessCodeInfo?.subscriptionPlan === 'lifetime' ? 'lifetime' : 
                            accessCodeInfo?.subscriptionPlan === 'monthly' ? 'monthly' : 
                            accessCodeInfo?.subscriptionPlan === 'yearly' ? 'yearly' : 'subscription'}
                          </span> subscription.
                          {accessCodeInfo?.subscriptionDuration && (
                            <span className="text-green-400 font-medium"> You'll receive {accessCodeInfo.subscriptionDuration} days free.</span>
                          )}
                          {' '}Please provide your payment information to continue. Your card will be charged after the free period ends.
                        </p>
                      </div>
                    </div>
                  </div>

                    {/* Enhanced Payment Form Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-base font-semibold text-white flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-blue-400" />
                        Payment Information
                        <span className="text-red-400">*</span>
                      </label>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Shield className="h-3 w-3 text-green-400" />
                        <span>Secured by Stripe</span>
                      </div>
                    </div>
                    
                    {stripeLoaded && stripePromise ? (
                      <Elements stripe={stripePromise}>
                        <PaymentFormComponent
                          onVerify={handleVerifyCardBeforeAgreements}
                          paymentProcessing={paymentProcessing}
                          error={error}
                        />
                      </Elements>
                    ) : (
                      <div className="relative bg-gradient-to-br from-gray-800/90 to-gray-900/90 border-2 border-gray-700/50 rounded-xl p-6 min-h-[220px] shadow-xl backdrop-blur-sm">
                        <div className="flex flex-col items-center justify-center h-32 space-y-3">
                          <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                          <div className="text-gray-400 text-sm">Loading secure payment form...</div>
                        </div>
                      </div>
                    )}
                    
                    {/* Security badges */}
                    <div className="flex items-center justify-center gap-6 pt-2">
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span>256-bit SSL Encryption</span>
                      </div>
                      <div className="w-px h-4 bg-gray-700"></div>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Shield className="h-3 w-3 text-green-400" />
                        <span>PCI DSS Compliant</span>
                      </div>
                      <div className="w-px h-4 bg-gray-700"></div>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Lock className="h-3 w-3 text-blue-400" />
                        <span>Your card details are never stored</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Show agreements if no payment required */
                <div className="space-y-6">
                  <div className="space-y-4">
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        className="mt-1 w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-300 text-sm">
                        I agree to the{' '}
                        <Link to="/terms" target="_blank" className="text-blue-400 hover:underline">
                          Terms of Service
                        </Link>{' '}
                        <span className="text-red-400">*</span>
                      </span>
                    </label>

                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agreedToPrivacy}
                        onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                        className="mt-1 w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-300 text-sm">
                        I agree to the{' '}
                        <Link to="/privacy" target="_blank" className="text-blue-400 hover:underline">
                          Privacy Policy
                        </Link>{' '}
                        <span className="text-red-400">*</span>
                      </span>
                    </label>

                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agreedToEarlyAdopter}
                        onChange={(e) => setAgreedToEarlyAdopter(e.target.checked)}
                        className="mt-1 w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-300 text-sm">
                        I agree to the{' '}
                        <Link to="/early-adopter" target="_blank" className="text-blue-400 hover:underline">
                          Early Adopter Access Agreement
                        </Link>{' '}
                        <span className="text-red-400">*</span>
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Step 6: Agreements (only shown if payment was required at step 5) */}
          {currentStep === 6 && (accessCodeInfo?.requiresPayment || accessCodeInfo?.subscriptionPlan) && (
            <div className="space-y-6">
              <div className="space-y-4">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-300 text-sm">
                    I agree to the{' '}
                    <Link to="/terms" target="_blank" className="text-blue-400 hover:underline">
                      Terms of Service
                    </Link>{' '}
                    <span className="text-red-400">*</span>
                  </span>
                </label>

                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToPrivacy}
                    onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-300 text-sm">
                    I agree to the{' '}
                    <Link to="/privacy" target="_blank" className="text-blue-400 hover:underline">
                      Privacy Policy
                    </Link>{' '}
                    <span className="text-red-400">*</span>
                  </span>
                </label>

                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToEarlyAdopter}
                    onChange={(e) => setAgreedToEarlyAdopter(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-300 text-sm">
                    I agree to the{' '}
                    <Link to="/early-adopter" target="_blank" className="text-blue-400 hover:underline">
                      Early Adopter Access Agreement
                    </Link>{' '}
                    <span className="text-red-400">*</span>
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          {/* Hide Next button on payment step (step 5) if payment is required - PaymentFormComponent has its own button */}
          {!(currentStep === 5 && (accessCodeInfo?.requiresPayment || accessCodeInfo?.subscriptionPlan)) && (
            <div className="flex justify-between mt-8">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={currentStep === 1}
                className="btn-secondary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
                <span>Previous</span>
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={loading || paymentProcessing}
                className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {(loading || paymentProcessing) && (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                )}
                <span>
                  {currentStep === totalSteps 
                    ? (loading || paymentProcessing ? 'Creating Account...' : 'Create Account')
                    : currentStep === 6
                    ? (loading ? 'Creating Account...' : 'Create Account')
                    : 'Next'}
                </span>
                {currentStep < totalSteps && <ChevronRight className="w-5 h-5" />}
              </button>
            </div>
          )}
          
          {/* Show Previous button only on payment step */}
          {currentStep === 5 && (accessCodeInfo?.requiresPayment || accessCodeInfo?.subscriptionPlan) && (
            <div className="flex justify-start mt-8">
              <button
                type="button"
                onClick={handlePrevious}
                className="btn-secondary flex items-center space-x-2"
              >
                <ChevronLeft className="w-5 h-5" />
                <span>Previous</span>
              </button>
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              Already have an account?{' '}
              <Link to="/signin" className={`font-medium bg-gradient-to-r ${getGradientClasses(colorScheme, 'text')} bg-clip-text text-transparent hover:opacity-80`}>
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
