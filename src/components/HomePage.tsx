import { useState } from 'react';
import { Link2, TrendingUp, Zap, BarChart3, Facebook } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function HomePage() {
  const [url, setUrl] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [isAffiliate, setIsAffiliate] = useState(false);
  const [redirectDelay, setRedirectDelay] = useState(3);
  const [loading, setLoading] = useState(false);
  const [shortenedUrl, setShortenedUrl] = useState('');
  const [error, setError] = useState('');

  const generateShortCode = () => {
    const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setShortenedUrl('');
    setLoading(true);

    try {
      if (!url) {
        throw new Error('Please enter a URL');
      }

      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        throw new Error('URL must start with http:// or https://');
      }

      const shortCode = customCode || generateShortCode();

      const { data: existing } = await supabase
        .from('links')
        .select('short_code')
        .eq('short_code', shortCode)
        .maybeSingle();

      if (existing) {
        throw new Error('This custom code is already taken. Please choose another.');
      }

      const { error: insertError } = await supabase
        .from('links')
        .insert({
          short_code: shortCode,
          original_url: url,
          is_affiliate: isAffiliate,
          redirect_delay: redirectDelay,
          created_by_ip: 'web'
        });

      if (insertError) throw insertError;

      const shortUrl = `${window.location.origin}/${shortCode}`;
      setShortenedUrl(shortUrl);
      setUrl('');
      setCustomCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create short link');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shortenedUrl);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Link2 className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">QuickLink</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/facebook-scheduler"
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Facebook className="w-4 h-4" />
              FB Scheduler
            </a>
            <a
              href="/analytics"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              Analytics
            </a>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Shorten Links, Maximize Revenue
          </h1>
          <p className="text-xl text-gray-600">
            Create short links with monetization landing pages. Perfect for Facebook and social media.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-12">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Long URL
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/your-long-url"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Code (Optional)
                </label>
                <input
                  type="text"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                  placeholder="my-custom-link"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Redirect Delay (seconds)
                </label>
                <select
                  value={redirectDelay}
                  onChange={(e) => setRedirectDelay(Number(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value={2}>2 seconds</option>
                  <option value={3}>3 seconds</option>
                  <option value={5}>5 seconds</option>
                  <option value={10}>10 seconds</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="affiliate"
                checked={isAffiliate}
                onChange={(e) => setIsAffiliate(e.target.checked)}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="affiliate" className="text-sm font-medium text-gray-700">
                This is an affiliate link (tracks revenue differently)
              </label>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}

            {shortenedUrl && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800 mb-2 font-medium">Your shortened link:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shortenedUrl}
                    readOnly
                    className="flex-1 px-4 py-2 bg-white border border-green-300 rounded-lg text-green-900 font-mono"
                  />
                  <button
                    type="button"
                    onClick={copyToClipboard}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? 'Creating...' : 'Shorten URL'}
              <Zap className="w-5 h-5" />
            </button>
          </form>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Monetize Every Click</h3>
            <p className="text-gray-600">Show ads or content before redirects to maximize revenue</p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Advanced Analytics</h3>
            <p className="text-gray-600">Track clicks, revenue, and performance in real-time</p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Link2 className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Bulk API</h3>
            <p className="text-gray-600">Create hundreds of links programmatically via API</p>
          </div>
        </div>
      </main>
    </div>
  );
}
