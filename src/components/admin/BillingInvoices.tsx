import { useState, useEffect } from 'react';
import { Receipt, Download, Search, ChevronLeft, ChevronRight, DollarSign, CheckCircle, Clock } from 'lucide-react';
import { adminApi } from '../../utils/api';

interface Invoice {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  walletAddress: string;
  tokenId: string;
  amount: string;
  currency: string;
  status: string;
  type: string;
  createdAt: string;
  transactionHash: string;
}

const BillingInvoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchInvoices();
  }, [page]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getBillingInvoices(page, 20);
      setInvoices(response.invoices || []);
      setTotalPages(response.pagination?.pages || 1);
      setSummary(response.summary);
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
      if (error.message?.includes('401') || error.message?.includes('403')) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        window.location.href = '/signin';
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(invoice =>
    invoice.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
    invoice.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    invoice.tokenId.includes(searchQuery) ||
    invoice.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && invoices.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card-dark">
            <div className="flex items-center justify-between mb-4">
              <Receipt className="h-6 w-6 text-blue-400" />
            </div>
            <h3 className="text-gray-400 text-sm font-medium mb-2">Total Invoices</h3>
            <p className="text-3xl font-bold text-white">{summary.totalInvoices}</p>
          </div>

          <div className="card-dark">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="h-6 w-6 text-green-400" />
            </div>
            <h3 className="text-gray-400 text-sm font-medium mb-2">Total Amount</h3>
            <p className="text-3xl font-bold text-white">{summary.totalAmount}</p>
            <p className="text-xs text-gray-500 mt-1">USD</p>
          </div>

          <div className="card-dark">
            <div className="flex items-center justify-between mb-4">
              <CheckCircle className="h-6 w-6 text-green-400" />
            </div>
            <h3 className="text-gray-400 text-sm font-medium mb-2">Paid Invoices</h3>
            <p className="text-3xl font-bold text-white">{summary.paidInvoices}</p>
          </div>

          <div className="card-dark">
            <div className="flex items-center justify-between mb-4">
              <Clock className="h-6 w-6 text-orange-400" />
            </div>
            <h3 className="text-gray-400 text-sm font-medium mb-2">Pending Invoices</h3>
            <p className="text-3xl font-bold text-white">{summary.pendingInvoices}</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="card-dark">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-dark w-full pl-10"
              placeholder="Search by email, name, token ID, or invoice ID..."
            />
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="card-dark overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold">Invoice ID</th>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold">User</th>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold">Token ID</th>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold">Amount</th>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold">Status</th>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold">Date</th>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length > 0 ? (
                filteredInvoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <span className="text-white font-mono text-sm">{invoice.id}</span>
                    </td>
                    <td className="py-4 px-6">
                      <div>
                        <p className="text-white font-medium">{invoice.userName || 'Unknown User'}</p>
                        <p className="text-gray-400 text-sm">{invoice.userEmail || 'N/A'}</p>
                        {invoice.walletAddress && (
                          <p className="text-gray-500 text-xs font-mono">
                            {invoice.walletAddress.slice(0, 8)}...{invoice.walletAddress.slice(-6)}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-purple-400 font-mono text-sm">
                        {invoice.tokenId && invoice.tokenId !== 'N/A' ? `#${invoice.tokenId}` : invoice.type || 'N/A'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-white font-semibold">
                        {invoice.amount} {invoice.currency}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          invoice.status?.toLowerCase() === 'paid'
                            ? 'bg-green-500/20 text-green-400'
                            : invoice.status?.toLowerCase() === 'pending'
                            ? 'bg-orange-500/20 text-orange-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {invoice.status || 'Pending'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-400 text-sm">
                      {new Date(invoice.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6">
                      <button
                        className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                        title="Download Invoice"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    No invoices found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800">
            <p className="text-sm text-gray-400">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BillingInvoices;

