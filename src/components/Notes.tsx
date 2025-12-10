import { useState, useEffect } from 'react';
import { MessageSquare, Clock, CheckCircle } from 'lucide-react';
import { authApi } from '../utils/api';
import { useTheme, getGradientClasses } from '../utils/theme';

const Notes = () => {
  const [notes, setNotes] = useState<string>('');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [lastReadAt, setLastReadAt] = useState<Date | null>(null);
  const [hasNewNotes, setHasNewNotes] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { colorScheme } = useTheme();

  useEffect(() => {
    loadNotes();
    // Mark notes as read when component mounts
    markAsRead();
  }, []);

  const loadNotes = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authApi.getUserNotes();
      setNotes(response.notes || '');
      setUpdatedAt(response.updatedAt ? new Date(response.updatedAt) : null);
      setLastReadAt(response.lastReadAt ? new Date(response.lastReadAt) : null);
      setHasNewNotes(response.hasNewNotes || false);
    } catch (err: any) {
      console.error('Failed to load notes:', err);
      setError(err.message || 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    try {
      await authApi.markNotesAsRead();
      setHasNewNotes(false);
      setLastReadAt(new Date());
    } catch (err: any) {
      console.error('Failed to mark notes as read:', err);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className={`h-10 w-10 rounded-lg bg-gradient-to-r ${getGradientClasses(colorScheme, 'primary')} flex items-center justify-center`}>
            <MessageSquare className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className={`text-3xl font-bold bg-gradient-to-r ${getGradientClasses(colorScheme, 'text')} bg-clip-text text-transparent`}>
              Notes
            </h1>
            <p className="text-gray-400 text-sm mt-1">Messages and comments from administrators</p>
          </div>
        </div>
        {hasNewNotes && (
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-blue-500/20 border border-blue-500/50 rounded-lg">
            <div className="h-2 w-2 bg-blue-400 rounded-full animate-pulse"></div>
            <span className="text-blue-400 text-sm font-medium">New</span>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="bg-dark-card border border-gray-800 rounded-lg p-6">
        {notes && notes.trim() !== '' ? (
          <div className="space-y-4">
            <div className="prose prose-invert max-w-none">
              <div className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                {notes}
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-800 space-y-2">
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <Clock className="h-4 w-4" />
                <span>Last updated: {formatDate(updatedAt)}</span>
              </div>
              {lastReadAt && (
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <CheckCircle className="h-4 w-4" />
                  <span>Read: {formatDate(lastReadAt)}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <MessageSquare className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg mb-2">No notes yet</p>
            <p className="text-gray-500 text-sm">Administrators will post messages and comments here when needed.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notes;

