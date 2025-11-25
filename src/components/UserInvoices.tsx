import { useState, useEffect } from 'react';
import { Receipt, Download, CheckCircle, Clock, DollarSign, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { authApi } from '../utils/api';
import { useTheme, getGradientClasses } from '../utils/theme';

interface Invoice {
  id: string;
  tokenId: string;
  amount: string;
  currency: string;
  status: string;
  type: string;
  createdAt: string;
  transactionHash: string;
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
      setInvoices(response.invoices || []);
      setTotalPages(response.pagination?.pages || 1);
      setSummary(response.summary);
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold bg-gradient-to-r ${getGradientClasses(colorScheme, 'text')} bg-clip-text text-transparent`}>
            Invoices
          </h1>
          <p className="text-gray-400 mt-1">View your payment history and invoices</p>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card-dark">
            <div className="flex items-center justify-between mb-4">
              <Receipt className={`h-6 w-6 bg-gradient-to-r ${getGradientClasses(colorScheme, 'medium')} text-transparent bg-clip-text`} />
            </div>
            <h3 className="text-gray-400 text-sm font-medium mb-2">Total Invoices</h3>
            <p className="text-3xl font-bold text-white">{summary.totalInvoices}</p>
          </div>

          <div className="card-dark">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="h-6 w-6 text-green-400" />
            </div>
            <h3 className="text-gray-400 text-sm font-medium mb-2">Total Amount</h3>
            <p className="text-3xl font-bold text-white">{summary.totalAmount} MATIC</p>
          </div>

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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-400 font-semibold">Invoice ID</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-semibold">Token ID</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-semibold">Type</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-semibold">Amount</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-semibold">Status</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-semibold">Date</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-semibold">Actions</th>
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
                      <span className={`text-purple-400 font-mono text-sm bg-gradient-to-r ${getGradientClasses(colorScheme, 'text')} bg-clip-text text-transparent`}>
                        #{invoice.tokenId}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-gray-300">{invoice.type}</span>
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
      ) : (
        <div className="card-dark text-center py-12">
          <Receipt className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Invoices Found</h3>
          <p className="text-gray-400">
            You don't have any invoices yet. Invoices will appear here after you mint NFTs.
          </p>
        </div>
      )}
    </div>
  );
};

export default UserInvoices;

