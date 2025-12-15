import { useState, useEffect } from 'react';
import { 
  Users, 
  TrendingUp, 
  Wallet, 
  FileText, 
  Activity, 
  ArrowUp, 
  BarChart3,
  LayoutDashboard,
  UserCog,
  LogOut,
  Menu,
  X,
  Shield,
  Receipt,
  UserCircle,
  Key
} from 'lucide-react';
import { adminApi } from '../../utils/api';
import UserManagement from './UserManagement';
import BillingInvoices from './BillingInvoices';
import UserDetails from './UserDetails';
import AccessCodeManagement from './AccessCodeManagement';

interface DashboardStats {
  overview: {
    totalUsers: number;
    usersWithWallets: number;
    usersWithoutWallets: number;
    totalNFTs: number;
  };
  growth: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  recentUsers: Array<{
    id: string;
    email: string;
    name: string;
    walletAddress: string | null;
    createdAt: string;
  }>;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Helper function to get display name (same as UserManagement)
  const getDisplayName = (user: { name?: string | null; email?: string }): string => {
    // If name exists and is not empty (handle both null and empty string)
    const userName = user.name?.trim();
    if (userName && userName !== '') {
      return userName;
    }
    
    // Otherwise, extract name from email (part before @)
    if (user.email) {
      const emailPart = user.email.split('@')[0];
      // Replace dots, underscores, dashes with spaces, then capitalize each word
      const formatted = emailPart
        .replace(/[._-]/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      return formatted;
    }
    
    // Final fallback
    return 'User';
  };
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'analytics' | 'billing' | 'access-codes' | 'user-details'>('dashboard');
  const [adminUser, setAdminUser] = useState<any>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  // Handle tab change when userId is set
  useEffect(() => {
    if (pendingUserId && selectedUserId === pendingUserId) {
      console.log('✅ selectedUserId matches pendingUserId, changing tab');
      setActiveTab('user-details');
      setPendingUserId(null);
    }
  }, [selectedUserId, pendingUserId]);

  useEffect(() => {
    const storedAdmin = localStorage.getItem('adminUser');
    if (storedAdmin) {
      setAdminUser(JSON.parse(storedAdmin));
    }
    fetchStats();
    fetchAnalytics();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getDashboardStats();
      setStats(data.stats);
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
      if (error.message?.includes('401') || error.message?.includes('403')) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        window.location.href = '/signin';
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const data = await adminApi.getAnalytics();
      setAnalytics(data.analytics);
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/signin';
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', tab: 'dashboard' as const },
    { icon: BarChart3, label: 'Analytics', tab: 'analytics' as const },
    { icon: UserCog, label: 'User Management', tab: 'users' as const },
    { icon: Key, label: 'Access Codes', tab: 'access-codes' as const },
    { icon: Receipt, label: 'Billing & Invoices', tab: 'billing' as const },
  ];

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } bg-gray-900/80 backdrop-blur-sm border-r border-gray-800 transition-all duration-300 overflow-hidden relative z-10 flex-shrink-0`}
      >
        <div className="h-full flex flex-col overflow-hidden">
          {/* Logo/Header */}
          <div className="p-6 border-b border-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-purple-600 to-pink-500 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Admin Panel</h1>
                  <p className="text-xs text-gray-400">Control Center</p>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.tab;
              return (
                <button
                  key={item.tab || item.label}
                  onClick={() => setActiveTab(item.tab)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white'
                      : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Admin Info & Logout */}
          <div className="p-4 border-t border-gray-800">
            <div className="flex items-center space-x-3 mb-4 p-3 bg-gray-800/50 rounded-lg">
              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {adminUser?.name || adminUser?.email || 'Admin'}
                </p>
                <p className="text-xs text-gray-400 truncate">{adminUser?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-800/50 hover:text-white transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Bar */}
        <header className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-800 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-400 hover:text-white"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold text-white capitalize">{activeTab}</h2>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-400 bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
                Admin
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 min-h-0">
          {activeTab === 'dashboard' && stats && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                  title="Total Users"
                  value={stats.overview.totalUsers}
                  icon={Users}
                  color="from-blue-500 to-cyan-500"
                  change={stats.growth.thisMonth}
                  changeLabel="this month"
                />
                <StatCard
                  title="Users with Wallets"
                  value={stats.overview.usersWithWallets}
                  icon={Wallet}
                  color="from-green-500 to-emerald-500"
                  percentage={stats.overview.totalUsers > 0 
                    ? ((stats.overview.usersWithWallets / stats.overview.totalUsers) * 100).toFixed(1)
                    : '0'}
                />
                <StatCard
                  title="Total NFTs"
                  value={stats.overview.totalNFTs}
                  icon={FileText}
                  color="from-purple-500 to-pink-500"
                />
                <StatCard
                  title="New Users Today"
                  value={stats.growth.today}
                  icon={Activity}
                  color="from-orange-500 to-red-500"
                  change={stats.growth.today}
                  changeLabel="today"
                />
              </div>

              {/* Growth Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card-dark">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">This Week</h3>
                    <TrendingUp className="h-5 w-5 text-green-400" />
                  </div>
                  <p className="text-3xl font-bold text-white">{stats.growth.thisWeek}</p>
                  <p className="text-sm text-gray-400 mt-2">New users registered</p>
                </div>

                <div className="card-dark">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">This Month</h3>
                    <TrendingUp className="h-5 w-5 text-blue-400" />
                  </div>
                  <p className="text-3xl font-bold text-white">{stats.growth.thisMonth}</p>
                  <p className="text-sm text-gray-400 mt-2">New users registered</p>
                </div>

                <div className="card-dark">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Wallet Adoption</h3>
                    <Wallet className="h-5 w-5 text-purple-400" />
                  </div>
                  <p className="text-3xl font-bold text-white">
                    {stats.overview.totalUsers > 0
                      ? ((stats.overview.usersWithWallets / stats.overview.totalUsers) * 100).toFixed(1)
                      : 0}%
                  </p>
                  <p className="text-sm text-gray-400 mt-2">Users with connected wallets</p>
                </div>
              </div>

              {/* Recent Users */}
              <div className="card-dark">
                <h3 className="text-xl font-bold text-white mb-4">Recent Users</h3>
                {stats.recentUsers.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left py-3 px-4 text-gray-400 font-semibold">Email</th>
                          <th className="text-left py-3 px-4 text-gray-400 font-semibold">Name</th>
                          <th className="text-left py-3 px-4 text-gray-400 font-semibold">Joined</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.recentUsers.map((user) => (
                          <tr key={user.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                            <td className="py-3 px-4 text-white">{user.email}</td>
                            <td className="py-3 px-4 text-gray-300">{getDisplayName(user)}</td>
                            <td className="py-3 px-4 text-gray-400 text-sm">
                              {new Date(user.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-400 text-center py-8">No users found</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'analytics' && analytics && (
            <AnalyticsView analytics={analytics} />
          )}

          {activeTab === 'users' && (
            <UserManagement onViewUserDetails={(userId) => {
              console.log('👁️ Eye button clicked - userId:', userId, 'type:', typeof userId);
              if (!userId) {
                console.error('❌ userId is falsy!', userId);
                alert('Error: User ID is missing. Please try again.');
                return;
              }
              // Set pending userId first, then selectedUserId
              // useEffect will handle the tab change when selectedUserId is set
              console.log('📝 Setting pendingUserId and selectedUserId to:', userId);
              setPendingUserId(userId);
              setSelectedUserId(userId);
            }} />
          )}

          {activeTab === 'billing' && <BillingInvoices />}

          {activeTab === 'access-codes' && <AccessCodeManagement />}

          {activeTab === 'user-details' && (
            <>
              {selectedUserId ? (
                <UserDetails 
                  userId={selectedUserId}
                  onBack={() => {
                    console.log('🔙 Back button clicked');
                    setActiveTab('users');
                    setSelectedUserId(null);
                  }}
                />
              ) : (
                <div className="card-dark text-center py-12 bg-yellow-900/20 border-2 border-yellow-500/50">
                  <p className="text-yellow-400 text-lg font-semibold mb-4">⚠️ No User Selected</p>
                  <p className="text-gray-300 mb-2">selectedUserId is: {String(selectedUserId) || 'null/undefined'}</p>
                  <p className="text-gray-400 mb-6">Please select a user from User Management to view details.</p>
                  <button
                    onClick={() => {
                      console.log('🔄 Going to User Management');
                      setActiveTab('users');
                    }}
                    className="btn-primary"
                  >
                    Go to User Management
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

interface AnalyticsViewProps {
  analytics: any;
}

const AnalyticsView = ({ analytics }: AnalyticsViewProps) => {
  const maxGrowth = Math.max(...(analytics.users.monthlyGrowth.map((g: any) => g.count) || [1]), 1);

  return (
    <div className="space-y-6">
      {/* User Growth Chart */}
      <div className="card-dark">
        <div className="flex items-center space-x-2 mb-6">
          <BarChart3 className="h-6 w-6 text-purple-400" />
          <h3 className="text-xl font-bold text-white">User Growth (Last 12 Months)</h3>
        </div>
        {analytics.users.monthlyGrowth && analytics.users.monthlyGrowth.length > 0 ? (
          <div className="space-y-4">
            {analytics.users.monthlyGrowth.map((item: any, index: number) => {
              const percentage = (item.count / maxGrowth) * 100;
              return (
                <div key={`growth-${index}-${item.month || index}`} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-300">{item.month}</span>
                    <span className="text-sm font-semibold text-white">{item.count} users</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-600 to-pink-500 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">No growth data available</p>
        )}
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-dark">
          <h4 className="text-lg font-semibold text-white mb-4">User Statistics</h4>
          <div className="space-y-3">
            <StatRow label="Total Users" value={analytics.users.total || 0} />
            <StatRow label="With Wallets" value={analytics.users.withWallets || 0} />
            <StatRow label="Without Wallets" value={analytics.users.withoutWallets || 0} />
            <StatRow label="New (Last 7 Days)" value={analytics.users.newLast7Days || 0} />
            <StatRow label="New (Last 30 Days)" value={analytics.users.newLast30Days || 0} />
          </div>
        </div>

        <div className="card-dark">
          <h4 className="text-lg font-semibold text-white mb-4">NFT Statistics</h4>
          <div className="space-y-3">
            <StatRow label="Total NFTs" value={analytics.nfts.total || 0} />
            <StatRow 
              label="Contract Address" 
              value={analytics.system?.contractAddress 
                ? (analytics.system.contractAddress.length > 10 
                    ? analytics.system.contractAddress.slice(0, 10) + '...' 
                    : analytics.system.contractAddress)
                : 'Not deployed'} 
            />
            <div className="pt-4 border-t border-gray-800">
              <p className="text-sm text-gray-400 mb-2">Wallet Adoption Rate</p>
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-gray-800 rounded-full h-2">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                    style={{
                      width: `${analytics.users.total > 0 
                        ? (analytics.users.withWallets / analytics.users.total) * 100 
                        : 0}%`
                    }}
                  />
                </div>
                <span className="text-sm font-semibold text-white">
                  {analytics.users.total > 0
                    ? ((analytics.users.withWallets / analytics.users.total) * 100).toFixed(1)
                    : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface StatRowProps {
  label: string;
  value: string | number;
}

const StatRow = ({ label, value }: StatRowProps) => (
  <div className="flex justify-between items-center">
    <span className="text-gray-400">{label}</span>
    <span className="text-white font-semibold">{value}</span>
  </div>
);

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
  change?: number;
  changeLabel?: string;
  percentage?: string;
}

const StatCard = ({ title, value, icon: Icon, color, change, changeLabel, percentage }: StatCardProps) => {
  return (
    <div className="card-dark bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg bg-gradient-to-r ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        {change !== undefined && change > 0 && (
          <div className="flex items-center text-green-400 text-sm">
            <ArrowUp className="h-4 w-4 mr-1" />
            <span>+{change}</span>
          </div>
        )}
      </div>
      <h3 className="text-gray-400 text-sm font-medium mb-2">{title}</h3>
      <p className="text-3xl font-bold text-white mb-1">{value.toLocaleString()}</p>
      {percentage && (
        <p className="text-sm text-gray-500">{percentage}% of total</p>
      )}
      {changeLabel && change !== undefined && (
        <p className="text-xs text-gray-500 mt-1">{changeLabel}</p>
      )}
    </div>
  );
};

export default AdminDashboard;
