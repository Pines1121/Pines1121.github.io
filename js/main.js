/*
   main(index) version script. 개발자가 아닌 하객을 위한 기본 청첩장이다.
   날짜, 주소, API, 사진 같은 설정은 js/config.js에서 공유한다.

   목차
   01. scroll reveal
   02. 사진 (main, gallery, lightbox, swipe)
   03. D-day countdown
   04. 달력
   05. 복사 button
   06. 축하 전하기 (꽃잎 confetti, 승인 API)
   07. hidden page banner
 */

const W = CONFIG.date;
const pad = (n) => String(n).padStart(2, '0');
// D-day 문구에 쓸 짧은 이름. invitation.conf 의 *_NAME_SHORT 에서 온다.
const SHORT_G = (CONFIG.people.groom || {}).short || '';
const SHORT_B = (CONFIG.people.bride || {}).short || '';


/* 01. scroll reveal */

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.18 }
);

document.querySelectorAll('.rv').forEach((el) => revealObserver.observe(el));


/* 02. 사진: main, gallery, lightbox, swipe */

const loadedPhotos = [];

function createPhoto(src, { caption = '', onLoaded = null } = {}) {
  const img = document.createElement('img');
  img.src = photoSrc(src);   // 배포별 ?v= cache busting
  img.alt = caption || '웨딩 사진';
  img.loading = 'lazy';

  img.addEventListener('load', () => {
    if (onLoaded) onLoaded(img);
  });

  img.addEventListener('error', () => {
    const placeholder = document.createElement('div');
    placeholder.className = 'ph-placeholder';
    placeholder.innerHTML = `
      <span class="ico">📷</span>
      <span class="fn">${src}</span>
      <span class="hint">사진을 준비 중이에요</span>
    `;
    img.replaceWith(placeholder);
  });

  return img;
}

// main 사진(아치 frame). 확대는 하지 않는다. 클릭과 zoom cursor가 없고 lightbox 목록에서도 뺀다.
const mainPhotoImg = createPhoto(CONFIG.photos.main, { caption: '메인 웨딩 사진' });
document.getElementById('mainPhoto').appendChild(mainPhotoImg);

// '축하 전하기' 아래의 전체폭(풀블리드) 사진. HTML의 #blessPhoto에 ?v= cache busting src를 넣는다.
const blessPhotoEl = document.getElementById('blessPhoto');
if (blessPhotoEl && CONFIG.photos.bless) blessPhotoEl.src = photoSrc(CONFIG.photos.bless);

// gallery. 3x3 pagination이라 한 page에 9장씩 나눠 보여준다.
const galleryEl = document.getElementById('gallery');
const GALLERY_PAGE = 9;   // 3x3, 한 page 9장

// main(main) version의 page 순서로 재배열한 gallery. config.js의 orderedGallery가 page 단위로 옮긴다.
const GALLERY = orderedGallery((CONFIG.photos.galleryPageOrder || {}).main);

// lightbox는 page와 무관하게 gallery 전체를 순환한다.
GALLERY.forEach((src) => loadedPhotos.push(src));

// 아이템을 한 번만 만들어 두면 page를 넘겨도 다시 내려받지 않는다.
const galleryItems = GALLERY.map((src, i) => {
  const item = document.createElement('figure');
  item.className = 'g-item';
  item.style.cursor = 'zoom-in';
  item.appendChild(createPhoto(src, { caption: `웨딩 사진 ${i + 1}` }));
  item.addEventListener('click', () => openLightbox(src));
  return item;
});

const galleryPages = Math.max(1, Math.ceil(galleryItems.length / GALLERY_PAGE));
let galleryPage = 0;

const galleryPager = document.createElement('div');
galleryPager.className = 'gallery-pager';
galleryEl.insertAdjacentElement('afterend', galleryPager);

function renderGallery(p) {
  const target = Math.min(Math.max(0, p), galleryPages - 1);
  const dir = Math.sign(target - galleryPage);   // 다음(+1) 또는 이전(-1) 방향으로 slide 인
  galleryPage = target;
  const start = galleryPage * GALLERY_PAGE;
  galleryEl.replaceChildren(...galleryItems.slice(start, start + GALLERY_PAGE));
  renderGalleryPager();
  if (dir !== 0) {
    galleryEl.style.transition = 'none';
    galleryEl.style.transform = 'translateX(' + (dir * 26) + 'px)';
    galleryEl.style.opacity = '0';
    void galleryEl.offsetWidth;                   // reflow를 강제한 뒤에 transition을 건다
    galleryEl.style.transition = 'transform .34s cubic-bezier(.22,1,.36,1), opacity .3s ease';
    galleryEl.style.transform = 'translateX(0)';
    galleryEl.style.opacity = '1';
  }
}

