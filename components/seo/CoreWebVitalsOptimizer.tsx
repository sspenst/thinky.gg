import { useEffect } from 'react';
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

interface VitalMetric {
  name: string;
  value: number;
  id: string;
}

const CoreWebVitalsOptimizer = () => {
  useEffect(() => {
    // Send vital metrics to analytics
    const sendToAnalytics = (metric: VitalMetric) => {
      // Send to Google Analytics or your analytics service
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', metric.name, {
          event_category: 'Web Vitals',
          event_label: metric.id,
          value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
          non_interaction: true,
        });
      }

      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`${metric.name}: ${metric.value}`);
      }
    };

    // Track all Core Web Vitals
    getCLS(sendToAnalytics);
    getFID(sendToAnalytics);
    getFCP(sendToAnalytics);
    getLCP(sendToAnalytics);
    getTTFB(sendToAnalytics);

    // Preload critical game assets
    const preloadCriticalAssets = () => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = '/logos/thinky/thinky.svg';
      document.head.appendChild(link);

      // Preload fonts
      const fontLink = document.createElement('link');
      fontLink.rel = 'preconnect';
      fontLink.href = 'https://fonts.googleapis.com';
      document.head.appendChild(fontLink);
    };

    preloadCriticalAssets();

    // Optimize layout shifts for game canvas
    const preventLayoutShifts = () => {
      const gameCanvas = document.querySelector('canvas');
      if (gameCanvas && !gameCanvas.style.aspectRatio) {
        gameCanvas.style.aspectRatio = '1';
        gameCanvas.style.maxWidth = '100%';
        gameCanvas.style.height = 'auto';
      }
    };

    // Run after initial render
    setTimeout(preventLayoutShifts, 100);
  }, []);

  // Return null as this is a monitoring component
  return null;
};

export default CoreWebVitalsOptimizer;