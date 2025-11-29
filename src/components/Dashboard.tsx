import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  Upload, 
  FileText, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Home,
  User,
  Receipt
} from 'lucide-react';
import { authApi } from '../utils/api';
import { useTheme, getGradientClasses } from '../utils/theme';

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { colorScheme } = useTheme();

  useEffect(() => {
    const loadUser = async () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      } else {
        try {
          const response = await authApi.getCurrentUser();
          setUser(response.user);
          localStorage.setItem('user', JSON.stringify(response.user));
        } catch (error) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/signin');
        }
      }
    };
    loadUser();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/signin');
  };


  const menuItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: Upload, label: 'Upload PDF', path: '/dashboard/upload' },
    { icon: FileText, label: 'My NFTs', path: '/dashboard/my-nfts' },
    { icon: Receipt, label: 'Invoices', path: '/dashboard/invoices' },
    { icon: Settings, label: 'Settings', path: '/dashboard/settings' },
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-dark-bg flex">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } bg-dark-card border-r border-gray-800 transition-all duration-300 overflow-hidden relative z-10`}
      >
        <div className="h-full flex flex-col">
          {/* Logo/Header */}
          <div className="p-6 border-b border-gray-800">
            <div className="flex items-center justify-between">
              <h1 className={`text-xl font-bold bg-gradient-to-r ${getGradientClasses(colorScheme, 'text')} bg-clip-text text-transparent`}>
                PDF Encryption
              </h1>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">AES-256-CBC ENCRYPTION</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive(item.path)
                      ? `bg-gradient-to-r ${getGradientClasses(colorScheme, 'primary')} text-white`
                      : 'text-gray-400 hover:bg-dark-hover hover:text-white'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-gray-800">
            <div className="flex items-center space-x-3 mb-4 p-3 bg-dark-hover rounded-lg">
              <div className={`h-10 w-10 rounded-full bg-gradient-to-r ${getGradientClasses(colorScheme, 'medium')} flex items-center justify-center`}>
                <User className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.name || user?.email || 'User'}
                </p>
                <p className="text-xs text-gray-400 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-dark-hover hover:text-white transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-dark-card border-b border-gray-800 px-6 py-4 relative z-20">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-400 hover:text-white"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center space-x-4">
              {/* User account info - wallet no longer needed */}
              {user && (
                <div className="text-sm text-gray-400">
                  {user.email}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Dashboard;