function renderGalleryPager() {
  if (galleryPages <= 1) { galleryPager.replaceChildren(); return; }
  const frag = document.createDocumentFragment();
  const btn = (label, page, opts = {}) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pg-btn' + (opts.active ? ' active' : '');
    b.textContent = label;
    if (opts.disabled) b.disabled = true;
    else b.addEventListener('click', () => renderGallery(page));
    return b;
  };
  frag.appendChild(btn('‹', galleryPage - 1, { disabled: galleryPage === 0 }));
  for (let i = 0; i < galleryPages; i++) {
    frag.appendChild(btn(String(i + 1), i, { active: i === galleryPage }));
  }
  frag.appendChild(btn('›', galleryPage + 1, { disabled: galleryPage === galleryPages - 1 }));
  galleryPager.replaceChildren(frag);
}

renderGallery(0);

// gallery 좌우 swipe로 page를 넘긴다. gesture 방향을 초기에 판정한다(directional lock).
// 가로로 확정되면 세로 scroll을 막아, 대각선 swipe 시 page가 위아래로 밀리지 않게 한다.
let gSwipeX = 0, gSwipeY = 0, gLock = null;   // gLock: null(미정) | 'h'(가로) | 'v'(세로)
galleryEl.addEventListener('touchstart', (e) => {
  gSwipeX = e.touches[0].clientX; gSwipeY = e.touches[0].clientY; gLock = null;
}, { passive: true });
galleryEl.addEventListener('touchmove', (e) => {
  const dx = e.touches[0].clientX - gSwipeX;
  const dy = e.touches[0].clientY - gSwipeY;
  if (gLock === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
    gLock = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
  }
  if (gLock === 'h') e.preventDefault();      // 가로 swipe 확정 → 세로 scroll 잠금
}, { passive: false });
galleryEl.addEventListener('touchend', (e) => {
  const dx = e.changedTouches[0].clientX - gSwipeX;
  if (gLock === 'h' && Math.abs(dx) > 48) {
    renderGallery(galleryPage + (dx > 0 ? -1 : 1));   // 오른쪽=이전, 왼쪽=다음
  }
  gLock = null;
}, { passive: true });

// 첫 방문에도 좌우 swipe가 바로 보이도록, 초기 load 뒤 gallery 사진 전체를 미리 받아 cache에 올린다.
const _preloaded = [];
function preloadGalleryImages() {
  GALLERY.forEach((src) => { const im = new Image(); im.src = photoSrc(src); _preloaded.push(im); });
}
if (document.readyState === 'complete') preloadGalleryImages();
else window.addEventListener('load', preloadGalleryImages, { once: true });

const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxCap = document.getElementById('lightboxCap');
let lightboxIndex = 0;

function openLightbox(src) {
  lightboxIndex = loadedPhotos.indexOf(src);
  showLightboxPhoto();
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.classList.remove('open');
  document.body.style.overflow = '';
}

function showLightboxPhoto() {
  lightboxImg.src = photoSrc(loadedPhotos[lightboxIndex]);
  lightboxCap.textContent = `${lightboxIndex + 1} / ${loadedPhotos.length}`;
}

function stepLightbox(delta) {
  const n = loadedPhotos.length;
  lightboxIndex = (lightboxIndex + delta + n) % n;
  showLightboxPhoto();
}

document.getElementById('lbClose').addEventListener('click', closeLightbox);
document.getElementById('lbPrev').addEventListener('click', () => stepLightbox(-1));
document.getElementById('lbNext').addEventListener('click', () => stepLightbox(1));

// 사진의 왼쪽과 오른쪽을 tap하면 이전, 다음으로 넘어간다. 사진 영역의 세로 범위 안에서만 동작한다.
// 배경이나 양옆 빈 곳을 눌러도 닫히지 않는다. 닫기는 ✕ button과 Esc 키가 담당한다.
lightbox.addEventListener('click', (e) => {
  if (lbSwiped) { lbSwiped = false; return; }               // swipe 직후 합성 클릭 무시(중복 이동 방지)
  if (e.target.closest('button')) return;                   // ✕, ‹, › button은 각자 handler가 처리
  const r = lightboxImg.getBoundingClientRect();
  if (e.clientY < r.top || e.clientY > r.bottom) { closeLightbox(); return; }  // 사진 세로 범위 밖(위/아래) → 닫기
  stepLightbox(e.clientX < window.innerWidth / 2 ? -1 : 1);                    // 사진 좌/우 → 이전/다음(사진 옆은 안 닫힘)
});

