const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

const context = { URL, globalThis: {} };
vm.runInNewContext(fs.readFileSync(require.resolve('../lib.js'), 'utf8'), context);
const api = context.globalThis.BiliExactViews;

test('parses BV and AV video URLs', () => {
  assert.equal(
    JSON.stringify(api.getVideoId('https://www.bilibili.com/video/BV1xx411c7mD?p=2')),
    JSON.stringify({ bvid: 'BV1xx411c7mD' })
  );
  assert.equal(
    JSON.stringify(api.getVideoId('https://www.bilibili.com/video/av2/')),
    JSON.stringify({ aid: '2' })
  );
  assert.equal(api.getVideoId('https://www.bilibili.com/read/cv1'), null);
});

test('accepts only safe non-negative view and danmaku counts from successful API responses', () => {
  const payload = { code: 0, data: { stat: { view: 5351637, danmaku: 143827 } } };
  assert.equal(api.getViewFromResponse(payload), 5351637);
  assert.equal(api.getDanmakuFromResponse(payload), 143827);
  assert.equal(api.getViewFromResponse({ code: -412, data: { stat: { view: 1 } } }), null);
  assert.equal(api.getViewFromResponse({ code: 0, data: { stat: { view: -1 } } }), null);
  assert.equal(api.getDanmakuFromResponse({ code: 0, data: { stat: { danmaku: -1 } } }), null);
});

test('accepts exact toolbar counts only from supported API stat fields', () => {
  const payload = {
    code: 0,
    data: { stat: { like: 2776123, coin: 1212456, favorite: 1459123, share: 460123 } }
  };
  assert.equal(api.getStatFromResponse(payload, 'like'), 2776123);
  assert.equal(api.getStatFromResponse(payload, 'coin'), 1212456);
  assert.equal(api.getStatFromResponse(payload, 'favorite'), 1459123);
  assert.equal(api.getStatFromResponse(payload, 'share'), 460123);
  assert.equal(api.getStatFromResponse(payload, 'unsupported'), null);
  assert.equal(api.getStatFromResponse({ code: -412, data: payload.data }, 'like'), null);
});

test('formats exact views and identifies an existing injected value for the same video', () => {
  assert.equal(api.formatView(5351637), '5,351,637');
  assert.equal(api.formatCount(143827), '143,827');
  assert.equal(api.formatView(-1), null);
  assert.equal(api.isExistingForVideo('bvid:BV1xx411c7mD', 'bvid:BV1xx411c7mD'), true);
  assert.equal(api.isExistingForVideo('bvid:BV1xx411c7mD', 'aid:2'), false);
});

test('recognizes the current Bilibili compact view markup', () => {
  assert.equal(api.VIEW_SELECTORS.includes('#viewbox_report .view.item .view-text'), true);
  assert.equal(api.isPlaybackText('14.0万', true), true);
  assert.equal(api.isPlaybackText('704', false), false);
  assert.equal(api.isPlaybackText('14.0万播放', false), true);
});

test('recognizes the current Bilibili danmaku text selector', () => {
  assert.equal(api.DANMAKU_SELECTORS.includes('#viewbox_report .dm.item .dm-text'), true);
  assert.equal(api.isPlaybackText('14.3万', true), true);
});

test('contains selectors for all current toolbar count nodes', () => {
  assert.equal(api.TOOLBAR_STAT_SELECTORS.like.includes('#arc_toolbar_report .video-like-info'), true);
  assert.equal(api.TOOLBAR_STAT_SELECTORS.coin.includes('#arc_toolbar_report .video-coin-info'), true);
  assert.equal(api.TOOLBAR_STAT_SELECTORS.favorite.includes('#arc_toolbar_report .video-fav-info'), true);
  assert.equal(api.TOOLBAR_STAT_SELECTORS.share.includes('#arc_toolbar_report .video-share-info'), true);
  assert.equal(
    api.TOOLBAR_STAT_SELECTORS.share.includes('#arc_toolbar_report .video-share-wrap .video-share'),
    true
  );
});
