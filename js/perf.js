(function () {
  'use strict';

  const thresholds = {
    LCP: [2500, 4000],
    FID: [100, 300],
    CLS: [0.1, 0.25],
    TTFB: [600, 1500],
    FCP: [1800, 3000]
  };

  const perfState = {
    metrics: {},
    slowResources: [],
    blockingTasks: [],
    memory: null
  };

  window.__scenicPerf = perfState;

  const setMetric = (name, value) => {
    perfState.metrics[name] = { value, rating: rateMetric(name, value) };
    persist();
  };

  const rateMetric = (name, value) => {
    const [good, needsWork] = thresholds[name] || [0, 0];
    if (value <= good) return 'Good';
    if (value <= needsWork) return 'Needs Work';
    return 'Poor';
  };

  const persist = () => {
    try {
      sessionStorage.setItem('scenicone_perf', JSON.stringify(perfState));
    } catch (_) {
      // no-op
    }
  };

  const logMemory = () => {
    try {
      if (!performance.memory) return;
      const { usedJSHeapSize, totalJSHeapSize } = performance.memory;
      const usage = totalJSHeapSize ? usedJSHeapSize / totalJSHeapSize : 0;
      perfState.memory = { usedJSHeapSize, totalJSHeapSize, usage };
      if (usage > 0.8) {
        console.warn('[ScenicOne] High heap usage detected:', `${Math.round(usage * 100)}%`);
      }
      persist();
    } catch (_) {
      // no-op
    }
  };

  const report = () => {
    try {
      const summary = Object.entries(perfState.metrics).map(([metric, data]) => ({
        metric,
        value: data.value,
        rating: data.rating
      }));
      console.group('[ScenicOne Performance Report]');
      if (summary.length) console.table(summary);
      if (perfState.slowResources.length) {
        console.log('Slow resources:', perfState.slowResources);
      }
      if (perfState.blockingTasks.length) {
        console.log('Blocking tasks:', perfState.blockingTasks);
      }
      if (perfState.memory) {
        console.log('Memory:', perfState.memory);
      }
      console.groupEnd();
    } catch (_) {
      // no-op
    }
  };

  try {
    const navEntry = performance.getEntriesByType('navigation')[0];
    if (navEntry) setMetric('TTFB', Math.round(navEntry.responseStart));
  } catch (_) {
    // no-op
  }

  try {
    const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
    if (fcpEntry) setMetric('FCP', Math.round(fcpEntry.startTime));
    else if (window.PerformanceObserver) {
      const fcpObserver = new PerformanceObserver((list) => {
        const entry = list.getEntriesByName('first-contentful-paint')[0];
        if (entry) {
          setMetric('FCP', Math.round(entry.startTime));
          fcpObserver.disconnect();
        }
      });
      fcpObserver.observe({ type: 'paint', buffered: true });
    }
  } catch (_) {
    // no-op
  }

  try {
    if (window.PerformanceObserver) {
      let lcp = 0;
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last) lcp = Math.round(last.startTime);
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

      const finalizeLcp = () => {
        if (lcp) setMetric('LCP', lcp);
        lcpObserver.disconnect();
      };

      addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') finalizeLcp();
      }, { once: true });
      addEventListener('pagehide', finalizeLcp, { once: true });
    }
  } catch (_) {
    // no-op
  }

  try {
    if (window.PerformanceObserver) {
      const fidObserver = new PerformanceObserver((list) => {
        const firstInput = list.getEntries()[0];
        if (firstInput) {
          setMetric('FID', Math.round(firstInput.processingStart - firstInput.startTime));
          fidObserver.disconnect();
        }
      });
      fidObserver.observe({ type: 'first-input', buffered: true });
    }
  } catch (_) {
    // no-op
  }

  try {
    if (window.PerformanceObserver) {
      let cls = 0;
      const clsObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (!entry.hadRecentInput) cls += entry.value;
        });
        setMetric('CLS', Number(cls.toFixed(4)));
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    }
  } catch (_) {
    // no-op
  }

  try {
    if (window.PerformanceObserver) {
      const taskObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.duration > 50) {
            const blocking = {
              name: entry.name || 'longtask',
              duration: Math.round(entry.duration)
            };
            perfState.blockingTasks.push(blocking);
            console.warn('[ScenicOne BLOCKING TASK]', blocking);
            persist();
          }
        });
      });
      taskObserver.observe({ type: 'longtask', buffered: true });
    }
  } catch (_) {
    // no-op
  }

  addEventListener('load', () => {
    try {
      const resources = performance.getEntriesByType('resource');
      resources.forEach((resource) => {
        if (resource.duration > 1000) {
          const slow = {
            name: resource.name,
            duration: Math.round(resource.duration)
          };
          perfState.slowResources.push(slow);
          console.warn('[ScenicOne SLOW RESOURCE]', slow);
        }
      });
      persist();
      logMemory();
      setTimeout(report, 0);
    } catch (_) {
      // no-op
    }
  });
})();
