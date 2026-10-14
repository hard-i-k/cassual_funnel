/**
 * CausalFunnel User Analytics Tracker
 * 
 * A lightweight JavaScript tracking script that captures user interactions
 * (page views and clicks) and sends them to the analytics backend.
 * 
 * Requirements met:
 *  - Tracks 'page_view' and 'click' events.
 *  - Stores session_id in localStorage with cookie fallback.
 *  - Captures: session_id, event_type, page_url, timestamp, click x/y coordinates,
 *    and viewport dimensions.
 *  - Reliable delivery with batching, keepalive fetch, and sendBeacon fallback on page unload.
 */
(function () {
  'use strict';

  // ── Configuration ──────────────────────────────────────────────
  var STORAGE_KEY = 'cf_session_id';
  var FLUSH_INTERVAL = 1500; // Flush queue every 1.5 seconds for snappy updates
  var BATCH_MAX_SIZE = 15;

  // Determine API endpoint from script attribute or window variable
  var scriptTag = document.currentScript;
  var API_URL =
    (scriptTag && scriptTag.getAttribute('data-api')) ||
    window.CF_TRACKER_API ||
    'http://localhost:5000';

  // Remove trailing slash if present
  API_URL = API_URL.replace(/\/+$/, '');

  // ── Session Management (localStorage with Cookie fallback) ────
  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  }

  function setCookie(name, value, days) {
    var expires = '';
    if (days) {
      var d = new Date();
      d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
      expires = '; expires=' + d.toUTCString();
    }
    document.cookie = name + '=' + encodeURIComponent(value) + expires + '; path=/; SameSite=Lax';
  }

  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function getSessionId() {
    var sessionId = null;
    try {
      sessionId = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      // LocalStorage might be disabled or blocked
    }

    if (!sessionId) {
      sessionId = getCookie(STORAGE_KEY);
    }

    if (!sessionId) {
      sessionId = generateUUID();
      try {
        localStorage.setItem(STORAGE_KEY, sessionId);
      } catch (e) {}
      setCookie(STORAGE_KEY, sessionId, 30);
    }

    return sessionId;
  }

  // ── Event Queue & Batching ─────────────────────────────────────
  var eventQueue = [];
  var flushTimer = null;

  function enqueueEvent(event) {
    eventQueue.push(event);

    // If queue reaches maximum batch size, flush immediately
    if (eventQueue.length >= BATCH_MAX_SIZE) {
      flushEvents();
    } else if (!flushTimer) {
      flushTimer = setTimeout(flushEvents, FLUSH_INTERVAL);
    }
  }

  function flushEvents() {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    if (eventQueue.length === 0) return;

    var batch = eventQueue.splice(0);
    var payload = JSON.stringify({ events: batch });

    // Use fetch with keepalive: true (best modern browser support for reliable analytics)
    fetch(API_URL + '/api/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: payload,
      keepalive: true,
    })
      .then(function (res) {
        if (!res.ok) {
          throw new Error('HTTP ' + res.status);
        }
        console.log('[CF Tracker] Dispatched ' + batch.length + ' event(s) to ' + API_URL);
      })
      .catch(function (err) {
        console.warn('[CF Tracker] Fetch failed, attempting sendBeacon fallback:', err.message);
        // Fallback to sendBeacon if fetch fails
        if (navigator.sendBeacon) {
          var blob = new Blob([payload], { type: 'application/json' });
          navigator.sendBeacon(API_URL + '/api/events', blob);
        }
      });
  }

  // Flush on page exit
  function handleUnload() {
    if (eventQueue.length === 0) return;
    var batch = eventQueue.splice(0);
    var payload = JSON.stringify({ events: batch });

    if (navigator.sendBeacon) {
      var blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon(API_URL + '/api/events', blob);
    } else {
      fetch(API_URL + '/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      });
    }
  }

  // ── Event Builders ─────────────────────────────────────────────
  function buildBaseEvent(eventType) {
    return {
      session_id: getSessionId(),
      event_type: eventType,
      page_url: window.location.href,
      timestamp: new Date().toISOString(),
      viewport_width: window.innerWidth || document.documentElement.clientWidth || 0,
      viewport_height: window.innerHeight || document.documentElement.clientHeight || 0,
    };
  }

  function trackPageView() {
    var event = buildBaseEvent('page_view');
    console.log('[CF Tracker] Page View:', event.page_url);
    enqueueEvent(event);
  }

  function trackClick(e) {
    // Avoid tracking clicks on the tracker's own debug UI if present
    if (e.target && e.target.closest && e.target.closest('.cf-ignore-track')) {
      return;
    }

    var event = buildBaseEvent('click');
    event.click_x = Math.round(e.clientX);
    event.click_y = Math.round(e.clientY);

    console.log('[CF Tracker] Click at (' + event.click_x + ', ' + event.click_y + ')');
    enqueueEvent(event);

    // Notify any registered UI listener (for demo visual feedback)
    if (typeof window.onCausalFunnelEvent === 'function') {
      window.onCausalFunnelEvent(event);
    }
  }

  // ── Initialization ─────────────────────────────────────────────
  function init() {
    var sessionId = getSessionId();
    console.log('[CF Tracker] Initialized with session_id:', sessionId);

    // Track initial page view
    trackPageView();

    // Track click events across whole document
    document.addEventListener('click', trackClick, true);

    // Ensure unsent events are sent when navigating away
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    // SPA Navigation support
    var originalPushState = history.pushState;
    if (originalPushState) {
      history.pushState = function () {
        originalPushState.apply(this, arguments);
        trackPageView();
      };
    }

    var originalReplaceState = history.replaceState;
    if (originalReplaceState) {
      history.replaceState = function () {
        originalReplaceState.apply(this, arguments);
        trackPageView();
      };
    }

    window.addEventListener('popstate', trackPageView);

    // Expose API for testing / manual triggering
    window.CausalFunnelTracker = {
      getSessionId: getSessionId,
      trackPageView: trackPageView,
      trackClick: trackClick,
      flush: flushEvents,
      getQueueLength: function () {
        return eventQueue.length;
      },
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
