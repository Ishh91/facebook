import { useEffect, useState } from 'react';
import HomePage from './components/HomePage';
import RedirectPage from './components/RedirectPage';
import AnalyticsPage from './components/AnalyticsPage';
import FacebookScheduler from './components/FacebookScheduler';

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const shortCode = currentPath.substring(1);

  if (currentPath === '/' || currentPath === '') {
    return <HomePage />;
  }

  if (currentPath === '/analytics' || shortCode === 'analytics') {
    return <AnalyticsPage />;
  }

  if (currentPath === '/facebook-scheduler' || shortCode === 'facebook-scheduler') {
    return <FacebookScheduler />;
  }

  return <RedirectPage shortCode={shortCode} />;
}

export default App;
