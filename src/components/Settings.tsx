import { useState, useEffect, useRef } from 'react';
import { 
  User, 
  Save, 
  Camera, 
  Palette, 
  Moon, 
  Sun,
  Mail,
  Edit2,
  Check,
  X,
  Image as ImageIcon,
  Sparkles,
  Phone,
  MapPin,
  Building,
  Briefcase,
  Globe,
  FileText,
  Home
} from 'lucide-react';
import { authApi } from '../utils/api';
import { useTheme, colorSchemes, type ColorScheme, type Theme } from '../utils/theme';

const Settings = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Profile state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [website, setWebsite] = useState('');
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Theme state
  const { theme, colorScheme, setTheme, setColorScheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'profile' | 'theme'>('profile');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await authApi.getCurrentUser();
        setUser(response.user);
        setName(response.user.name || '');
        setEmail(response.user.email || '');
        setProfilePhoto(response.user.profilePhoto || null);
        setBio(response.user.bio || '');
        setPhone(response.user.phone || '');
        setAddress(response.user.address || '');
        setCity(response.user.city || '');
        setCountry(response.user.country || '');
        setZipCode(response.user.zipCode || '');
        setWebsite(response.user.website || '');
        setCompany(response.user.company || '');
        setJobTitle(response.user.jobTitle || '');
      } catch (error) {
        console.error('Failed to load user:', error);
      }
    };
    loadUser();
  }, []);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await authApi.updateProfile({
        name,
        email,
        profilePhoto,
        bio,
        phone,
        address,
        city,
        country,
        zipCode,
        website,
        company,
        jobTitle
      });
      
      setUser(response.user);
      localStorage.setItem('user', JSON.stringify(response.user));
      setSuccess('Profile updated successfully');
      setIsEditingProfile(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    setSuccess('Theme updated successfully');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleColorSchemeChange = (newScheme: ColorScheme) => {
    setColorScheme(newScheme);
    setSuccess('Color scheme updated successfully');
    setTimeout(() => setSuccess(null), 3000);
  };

  const getGradientClasses = (scheme: ColorScheme) => {
    return colorSchemes[scheme].primary;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          Settings
        </h1>
      </div>

      {/* Success/Error Messages */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="hover:text-red-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="hover:text-green-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-2 border-b border-gray-800">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-6 py-3 font-medium transition-colors relative ${
            activeTab === 'profile'
              ? 'text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>Profile</span>
          </div>
          {activeTab === 'profile' && (
            <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${getGradientClasses(colorScheme)}`} />
          )}
        </button>
        <button
          onClick={() => setActiveTab('theme')}
          className={`px-6 py-3 font-medium transition-colors relative ${
            activeTab === 'theme'
              ? 'text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Palette className="h-4 w-4" />
            <span>Theme & Colors</span>
          </div>
          {activeTab === 'theme' && (
            <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${getGradientClasses(colorScheme)}`} />
          )}
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="card-dark">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold mb-1">Profile Settings</h2>
              <p className="text-sm text-gray-400">Manage your account information and profile photo</p>
            </div>
            {!isEditingProfile && (
              <button
                onClick={() => setIsEditingProfile(true)}
                className="btn-secondary flex items-center space-x-2"
              >
                <Edit2 className="h-4 w-4" />
                <span>Edit Profile</span>
              </button>
            )}
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-6">
            {/* Profile Photo */}
            <div className="flex items-center space-x-6">
              <div className="relative">
                <div className="h-24 w-24 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 p-0.5">
                  <div className="h-full w-full rounded-full bg-dark-card flex items-center justify-center overflow-hidden">
                    {profilePhoto ? (
                      <img
                        src={profilePhoto}
                        alt="Profile"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-12 w-12 text-gray-400" />
                    )}
                  </div>
                </div>
                {isEditingProfile && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 flex items-center justify-center hover:opacity-90 transition-opacity shadow-lg"
                  >
                    <Camera className="h-4 w-4 text-white" />
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-white mb-1">Profile Photo</h3>
                <p className="text-sm text-gray-400">
                  {isEditingProfile
                    ? 'Click the camera icon to upload a new photo (max 5MB)'
                    : 'Upload a profile photo to personalize your account'}
                </p>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Full Name
              </label>
              {isEditingProfile ? (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-dark w-full"
                  placeholder="Enter your name"
                />
              ) : (
                <p className="text-white py-3 px-4 bg-dark-hover rounded-lg">
                  {name || 'Not set'}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span>Email Address</span>
              </label>
              {isEditingProfile ? (
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-dark w-full"
                  placeholder="Enter your email"
                />
              ) : (
                <p className="text-white py-3 px-4 bg-dark-hover rounded-lg">
                  {email || 'Not set'}
                </p>
              )}
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Bio</span>
              </label>
              {isEditingProfile ? (
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="input-dark w-full min-h-[100px] resize-y"
                  placeholder="Tell us about yourself..."
                  maxLength={500}
                />
              ) : (
                <p className="text-white py-3 px-4 bg-dark-hover rounded-lg min-h-[60px]">
                  {bio || 'Not set'}
                </p>
              )}
            </div>

            {/* Contact Information Section */}
            <div className="pt-4 border-t border-gray-800">
              <h3 className="text-lg font-semibold text-white mb-4">Contact Information</h3>
              
              {/* Phone */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center space-x-2">
                  <Phone className="h-4 w-4" />
                  <span>Phone Number</span>
                </label>
                {isEditingProfile ? (
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="input-dark w-full"
                    placeholder="Enter your phone number"
                  />
                ) : (
                  <p className="text-white py-3 px-4 bg-dark-hover rounded-lg">
                    {phone || 'Not set'}
                  </p>
                )}
              </div>

              {/* Address */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center space-x-2">
                  <Home className="h-4 w-4" />
                  <span>Street Address</span>
                </label>
                {isEditingProfile ? (
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="input-dark w-full"
                    placeholder="Enter your street address"
                  />
                ) : (
                  <p className="text-white py-3 px-4 bg-dark-hover rounded-lg">
                    {address || 'Not set'}
                  </p>
                )}
              </div>

              {/* City, Country, Zip Code Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center space-x-2">
                    <MapPin className="h-4 w-4" />
                    <span>City</span>
                  </label>
                  {isEditingProfile ? (
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="input-dark w-full"
                      placeholder="City"
                    />
                  ) : (
                    <p className="text-white py-3 px-4 bg-dark-hover rounded-lg">
                      {city || 'Not set'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center space-x-2">
                    <MapPin className="h-4 w-4" />
                    <span>Country</span>
                  </label>
                  {isEditingProfile ? (
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="input-dark w-full"
                      placeholder="Country"
                    />
                  ) : (
                    <p className="text-white py-3 px-4 bg-dark-hover rounded-lg">
                      {country || 'Not set'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center space-x-2">
                    <MapPin className="h-4 w-4" />
                    <span>Zip/Postal Code</span>
                  </label>
                  {isEditingProfile ? (
                    <input
                      type="text"
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      className="input-dark w-full"
                      placeholder="Zip Code"
                    />
                  ) : (
                    <p className="text-white py-3 px-4 bg-dark-hover rounded-lg">
                      {zipCode || 'Not set'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Professional Information Section */}
            <div className="pt-4 border-t border-gray-800">
              <h3 className="text-lg font-semibold text-white mb-4">Professional Information</h3>
              
              {/* Company */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center space-x-2">
                  <Building className="h-4 w-4" />
                  <span>Company</span>
                </label>
                {isEditingProfile ? (
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="input-dark w-full"
                    placeholder="Enter your company name"
                  />
                ) : (
                  <p className="text-white py-3 px-4 bg-dark-hover rounded-lg">
                    {company || 'Not set'}
                  </p>
                )}
              </div>

              {/* Job Title */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center space-x-2">
                  <Briefcase className="h-4 w-4" />
                  <span>Job Title</span>
                </label>
                {isEditingProfile ? (
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="input-dark w-full"
                    placeholder="Enter your job title"
                  />
                ) : (
                  <p className="text-white py-3 px-4 bg-dark-hover rounded-lg">
                    {jobTitle || 'Not set'}
                  </p>
                )}
              </div>

              {/* Website */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center space-x-2">
                  <Globe className="h-4 w-4" />
                  <span>Website</span>
                </label>
                {isEditingProfile ? (
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="input-dark w-full"
                    placeholder="https://yourwebsite.com"
                  />
                ) : (
                  <p className="text-white py-3 px-4 bg-dark-hover rounded-lg">
                    {website ? (
                      <a href={website} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">
                        {website}
                      </a>
                    ) : (
                      'Not set'
                    )}
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            {isEditingProfile && (
              <div className="flex items-center space-x-3 pt-4 border-t border-gray-800">
                <button
                  type="submit"
                  disabled={loading}
                  className={`btn-primary flex items-center space-x-2 bg-gradient-to-r ${getGradientClasses(colorScheme)}`}
                >
                  <Save className="h-4 w-4" />
                  <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingProfile(false);
                    setName(user?.name || '');
                    setEmail(user?.email || '');
                    setProfilePhoto(user?.profilePhoto || null);
                    setBio(user?.bio || '');
                    setPhone(user?.phone || '');
                    setAddress(user?.address || '');
                    setCity(user?.city || '');
                    setCountry(user?.country || '');
                    setZipCode(user?.zipCode || '');
                    setWebsite(user?.website || '');
                    setCompany(user?.company || '');
                    setJobTitle(user?.jobTitle || '');
                  }}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <X className="h-4 w-4" />
                  <span>Cancel</span>
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* Theme Tab */}
      {activeTab === 'theme' && (
        <div className="space-y-6">
          {/* Theme Selection */}
          <div className="card-dark">
            <div className="flex items-center space-x-2 mb-4">
              <Moon className="h-5 w-5 text-purple-400" />
              <h2 className="text-xl font-semibold">Appearance</h2>
            </div>
            <p className="text-sm text-gray-400 mb-6">Choose your preferred theme</p>
            
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleThemeChange('dark')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  theme === 'dark'
                    ? `border-purple-500 bg-gradient-to-br ${getGradientClasses(colorScheme)}/20`
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-lg bg-dark-bg border border-gray-700 flex items-center justify-center">
                    <Moon className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-white">Dark</p>
                    <p className="text-xs text-gray-400">Easy on the eyes</p>
                  </div>
                  {theme === 'dark' && (
                    <Check className="h-5 w-5 text-purple-400 ml-auto" />
                  )}
                </div>
              </button>

              <button
                onClick={() => handleThemeChange('light')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  theme === 'light'
                    ? `border-purple-500 bg-gradient-to-br ${getGradientClasses(colorScheme)}/20`
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-lg bg-white border border-gray-300 flex items-center justify-center">
                    <Sun className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-white">Light</p>
                    <p className="text-xs text-gray-400">Bright and clean</p>
                  </div>
                  {theme === 'light' && (
                    <Check className="h-5 w-5 text-purple-400 ml-auto" />
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Color Scheme Selection */}
          <div className="card-dark">
            <div className="flex items-center space-x-2 mb-4">
              <Sparkles className="h-5 w-5 text-purple-400" />
              <h2 className="text-xl font-semibold">Color Scheme</h2>
            </div>
            <p className="text-sm text-gray-400 mb-6">Customize the color palette of your interface</p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(colorSchemes).map(([scheme, colors]) => (
                <button
                  key={scheme}
                  onClick={() => handleColorSchemeChange(scheme as ColorScheme)}
                  className={`relative p-4 rounded-lg border-2 transition-all overflow-hidden group ${
                    colorScheme === scheme
                      ? 'border-purple-500 ring-2 ring-purple-500/50'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className={`h-20 w-full rounded-md bg-gradient-to-r ${colors.primary} mb-3 opacity-80 group-hover:opacity-100 transition-opacity`} />
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-white capitalize">
                      {scheme.replace('-', ' ')}
                    </p>
                    {colorScheme === scheme && (
                      <Check className="h-5 w-5 text-purple-400" />
                    )}
                  </div>
                  {colorScheme === scheme && (
                    <div className="absolute top-2 right-2">
                      <div className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Preview Section */}
          <div className="card-dark bg-gradient-to-r from-purple-900/20 to-pink-900/20 border-purple-500/20">
            <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
              <ImageIcon className="h-5 w-5" />
              <span>Preview</span>
            </h3>
            <div className="space-y-3">
              <div className={`h-12 rounded-lg bg-gradient-to-r ${getGradientClasses(colorScheme)} flex items-center justify-center`}>
                <span className="text-white font-medium">Primary Button</span>
              </div>
              <div className="h-12 rounded-lg bg-dark-hover flex items-center justify-center">
                <span className="text-gray-300">Secondary Element</span>
              </div>
              <p className="text-sm text-gray-400 text-center pt-2">
                Your changes are applied instantly across the platform
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