document.addEventListener('keydown', (e) => {
  if (!lightbox.classList.contains('open')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') stepLightbox(-1);
  if (e.key === 'ArrowRight') stepLightbox(1);
});

let touchStartX = 0, lbSwiped = false;

lightbox.addEventListener('touchstart', (e) => {
  touchStartX = e.touches[0].clientX;
  lbSwiped = false;
}, { passive: true });

lightbox.addEventListener('touchend', (e) => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 48) { lbSwiped = true; stepLightbox(dx > 0 ? -1 : 1); }
}, { passive: true });

// lightbox가 떠 있는 동안 배경 page가 밀리지 않게 한다.
// overlay의 touchmove를 막아 swipe를 차단한다.
lightbox.addEventListener('touchmove', (e) => { e.preventDefault(); }, { passive: false });


/* 03. D-day countdown */

function tickCountdown() {
  const diff = Math.max(0, W - new Date());

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000) % 24;
  const minutes = Math.floor(diff / 60000) % 60;
  const seconds = Math.floor(diff / 1000) % 60;

  document.getElementById('cdD').textContent = days;
  document.getElementById('cdH').textContent = pad(hours);
  document.getElementById('cdM').textContent = pad(minutes);
  document.getElementById('cdS').textContent = pad(seconds);

  document.getElementById('ddayNote').innerHTML =
    diff > 0
      ? `${SHORT_G} ♥ ${SHORT_B} 결혼식이 <b>${days}일</b> 남았습니다`
      : `${SHORT_G} ♥ ${SHORT_B}, 부부가 되었습니다 ♥`;
}

tickCountdown();
setInterval(tickCountdown, 1000);


/* 04. 달력 */

document.getElementById('calTitle').textContent =
  `${W.getFullYear()}년 ${W.getMonth() + 1}월`;

(function buildCalendar() {
  const year = W.getFullYear();
  const month = W.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();

  let html =
    '<thead><tr>' +
    ['일', '월', '화', '수', '목', '금', '토'].map((d) => `<th>${d}</th>`).join('') +
    '</tr></thead><tbody><tr>';

  let col = 0;

  for (let i = 0; i < firstWeekday; i++, col++) {
    html += '<td></td>';
  }

  for (let date = 1; date <= lastDate; date++) {
    if (col === 7) {
      html += '</tr><tr>';
      col = 0;
    }
    const mark = date === W.getDate() ? ' wedding-day' : '';
    html += `<td><span class="d${mark}">${date}</span></td>`;
    col++;
  }

  while (col++ < 7) html += '<td></td>';

  html += '</tr></tbody>';
  document.getElementById('calTable').innerHTML = html;
})();


/* 05. 복사 button */

function flashCopied(button, label = '복사됨 ✓') {
  const original = button.textContent;
  button.textContent = label;
  button.classList.add('copied');

  setTimeout(() => {
    button.textContent = original;
    button.classList.remove('copied');
  }, 1600);
}

document.getElementById('copyAddr').addEventListener('click', (e) => {
  navigator.clipboard
    .writeText(CONFIG.address)
    .then(() => flashCopied(e.target));
});

// 계좌 복사는 js/private.js가 맡는다. server가 주입하고, 펼칠 때만 render한다.


/*
   06. 축하 전하기: 꽃잎 confetti와 승인 API
   (개발자 version과 같은 API/저장소를 공유합니다)
 */

const blLines = document.getElementById('blLines');
const blTotal = document.getElementById('blTotal');
// 표시 개수는 config.js의 스토어가 20건 단위로 관리한다. 여기서는 받아둔 만큼 전부 그린다.
// box 높이는 css .bl-lines 의 max-height 가 잡고, 넘치면 scroll된다.

