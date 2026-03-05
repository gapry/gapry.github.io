import { useEffect } from 'react';
import siteConfig from './config.json';

export default function Analytics() {
  const trackingId = siteConfig.analytics.trackingId;

  useEffect(() => {
    if (!trackingId) {
      return;
    }

    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== 'function') {
      window.gtag = function() {
        window.dataLayer.push(arguments);
      };
      window.gtag('js', new Date());
    }

    window.gtag('config', trackingId, {
      anonymize_ip: siteConfig.analytics.anonymizeIp,
    });

    if (document.getElementById('google-analytics')) {
      return;
    }

    const script  = document.createElement('script');
    script.id     = 'google-analytics';
    script.src    = `https://www.googletagmanager.com/gtag/js?id=${trackingId}`;
    script.async  = true;

    document.head.appendChild(script);
  }, [trackingId, siteConfig.analytics.anonymizeIp]);

  return null; 
}