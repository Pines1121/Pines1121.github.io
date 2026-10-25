/*
   공용 설정. 네 page(index, developer, terminal, release)가 모두 공유한다.
   날짜, 주소, API, 사진 등 공개 정보는 이 파일에서만 수정하면 된다.

   주의: 계좌번호 같은 개인정보는 여기 두지 않는다.
     invitation.conf 에만 두고, 난독화한 blob을 HTML에 심는다.
     결과물과 검색 결과에 평문이 남지 않는다.
 */

/* HTML에 심어 둔 이 청첩장의 데이터. 원본은 invitation.conf 다.
   static은 build.sh 가 js/data.js 로 만들어 둔다. with-guestbook은 server가 요청마다 주입한다.
   추적되는 소스에는 이름도 예식 정보도 없고, 전부 여기서 읽어 쓴다.
   주입이 없으면 빈 값으로 떨어져 화면만 비어 보인다. */
/* 이 파일 안에서만 쓰는 이름이다. main.js, developer.js, terminal.js 가 각자
   const W = CONFIG.date 를 최상위에 선언하므로, 여기서 W 를 쓰면 전역에서 부딪쳐
   'Identifier W has already been declared' SyntaxError 로 그 파일들이 통째로 죽는다. */
var WDATA = (typeof window !== 'undefined' && window.__WEDDING__) || {};
var WV = WDATA.venue || {};
var WP = WDATA.photos || {};

/* 메인의 프로필 card 한 사람. role은 화면 label이라 코드에 둔다. */
function profileOf(p, role) {
  p = p || {};
  return {
    role: role, name: p.name || '', initial: p.initial || '',
    photo: p.photo || '', photoFocus: p.photoFocus || '50% 30%', photoZoom: p.photoZoom || 1,
    mbti: p.mbti || '', hobby: p.hobby || '',
  };
}

const CONFIG = {
  // 예식 일시. countdown, 달력, D-day가 여기서 자동으로 계산된다.
  date: new Date(WDATA.at || 0),
  // 두 사람이 처음 만난 날. terminal version의 uptime과 진행 bar 기준점.
  firstMet: new Date(WDATA.firstMetAt || WDATA.at || 0),

  // 주소 복사 button이 clipboard에 넣는 문자열
  address: WV.addressCopy || '',

  // 예식장과 길찾기 link
  venue: WV,
  map: WDATA.map || {},

  // 승인(축하) API. 같은 origin에서 서빙하면 /api 로 충분하다. with-guestbook이 그렇다.
  // 다른 곳의 API를 쓰려면 invitation.conf 의 GUESTBOOK_API_BASE 에 절대 URL을 적는다.
  // 그 값이 window.__API__ 로 주입된다.
  // API가 아예 없는 정적 배포에서는 window.__NO_API__ 가 심어지고
  // 화면이 localStorage demo mode로 fallback한다.
  // 계약: GET  {baseUrl}/approvals             -> { count, recent: [{ id, ts, msg }] }
  //       POST {baseUrl}/approvals { message } -> { count }
  api: {
    baseUrl: (typeof window !== 'undefined' && window.__API__) || '/api',
  },

  // 사진. 목록도 invitation.conf 에서 온다. 비어 있으면 자리 표시가 대신 나온다.
  //   gallery는 3x3 pagination이라 한 page에 9장이고, 배열 순서가 곧 표시 순서다.
  photos: {
    main: WP.main || '',
    mainDev: WP.mainDev || '',
    bless: WP.bless || '',
    gallery: WP.gallery || [],
    galleryPageOrder: WP.galleryPageOrder || {},
  },

  // 신랑과 신부 프로필. 메인(index)의 '신랑 & 신부' section에서 쓴다.
  profile: {
    groom: profileOf(WDATA.groom, '신랑'),
    bride: profileOf(WDATA.bride, '신부'),
  },

  // terminal version의 struct person card가 쓰는 원본(부모, 서열, 직업까지)
  people: { groom: WDATA.groom || {}, bride: WDATA.bride || {} },

  // 네이버 지도 embed. key(ncpKeyId)는 invitation.conf 의 NAVER_MAP_KEY_ID 에 넣는다.
  //   window.__NAVER_MAP_KEY__ 로 심어지므로 아래 keyId는 늘 비워 둔다.
  //   key가 없으면 지도 대신 안내 문구가 보이고, 길찾기 button은 그대로 동작한다.
  naverMap: {
    keyId: '',
    lat: WV.lat || 0,
    lng: WV.lng || 0,
    zoom: WV.zoom || 17,
    label: [WV.name, WV.hall].filter(Boolean).join(' '),
  },
};

/* 축하 한마디를 저장할 곳이 없는 정적 배포에서는 입력창과 기록 목록을 감춘다.
   build.sh 가 window.__NO_API__ 를 넣어 알려 준다.
   그대로 두면 하객이 글을 남겨도 그 사람 browser에만 남고 신랑신부에게 오지 않는데,
   화면은 잘 보낸 것처럼 보여서 하객을 속이게 된다.
   AI agent들의 축하는 저장이 필요 없으므로 그대로 둔다.
   element를 지우지 않고 감추기만 하는 이유는, 각 version의 js가 이 element들을
   getElementById로 잡아 두기 때문이다. 지우면 null을 참조해 그 파일이 통째로 멈춘다.
   GUESTBOOK_API_BASE 를 채워 API를 붙이면 __NO_API__ 가 없으므로 다시 보인다. */
