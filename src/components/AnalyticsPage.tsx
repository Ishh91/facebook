import { useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink, TrendingUp, MousePointerClick, DollarSign, Calendar } from 'lucide-react';
import { supabase, Link, Click } from '../lib/supabase';

interface LinkWithClicks extends Link {
  recent_clicks?: Click[];
}

export default function AnalyticsPage() {
  const [links, setLinks] = useState<LinkWithClicks[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'clicks' | 'revenue' | 'date'>('revenue');

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const { data: linksData, error: linksError } = await supabase
        .from('links')
        .select('*')
        .order('created_at', { ascending: false });

      if (linksError) throw linksError;

      if (linksData) {
        const linksWithClicks = await Promise.all(
          linksData.map(async (link) => {
            const { data: clicks } = await supabase
              .from('clicks')
              .select('*')
              .eq('link_id', link.id)
              .order('clicked_at', { ascending: false })
              .limit(5);

            return { ...link, recent_clicks: clicks || [] };
          })
        );

        setLinks(linksWithClicks);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const sortedLinks = [...links].sort((a, b) => {
    switch (sortBy) {
      case 'clicks':
        return b.total_clicks - a.total_clicks;
      case 'revenue':
        return Number(b.estimated_revenue) - Number(a.estimated_revenue);
      case 'date':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      default:
        return 0;
    }
  });

  const totalClicks = links.reduce((sum, link) => sum + link.total_clicks, 0);
  const totalRevenue = links.reduce((sum, link) => sum + Number(link.estimated_revenue), 0);
  const affiliateLinks = links.filter(link => link.is_affiliate).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </a>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
          <p className="text-gray-600">Track your link performance and revenue in real-time</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-blue-600">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Total Links</h3>
              <ExternalLink className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{links.length}</p>
            <p className="text-xs text-gray-500 mt-1">{affiliateLinks} affiliate</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-green-600">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Total Clicks</h3>
              <MousePointerClick className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{totalClicks.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">All time</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-yellow-600">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Est. Revenue</h3>
              <DollarSign className="w-5 h-5 text-yellow-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">${totalRevenue.toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-1">From all links</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-purple-600">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Avg Revenue/Link</h3>
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              ${links.length > 0 ? (totalRevenue / links.length).toFixed(2) : '0.00'}
            </p>
            <p className="text-xs text-gray-500 mt-1">Per link</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">All Links</h2>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'clicks' | 'revenue' | 'date')}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="revenue">Revenue</option>
                <option value="clicks">Clicks</option>
                <option value="date">Date Created</option>
              </select>
            </div>
          </div>

          {sortedLinks.length === 0 ? (
            <div className="text-center py-12">
              <ExternalLink className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No links yet</h3>
              <p className="text-gray-600 mb-6">Create your first shortened link to see analytics</p>
              <a
                href="/"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Link
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedLinks.map((link) => (
                <div
                  key={link.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <a
                          href={`/${link.short_code}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-lg font-bold text-blue-600 hover:text-blue-700 font-mono"
                        >
                          /{link.short_code}
                        </a>
                        {link.is_affiliate && (
                          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            Affiliate
                          </span>
                        )}
                        {!link.is_active && (
                          <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 break-all mb-2">{link.original_url}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(link.created_at).toLocaleDateString()}
                        </span>
                        <span>Delay: {link.redirect_delay}s</span>
                      </div>
                    </div>

                    <div className="text-right ml-6">
                      <div className="mb-3">
                        <p className="text-2xl font-bold text-gray-900">{link.total_clicks}</p>
                        <p className="text-xs text-gray-500">clicks</p>
                      </div>
                      <div>
                        <p className="text-xl font-bold text-green-600">
                          ${Number(link.estimated_revenue).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">revenue</p>
                      </div>
                    </div>
                  </div>

                  {link.recent_clicks && link.recent_clicks.length > 0 && (
                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Recent Clicks:</p>
                      <div className="space-y-2">
                        {link.recent_clicks.map((click) => (
                          <div
                            key={click.id}
                            className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded"
                          >
                            <span className="text-gray-600">
                              {new Date(click.clicked_at).toLocaleString()}
                            </span>
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                              {click.device_type}
                            </span>
                            <span className="text-green-600 font-medium">
                              +${Number(click.revenue_generated).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Revenue Calculation</h3>
          <p className="text-sm text-gray-600 mb-2">
            Each click generates estimated revenue based on link type:
          </p>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Regular links: $0.01 per click</li>
            <li>• Affiliate links: $0.05 per click</li>
            <li>• Actual revenue may vary based on ad performance and conversions</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
