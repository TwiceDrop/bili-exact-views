(() => {
  'use strict';

  const BVID_PATTERN = /^BV[0-9A-Za-z]{10}$/;
  const AID_PATTERN = /^\d+$/;
  const VIEW_SELECTORS = Object.freeze([
    '#viewbox_report .video-info-meta .view-text',
    '#viewbox_report .view.item .view-text',
    '#viewbox_report .view-text',
    '#viewbox_report .video-data .view',
    '#viewbox_report .video-data .view-text',
    '.video-info-detail .video-data .view',
    '.video-info-detail .video-data .view-text',
    '#viewbox_report .video-info-meta .view',
    '.video-info-detail .video-info-meta .view',
    '#viewbox_report .view',
    '.video-info-detail .view'
  ]);
  const DANMAKU_SELECTORS = Object.freeze([
    '#viewbox_report .video-info-meta .dm-text',
    '#viewbox_report .dm.item .dm-text',
    '#viewbox_report .dm-text',
    '#viewbox_report .video-data .dm',
    '#viewbox_report .video-data .dm-text',
    '.video-info-detail .video-data .dm',
    '.video-info-detail .video-data .dm-text',
    '#viewbox_report .video-info-meta .dm',
    '.video-info-detail .video-info-meta .dm',
    '#viewbox_report .dm',
    '.video-info-detail .dm'
  ]);
  const TOOLBAR_STAT_SELECTORS = Object.freeze({
    like: Object.freeze([
      '#arc_toolbar_report .video-like-info',
      '#arc_toolbar_report .video-like .video-toolbar-item-text',
      '.video-like-info'
    ]),
    coin: Object.freeze([
      '#arc_toolbar_report .video-coin-info',
      '#arc_toolbar_report .video-coin .video-toolbar-item-text',
      '.video-coin-info'
    ]),
    favorite: Object.freeze([
      '#arc_toolbar_report .video-fav-info',
      '#arc_toolbar_report .video-fav .video-toolbar-item-text',
      '.video-fav-info'
    ]),
    share: Object.freeze([
      '#arc_toolbar_report .video-share-info',
      '#arc_toolbar_report .video-share .video-toolbar-item-text',
      '#arc_toolbar_report .video-share-wrap .video-toolbar-item-text',
      '#arc_toolbar_report .video-share-wrap .video-share-info',
      '#arc_toolbar_report .video-share-wrap .video-share',
      '#arc_toolbar_report [class*="video-share"] [class*="share-info"]',
      '#arc_toolbar_report .video-toolbar-left-main > .toolbar-left-item-wrap:nth-child(4) .video-toolbar-item-text',
      '.video-share-info'
    ])
  });

  function getVideoId(url) {
    let pathname;
    try {
      pathname = new URL(url).pathname;
    } catch {
      return null;
    }

    const bvMatch = pathname.match(/\/video\/(BV[0-9A-Za-z]{10})(?:\/|$)/i);
    if (bvMatch) {
      return { bvid: bvMatch[1] };
    }

    const avMatch = pathname.match(/\/video\/av(\d+)(?:\/|$)/i);
    if (avMatch) {
      return { aid: avMatch[1] };
    }

    return null;
  }

  function isValidVideoId(videoId) {
    if (!videoId || typeof videoId !== 'object') {
      return false;
    }
    return (typeof videoId.bvid === 'string' && BVID_PATTERN.test(videoId.bvid)) ||
      (typeof videoId.aid === 'string' && AID_PATTERN.test(videoId.aid));
  }

  function getVideoKey(videoId) {
    if (!isValidVideoId(videoId)) {
      return null;
    }
    return videoId.bvid ? `bvid:${videoId.bvid}` : `aid:${videoId.aid}`;
  }

  function getViewFromResponse(payload) {
    const view = payload?.code === 0 ? payload?.data?.stat?.view : null;
    return Number.isSafeInteger(view) && view >= 0 ? view : null;
  }

  function getDanmakuFromResponse(payload) {
    const danmaku = payload?.code === 0 ? payload?.data?.stat?.danmaku : null;
    return Number.isSafeInteger(danmaku) && danmaku >= 0 ? danmaku : null;
  }

  function getStatFromResponse(payload, field) {
    if (!Object.hasOwn(TOOLBAR_STAT_SELECTORS, field)) {
      return null;
    }
    const count = payload?.code === 0 ? payload?.data?.stat?.[field] : null;
    return Number.isSafeInteger(count) && count >= 0 ? count : null;
  }

  function formatCount(count) {
    if (!Number.isSafeInteger(count) || count < 0) {
      return null;
    }
    return count.toLocaleString('en-US');
  }

  function isExistingForVideo(existingKey, currentKey) {
    return Boolean(existingKey && currentKey && existingKey === currentKey);
  }

  function isPlaybackText(text, acceptCompact = false) {
    const normalized = typeof text === 'string' ? text.trim() : '';
    const isCompactViewNumber = /^\d+(?:\.\d+)?(?:万|亿)?$/.test(normalized);
    return /^\d+(?:\.\d+)?(?:万|亿)?\s*播放$/.test(normalized) ||
      (acceptCompact && isCompactViewNumber);
  }

  globalThis.BiliExactViews = {
    DANMAKU_SELECTORS,
    TOOLBAR_STAT_SELECTORS,
    VIEW_SELECTORS,
    formatCount,
    formatView: formatCount,
    getDanmakuFromResponse,
    getStatFromResponse,
    getVideoId,
    getVideoKey,
    getViewFromResponse,
    isExistingForVideo,
    isPlaybackText,
    isValidVideoId
  };
})();