(function hideGuestbookWithoutStore() {
  if (typeof window === 'undefined' || !window.__NO_API__) return;
  var st = document.createElement('style');
  st.id = 'no-guestbook-style';
  st.textContent =
    // main version. section 전체가 축하 기능이다. 아래 전체폭 사진은 section 밖이라 남는다.
    '#bless{display:none}' +
    // developer version. AI 축하(.ai-guests)는 남기고 나머지를 감춘다.
    // .readme 는 'approve해 주세요' 안내문이다. 누를 button이 없으니 함께 감춘다.
    '#deploy .readme,#deploy .deploy-line,#deploy .input-hint,' +
    '#deployBtn,#deployMsg,#deploy .approval-log{display:none}' +
    // terminal version. AI 축하(.ai)는 남기고 나머지를 감춘다.
    '#rsvp .body-text,#rsvp .rsvp-line,#rsvp .input-hint,' +
    '#rsvpBtn,#rsvpMsg,#rsvp .log{display:none}';
  (document.head || document.documentElement).appendChild(st);

  /* AI 축하 머리글의 '먼저'를 뺀다. 하객 축하를 받지 않으므로 뒤따라 올 것이 없는데
     '먼저 도착했습니다'는 곧 다른 축하가 온다는 뜻으로 읽힌다. */
  function dropMeonjeo() {
    var heads = document.querySelectorAll('#deploy .ai-head, #rsvp .ai-head');
    for (var i = 0; i < heads.length; i++) {
      heads[i].textContent = heads[i].textContent.replace('먼저 도착', '도착');
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', dropMeonjeo);
  } else {
    dropMeonjeo();
  }
})();


/* 예식 시각이 지났는지 판정한다. hidden(release) page 공개 여부를 가른다.
   어느 page든 ?preview=1 을 붙이면 시각 전에도 미리 볼 수 있다(신랑신부 확인용). */
function isWeddingDeployed() {
  if (new URLSearchParams(location.search).get('preview') === '1') return true;
  return Date.now() >= CONFIG.date.getTime();
}

/* CONFIG.photos 의 파일 이름을 실제 URL로 바꾼다.
   사진은 photos/ 에 있고 그 base가 window.__PHOTOS__ 로 주입된다. */
function photoSrc(src) {
  if (!src) return src;
  if (/^(https?:)?\/\//.test(src) || src.charAt(0) === '/') return src;   // 이미 절대 경로면 그대로
  var base = (typeof window !== 'undefined' && window.__PHOTOS__) || '';
  return base + src;
}

/* 청첩장 자산(css, js, assets)의 base 경로. window.__INV__ 로 주입된다.
   page가 모두 같은 깊이라 '.' 이 들어가고, 하위 경로 배포에서도 그대로 동작한다. */
function invAsset(path) {
  var base = (typeof window !== 'undefined' && window.__INV__) || '';
  return base + '/' + String(path || '').replace(/^\/+/, '');
}

/* gallery page 재배열. CONFIG.photos.gallery(평면 배열)를 9장 단위로 나눈 뒤
   version별 order(1-indexed page 번호 배열)대로 이어붙여 돌려준다.
   order가 없으면 원래 순서 그대로다.
   예) order=[1,3,2,4] 이면 1, 3, 2, 4page 순서로 표시한다.
   index는 main 순서를, developer는 dev 순서를 쓴다. */
function orderedGallery(order) {
  var P = 9;
  var all = (CONFIG.photos && CONFIG.photos.gallery) || [];
  var pages = [];
  for (var i = 0; i < all.length; i += P) pages.push(all.slice(i, i + P));
  var ord = (order && order.length) ? order : pages.map(function (_, i) { return i + 1; });
  return ord.reduce(function (acc, n) { return acc.concat(pages[n - 1] || []); }, []);
}


/* 승인(축하) log 조회. 세 version이 각자 render를 넘겨 함께 쓴다.
   '가끔 모든 version에서 축하 메시지가 안 뜨는' 문제를 두 가지로 막는다.
     1) 5초 polling 중의 network blip과 비정상 응답(res.ok=false)이 이미 화면에 떠 있던
        log를 '아직 기록 없음'으로 덮어쓰지 않게 한다.
        마지막으로 성공한, 비어 있지 않은 render를 유지한다.
     2) 첫 조회가 실패하거나 비면 짧게 재시도해, server가 막 떠서 느린 구간을 흡수한다.
        count는 server에서 단조 증가하므로, 한번 채워진 뒤의
        빈 응답은 일시적 blip으로 본다.
   render(count, recent) : 화면에 그릴 내용이 확정됐을 때만 호출한다.
   onFail()              : 첫 조회조차 끝내 실패했을 때만 호출한다(오프라인 demo fallback용). */
/* API는 최신 20건씩만 준다(server의 PAGE). '더보기'로 뒤를 계속 이어 받는 동안에도
   5초 polling이 계속 돌기 때문에 polling 응답으로 목록을 통째로 '교체'하면 이미 불러둔
   이전 항목이 사라진다. 그래서 받은 page를 기존 목록에 '합친다'. 중복 판별과 정렬 기준은 id(<ms>-<seq>)다.
   이 누적 목록이 위 1)의 '마지막 성공본' 역할도 겸한다(비어 있을 때만 빈 화면). */
var _apprItems = [];        // 최신순 누적 [{id,ts,msg}]
var _apprCount = 0;         // 전체 건수(API가 주는 count)
var _apprCursor = '';       // 다음 '더보기' 기준 = 지금 목록의 가장 오래된 id
var _apprExhausted = false; // 더 받을 게 없다고 server가 확인해 준 상태
var _apprMoreBusy = false;  // '더보기' 연타 방지
var _apprFirstDone = false; // 첫 조회를 이미 한 번 수행했는지(재시도는 첫 load에만)

/* 각 version이 '더보기 button을 보일지 / 로딩 표시를 할지' 판단할 때 쓴다. */
function approvalsHasMore() { return !_apprExhausted && !!_apprCursor && _apprItems.length < _apprCount; }
function approvalsBusy() { return _apprMoreBusy; }

// stream id는 "<ms>-<seq>" 꼴이다. 문자열로 비교하면 "9" > "10" 이 되므로 숫자로 나눠 비교한다.
function _apprCmpDesc(a, b) {
  var x = String(a.id || '').split('-'), y = String(b.id || '').split('-');
  var ax = Number(x[0]) || 0, ay = Number(y[0]) || 0;
  if (ax !== ay) return ay - ax;                            // 최신(큰 ms) 먼저
  return (Number(y[1]) || 0) - (Number(x[1]) || 0);
}

// demo fallback 항목에는 id가 없어서 ts|msg로 대체 키를 만든다.
function _apprKey(it) { return it.id || (it.ts + '|' + it.msg); }

function _apprMerge(incoming) {
  var all = incoming.concat(_apprItems);
  var seen = Object.create(null), out = [];
  for (var i = 0; i < all.length; i++) {
    var k = _apprKey(all[i]);
    if (seen[k]) continue;
    seen[k] = 1;
    out.push(all[i]);
  }
  if (out.length && out[0].id) out.sort(_apprCmpDesc);       // id 있는 정상 경로만 정렬
  _apprItems = out;
  _apprCursor = out.length ? (out[out.length - 1].id || '') : '';
}

async function loadApprovals(render, onFail) {
  /* API가 없는 정적 배포다. build.sh 가 window.__NO_API__ 를 넣어 알려 준다.
     그냥 두면 5초마다 없는 주소로 요청해 404가 쌓이므로, 여기서 바로 demo mode로 넘긴다.
     축하 한마디는 이 browser의 localStorage에만 남는다. */
  if (typeof window !== 'undefined' && window.__NO_API__) {
    if (onFail) onFail();
    return;
  }
  // 재시도(cold start 흡수)는 첫 조회에만 한다. 이후 5초 polling은 단발이고, 다음 tick이 5초 뒤에 온다.
  // 메시지가 0건인 환경에서 polling마다 요청을 3배로 치지 않게 하려는 것이다.
  // '기존 render 유지'는 _apprItems가 매 회 보장한다.
  var maxTry = _apprFirstDone ? 1 : 3;
  _apprFirstDone = true;
  for (var i = 0; i < maxTry; i++) {
    try {
      var res = await fetch(CONFIG.api.baseUrl + '/approvals', { cache: 'no-store' });
      if (!res.ok) throw new Error('http ' + res.status);
      var data = await res.json();
      var recent = (data && Array.isArray(data.recent)) ? data.recent : [];
      var count = (data && Number(data.count)) || 0;
      if (recent.length) {                      // 정상 데이터. 누적에 합쳐 render한다.
        _apprCount = count;
        _apprMerge(recent);
        render(_apprCount, _apprItems);
        return;
      }
      if (_apprItems.length) {                  // 빈 응답인데 예전엔 있었다. 일시 blip이므로 기존 유지.
        render(_apprCount, _apprItems);
        return;
      }
      if (i === maxTry - 1) {                   // 재시도 후에도 정말 비었다(갓 배포된 환경 등). 빈 상태로.
        _apprCount = count;
        render(count, []);
        return;
      }
    } catch (e) {
      if (_apprItems.length) {                  // 실패했지만 이미 받아둔 목록이 있으면 그대로 유지(안 지움)
        render(_apprCount, _apprItems);
        return;
      }
      if (i === maxTry - 1) {                   // 첫 조회조차 끝내 실패했다. demo로 fallback한다.
        if (onFail) onFail();
        return;
      }
    }
    await new Promise(function (r) { setTimeout(r, 500); });   // 재시도 간격(cold start 흡수)
  }
}

/* '더보기'. 지금 목록에서 가장 오래된 id보다 더 오래된 20건을 뒤에 이어 붙인다.
   실패하면 목록과 cursor를 그대로 둬서 다음 클릭에 재시도되게 한다(button도 유지). */
async function loadMoreApprovals(render) {
  if (_apprMoreBusy || !approvalsHasMore()) return;
  _apprMoreBusy = true;
  if (render) render(_apprCount, _apprItems);                 // button을 '불러오는 중'으로 즉시 갱신
  try {
    var res = await fetch(
      CONFIG.api.baseUrl + '/approvals?before=' + encodeURIComponent(_apprCursor),
      { cache: 'no-store' }
    );
    if (!res.ok) throw new Error('http ' + res.status);
    var data = await res.json();
    var older = (data && Array.isArray(data.recent)) ? data.recent : [];
    if (data && Number(data.count)) _apprCount = Number(data.count);
    // 빈 page는 목록 끝을 뜻한다. 합계 표시가 틀어지지 않게 count는 건드리지 않는다.
    if (older.length) _apprMerge(older); else _apprExhausted = true;
  } catch (e) {
    /* network나 스토어 오류. button을 남겨 다음 클릭에 재시도되게 한다. */
  } finally {
    _apprMoreBusy = false;
    if (render) render(_apprCount, _apprItems);
  }
}


/* 자동 축하 메시지 선택. 세 version이 각자의 풀을 넘겨 함께 쓴다.
   풀은 version마다 다르다. main은 BLESS_MSGS, developer는 APPROVE_MSGS, terminal은 LOG_MSGS.
   직접 입력이 없는(msg가 빈) 승인은 이 풀에서 문구를 뽑아 표시한다.
   ts hash로 안정적으로 고르되, avoid(바로 직전 2개 메시지)와 겹치면 풀에서 다음 후보로
   밀어 같은 문구가 연속으로 뜨는 것을 막는다. */
function pickAutoMsg(iso, pool, avoid) {
  if (!pool || !pool.length) return '';
  var start = 0, s = String(iso || '');
  for (var i = 0; i < s.length; i++) start = (start * 31 + s.charCodeAt(i)) >>> 0;
  start = start % pool.length;
  var av = avoid || [];
  for (var k = 0; k < pool.length; k++) {
    var cand = pool[(start + k) % pool.length];
    if (av.indexOf(cand) === -1) return cand;   // 직전 2개와 안 겹치는 첫 후보
  }
  return pool[start];                            // 풀이 2개 이하일 때의 fallback
}

/* recent(최신순 [{ts,msg}])를 받아, 빈 msg를 자동 축하 문구로 채운 목록을 최신순 그대로 돌려준다.
   결정은 오래된 항목부터 최신 항목 쪽으로 진행해, 각 항목이 시간상 바로 앞의 두 메시지와
   겹치지 않게 한다. 기록이 append-only라 더 오래된 항목의 선택은 바뀌지 않고,
   덕분에 polling을 반복해도 화면 표시가 흔들리지 않는다. */
function resolveAutoMsgs(list, pool) {
  var out = new Array(list.length);
  var avoid = [];
  for (var j = list.length - 1; j >= 0; j--) {
    var it = list[j] || {};
    var ts = it.ts || it;
    var msg = it.msg || pickAutoMsg(ts, pool, avoid);
    out[j] = { ts: ts, msg: msg };
    avoid.push(msg);
    if (avoid.length > 2) avoid.shift();          // 직전 2개만 유지
  }
  return out;
}

/* 공유하기. button을 누르면 4채널 bottom sheet를 연다(세 version 공통).
   1) 카카오톡으로 공유하기  : Kakao.Share.sendDefault로 피드 card(사진, 제목, button)를 보낸다.
                              login은 필요 없다.
   2) 문자로 공유하기        : sms: scheme으로 문자앱을 연다. 본문은 제목, 일자, 장소, link다.
   3) 이외 방법으로 공유하기 : system native 공유 sheet(navigator.share). 미지원이면 link 복사.
   4) link 복사              : clipboard로 복사한다.
   카카오 키(JavaScript 키, domain 제한 공개키)는 invitation.conf 의 KAKAO_JS_KEY 에 넣고
   window.__KAKAO_KEY__ 로 심어진다. 키가 없으면 1)은 system 공유로 fallback한다. */

/* 이 청첩장의 domain. invitation.conf 의 SITE_ORIGIN 이 window.__ORIGIN__ 으로 심어진다.
   없으면 지금 열린 주소를 쓴다. */
function siteOrigin() {
  return (typeof window !== 'undefined' && window.__ORIGIN__) || location.origin;
}

/* 현재 환경 domain에서 scheme을 뺀 호스트만. terminal과 개발자 version의 장식 text(ssh, curl)에 쓴다.
   domain을 hardcoding하지 않기 위한 것이다. */
function siteHost() {
  return String(siteOrigin()).replace(/^https?:\/\//, '');
}

function shareUrl() {
  return siteOrigin() + location.pathname;   // 환경 domain(단일 출처)과 현재 page 경로
}

/* 현재 page의 og 메타값. 카카오 공유 card에 그대로 재사용한다.
   치환 단계에서 절대 URL까지 채워 둔 값이다. */
function ogMeta(prop) {
  var el = document.querySelector('meta[property="' + prop + '"]');
  return (el && el.getAttribute('content')) || '';
}

/* 카카오 SDK load와 초기화. 키가 있을 때만 한다.
   키가 없으면 navigator.share나 link 복사로 fallback한다. */
var kakaoReady = false;
function initKakaoShare() {
  var key = (typeof window !== 'undefined' && window.__KAKAO_KEY__) || '';
  if (!key || document.getElementById('kakao-sdk')) return;
  var s = document.createElement('script');
  s.id = 'kakao-sdk';
  // SDK version. 카카오가 새 version을 내면 숫자만 올리면 된다. load에 실패하면 조용히 fallback한다.
  s.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.5/kakao.min.js';
  s.crossOrigin = 'anonymous';
  s.onload = function () {
    try {
      if (window.Kakao && !Kakao.isInitialized()) Kakao.init(key);
      kakaoReady = !!(window.Kakao && Kakao.isInitialized() && Kakao.Share);
    } catch (e) { kakaoReady = false; }
  };
  s.onerror = function () { kakaoReady = false; };
  document.head.appendChild(s);
}

/* 카카오 공유. og 메타로 card를 명시해 보낸다. 미리보기가 즉시 뜨고 in-app browser에서도 동작한다. */
function shareKakao(url) {
  Kakao.Share.sendDefault({
    objectType: 'feed',
    content: {
      title: ogMeta('og:title') || document.title,
      description: ogMeta('og:description') || '',
      imageUrl: ogMeta('og:image') || '',
      link: { mobileWebUrl: url, webUrl: url },
    },
    buttons: [{ title: '청첩장 열기', link: { mobileWebUrl: url, webUrl: url } }],
  });
}

/* 공유에 쓸 제목, 일자, 장소, link를 og 메타에서 모은다. */
function shareData() {
  return {
    title: ogMeta('og:title') || document.title,
    desc: ogMeta('og:description') || '',   // 일자와 장소
    url: shareUrl(),
  };
}

/* 4) link 복사 */
function copyLink(url, btn) {
  function flash() {
    if (!btn) return;
    var prev = btn.getAttribute('data-label') || btn.textContent;
    btn.textContent = '링크 복사됨 ✓';
    setTimeout(function () { btn.textContent = prev; }, 1500);
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(flash).catch(function () {
      window.prompt('아래 링크를 복사해 공유해 주세요', url);
    });
  } else {
    window.prompt('아래 링크를 복사해 공유해 주세요', url);
  }
}

/* 2) 문자(SMS). 본문은 제목, 일자와 장소, link로 만든다.
   scheme은 iOS가 sms:&body=, 나머지는 sms:?body= 를 쓴다.
   제목은 version별 og:title 대신 CONFIG.profile의 이름으로 만든 하객용 한국어 문구를 쓴다.
   terminal version의 og:title은 'marriage: A && B' 꼴인데, 일부 문자앱이 그 '&'를
   sms: 본문의 구분자로 오인해 뒤를 잘라낸다. 그대로 두면 첫 이름까지만 남는다.
   또 어느 version에서 공유하든 하객이 똑같이 읽기 좋은 문구를 받게 된다.
   fallback 경로에서도 '&'는 제거한다. */
function shareViaSms(d) {
  var p = (typeof CONFIG !== 'undefined' && CONFIG.profile) || null;
  var title = (p && p.groom && p.bride)
    ? p.groom.name + ' ♥ ' + p.bride.name + ' 결혼합니다'
    : String(d.title || '').replace(/\s*&+\s*/g, ' ');
  var body = title + '\n' + d.desc + '\n' + d.url;
  var ios = /iP(hone|ad|od)/i.test(navigator.userAgent || '');
  location.href = 'sms:' + (ios ? '&' : '?') + 'body=' + encodeURIComponent(body);
}

/* 3) 이외 방법. system native 공유 sheet(navigator.share)를 쓰고, 미지원이면 link를 복사한다. */
function shareViaSystem(d, btn) {
  if (navigator.share) navigator.share({ url: d.url }).catch(function () {});
  else copyLink(d.url, btn);
}

/* 공유 bottom sheet(4채널 메뉴). 한 번 만들어 두고 재사용한다. */
var _shsBack = null;
function buildShareSheet() {
  if (_shsBack) return _shsBack;
  if (!document.getElementById('shs-style')) {
    var st = document.createElement('style');
    st.id = 'shs-style';
    st.textContent =
      '.shs-back{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:99998;display:flex;align-items:flex-end;justify-content:center;opacity:0;transition:opacity .2s}' +
      '.shs-back.on{opacity:1}' +
      '.shs{width:100%;max-width:460px;background:#fff;color:#222;border-radius:20px 20px 0 0;padding:8px 16px calc(18px + env(safe-area-inset-bottom));transform:translateY(101%);transition:transform .26s cubic-bezier(.2,.8,.2,1);box-shadow:0 -8px 40px rgba(0,0,0,.25);font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Malgun Gothic",sans-serif}' +
      '.shs-back.on .shs{transform:translateY(0)}' +
      '.shs-grip{width:38px;height:4px;border-radius:2px;background:#dadada;margin:8px auto 12px}' +
      '.shs-ttl{text-align:center;font-size:13px;color:#999;margin:0 0 10px}' +
      '.shs-btn{display:flex;align-items:center;gap:12px;width:100%;border:0;background:#f2f2f4;color:#222;font-size:15.5px;font-weight:500;padding:15px 16px;border-radius:14px;margin:8px 0;cursor:pointer;text-align:left;line-height:1.2;font-family:inherit}' +
      '.shs-btn:active{background:#e6e6e9}' +
      '.shs-btn .i{font-size:19px;width:24px;flex:0 0 24px;text-align:center}' +
      // main version은 카카오 button에 실제 카카오톡 icon을 쓴다.
      // terminal과 개발자 skin은 .i 를 숨기므로 icon이 자동으로 안 보인다.
      '.shs-btn.kakao .i img{display:block;width:22px;height:22px;border-radius:5px;margin:0 auto}' +
      '.shs-btn.kakao{background:#FEE500;color:#181600}' +
      '.shs-btn.kakao:active{background:#f3da00}' +
      '.shs-btn.sms{background:#e4f4ea;color:#1f5b38}.shs-btn.sms:active{background:#d4ecdd}' +
      '.shs-btn.sys{background:#e7eefb;color:#284a86}.shs-btn.sys:active{background:#d6e4f8}' +
      '.shs-btn.copy{background:#f0eaf8;color:#4a3a6b}.shs-btn.copy:active{background:#e4daf3}' +
      '.shs-cancel{background:transparent;color:#999;font-weight:600;justify-content:center;margin-top:2px}' +
      // terminal version은 CRT 모노스페이스 phosphor skin이다. terminal theme 변수
      // (--bg, --fg, --fg-dim, --accent, --mono)를 쓰므로 녹색과 amber toggle을 자동으로 따라간다.
      '.shs-back.term .shs{background:var(--bg);color:var(--fg);border-top:1px solid var(--fg-dim);border-radius:0;font-family:var(--mono);box-shadow:0 -8px 40px rgba(0,0,0,.7)}' +
      '.shs-back.term .shs-grip{background:var(--fg-dim)}' +
      '.shs-back.term .shs-ttl{color:var(--fg-dim);letter-spacing:.08em}' +
      '.shs-back.term .shs-btn{background:transparent;color:var(--fg);border:1px solid var(--fg-dim);border-radius:0;font-family:var(--mono);font-weight:400;font-size:14px}' +
      '.shs-back.term .shs-btn:active{background:var(--fg-dim);color:var(--bg)}' +
      '.shs-back.term .shs-btn .i{display:none}' +
      '.shs-back.term .shs-btn::before{content:"$ ";color:var(--fg-dim)}' +
      // button별 ANSI 컬러와 shell prompt (bash $, zsh %, fish >, starship ❯)
      '.shs-back.term .shs-btn.kakao{color:#e5c07b;border-color:#e5c07b}.shs-back.term .shs-btn.kakao::before{content:"$ ";color:#e5c07b}.shs-back.term .shs-btn.kakao:active{background:#e5c07b;color:var(--bg)}' +
      '.shs-back.term .shs-btn.sms{color:#98c379;border-color:#98c379}.shs-back.term .shs-btn.sms::before{content:"% ";color:#98c379}.shs-back.term .shs-btn.sms:active{background:#98c379;color:var(--bg)}' +
      '.shs-back.term .shs-btn.sys{color:#56b6c2;border-color:#56b6c2}.shs-back.term .shs-btn.sys::before{content:"> ";color:#56b6c2}.shs-back.term .shs-btn.sys:active{background:#56b6c2;color:var(--bg)}' +
      '.shs-back.term .shs-btn.copy{color:#c678dd;border-color:#c678dd}.shs-back.term .shs-btn.copy::before{content:"❯ ";color:#c678dd}.shs-back.term .shs-btn.copy:active{background:#c678dd;color:var(--bg)}' +
      '.shs-back.term .shs-cancel{border-color:transparent;color:var(--fg-dim)}' +
      '.shs-back.term .shs-cancel::before{content:""}' +
      // 개발자 version은 editor(IDE) skin이다. developer.css의 theme 변수
      // (--panel, --line, --text, --comment, --mint 등)를 따라가므로 dark와 light가 자동으로 붙는다.
      // button은 couple.yaml처럼 'key: value' 꼴이고 앞 token이 채널 이름 겸 syntax color다.
      // 덕분에 terminal(CRT) skin과 확실히 구분된다.
      '.shs-back.dev .shs{background:var(--panel);color:var(--text);border:1px solid var(--line);border-bottom:0;border-radius:12px 12px 0 0;font-family:var(--mono);box-shadow:0 -10px 44px rgba(0,0,0,.5)}' +
      '.shs-back.dev .shs-grip{background:var(--line)}' +
      '.shs-back.dev .shs-ttl{color:var(--comment);letter-spacing:.04em}' +
      '.shs-back.dev .shs-btn{background:color-mix(in srgb,var(--text) 5%,transparent);color:var(--text);border:1px solid var(--line);border-radius:8px;font-family:var(--mono);font-weight:400;font-size:13.5px}' +
      '.shs-back.dev .shs-btn:active{background:color-mix(in srgb,var(--text) 12%,transparent)}' +
      '.shs-back.dev .shs-btn .i{display:none}' +
      '.shs-back.dev .shs-btn::before{color:var(--comment)}' +
      // 채널별 syntax color, 'key:' token, 눌렀을 때의 배경 채움
      '.shs-back.dev .shs-btn.kakao{border-color:color-mix(in srgb,var(--amber) 40%,var(--line))}.shs-back.dev .shs-btn.kakao::before{content:"kakao: ";color:var(--amber)}.shs-back.dev .shs-btn.kakao:active{background:color-mix(in srgb,var(--amber) 16%,transparent)}' +
      '.shs-back.dev .shs-btn.sms{border-color:color-mix(in srgb,var(--green) 40%,var(--line))}.shs-back.dev .shs-btn.sms::before{content:"sms: ";color:var(--green)}.shs-back.dev .shs-btn.sms:active{background:color-mix(in srgb,var(--green) 16%,transparent)}' +
      '.shs-back.dev .shs-btn.sys{border-color:color-mix(in srgb,var(--blue) 40%,var(--line))}.shs-back.dev .shs-btn.sys::before{content:"system: ";color:var(--blue)}.shs-back.dev .shs-btn.sys:active{background:color-mix(in srgb,var(--blue) 16%,transparent)}' +
      '.shs-back.dev .shs-btn.copy{border-color:color-mix(in srgb,var(--mint) 40%,var(--line))}.shs-back.dev .shs-btn.copy::before{content:"link: ";color:var(--mint)}.shs-back.dev .shs-btn.copy:active{background:color-mix(in srgb,var(--mint) 16%,transparent)}' +
      '.shs-back.dev .shs-cancel{background:transparent;border-color:transparent;color:var(--comment)}' +
      '.shs-back.dev .shs-cancel::before{content:"# "}';
    document.head.appendChild(st);
  }
  var back = document.createElement('div');
  back.className = 'shs-back';
  back.innerHTML =
    '<div class="shs" role="dialog" aria-label="공유하기">' +
    '<div class="shs-grip"></div><div class="shs-ttl">공유하기</div>' +
    '<button class="shs-btn kakao" data-act="kakao"><span class="i"><img class="kakao-ico" src="' +
    invAsset('assets/kakao.png') + '" alt="" /></span>카카오톡으로 공유하기</button>' +
    '<button class="shs-btn sms" data-act="sms"><span class="i">✉️</span>문자로 공유하기</button>' +
    '<button class="shs-btn sys" data-act="system"><span class="i">📤</span>이외 방법으로 공유하기</button>' +
    '<button class="shs-btn copy" data-act="copy"><span class="i">🔗</span>모바일 청첩장 링크 복사하기</button>' +
    '<button class="shs-btn shs-cancel" data-act="close">닫기</button>' +
    '</div>';
  // version별 skin을 고른다. terminal.css가 걸려 있으면 CRT, .editor-bar header가 있으면
  // editor IDE, 둘 다 아니면 main의 기본 pastel이다.
  if (document.querySelector('link[href*="terminal.css"]')) {
    back.classList.add('term');
    var ttlT = back.querySelector('.shs-ttl');
    if (ttlT) ttlT.textContent = '$ ./share.sh';
  } else if (document.querySelector('.editor-bar')) {
    back.classList.add('dev');
    var ttlD = back.querySelector('.shs-ttl');
    if (ttlD) ttlD.textContent = '$ ./share --invite';
  }
  // terminal과 개발자 skin은 icon emoji(.i)를 쓰지 않는다. CSS의 display:none에 더해
  // node 자체를 제거해서, 예전 cache된 사본이나 render 예외 상황에서도 emoji가 절대 안 보이게 한다.
  // main version은 icon을 그대로 둔다.
  if (back.classList.contains('term') || back.classList.contains('dev')) {
    [].forEach.call(back.querySelectorAll('.shs-btn .i'), function (ic) {
      if (ic.parentNode) ic.parentNode.removeChild(ic);
    });
  }
  back.style.display = 'none';
  document.body.appendChild(back);

  function close() {
    back.classList.remove('on');
    setTimeout(function () { back.style.display = 'none'; }, 260);
  }
  back.addEventListener('click', function (e) {
    if (e.target === back) return close();                 // 바깥의 어두운 영역을 tap하면 닫는다
    var b = e.target.closest('[data-act]');
    if (!b) return;
    var act = b.getAttribute('data-act');
    if (act === 'close') return close();
    var d = shareData();
    if (act === 'kakao') {
      if (kakaoReady && window.Kakao && Kakao.Share) {
        try { shareKakao(d.url); } catch (e2) { shareViaSystem(d); }
      } else { shareViaSystem(d); }                        // 카카오가 준비 안 됐으면 system 공유로 fallback
      close();
    } else if (act === 'sms') { shareViaSms(d); close(); }
    else if (act === 'system') { shareViaSystem(d); close(); }
    else if (act === 'copy') { copyLink(d.url, b); setTimeout(close, 1000); }
  });
  _shsBack = back;
  return back;
}

function openShareSheet() {
  var back = buildShareSheet();
  back.style.display = 'flex';
  void back.offsetWidth;        // reflow를 강제해야 slide 인 animation이 걸린다
  back.classList.add('on');
}
/* 하위호환용으로 기존 진입점 이름을 남겨 둔다. */
function shareInvitation() { openShareSheet(); }

document.addEventListener('DOMContentLoaded', function () {
  initKakaoShare();                                // 키가 있으면 카카오 SDK를 미리 load한다
  var b = document.getElementById('shareBtn');
  if (!b) return;
  b.addEventListener('click', function () { openShareSheet(); });
});


/* 네이버 지도 embed. main과 개발자 version의 '오시는 길'에서 쓴다.
   #naverMap 요소가 있고 키가 설정돼 있을 때만 지도를 그린다.
   키가 없거나 load에 실패하면 container에 .is-fallback을 붙여 안내 문구(.map-note)를 노출하고,
   네이버 지도와 카카오맵 길찾기 button으로 유도한다. */
function initNaverMap() {
  var box = document.getElementById('naverMap');
  if (!box) return;
  var cfg = CONFIG.naverMap || {};
  // 키(ncpKeyId)는 invitation.conf 의 NAVER_MAP_KEY_ID 가 window.__NAVER_MAP_KEY__ 로 주입된다.
  // 없으면 아래 cfg.keyId로 fallback하는데 그쪽은 늘 비어 있다.
  var keyId = (typeof window !== 'undefined' && window.__NAVER_MAP_KEY__) || cfg.keyId || '';
  function fallback() { box.classList.add('is-fallback'); }
  if (!keyId) { fallback(); return; }

  var s = document.createElement('script');
  s.src = 'https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=' +
          encodeURIComponent(keyId);
  // 인증에 실패하면(잘못된 키이거나 NCP에 domain이 미등록이면) 네이버 API가 부르는 전역 callback.
  // 깨진 지도나 빈 지도 대신 안내 문구(.is-fallback)로 떨어지게 한다. 네이버가 권장하는 훅이다.
  window.navermap_authFailure = fallback;

  s.onload = function () {
    if (!window.naver || !naver.maps) { fallback(); return; }
    var pos = new naver.maps.LatLng(cfg.lat, cfg.lng);
    box.innerHTML = '';                          // 안내 문구를 지운 뒤 지도를 그린다
    var map = new naver.maps.Map(box, {
      center: pos,
      zoom: cfg.zoom || 16,
      scrollWheel: false,                        // page scroll이 지도에 갇히지 않게
      draggable: false,                          // drag(패닝) 잠금. 약도가 손으로 안 움직이게.
      pinchZoom: false,                          // pinch zoom 잠금
      disableDoubleTapZoom: true,                // double tap zoom 잠금
      disableDoubleClickZoom: true,              // 더블클릭 zoom 잠금
      disableKineticPan: true,                   // 관성 이동 잠금
      keyboardShortcuts: false,                  // 키보드 이동 잠금
    });
    new naver.maps.Marker({ position: pos, map: map, title: cfg.label || '' });
  };
  s.onerror = fallback;
  document.head.appendChild(s);
}

document.addEventListener('DOMContentLoaded', initNaverMap);


/* 확대(zoom) 차단. 전 화면 공통.
   viewport meta의 user-scalable=no를 iOS Safari가 무시하므로 JS로 보강한다.
   touch-action으로 pinch와 double tap zoom을 끄고, gesture event와 데스크톱의 ctrl 또는 command zoom도
   막는다. 일반 scroll은 그대로 둔다. */
(function blockZoom() {
  try { document.documentElement.style.touchAction = 'pan-x pan-y'; } catch (e) {}
  // iOS Safari pinch(gesture) zoom
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (ev) {
    document.addEventListener(ev, function (e) { e.preventDefault(); }, { passive: false });
  });
  // multi-touch(pinch) 보강
  document.addEventListener('touchmove', function (e) {
    if (e.touches && e.touches.length > 1) e.preventDefault();
  }, { passive: false });
  // 데스크톱의 ctrl 또는 command 조합 zoom: 휠 zoom과 (+, -, =, 0) 키 zoom
  document.addEventListener('wheel', function (e) {
    if (e.ctrlKey || e.metaKey) e.preventDefault();
  }, { passive: false });
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && ['+', '-', '=', '0'].indexOf(e.key) !== -1) e.preventDefault();
  });
})();