function timeAgo(iso) {
  const sec = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (sec < 60) return '방금 전';
  if (sec < 3600) return `${Math.floor(sec / 60)}분 전`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}시간 전`;
  return `${Math.floor(sec / 86400)}일 전`;
}

// 축하 메시지 풀. timestamp hash로 안정적으로 골라 매번 다른 한마디가 나온다.
// 일반 version: 한국 결혼식에서 실제로 건네는 따뜻한 덕담들
const BLESS_MSGS = [
  '결혼 진심으로 축하드려요 🎉',
  '두 분의 앞날을 축복합니다 💐',
  '검은 머리 파뿌리 될 때까지 행복하세요 👵👴',
  '백년해로하세요 🥂',
  '꽃길만 걸으세요 🌸',
  '늘 처음처럼 사랑하며 사세요 ❤️',
  '서로 아끼고 보듬으며 사세요 🤍',
  '행복한 가정 이루시길 바라요 🏡',
  '천생연분, 너무 잘 어울려요 🥰',
  '기쁨은 두 배로, 슬픔은 절반으로 💞',
  '평생의 단짝을 만나셨네요 💫',
  '사랑 가득한 신혼 보내세요 💖',
  '두 분 닮은 예쁜 가정 이루세요 👶',
  '늘 건강하고 행복하시길 🙏',
  '변치 않는 사랑 나누며 사세요 💗',
  '좋은 일만 가득하시길 바랍니다 🍀',
  '오래오래 함께 웃으며 사세요 😊',
  '서로에게 가장 좋은 사람이 되어주세요 ✨',
  '두 분의 새 출발을 응원합니다 🌷',
  '영원히 행복하세요 🎊',
  '깨가 쏟아지는 신혼 되세요 🌿',
  '축하해요, 두 분 정말 보기 좋아요 💐',
];

// 자동 축하 문구 선택은 config.js pickAutoMsg/resolveAutoMsgs 로 일원화(직전 2개 제외).

// 사용자 입력 메시지를 화면에 안전하게 출력(XSS 방어)
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// recent 항목은 { ts, msg }. (구버전 ISO 문자열도 호환)
function renderBlessings(count, recent) {
  // 5초 폴링 재렌더로 읽던 위치가 맨 위로 튀지 않게 스크롤을 기억해 둔다.
  const keepScroll = blLines.scrollTop;
  blLines.innerHTML = '';

  if (!recent.length) {
    blLines.innerHTML =
      '<div class="bl-line">아직 기록이 없어요. 첫 번째 축하를 남겨주세요!</div>';
  }

  // 빈 msg는 자동 문구로 채우되 '직전 2개'와 안 겹치게(config.js resolveAutoMsgs). 렌더는 최신순 유지.
  resolveAutoMsgs(recent, BLESS_MSGS).forEach((it) => {
    const line = document.createElement('div');
    line.className = 'bl-line';
    line.innerHTML = `<span class="ts">${timeAgo(it.ts)}</span> ${esc(it.msg)}`;
    blLines.appendChild(line);
  });

  // 목록 맨 아래의 '더보기'. 스크롤을 끝까지 내리면 나오고, 누르면 20건씩 이어 붙는다.
  if (approvalsHasMore()) {
    const busy = approvalsBusy();
    const more = document.createElement('button');
    more.className = 'bl-more';
    more.type = 'button';
    more.disabled = busy;
    more.textContent = busy
      ? '불러오는 중…'
      : `지난 축하 더보기 (${(count - recent.length).toLocaleString()}개 남음)`;
    more.addEventListener('click', () => loadMoreApprovals(renderBlessings));
    blLines.appendChild(more);
  }

  blLines.scrollTop = keepScroll;
  blTotal.innerHTML = `지금까지 <b>${count.toLocaleString()}</b>번의 축하를 받았어요`;
}

function readDemo() {
  return JSON.parse(localStorage.getItem('wedding-approvals-demo') || '[]');
}

function pushDemo(msg) {
  const demo = readDemo();
  demo.push({ ts: new Date().toISOString(), msg });
  localStorage.setItem('wedding-approvals-demo', JSON.stringify(demo));
}

async function fetchBlessings() {
  // 조회는 config.js의 loadApprovals()에 맡긴다. 폴링 실패나 일시적 빈 응답이 기존 렌더를
  // 지우지 않게 방어(마지막 성공본 유지) + 첫 로드 실패 시 재시도(cold start 흡수).
  await loadApprovals(renderBlessings, () => {
    const demo = readDemo();
    renderBlessings(demo.length, demo.slice().reverse());
  });
}

async function sendBlessing() {
  // 직접 입력한 한마디(비우면 '' → 서버가 ts만 저장 → 일반 버전 랜덤 문구로 표시)
  const input = document.getElementById('blessInput');
  const message = ((input && input.value) || '').trim();

  try {
    // API가 없는 정적 배포면 network를 거치지 않고 바로 이 browser에만 남긴다.
    if (typeof window !== 'undefined' && window.__NO_API__) throw new Error('no api');
    const res = await fetch(`${CONFIG.api.baseUrl}/approvals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    // 404나 503 같은 응답은 fetch가 예외로 던지지 않는다. 그대로 두면 아래 catch가
    // 실행되지 않아 하객이 남긴 글이 아무 곳에도 저장되지 않고 사라진다.
    if (!res.ok) throw new Error('http ' + res.status);
  } catch {
    pushDemo(message);
  }

  if (input) { input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); }  // 글자수 카운터도 리셋
  fetchBlessings();
}

