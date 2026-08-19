(function () {
  'use strict';

  var SKIP_SLUGS = {
    essays: true,
    about: true,
    anime: true,
    eats: true,
    resume: true,
    'feed.xml': true,
    '404.html': true,
  };

  var startedAt = Date.now();
  var depthSeen = {};
  var readFired = false;
  var scrollQueued = false;

  function context() {
    var body = document.body;
    return {
      page_type: (body && body.getAttribute('data-page-type')) || '',
      slug: (body && body.getAttribute('data-slug')) || '',
      title: document.title,
      theme: currentTheme(),
    };
  }

  function currentTheme() {
    var t = document.documentElement.getAttribute('data-theme');
    if (t === 'dark' || t === 'light') return t;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function track(event, props) {
    if (!window.posthog || typeof window.posthog.capture !== 'function') return;
    var merged = {};
    var base = context();
    var extra = props || {};
    var key;
    for (key in base) {
      if (Object.prototype.hasOwnProperty.call(base, key)) merged[key] = base[key];
    }
    for (key in extra) {
      if (Object.prototype.hasOwnProperty.call(extra, key)) merged[key] = extra[key];
    }
    window.posthog.capture(event, merged);
  }

  window.track = track;

  function registerContext() {
    if (!window.posthog || typeof window.posthog.register !== 'function') return;
    window.posthog.register({
      page_type: context().page_type,
      slug: context().slug,
      theme: currentTheme(),
    });
  }

  function regionOf(el) {
    var node = el.closest('[data-track-region]');
    return node ? node.getAttribute('data-track-region') || '' : '';
  }

  function slugFromPath(pathname) {
    return String(pathname || '').replace(/^\/+|\/+$/g, '');
  }

  function isEssayPath(pathname) {
    var slug = slugFromPath(pathname);
    if (!slug || slug.indexOf('/') !== -1) return false;
    return !SKIP_SLUGS[slug];
  }

  function isSitePath(pathname) {
    var slug = slugFromPath(pathname);
    return slug === '' || slug === 'essays' || slug === 'about' || slug === 'anime' || slug === 'eats' || slug === 'resume';
  }

  function essaySource(region, pageType) {
    if (region === 'home') return 'home';
    if (region === 'essays') return 'essays';
    if (region === '404' || pageType === '404') return '404';
    if (region === 'related') return 'related';
    return 'inline';
  }

  function navItem(anchor, pathname) {
    if (anchor.classList.contains('home')) return 'home';
    var slug = slugFromPath(pathname);
    if (!slug) return 'home';
    if (slug === 'essays' || slug === 'about' || slug === 'anime' || slug === 'eats' || slug === 'resume') return slug;
    var label = (anchor.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
    return label || slug;
  }

  function linkLabel(anchor) {
    return (anchor.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function onClick(event) {
    var anchor = event.target.closest && event.target.closest('a');
    if (!anchor || !anchor.href) return;

    var href = anchor.getAttribute('href') || '';
    if (!href || href.charAt(0) === '#') return;

    var region = regionOf(anchor) || context().page_type;
    var pageType = context().page_type;

    if (anchor.protocol === 'mailto:') {
      track('contact_click', { region: region, confirmed: !event.defaultPrevented });
      return;
    }

    var pathname;
    try {
      pathname = anchor.pathname;
    } catch (err) {
      return;
    }

    if (pathname === '/feed.xml' || href.indexOf('feed.xml') !== -1) {
      track('rss_click', { region: region });
      return;
    }

    if (anchor.classList.contains('anime-row-link')) {
      track('anime_imdb_open', { title: anchor.getAttribute('data-title') || linkLabel(anchor) });
      return;
    }

    var isExternal = anchor.hostname && anchor.hostname !== location.hostname;
    if (isExternal) {
      track('outbound_click', {
        url: anchor.href,
        domain: anchor.hostname.replace(/^www\./, ''),
        label: linkLabel(anchor),
        region: region,
      });
      return;
    }

    if (isEssayPath(pathname)) {
      var heading = anchor.querySelector('strong');
      track('essay_open', {
        slug: slugFromPath(pathname),
        title: heading ? heading.textContent.trim() : linkLabel(anchor),
        source: essaySource(region, pageType),
      });
      return;
    }

    if (isSitePath(pathname) || region === 'topbar' || region === 'footer') {
      track('nav_click', { item: navItem(anchor, pathname), region: region });
    }
  }

  function bindTheme() {
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.addEventListener(
      'click',
      function () {
        var from = currentTheme();
        var to = from === 'dark' ? 'light' : 'dark';
        track('theme_toggle', { from: from, to: to });
        if (window.posthog && typeof window.posthog.register === 'function') {
          window.posthog.register({ theme: to });
        }
      },
      true
    );
  }

  function scrollPercent() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (max <= 0) return 100;
    return (window.scrollY / max) * 100;
  }

  function maybeEssayRead(percent) {
    if (readFired || context().page_type !== 'essay') return;
    var seconds = Math.round((Date.now() - startedAt) / 1000);
    if (percent < 75 && seconds < 60) return;
    readFired = true;
    track('essay_read', {
      slug: context().slug,
      seconds: seconds,
      percent: Math.min(100, Math.round(percent)),
    });
  }

  function checkScroll() {
    var percent = scrollPercent();
    [25, 50, 75, 100].forEach(function (mark) {
      if (percent >= mark && !depthSeen[mark]) {
        depthSeen[mark] = true;
        track('scroll_depth', { percent: mark });
      }
    });
    maybeEssayRead(percent);
  }

  function onScroll() {
    if (scrollQueued) return;
    scrollQueued = true;
    window.requestAnimationFrame(function () {
      scrollQueued = false;
      checkScroll();
    });
  }

  function onCopy() {
    var sel = window.getSelection();
    var text = sel ? String(sel) : '';
    if (!text) return;
    track('copy', { length: text.length });
  }

  registerContext();

  if (context().page_type === '404') {
    track('not_found', { path: location.pathname });
  }

  document.addEventListener('click', onClick);
  document.addEventListener('copy', onCopy);
  window.addEventListener('scroll', onScroll, { passive: true });
  bindTheme();
  checkScroll();
  window.setTimeout(function () {
    maybeEssayRead(scrollPercent());
  }, 60000);
})();