/* text 선택과 long press callout 차단. 전 화면 공통.
   길게 눌러도 문구가 drag 선택되거나 iOS의 복사, 정의 callout이 뜨지 않게 해서 앱처럼 보이게 한다.
   주의: 축하 한마디 같은 입력창은 선택과 편집을 그대로 유지한다.
     주소와 계좌 복사는 각 화면의 '복사' button이 담당하므로 영향이 없다. */
(function blockTextSelection() {
  var st = document.createElement('style');
  st.id = 'no-select-style';
  st.textContent =
    'html,body{-webkit-touch-callout:none;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}' +
    'input,textarea,[contenteditable="true"]{-webkit-user-select:text;-moz-user-select:text;-ms-user-select:text;user-select:text;-webkit-touch-callout:default}';
  (document.head || document.documentElement).appendChild(st);
})();


/* image long press 메뉴 차단. 전 화면 공통.
   세 겹으로 막는다. browser마다 메뉴를 띄우는 경로가 달라 한 가지로는 다 안 잡힌다.
     1) -webkit-touch-callout      : iOS 사파리의 callout
     2) contextmenu preventDefault : 데스크톱과 안드로이드 크롬의 context 메뉴
     3) pointer-events:none        : 카카오톡 등 in-app browser(안드로이드 WebView)
   3)이 없으면 in-app browser를 못 막는다. 앱이 직접 long press를 가로채 hit test 결과가
   image면 저장 메뉴를 띄우는데, JS의 contextmenu를 아예 거치지 않아 2)가 통하지 않는다.
   image를 히트 대상에서 빼면 결과가 image가 아니게 되어 메뉴가 뜨지 않는다.
   주의: 동작에는 안전하다. 이 저장소는 click과 touch handler가 모두 container(.g-item, .gallery,
   .lightbox)에 붙어 있고 img에 직접 붙은 것이 없다. event는 container로 버블링되므로 사진 tap,
   gallery swipe, lightbox 좌우 이동이 그대로 동작한다. load와 error는 pointer event가 아니다.
   주의: image에만 건다. 화면 전체에 걸면 데스크톱에서 우클릭이 통째로 막힌다.
   drag해서 저장하는 경로(dragstart)도 함께 막는다. */
