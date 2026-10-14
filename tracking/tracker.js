/**
 * CausalFunnel User Analytics Tracker
 * 
 * A lightweight JavaScript tracking script that captures user interactions
 * (page views and clicks) and sends them to the analytics backend.
 * 
 * Features:
 *  - Tracks 'page_view' and 'click' events.
 *  - Stores session_id in localStorage with cookie fallback.
 *  - Captures: session_id, event_type, page_url, timestamp, click x/y coordinates,
 *    and viewport dimensions.
 *  - Smart API resolution: Query parameter `?api=`, localStorage override,
 *    script tag attribute `data-api`, or auto localhost/origin fallback.
 *  - Reliable delivery with batching, keepalive fetch, and sendBeacon fallback on page unload.
 */
(function () {
  'use strict';

  // ── Configuration ──────────────────────────────────────────────
  var STORAGE_KEY = 'cf_session_id';
  var API_STORAGE_KEY = 'cf_api_url';
  var FLUSH_INTERVAL = 1500; // Flush queue every 1.5 seconds for snappy updates
  var BATCH_MAX_SIZE = 15;

  // Determine API endpoint
  function resolveApiUrl() {
    // 1. Check URL query parameter (e.g. ?api=https://casual-funnel-api.onrender.com)
    try {
      var urlParams = new URLSearchParams(window.location.search);
      var paramApi = urlParams.get('api') || urlParams.get('api_url');
      if (paramApi && paramApi.trim()) {
        var cleanParam = paramApi.trim().replace(/\/+$/, '');
        localStorage.setItem(API_STORAGE_KEY, cleanParam);
        return cleanParam;
      }
    } catch (e) {}

    // 2. Check localStorage override (configured via HUD)
    try {
      var storedApi = localStorage.getItem(API_STORAGE_KEY);
      if (storedApi && storedApi.trim()) {
        return storedApi.trim().replace(/\/+$/, '');
      }
    } catch (e) {}

    // 3. Check data-api attribute on current script tag
    var scriptTag = document.currentScript;
    if (scriptTag) {
      var attrApi = scriptTag.getAttribute('data-api');
      if (attrApi && attrApi.trim()) {
        return attrApi.trim().replace(/\/+$/, '');
      }
    }

    // 4. Check global window variable
    if (window.CF_TRACKER_API && window.CF_TRACKER_API.trim()) {
      return window.CF_TRACKER_API.trim().replace(/\/+$/, '');
    }

    // 5. If running on localhost or 127.0.0.1, default to port 5000
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:5000';
    }

    // 6. Default to same origin or fallback
    return window.location.origin.replace(/\/+$/, '');
  }

  var API_URL = resolveApiUrl();

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

    var targetUrl = API_URL + '/api/events';
    var batch = eventQueue.splice(0);
    var payload = JSON.stringify({ events: batch });

    // Use fetch with keepalive: true (best modern browser support for reliable analytics)
    fetch(targetUrl, {
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
        console.log('[CF Tracker] Dispatched ' + batch.length + ' event(s) to ' + targetUrl);
      })
      .catch(function (err) {
        console.warn('[CF Tracker] Fetch failed, attempting sendBeacon fallback:', err.message);
        // Fallback to sendBeacon if fetch fails
        if (navigator.sendBeacon) {
          var blob = new Blob([payload], { type: 'application/json' });
          navigator.sendBeacon(targetUrl, blob);
        }
      });
  }

  // Flush on page exit
  function handleUnload() {
    if (eventQueue.length === 0) return;
    var targetUrl = API_URL + '/api/events';
    var batch = eventQueue.splice(0);
    var payload = JSON.stringify({ events: batch });

    if (navigator.sendBeacon) {
      var blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon(targetUrl, blob);
    } else {
      fetch(targetUrl, {
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
    // Avoid tracking clicks on the tracker's own debug UI
    if (e.target && e.target.closest && e.target.closest('.cf-ignore-track')) {
      return;
    }

    var event = buildBaseEvent('click');
    event.click_x = Math.round(e.clientX);
    event.click_y = Math.round(e.clientY);

    console.log('[CF Tracker] Click at (' + event.click_x + ', ' + event.click_y + ')');
    enqueueEvent(event);

    // Notify registered UI listener (for demo visual feedback)
    if (typeof window.onCausalFunnelEvent === 'function') {
      window.onCausalFunnelEvent(event);
    }
  }

  // ── Initialization ─────────────────────────────────────────────
  function init() {
    var sessionId = getSessionId();
    console.log('[CF Tracker] Initialized with session_id:', sessionId);
    console.log('[CF Tracker] Target API URL:', API_URL);

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
      getApiUrl: function () {
        return API_URL;
      },
      setApiUrl: function (newUrl) {
        if (!newUrl) return;
        API_URL = newUrl.trim().replace(/\/+$/, '');
        localStorage.setItem(API_STORAGE_KEY, API_URL);
        console.log('[CF Tracker] API URL updated to:', API_URL);
      },
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
