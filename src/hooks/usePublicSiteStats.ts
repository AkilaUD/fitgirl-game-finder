import { useEffect, useState } from 'react';
import {
  fetchPublicStats,
  recordSiteVisit,
  type PublicSiteStats,
} from '../lib/siteStats';

export function usePublicSiteStats() {
  const [stats, setStats] = useState<PublicSiteStats | null>(null);

  useEffect(() => {
    recordSiteVisit();
    void fetchPublicStats().then(setStats);
  }, []);

  return stats;
}