import { useEffect } from 'react';
import siteConfig from './config.json';

export default function Analytics() {
  const trackingId = siteConfig.analytics.trackingId;

  useEffect(() => {
    if (!trackingId || document.getElementById('google-analytics')) {
      return;
    }

    const script = document.createElement('script');
    
    script.id    = 'google-analytics';
    script.src   = `https://www.googletagmanager.com/gtag/js?id=${trackingId}`;
    script.async = true;
    
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    
    window.gtag = function() { 
      window.dataLayer.push(arguments); 
    };

    window.gtag('js', new Date());
    window.gtag('config', trackingId, { 
      anonymize_ip: siteConfig.analytics.anonymizeIp 
    });
  }, [trackingId]);

  return null; 
}