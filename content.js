/* global BiliExactViews */
(() => {
  'use strict';

  const MARKER_CLASS = 'bilibili-exact-views-value';
  const DANMAKU_MARKER_CLASS = 'bilibili-exact-danmaku-value';
  const TOOLBAR_STATS = Object.freeze([
    { field: 'like', markerClass: 'bilibili-exact-like-value' },
    { field: 'coin', markerClass: 'bilibili-exact-coin-value' },
    { field: 'favorite', markerClass: 'bilibili-exact-favorite-value' },
    { field: 'share', markerClass: 'bilibili-exact-share-value' }
  ]);
  const ALL_MARKER_CLASSES = Object.freeze([
    MARKER_CLASS,
    DANMAKU_MARKER_CLASS,
    ...TOOLBAR_STATS.map(({ markerClass }) => markerClass)
  ]);
  const state = {
    currentKey: null,
    view: null,
    danmaku: null,
    like: null,
    coin: null,
    favorite: null,
    share: null,
    viewKey: null,
    refreshTimer: null,
    scheduled: false
  };

  function getPlaybackElement() {
    for (const selector of BiliExactViews.VIEW_SELECTORS) {
      const element = document.querySelector(selector);
      if (isPlaybackElement(element, true)) {
        return element;
      }
    }

    const roots = document.querySelectorAll('#viewbox_report, .video-info-detail');
    for (const root of roots) {
      const candidates = root.querySelectorAll('[class~="view"], .view-text, span, div');
      for (const element of candidates) {
        if (isPlaybackElement(
          element,
          element.classList.contains('view') ||
            element.classList.contains('view-text') ||
            Boolean(element.closest('.view.item'))
        )) {
          return element;
        }
      }
    }
    return null;
  }

  function getDanmakuElement() {
    for (const selector of BiliExactViews.DANMAKU_SELECTORS) {
      const element = document.querySelector(selector);
      if (isDanmakuElement(element, true)) {
        return element;
      }
    }

    const roots = document.querySelectorAll('#viewbox_report, .video-info-detail');
    for (const root of roots) {
      const candidates = root.querySelectorAll('[class~="dm"], .dm-text, span, div');
      for (const element of candidates) {
        if (isDanmakuElement(
          element,
          element.classList.contains('dm') ||
            element.classList.contains('dm-text') ||
            Boolean(element.closest('.dm.item'))
        )) {
          return element;
        }
      }
    }
    return null;
  }

  function isPlaybackElement(element, acceptViewOnly = false) {
    if (!(element instanceof HTMLElement) || element.querySelector(`.${MARKER_CLASS}`)) {
      return false;
    }
    const ownText = Array.from(element.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent)
      .join('')
      .trim();
    return BiliExactViews.isPlaybackText(ownText, acceptViewOnly);
  }

  function isDanmakuElement(element, acceptCompact = false) {
    if (!(element instanceof HTMLElement) || element.querySelector(`.${DANMAKU_MARKER_CLASS}`)) {
      return false;
    }
    const ownText = Array.from(element.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent)
      .join('')
      .trim();
    return BiliExactViews.isPlaybackText(ownText, acceptCompact);
  }

  function removeInjectedValues() {
    document.querySelectorAll(ALL_MARKER_CLASSES.map((className) => `.${className}`).join(', '))
      .forEach((element) => element.remove());
  }

  function findCompactCountElement(selectors, markerClass) {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement) || element.querySelector(`.${markerClass}`)) {
        continue;
      }

      const candidates = [element, ...element.querySelectorAll('span, div')];
      for (const candidate of candidates) {
        if (!(candidate instanceof HTMLElement) || candidate.querySelector(`.${markerClass}`)) {
          continue;
        }
        const ownText = Array.from(candidate.childNodes)
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent)
          .join('')
          .trim();
        if (BiliExactViews.isPlaybackText(ownText, true)) {
          return candidate;
        }
      }
    }
    return null;
  }

  function renderExactView() {
    if (state.viewKey !== state.currentKey || state.view === null) {
      return;
    }

    const existing = document.querySelector(`.${MARKER_CLASS}`);
    if (BiliExactViews.isExistingForVideo(existing?.dataset.videoKey, state.currentKey)) {
      return;
    }
    const playbackElement = getPlaybackElement();
    if (!playbackElement) {
      return;
    }
    removeInjectedValues();

    const formattedView = BiliExactViews.formatCount(state.view);
    if (!formattedView) {
      return;
    }
    const exactView = document.createElement('span');
    exactView.className = MARKER_CLASS;
    exactView.dataset.videoKey = state.currentKey;
    exactView.textContent = `（${formattedView}）`;
    exactView.style.marginLeft = '4px';
    exactView.style.whiteSpace = 'nowrap';
    playbackElement.append(exactView);
  }

  function renderExactDanmaku() {
    if (state.viewKey !== state.currentKey || state.danmaku === null) {
      return;
    }

    const existing = document.querySelector(`.${DANMAKU_MARKER_CLASS}`);
    if (BiliExactViews.isExistingForVideo(existing?.dataset.videoKey, state.currentKey)) {
      return;
    }
    const danmakuElement = getDanmakuElement();
    if (!danmakuElement) {
      return;
    }
    existing?.remove();

    const formattedDanmaku = BiliExactViews.formatCount(state.danmaku);
    if (!formattedDanmaku) {
      return;
    }
    const exactDanmaku = document.createElement('span');
    exactDanmaku.className = DANMAKU_MARKER_CLASS;
    exactDanmaku.dataset.videoKey = state.currentKey;
    exactDanmaku.textContent = `（${formattedDanmaku}）`;
    exactDanmaku.style.marginLeft = '4px';
    exactDanmaku.style.whiteSpace = 'nowrap';
    danmakuElement.append(exactDanmaku);
  }

  function renderExactToolbarStat(field, markerClass) {
    if (state.viewKey !== state.currentKey || state[field] === null) {
      return;
    }

    const formattedCount = BiliExactViews.formatCount(state[field]);
    const existing = document.querySelector(`.${markerClass}`);
    if (BiliExactViews.isExistingForVideo(existing?.dataset.videoKey, state.currentKey)) {
      const expectedText = formattedCount ? `（${formattedCount}）` : null;
      if (expectedText && existing.textContent !== expectedText) {
        existing.textContent = expectedText;
      }
      return;
    }
    existing?.remove();

    const target = findCompactCountElement(BiliExactViews.TOOLBAR_STAT_SELECTORS[field], markerClass);
    if (!target || !formattedCount) {
      return;
    }

    const exactCount = document.createElement('span');
    exactCount.className = `${markerClass} bilibili-exact-toolbar-value`;
    exactCount.dataset.videoKey = state.currentKey;
    exactCount.textContent = `（${formattedCount}）`;
    exactCount.style.marginLeft = '4px';
    exactCount.style.whiteSpace = 'nowrap';
    target.append(exactCount);
  }

  function renderExactStats() {
    renderExactView();
    renderExactDanmaku();
    for (const { field, markerClass } of TOOLBAR_STATS) {
      renderExactToolbarStat(field, markerClass);
    }
  }

  function requestExactView(videoId, key) {
    chrome.runtime.sendMessage(
      { type: 'bilibili-exact-views:get-view', videoId },
      (result) => {
        if (chrome.runtime.lastError || !result?.ok || state.currentKey !== key) {
          return;
        }
        state.view = result.view;
        state.danmaku = result.danmaku;
        state.like = result.like;
        state.coin = result.coin;
        state.favorite = result.favorite;
        state.share = result.share;
        state.viewKey = key;
        scheduleSync();
      }
    );
  }

  function sync() {
    const videoId = BiliExactViews.getVideoId(window.location.href);
    const key = BiliExactViews.getVideoKey(videoId);
    if (!key) {
      clearTimeout(state.refreshTimer);
      state.refreshTimer = null;
      state.currentKey = null;
      state.view = null;
      state.danmaku = null;
      state.like = null;
      state.coin = null;
      state.favorite = null;
      state.share = null;
      state.viewKey = null;
      removeInjectedValues();
      return;
    }

    if (state.currentKey !== key) {
      clearTimeout(state.refreshTimer);
      state.refreshTimer = null;
      state.currentKey = key;
      state.view = null;
      state.danmaku = null;
      state.like = null;
      state.coin = null;
      state.favorite = null;
      state.share = null;
      state.viewKey = null;
      removeInjectedValues();
      requestExactView(videoId, key);
      return;
    }
    renderExactStats();
  }

  function scheduleSync() {
    if (state.scheduled) {
      return;
    }
    state.scheduled = true;
    setTimeout(() => {
      state.scheduled = false;
      sync();
    }, 100);
  }

  function scheduleStatsRefresh() {
    clearTimeout(state.refreshTimer);
    state.refreshTimer = setTimeout(() => {
      const videoId = BiliExactViews.getVideoId(window.location.href);
      const key = BiliExactViews.getVideoKey(videoId);
      if (key && key === state.currentKey) {
        requestExactView(videoId, key);
      }
    }, 1200);
  }

  function handleToolbarClick(event) {
    if (event.target instanceof Element && event.target.closest(
      '#arc_toolbar_report .video-like, ' +
      '#arc_toolbar_report .video-coin, ' +
      '#arc_toolbar_report .video-fav'
    )) {
      scheduleStatsRefresh();
    }
  }

  new MutationObserver(scheduleSync).observe(document.documentElement, {
    childList: true,
    subtree: true
  });
  window.addEventListener('popstate', scheduleSync);
  window.addEventListener('hashchange', scheduleSync);
  document.addEventListener('click', handleToolbarClick, true);
  scheduleSync();
})();
