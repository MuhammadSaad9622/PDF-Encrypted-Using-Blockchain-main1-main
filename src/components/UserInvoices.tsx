import { useState, useEffect } from 'react';
import { Receipt, Download, CheckCircle, Clock, DollarSign, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { authApi } from '../utils/api';
import { useTheme, getGradientClasses } from '../utils/theme';

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

const UserInvoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState<any>(null);
  const { colorScheme } = useTheme();

  useEffect(() => {
    fetchInvoices();
  }, [page]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await authApi.getUserInvoices(page, 20);
      
      // Ensure we always have empty arrays if response is missing
      setInvoices(response?.invoices || []);
      setTotalPages(response?.pagination?.pages || 1);
      setSummary(response?.summary || {
        totalInvoices: 0,
        paidInvoices: 0,
        pendingInvoices: 0
      });
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
      // On error, set empty state
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

  if (loading && invoices.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl lg:text-3xl font-bold bg-gradient-to-r ${getGradientClasses(colorScheme, 'text')} bg-clip-text text-transparent`}>
            Invoices
          </h1>
          <p className="text-gray-400 mt-1 text-sm lg:text-base">View your payment history and invoices</p>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
          <div className="card-dark">
            <div className="flex items-center justify-between mb-4">
              <CheckCircle className="h-6 w-6 text-green-400" />
            </div>
            <h3 className="text-gray-400 text-sm font-medium mb-2">Paid</h3>
            <p className="text-3xl font-bold text-white">{summary.paidInvoices}</p>
          </div>

          <div className="card-dark">
            <div className="flex items-center justify-between mb-4">
              <Clock className="h-6 w-6 text-orange-400" />
            </div>
            <h3 className="text-gray-400 text-sm font-medium mb-2">Pending</h3>
            <p className="text-3xl font-bold text-white">{summary.pendingInvoices}</p>
          </div>
        </div>
      )}

      {/* Invoices List */}
      {invoices.length > 0 ? (
        <div className="card-dark">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Invoice History</span>
          </h3>
          <div className="overflow-x-auto -mx-4 lg:mx-0">
            <div className="min-w-full inline-block align-middle">
              {/* Mobile Card View */}
              <div className="lg:hidden space-y-3 p-4">
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="card-dark p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-400 mb-1">Invoice ID</p>
                        <p className="text-sm text-white font-mono truncate">{invoice.id}</p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ml-2 ${
                          invoice.status === 'Paid'
                            ? 'bg-green-500/20 text-green-400'
                            : invoice.status === 'Pending'
                            ? 'bg-orange-500/20 text-orange-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {invoice.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-800">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Plan</p>
                        <p className="text-sm text-white capitalize">{invoice.subscriptionPlan || invoice.type}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Amount</p>
                        <p className="text-sm text-white font-semibold">{invoice.amount} {invoice.currency}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-gray-400 mb-1">Date</p>
                        <p className="text-sm text-gray-400">{new Date(invoice.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex justify-end pt-2 border-t border-gray-800">
                      <button
                        className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                        title="Download Invoice"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <table className="hidden lg:table w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Invoice ID</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Subscription Plan</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Amount</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Status</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Date</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <span className="text-white font-mono text-sm">{invoice.id}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-white font-medium capitalize">
                          {invoice.subscriptionPlan || invoice.type}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-white font-semibold">
                          {invoice.amount} {invoice.currency}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            invoice.status === 'Paid'
                              ? 'bg-green-500/20 text-green-400'
                              : invoice.status === 'Pending'
                              ? 'bg-orange-500/20 text-orange-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {invoice.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-gray-400 text-sm">
                        {new Date(invoice.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-4">
                        <button
                          className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                          title="Download Invoice"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 lg:px-6 py-4 border-t border-gray-800">
              <p className="text-xs lg:text-sm text-gray-400">
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
      ) : (
        <div className="card-dark text-center py-12">
          <Receipt className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Invoices Found</h3>
          <p className="text-gray-400">
            You don't have any subscription invoices yet. Invoices will appear here after you subscribe to the platform.
          </p>
        </div>
      )}
    </div>
  );
};

export default UserInvoices;