(function blockImageSave() {
  var st = document.createElement('style');
  st.id = 'no-image-save-style';
  st.textContent = 'img{-webkit-touch-callout:none;-webkit-user-drag:none;pointer-events:none}';
  (document.head || document.documentElement).appendChild(st);

  // 캡처 단계에서 잡아, 나중에 붙는 image(gallery, lightbox, profile)까지 한 번에 처리한다.
  function blockOnImage(e) {
    if (e.target && e.target.tagName === 'IMG') e.preventDefault();
  }
  document.addEventListener('contextmenu', blockOnImage, true);
  document.addEventListener('dragstart', blockOnImage, true);
})();


/* 입력 정제. 축하 한마디 입력창에서 깨진 기호를 걸러낸다.
   결합문자(Zalgo, 글자 위아래로 무한정 쌓이는 것)와 제어문자, zero-width 및 방향제어 문자를 없앤다.
   한글, 영문, emoji, 일반 문장부호는 그대로 둔다.
   \p{M}은 Mark 카테고리만 지우므로 한글과 emoji는 대상이 아니다. */
function cleanMessage(s) {
  s = String(s == null ? '' : s).replace(/\p{M}+/gu, '');  // 결합문자(위아래로 쌓이는 자모) 제거
  var out = '';
  for (var i = 0; i < s.length; i++) {
    var c = s.charCodeAt(i);
    if (c < 0x20 || (c >= 0x7f && c <= 0x9f)) continue;                       // 제어문자(C0, C1)
    if (c === 0x200b || c === 0x200c || c === 0x200e || c === 0x200f ||
        (c >= 0x202a && c <= 0x202e) || c === 0x2060 || c === 0xfeff) continue; // zero-width, 방향제어(BIDI)
    out += s.charAt(i);
  }
  return out;
}

