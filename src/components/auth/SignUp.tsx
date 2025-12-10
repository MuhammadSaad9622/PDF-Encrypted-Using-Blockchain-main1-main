import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../utils/api';
import { Lock, Mail, User, Eye, EyeOff, Phone, MapPin, Building, Key, Users, CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { useTheme, getGradientClasses } from '../../utils/theme';
import Web3AnimatedBackground from './Web3AnimatedBackground';
import countries from '../../utils/countries';

const SignUp = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;

  // Step 1: Access Code
  const [accessCode, setAccessCode] = useState('');
  const [accessCodeValid, setAccessCodeValid] = useState(false);
  const [validatingAccessCode, setValidatingAccessCode] = useState(false);
  const [accessCodeError, setAccessCodeError] = useState<string | null>(null);

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
      if (response.valid) {
        setAccessCodeValid(true);
        setAccessCodeError(null);
      } else {
        setAccessCodeValid(false);
        setAccessCodeError(response.error || 'Invalid access code');
      }
    } catch (err: any) {
      setAccessCodeValid(false);
      setAccessCodeError(err.message || 'Invalid access code');
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
        setError('Please fill in all fields');
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
    } else if (currentStep === 3) {
      if (!name || !phone || !address || !city || !country || !zipCode) {
        setError('Please fill in all required fields');
        return;
      }
    } else if (currentStep === 4) {
      // Referral is optional, so we can proceed
      if (referralCode && !referralValid) {
        setReferralError('Please validate your referral code or remove it');
        return;
      }
    } else if (currentStep === 5) {
      if (!agreedToTerms || !agreedToPrivacy || !agreedToEarlyAdopter) {
        setError('You must agree to all terms and policies');
        return;
      }
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

  // Submit form
  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      const signupData = {
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
  const StepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3, 4, 5].map((step) => (
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

          {/* Step 5: Agreements */}
          {currentStep === 5 && (
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
              disabled={loading}
              className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{currentStep === totalSteps ? (loading ? 'Creating Account...' : 'Create Account') : 'Next'}</span>
              {currentStep < totalSteps && <ChevronRight className="w-5 h-5" />}
            </button>
          </div>

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
