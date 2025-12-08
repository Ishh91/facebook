import { useEffect, useState } from 'react';
import { ArrowLeft, Facebook, Calendar, Image, Clock, CheckCircle, XCircle, Loader, Plus, Trash2, PlayCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface FacebookAccount {
  id: string;
  facebook_user_id: string;
  page_id: string | null;
  page_name: string | null;
  token_expires_at: string;
  is_active: boolean;
  created_at: string;
}

interface ScheduledStory {
  id: string;
  story_type: string;
  media_url: string;
  caption: string;
  scheduled_time: string;
  status: string;
  posted_at: string | null;
  error_message: string | null;
  facebook_account_id: string;
}

export default function FacebookScheduler() {
  const [accounts, setAccounts] = useState<FacebookAccount[]>([]);
  const [stories, setStories] = useState<ScheduledStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [userId, setUserId] = useState<string>('');

  const [accessToken, setAccessToken] = useState('');
  const [pageId, setPageId] = useState('');
  const [pageName, setPageName] = useState('');
  const [tokenExpiry, setTokenExpiry] = useState('');

  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          setUserId(session.user.id);
          fetchAccounts(session.user.id);
          fetchStories();
        } else {
          setError('Please sign in to use the Facebook Scheduler');
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to get user session:', err);
        setError('Authentication error. Please refresh and try again.');
        setLoading(false);
      }
    };

    getUser();
  }, []);

  const fetchAccounts = async (currentUserId: string) => {
    try {
      const { data, error } = await supabase
        .from('facebook_accounts')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
      if (data && data.length > 0) {
        setSelectedAccountId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStories = async () => {
    try {
      const { data, error } = await supabase
        .from('scheduled_stories')
        .select('*')
        .order('scheduled_time', { ascending: false });

      if (error) throw error;
      setStories(data || []);
    } catch (err) {
      console.error('Failed to fetch stories:', err);
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setProcessing(true);

    try {
      if (!accessToken || !tokenExpiry) {
        throw new Error('Access token and expiry date are required');
      }

      if (!userId) {
        throw new Error('User not authenticated');
      }

      const { error: insertError } = await supabase
        .from('facebook_accounts')
        .insert({
          user_id: userId,
          facebook_user_id: pageId || 'me',
          access_token: accessToken,
          page_id: pageId || null,
          page_name: pageName || null,
          token_expires_at: new Date(tokenExpiry).toISOString(),
          is_active: true,
        });

      if (insertError) throw insertError;

      setMessage('Facebook account connected successfully!');
      setAccessToken('');
      setPageId('');
      setPageName('');
      setTokenExpiry('');
      setShowAddAccount(false);
      fetchAccounts(userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add account');
    } finally {
      setProcessing(false);
    }
  };

  const handleScheduleStory = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setProcessing(true);

    try {
      if (!selectedAccountId || !imageUrl || !scheduledTime) {
        throw new Error('Please fill in all required fields');
      }

      if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
        throw new Error('Image URL must start with http:// or https://');
      }

      const { error: insertError } = await supabase
        .from('scheduled_stories')
        .insert({
          facebook_account_id: selectedAccountId,
          story_type: 'image',
          media_url: imageUrl,
          caption: caption || '',
          scheduled_time: new Date(scheduledTime).toISOString(),
          status: 'pending',
        });

      if (insertError) throw insertError;

      setMessage('Story scheduled successfully!');
      setImageUrl('');
      setCaption('');
      setScheduledTime('');
      setShowScheduleForm(false);
      fetchStories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule story');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    if (!confirm('Are you sure you want to delete this scheduled story?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('scheduled_stories')
        .delete()
        .eq('id', storyId);

      if (error) throw error;
      setMessage('Story deleted successfully');
      fetchStories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete story');
    }
  };

  const handleRunScheduler = async () => {
    setProcessing(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-scheduled-stories`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to process stories');
      }

      setMessage(`Processed ${result.processed} stories. ${result.successful} successful, ${result.failed} failed.`);
      fetchStories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run scheduler');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'posted':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'processing':
        return <Loader className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'posted':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!userId && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
        <nav className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <a
              href="/"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Home
            </a>
            <div className="flex items-center gap-2">
              <Facebook className="w-6 h-6 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">Facebook Story Scheduler</span>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 py-12">
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <Facebook className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
            <p className="text-gray-600 mb-6">Please sign in to use the Facebook Story Scheduler</p>
            <a
              href="/"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Home
            </a>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </a>
          <div className="flex items-center gap-2">
            <Facebook className="w-6 h-6 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">Facebook Story Scheduler</span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-12">
        {message && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Connected Accounts</h2>
              <button
                onClick={() => setShowAddAccount(!showAddAccount)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Account
              </button>
            </div>

            {showAddAccount && (
              <form onSubmit={handleAddAccount} className="mb-6 p-4 bg-blue-50 rounded-lg space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Facebook Access Token *
                  </label>
                  <input
                    type="text"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="Enter your Facebook access token"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Page ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={pageId}
                    onChange={(e) => setPageId(e.target.value)}
                    placeholder="Leave empty for personal account"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Page Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={pageName}
                    onChange={(e) => setPageName(e.target.value)}
                    placeholder="Page name for reference"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Token Expiry Date *
                  </label>
                  <input
                    type="datetime-local"
                    value={tokenExpiry}
                    onChange={(e) => setTokenExpiry(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={processing}
                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {processing ? 'Adding...' : 'Add Account'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddAccount(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {accounts.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No accounts connected yet</p>
            ) : (
              <div className="space-y-3">
                {accounts.map((account) => (
                  <div
                    key={account.id}
                    className={`p-4 border rounded-lg ${
                      account.is_active ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {account.page_name || 'Personal Account'}
                        </p>
                        <p className="text-sm text-gray-600">
                          Expires: {new Date(account.token_expires_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          account.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {account.is_active ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Schedule Story</h2>
              <button
                onClick={handleRunScheduler}
                disabled={processing}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <PlayCircle className="w-4 h-4" />
                Run Scheduler
              </button>
            </div>

            {accounts.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Please connect a Facebook account first</p>
            ) : (
              <>
                {!showScheduleForm ? (
                  <button
                    onClick={() => setShowScheduleForm(true)}
                    className="w-full py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
                  >
                    <Plus className="w-6 h-6 mx-auto mb-2" />
                    Schedule New Story
                  </button>
                ) : (
                  <form onSubmit={handleScheduleStory} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Facebook Account
                      </label>
                      <select
                        value={selectedAccountId}
                        onChange={(e) => setSelectedAccountId(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      >
                        {accounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.page_name || 'Personal Account'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Image URL *
                      </label>
                      <input
                        type="url"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Caption (Optional)
                      </label>
                      <textarea
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder="Add a caption to your story"
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Scheduled Time *
                      </label>
                      <input
                        type="datetime-local"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        min={new Date().toISOString().slice(0, 16)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        required
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={processing}
                        className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {processing ? 'Scheduling...' : 'Schedule Story'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowScheduleForm(false)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Scheduled Stories</h2>

          {stories.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No stories scheduled yet</h3>
              <p className="text-gray-600">Schedule your first Facebook story to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {stories.map((story) => (
                <div
                  key={story.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={story.media_url}
                          alt="Story preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjZTVlN2ViIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzljYTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlPC90ZXh0Pjwvc3ZnPg==';
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(story.status)}
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(story.status)}`}>
                          {story.status.toUpperCase()}
                        </span>
                      </div>

                      <p className="text-gray-700 mb-2">{story.caption || 'No caption'}</p>

                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {new Date(story.scheduled_time).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Image className="w-4 h-4" />
                          {story.story_type}
                        </span>
                      </div>

                      {story.error_message && (
                        <p className="mt-2 text-sm text-red-600">Error: {story.error_message}</p>
                      )}

                      {story.posted_at && (
                        <p className="mt-2 text-sm text-green-600">
                          Posted: {new Date(story.posted_at).toLocaleString()}
                        </p>
                      )}
                    </div>

                    {story.status === 'pending' && (
                      <button
                        onClick={() => handleDeleteStory(story.id)}
                        className="flex-shrink-0 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">How to Get Your Facebook Access Token</h3>
          <ol className="text-sm text-gray-700 space-y-2">
            <li>1. Go to Facebook Graph API Explorer</li>
            <li>2. Select your app or create a new one</li>
            <li>3. Add permissions: pages_manage_posts, pages_read_engagement</li>
            <li>4. Generate access token</li>
            <li>5. Copy the token and paste it above</li>
            <li>6. Note: Long-lived tokens last 60 days, exchange for page tokens for permanent access</li>
          </ol>
        </div>
      </main>
    </div>
  );
}