/* 축하 한마디 글자수 제한(세 version 공통)
   server의 sanitize()도 같은 50자로 잘라낸다. 여기서는 입력 자체는 허용하되,
   50자를 넘으면 실시간 글자수와 경고를 띄우고 전송은 blessExceeded()로 막는다. */
var BLESS_LIMIT = 50;

/* 입력값이 제한을 넘었는지 확인한다. 각 version의 전송 handler가 불러서 전송을 막는다. */
function blessExceeded(id) {
  var el = document.getElementById(id);
  return !!(el && String((el && el.value) || '').length > BLESS_LIMIT);
}

document.addEventListener('DOMContentLoaded', function () {
  ['blessInput', 'deployInput', 'rsvpInput'].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;

    // 50자 초과를 '경고 후 차단'으로 다루려고 하드 제한(maxlength)을 푼다.
    // JS가 load되지 않으면 HTML의 maxlength=50이 그대로 fallback이라, 그때는 초과 입력 자체가 안 된다.
    el.removeAttribute('maxlength');

    // 실시간 글자수 counter를 입력창 바로 뒤에 넣는다. version별 .bless-count style이 theme를 따라간다.
    var counter = document.createElement('div');
    counter.className = 'bless-count';
    counter.setAttribute('aria-live', 'polite');
    el.insertAdjacentElement('afterend', counter);

    function refresh() {
      var len = String(el.value || '').length;
      var over = len > BLESS_LIMIT;
      el.classList.toggle('over-limit', over);
      if (!len) {
        counter.className = 'bless-count';
        counter.textContent = '';
      } else {
        counter.className = 'bless-count' + (over ? ' over' : '');
        counter.textContent = over
          ? '50자를 넘기는 축하 메세지는 보낼 수 없어요 (현재 ' + len + '자)'
          : len + ' / ' + BLESS_LIMIT;
      }
    }

    el.addEventListener('input', function () {
      var cleaned = cleanMessage(el.value);
      if (cleaned !== el.value) {
        var atEnd = el.selectionStart === el.value.length;
        el.value = cleaned;
        if (atEnd) { try { el.setSelectionRange(cleaned.length, cleaned.length); } catch (e) {} }
      }
      refresh();
    });
    refresh();
  });
});


