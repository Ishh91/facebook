import { useEffect, useState } from 'react';
import { ExternalLink, Shield, Clock } from 'lucide-react';
import { supabase, Link } from '../lib/supabase';

interface RedirectPageProps {
  shortCode: string;
}

export default function RedirectPage({ shortCode }: RedirectPageProps) {
  const [link, setLink] = useState<Link | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [error, setError] = useState('');
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    const fetchLink = async () => {
      try {
        const { data, error } = await supabase
          .from('links')
          .select('*')
          .eq('short_code', shortCode)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          setError('Link not found or has expired');
          return;
        }

        setLink(data);
        setCountdown(data.redirect_delay);

        await supabase.rpc('increment_click_count', { link_uuid: data.id });

        const deviceType = /Mobile|Android|iPhone/i.test(navigator.userAgent)
          ? 'mobile'
          : /Tablet|iPad/i.test(navigator.userAgent)
          ? 'tablet'
          : 'desktop';

        await supabase.from('clicks').insert({
          link_id: data.id,
          referrer: document.referrer || '',
          user_agent: navigator.userAgent,
          device_type: deviceType,
          revenue_generated: data.is_affiliate ? 0.05 : 0.01
        });

        if (data.is_affiliate) {
          await supabase.rpc('update_link_revenue', {
            link_uuid: data.id,
            revenue_amount: 0.05
          });
        } else {
          await supabase.rpc('update_link_revenue', {
            link_uuid: data.id,
            revenue_amount: 0.01
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load link');
      }
    };

    fetchLink();
  }, [shortCode]);

  useEffect(() => {
    if (countdown > 0 && link) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && link && !isRedirecting) {
      setIsRedirecting(true);
      window.location.href = link.original_url;
    }
  }, [countdown, link, isRedirecting]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ExternalLink className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Link Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Your Own Link
          </a>
        </div>
      </div>
    );
  }

  if (!link) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-8 text-white text-center">
            <Clock className="w-16 h-16 mx-auto mb-4" />
            <h1 className="text-4xl font-bold mb-2">Redirecting in {countdown}s</h1>
            <p className="text-blue-100">Please wait while we prepare your destination...</p>
          </div>

          <div className="p-8">
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-xl p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">
                Advertisement Space
              </h2>
              <div className="bg-white rounded-lg p-6 text-center">
                <p className="text-gray-600 mb-4">
                  Your ad could be here! This is a premium spot to showcase your product or service.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="bg-gradient-to-br from-blue-100 to-blue-200 p-6 rounded-lg">
                    <h3 className="font-bold text-blue-900 mb-2">Feature 1</h3>
                    <p className="text-sm text-blue-800">Premium advertising space</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-100 to-green-200 p-6 rounded-lg">
                    <h3 className="font-bold text-green-900 mb-2">Feature 2</h3>
                    <p className="text-sm text-green-800">High engagement rates</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-100 to-purple-200 p-6 rounded-lg">
                    <h3 className="font-bold text-purple-900 mb-2">Feature 3</h3>
                    <p className="text-sm text-purple-800">Targeted audience</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <Shield className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Destination Information</h3>
              </div>
              <p className="text-sm text-gray-600 mb-2">You will be redirected to:</p>
              <p className="text-blue-600 font-mono text-sm break-all">{link.original_url}</p>
              {link.is_affiliate && (
                <div className="mt-3 inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                  Affiliate Link
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => window.location.href = link.original_url}
                className="flex-1 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-5 h-5" />
                Skip & Continue Now
              </button>
              <a
                href="/"
                className="px-6 py-4 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Back to Home
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            This link has been clicked <span className="font-bold text-blue-600">{link.total_clicks + 1}</span> times
          </p>
        </div>
      </div>
    </div>
  );
}
