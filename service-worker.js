/* global BiliExactViews */
'use strict';

importScripts('lib.js');

const API_URL = 'https://api.bilibili.com/x/web-interface/view';

async function fetchExactStats(videoId) {
  if (!BiliExactViews.isValidVideoId(videoId)) {
    return { ok: false, error: 'invalid-video-id' };
  }

  const url = new URL(API_URL);
  if (videoId.bvid) {
    url.searchParams.set('bvid', videoId.bvid);
  } else {
    url.searchParams.set('aid', videoId.aid);
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return { ok: false, error: 'http-error' };
    }

    const payload = await response.json();
    const view = BiliExactViews.getViewFromResponse(payload);
    const danmaku = BiliExactViews.getDanmakuFromResponse(payload);
    const like = BiliExactViews.getStatFromResponse(payload, 'like');
    const coin = BiliExactViews.getStatFromResponse(payload, 'coin');
    const favorite = BiliExactViews.getStatFromResponse(payload, 'favorite');
    const share = BiliExactViews.getStatFromResponse(payload, 'share');
    return [view, danmaku, like, coin, favorite, share].every((count) => count === null)
      ? { ok: false, error: 'invalid-api-response' }
      : { ok: true, view, danmaku, like, coin, favorite, share };
  } catch {
    return { ok: false, error: 'network-error' };
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'bilibili-exact-views:get-view') {
    return;
  }

  fetchExactStats(message.videoId).then(sendResponse);
  return true;
});