/* Google Analytics (전 화면 공통)
   invitation.conf 의 GA_MEASUREMENT_ID 가 window.__GA_ID__ 로 심어진다.
   비어 있으면 script를 부르지 않고 요청도 내지 않는다. 이 저장소는 남이 fork해서 쓰므로
   ID를 HTML에 박아 두면 남의 하객 방문이 내 속성으로 들어온다. 그래서 conf 로 뺐다.
   config.js 는 네 page가 모두 가장 먼저 부르므로 여기 한 곳이면 전 page에 걸린다. */
(function loadAnalytics() {
  var id = (typeof window !== 'undefined' && window.__GA_ID__) || '';
  if (!id) return;
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
  (document.head || document.documentElement).appendChild(s);
  window.dataLayer = window.dataLayer || [];
  // gtag는 GA가 요구하는 전역 이름이다. arguments 를 그대로 넘겨야 한다.
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', id);
})();


/* easter egg: 개발자 console 인사(전 version 공통)
   개발자도구 console을 열면 terminal version의 부부 사진(our_wedding.jpg) ASCII art와
   영어 감사 인사를 console.log로 남긴다. config.js는 세 version과 release가 모두 가장 먼저
   load하므로 어느 URL에서든 똑같이 보인다.
   도형은 terminal.js의 renderPhoto()에 있는 polaroid 커플과 같고, 여기서는 평문으로 재현한다.
   ※ console.log라서 기본 console 레벨(Info)에서 항상 보인다. */