// 꽃잎 컨페티
const PETALS = ['❀', '✿', '🌸', '♥', '❁'];
const PETAL_COLORS = ['#bd5d7c', '#e7c3cf', '#b08d4f', '#5a7a5e', '#d98ba6'];

/* 축하 버튼. 첫 축하 뒤 60초가 지나야 '한번 더 축하하기'가 열린다.
   server는 경계 race를 피하려고 이보다 짧은 50초 창으로 검증한다(RATE_LIMIT_SECONDS). */
const blessBtn = document.getElementById('blessBtn');
const blessMsg = document.getElementById('blessMsg');
const BLESS_COOLDOWN = 60 * 1000;
let blessTick = null;

function fireBlessConfetti() {
  for (let i = 0; i < 40; i++) {
    setTimeout(() => {
      const petal = document.createElement('span');
      petal.className = 'confetti';
      petal.textContent = PETALS[Math.floor(Math.random() * PETALS.length)];
      petal.style.left = Math.random() * 100 + 'vw';
      petal.style.top = '-5vh';
      petal.style.color = PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)];
      petal.style.fontSize = 12 + Math.random() * 12 + 'px';
      petal.style.animationDuration = 3 + Math.random() * 3 + 's';

      document.body.appendChild(petal);
      setTimeout(() => petal.remove(), 6500);
    }, i * 70);
  }
}

function refreshBlessBtn() {
  const at = +localStorage.getItem('wedding-bless-at') || 0;
  const remain = Math.ceil((BLESS_COOLDOWN - (Date.now() - at)) / 1000);
  if (at && remain > 0) {
    blessBtn.disabled = true;
    blessBtn.classList.add('blessed');
    blessBtn.textContent = `한번 더 축하하기 (${remain}초)`;
  } else {
    blessBtn.disabled = false;
    blessBtn.classList.remove('blessed');
    blessBtn.textContent = at ? '한번 더 축하하기 ❀' : '축하의 마음 전하기 ❀';   // 한 번이라도 축하했으면 '한번 더'
    if (blessTick) { clearInterval(blessTick); blessTick = null; }
  }
}

function startBlessTick() {
  if (!blessTick) blessTick = setInterval(refreshBlessBtn, 1000);
}

blessBtn.addEventListener('click', function () {
  const at = +localStorage.getItem('wedding-bless-at') || 0;
  if (at && Date.now() - at < BLESS_COOLDOWN) return; // 쿨다운 중

  // 50자 초과를 막는다. 쿨다운 타임스탬프를 먼저 쓰지 않도록 전송 전에 검사한다.
  if (typeof blessExceeded === 'function' && blessExceeded('blessInput')) {
    blessMsg.textContent = '50자를 넘기는 축하 메세지는 보낼 수 없어요.';
    blessMsg.classList.add('show');
    return;
  }

  localStorage.setItem('wedding-bless-at', String(Date.now()));

  blessMsg.textContent = '따뜻한 축하 감사합니다. 소중히 간직할게요.';
  blessMsg.classList.add('show');
  sendBlessing();
  fireBlessConfetti();

  refreshBlessBtn();
  startBlessTick();
});

refreshBlessBtn();
startBlessTick();

fetchBlessings();
setInterval(fetchBlessings, 5000);   // 5초마다 폴링(첫 로드 즉시 + 실시간 반영)


/* 07. 히든 페이지 배너: 예식 후 노출 */

if (isWeddingDeployed()) {
  document.getElementById('releaseBanner').classList.add('show');
}