(function consoleEasterEgg() {
  try {
    if (typeof console === 'undefined' || !console.log) return;
    var INNER = 28;
    var padIn = function (s) { return s + ' '.repeat(Math.max(0, INNER - s.length)); };
    var bar = function (l, r) { return l + '─'.repeat(INNER) + r; };
    var header = ' our_wedding.jpg'.padEnd(INNER - 6) + '[_][o]';
    // 왼쪽은 신랑(톱햇 ___ 과 보타이 =), 오른쪽은 신부(플라워 베일 .ooo. 과 드레스 :::),
    // 가운데 ______ 는 두 사람을 잇는 붉은 실이다.
    var body = [
      '',
      '           ( <3 )',
      '       ___',
      '      [___]      .ooo.',
      '      (^_^)      (^_^)',
      '      /|=|\\______/|V|\\',
      '       | |       /:::\\',
      '      _/ \\_     /:::::\\',
      '',
    ];
    var art = [bar('┌', '┐'), '│' + header + '│', bar('├', '┤')]
      .concat(body.map(function (b) { return '│' + padIn(b) + '│'; }))
      .concat([bar('└', '┘')])
      .join('\n');
    var gn = String((CONFIG.people.groom || {}).en || '').split(' ')[0];
    var bn = String((CONFIG.people.bride || {}).en || '').split(' ')[0];
    var msg = 'Dear developer, thank you for celebrating our marriage! ♥\n'
            + 'With love, ' + gn + ' ♥ ' + bn;
    var mono = 'font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';
    console.log(
      '%c' + art + '\n\n%c' + msg,
      'color:#39d353;' + mono + ';font-size:12px;line-height:1.25',
      'color:#e5c07b;' + mono + ';font-size:13px;font-weight:700;line-height:1.6'
    );
  } catch (e) {}
})();
