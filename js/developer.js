/*
   개발자(developer) version script. IDE와 CI/CD를 motif로 한 청첩장이다.
   날짜, 주소, API, 사진 같은 설정은 js/config.js에서 공유한다.

   목차
   01. CONFIG        : js/config.js에서 load
   02. theme toggle      : dark와 light, localStorage 저장
   03. 날짜 rendering    : hero와 .env block의 날짜 자동 갱신
   04. terminal typing  : hero의 git merge 연출
   05. scroll reveal    : IntersectionObserver
   06. pipeline     : CI/CD 단계 순차 통과 연출
   07. countdown     : D-day 실시간 갱신
   08. 달력          : 예식 월 자동 생성
   09. gallery        : 사진 grid와 lightbox
   10. 복사 button      : 주소와 계좌 clipboard
   11. confetti        : approve(deploy) button 연출
   12. 축하 log      : 익명 승인 기록
   13. hidden page 공개 : 예식 시각 이후
   14. AI guests     : AI agent들의 축하
 */


/*
   01. CONFIG: js/config.js에서 load된다.
   날짜, 주소, API, 사진 수정은 모두 그 파일에서 한다.
 */


/* 02. theme toggle: dark와 light */

const themeToggle = document.getElementById('themeToggle');

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeToggle.textContent = theme === 'dark' ? '☾' : '☀';
  themeToggle.title = theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환';
  localStorage.setItem('wedding-theme', theme);
}

// URL(?theme=dark|light) > 저장된 theme > dark(기본) 순서로 결정
// 개발자 version은 system 설정과 무관하게 dark mode를 기본으로 채택합니다.
const urlTheme = new URLSearchParams(location.search).get('theme');
const savedTheme = localStorage.getItem('wedding-theme');
applyTheme(urlTheme || savedTheme || 'dark');

themeToggle.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(next);
});


/* 03. 날짜 rendering */

const W = CONFIG.date;
const pad = (n) => String(n).padStart(2, '0');

const DAY_KO = ['일', '월', '화', '수', '목', '금', '토'];
const DAY_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTH_EN = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
];

const hour12 = W.getHours() % 12 || 12;
const ampm = W.getHours() < 12 ? 'AM' : 'PM';

document.getElementById('heroDate').textContent =
  `${W.getFullYear()}.${pad(W.getMonth() + 1)}.${pad(W.getDate())}` +
  ` ${DAY_EN[W.getDay()]} ${ampm} ${hour12}:${pad(W.getMinutes())}`;

document.getElementById('envDate').textContent =
  `"${W.getFullYear()}-${pad(W.getMonth() + 1)}-${pad(W.getDate())} (${DAY_KO[W.getDay()]})"`;

document.getElementById('envTime').textContent =
  `"${ampm === 'AM' ? '오전' : '오후'} ${hour12}시${W.getMinutes() ? ' ' + W.getMinutes() + '분' : ''}"`;


/* 04. terminal typing */

/* git log 연출의 branch 이름. 'Anga Kim' -> 'anga-kim'
   이 파일에는 이름을 박아 두지 않는다. CONFIG.people 은 invitation.conf 에서 주입된 값이다. */
const branchName = (person) =>
  String((person || {}).en || '')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .join('-');

const GROOM_BRANCH = branchName(CONFIG.people.groom);
const BRIDE_BRANCH = branchName(CONFIG.people.bride);

const TERMINAL_LINES = [
  { type: 'cmd', text: 'git checkout -b our-life' },
  { type: 'out', text: "Switched to a new branch 'our-life'" },
  { type: 'cmd', text: `git merge ${GROOM_BRANCH} ${BRIDE_BRANCH} --strategy=love` },
  { type: 'out', text: 'Auto-merging hearts...' },
  { type: 'out', text: '✓ 0 conflicts — fast-forward', cls: 't-green' },
  { type: 'out', text: 'Merge made by the "love" strategy.' },
  { type: 'out', text: ' 2 lives changed, ∞ insertions(+), 0 deletions(-)', cls: 't-amber' },
  { type: 'cmd', text: 'cat invitation.md' },
  { type: 'out', text: '저희, 결혼합니다. 귀한 걸음 해주세요 ♥', cls: 't-rose' },
];

const termBody = document.getElementById('termBody');
let lineIndex = 0;

function typeNextLine() {
  // 모든 줄 출력 후 깜빡이는 prompt로 마무리
  if (lineIndex >= TERMINAL_LINES.length) {
    const last = document.createElement('div');
    last.className = 't-line';
    last.innerHTML = '<span class="t-prompt">$ </span><span class="cursor"></span>';
    termBody.appendChild(last);
    return;
  }

  const line = TERMINAL_LINES[lineIndex++];
  const row = document.createElement('div');
  row.className = 't-line';
  termBody.appendChild(row);

  if (line.type === 'out') {
    // 출력 줄: 한 번에 표시
    const span = document.createElement('span');
    span.className = line.cls || 't-out';
    span.textContent = line.text;
    row.appendChild(span);
    setTimeout(typeNextLine, 260);
    return;
  }

  // 명령 줄: 한 글자씩 typing
  const prompt = document.createElement('span');
  prompt.className = 't-prompt';
  prompt.textContent = '$ ';

  const cmd = document.createElement('span');
  cmd.className = 't-cmd';

  const cursor = document.createElement('span');
  cursor.className = 'cursor';

  row.append(prompt, cmd, cursor);

  let charIndex = 0;
  (function typeChar() {
    if (charIndex < line.text.length) {
      cmd.textContent += line.text[charIndex++];
      setTimeout(typeChar, 34 + Math.random() * 40);
    } else {
      cursor.remove();
      setTimeout(typeNextLine, 320);
    }
  })();
}

setTimeout(typeNextLine, 600);


/* 05. scroll reveal */

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


/* 06. pipeline: 화면에 들어오면 단계별로 통과 처리 */

const pipelineSteps = [...document.querySelectorAll('.pl-step')];

const pipelineObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      pipelineObserver.disconnect();

      pipelineSteps.forEach((step, i) => {
        setTimeout(() => {
          const isLast = i === pipelineSteps.length - 1;
          step.classList.add(isLast ? 'run' : 'done');
          step.querySelector('.st').textContent = isLast ? 'RUNNING' : 'PASSED';
        }, 500 + i * 550);
      });
    });
  },
  { threshold: 0.4 }
);

pipelineObserver.observe(document.getElementById('pipeline'));


/* 07. countdown */

function tickCountdown() {
  const diff = Math.max(0, W - new Date());

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000) % 24;
  const minutes = Math.floor(diff / 60000) % 60;
  const seconds = Math.floor(diff / 1000) % 60;

  document.getElementById('ddayNum').textContent = String(days).padStart(3, '0');
  document.getElementById('cdD').textContent = String(days).padStart(2, '0');
  document.getElementById('cdH').textContent = pad(hours);
  document.getElementById('cdM').textContent = pad(minutes);
  document.getElementById('cdS').textContent = pad(seconds);
}

tickCountdown();
setInterval(tickCountdown, 1000);


/* 08. 달력: 예식 월을 자동 생성하고 예식일을 강조 */

document.getElementById('calTitle').textContent =
  `${MONTH_EN[W.getMonth()]} ${W.getFullYear()}`;

(function buildCalendar() {
  const year = W.getFullYear();
  const month = W.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();

  let html =
    '<thead><tr>' +
    ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => `<th>${d}</th>`).join('') +
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


/* 09. gallery: 사진 grid와 lightbox */

// lightbox가 순환할 사진 목록.
const loadedPhotos = [];

/** img 엘리먼트를 만든다. 파일이 없으면 자리 표시로 대체한다. */
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
      <span class="hint">이 경로에 사진을 추가해주세요</span>
    `;
    img.replaceWith(placeholder);
  });

  return img;
}

// main 사진(hero 아래 viewer frame). 개발자 version 표지(mainDev)를 우선 쓴다.
// 확대는 하지 않는다. 클릭과 zoom cursor가 없고 lightbox 목록에서도 뺀다.
const MAIN_PHOTO = CONFIG.photos.mainDev || CONFIG.photos.main;
const mainPhotoImg = createPhoto(MAIN_PHOTO, { caption: '메인 웨딩 사진' });
document.getElementById('mainPhoto').appendChild(mainPhotoImg);

// gallery. 3x3 pagination이라 한 page에 9장씩 나눠 보여준다.
const galleryEl = document.getElementById('gallery');
const GALLERY_PAGE = 9;   // 3x3, 한 page 9장

// 개발자(dev) version의 page 순서로 재배열한 gallery. config.js의 orderedGallery가 page 단위로 옮긴다.
const GALLERY = orderedGallery((CONFIG.photos.galleryPageOrder || {}).dev);

// lightbox는 page와 무관하게 gallery 전체를 순환한다.
GALLERY.forEach((src) => loadedPhotos.push(src));

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
  const dir = Math.sign(target - galleryPage);   // 다음(+1)/이전(-1) 방향으로 부드럽게 slide-인
  galleryPage = target;
  const start = galleryPage * GALLERY_PAGE;
  galleryEl.replaceChildren(...galleryItems.slice(start, start + GALLERY_PAGE));
  renderGalleryPager();
  if (dir !== 0) {
    galleryEl.style.transition = 'none';
    galleryEl.style.transform = 'translateX(' + (dir * 26) + 'px)';
    galleryEl.style.opacity = '0';
    void galleryEl.offsetWidth;                   // reflow 후 transition 적용
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
  const src = loadedPhotos[lightboxIndex];
  lightboxImg.src = photoSrc(src);
  // 확대 시 파일명은 표시하지 않고 위치 counter만 (main version과 동일)
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


/* 10. 복사 button: 주소와 계좌번호 */

function flashCopied(button, label = 'copied!') {
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
    .then(() => flashCopied(e.target, '복사됨 ✓'));
});

// 계좌 복사는 js/private.js가 맡는다. server가 주입하고, 펼칠 때만 render한다.


/* 11. confetti: approve(deploy) button */

const CONFETTI_SYMBOLS = ['{ }', '</>', ';', '++', '♥', '=>', '0', '1', '&&', '#!'];

/* 축하 button. 첫 축하 뒤 60초가 지나야 '한번 더'가 열린다.
   server는 경계 race를 피하려고 이보다 짧은 50초 창으로 검증한다(RATE_LIMIT_SECONDS). */
const deployBtn = document.getElementById('deployBtn');
const deployMsg = document.getElementById('deployMsg');
const DEPLOY_COOLDOWN = 60 * 1000;
let deployTick = null;

function fireDeployConfetti() {
  // 현재 theme의 색상을 그대로 confetti에 사용
  const style = getComputedStyle(document.documentElement);
  const colors = ['--mint', '--rose', '--amber', '--blue', '--green']
    .map((v) => style.getPropertyValue(v).trim());

  for (let i = 0; i < 48; i++) {
    setTimeout(() => {
      const piece = document.createElement('span');
      piece.className = 'confetti';
      piece.textContent =
        CONFETTI_SYMBOLS[Math.floor(Math.random() * CONFETTI_SYMBOLS.length)];
      piece.style.left = Math.random() * 100 + 'vw';
      piece.style.top = '-5vh';
      piece.style.color = colors[Math.floor(Math.random() * colors.length)];
      piece.style.fontSize = 10 + Math.random() * 12 + 'px';
      piece.style.animationDuration = 2.4 + Math.random() * 2.4 + 's';

      document.body.appendChild(piece);
      setTimeout(() => piece.remove(), 5200);
    }, i * 60);
  }
}

function refreshDeployBtn() {
  const at = +localStorage.getItem('wedding-bless-at') || 0;
  const remain = Math.ceil((DEPLOY_COOLDOWN - (Date.now() - at)) / 1000);
  if (at && remain > 0) {
    deployBtn.disabled = true;
    deployBtn.classList.add('deployed');
    deployBtn.textContent = `$ approve --again (${remain}s)`;
  } else {
    deployBtn.disabled = false;
    deployBtn.classList.remove('deployed');
    deployBtn.textContent = at ? '$ approve --again' : '$ approve --deploy wedding';   // 한 번이라도 축하했으면 '--again'
    if (deployTick) { clearInterval(deployTick); deployTick = null; }
  }
}

function startDeployTick() {
  if (!deployTick) deployTick = setInterval(refreshDeployBtn, 1000);
}

deployBtn.addEventListener('click', function () {
  const at = +localStorage.getItem('wedding-bless-at') || 0;
  if (at && Date.now() - at < DEPLOY_COOLDOWN) return; // cooldown 중

  // 50자 초과를 막는다. cooldown timestamp를 먼저 쓰지 않도록 전송 전에 검사한다.
  if (typeof blessExceeded === 'function' && blessExceeded('deployInput')) {
    deployMsg.textContent = '// 50자를 넘기는 축하 메세지는 보낼 수 없어요';
    deployMsg.classList.add('show');
    return;
  }

  localStorage.setItem('wedding-bless-at', String(Date.now()));

  deployMsg.textContent = '축하의 마음이 전달되었습니다 — 200 OK';
  deployMsg.classList.add('show');
  sendApproval();
  fireDeployConfetti();

  refreshDeployBtn();
  startDeployTick();
});

refreshDeployBtn();
startDeployTick();


/*
   12. 축하 log: 익명 승인 기록
   '누가'는 수집하지 않고 '언제'만 기록한다.
   저장소는 SQLite이고 단조 증가하는 seq로 순서를 정한다.
   API에 닿지 못하면 localStorage demo mode로 fallback한다. */

const alLines = document.getElementById('alLines');
const alTotal = document.getElementById('alTotal');
// 표시 개수는 config.js의 스토어가 20건 단위로 관리한다. 여기서는 받아둔 만큼 전부 그린다.
// box 높이는 css .al-lines 의 max-height 가 잡고, 넘치면 scroll된다.

/** ISO timestamp를 "방금 전", "3분 전" 같은 상대 시간으로 바꾼다. */
function timeAgo(iso) {
  const sec = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (sec < 60) return '방금 전';
  if (sec < 3600) return `${Math.floor(sec / 60)}분 전`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}시간 전`;
  return `${Math.floor(sec / 86400)}일 전`;
}

// 축하 메시지 풀(개발자와 code 톤). timestamp hash로 안정적으로 골라 매번 다른 한마디가 나온다.
const APPROVE_MSGS = [
  'guest approved ✓',
  'LGTM 👍 ship it!',
  '+1 merged 🎉',
  'deployed to ♥ 🚀',
  'congrats commit complete ✅',
  'PR approved, congrats ✨',
  '🥳 congrats on the release!',
  'no conflicts, all green 💚',
  'blessing pushed to main 📦',
  'ACK, be happy forever 🎊',
  'git push origin happiness 💍',
  'build passed: happiness 100% 🟢',
  'reviewed & approved, congrats to you both 🙌',
  'congrats on the merge 🔀',
  'uptime guaranteed for life, right? ✓',
  '⭐⭐⭐⭐⭐ would attend again',
  'rebased on love 💕',
  'checks passed, happiness ✅',
  'a perfect couple, no hotfix needed 💯',
  'newlyweds.tar.gz extracted 🎀',
  'to production, forever 🚀',
  'CI/CD: congrats pipeline succeeded 🎉',
];

// 자동 축하 문구 선택은 config.js pickAutoMsg/resolveAutoMsgs 로 일원화(직전 2개 제외).

// 사용자 입력 메시지를 화면에 안전하게 출력(XSS 방어)
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function readDemo() {
  return JSON.parse(localStorage.getItem('wedding-approvals-demo') || '[]');
}
function pushDemo(msg) {
  const demo = readDemo();
  demo.push({ ts: new Date().toISOString(), msg });
  localStorage.setItem('wedding-approvals-demo', JSON.stringify(demo));
}

/** 로그 패널을 그린다. recent 항목은 { ts, msg }이고, 구버전 ISO 문자열도 호환한다. */
function renderApprovals(count, recent) {
  // 5초 폴링 재렌더로 읽던 위치가 맨 위로 튀지 않게 스크롤을 기억해 둔다.
  const keepScroll = alLines.scrollTop;
  alLines.innerHTML = '';

  if (!recent.length) {
    alLines.innerHTML =
      '<div class="al-line muted"># 아직 기록이 없어요. 첫 번째 축하를 deploy해 주세요!</div>';
  }

  // 빈 msg는 자동 문구로 채우되 '직전 2개'와 안 겹치게(config.js resolveAutoMsgs). 렌더는 최신순 유지.
  resolveAutoMsgs(recent, APPROVE_MSGS).forEach((it) => {
    const line = document.createElement('div');
    line.className = 'al-line';
    line.innerHTML = `<span class="ts">[${timeAgo(it.ts)}]</span> ${esc(it.msg)}`;
    alLines.appendChild(line);
  });

  // 목록 맨 아래의 '더보기'. 스크롤을 끝까지 내리면 나오고, 누르면 20건씩 이어 붙는다.
  if (approvalsHasMore()) {
    const busy = approvalsBusy();
    const more = document.createElement('button');
    more.className = 'al-more';
    more.type = 'button';
    more.disabled = busy;
    // 프롬프트, 명령어, 주석을 각각 다른 색으로 준다(.p, .cmd, .cm 은 developer.css).
    // 삽입값은 숫자뿐이라 이스케이프 대상 없음(메시지 본문은 위에서 esc() 처리).
    more.innerHTML = '<span class="p">$</span> <span class="cmd">git log -n 20</span> '
      + (busy
        ? '<span class="cm"># 불러오는 중 …</span>'
        : `<span class="cm"># 더보기 (${(count - recent.length).toLocaleString()}개 남음)</span>`);
    more.addEventListener('click', () => loadMoreApprovals(renderApprovals));
    alLines.appendChild(more);
  }

  alLines.scrollTop = keepScroll;
  alTotal.innerHTML = `지금까지 <b>${count.toLocaleString()}</b>번의 축하를 받았어요`;
}

/** 서버에서 현재 기록을 조회한다. 실제 동작은 config.js의 loadApprovals()에 맡긴다.
    폴링 실패나 일시적 빈 응답이 기존 렌더를 지우지 않게 마지막 성공본을 유지하고,
    첫 로드에 실패하면 재시도해 색전환 직후의 cold start를 흡수한다.
    끝내 실패했을 때만 데모로 폴백한다. */
async function fetchApprovals() {
  await loadApprovals(renderApprovals, () => {
    const demo = readDemo();
    renderApprovals(demo.length, demo.slice().reverse());
  });
}

/** 승인 1건을 보낸다. 직접 입력한 한마디를 함께 싣고, 비우면 개발자 버전의 자동 문구로 표시된다. */
async function sendApproval() {
  const input = document.getElementById('deployInput');
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
    pushDemo(message); // 전송 실패 시 데모 저장소에라도 기록
  }

  if (input) { input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); }  // 글자수 카운터도 리셋
  fetchApprovals();
}

// 첫 진입 시 로그를 표시하고, 이후 5초마다 폴링해 목록과 상대 시간을 갱신한다.
fetchApprovals();
setInterval(fetchApprovals, 5000);   // 5초마다 폴링(첫 로드 즉시 + 실시간 반영)


/*
   13. 히든 페이지 공개: 예식 시각이 되면
   예식 시각(2026-11-14 11:00 KST)이 지나면 히어로에 release 배너가 나타나고
   파이프라인의 deploy 단계가 완료 상태로 바뀐다.
   미리보기는 어느 페이지든 ?preview=1 을 붙이면 된다. */

if (isWeddingDeployed()) {
  // 히어로에 release.html 입구 배너 노출
  const banner = document.getElementById('releaseBanner');
  if (banner) banner.classList.add('show');

  // 파이프라인 마지막 단계: RUNNING 대신 완료 처리
  const lastStep = pipelineSteps[pipelineSteps.length - 1];
  setTimeout(() => {
    lastStep.classList.remove('run');
    lastStep.classList.add('done');
    lastStep.querySelector('.st').textContent = 'DEPLOYED';
  }, 500 + pipelineSteps.length * 550 + 100);

  // 카운트다운 라벨도 완료 문구로
  document.querySelector('.dday-label').innerHTML =
    'DEPLOYED ✓ — marriage v1.0.0 <span style="color:var(--green)">live</span>';
}


/*
   14. AI guests: AI agent들의 축하
   브랜드 아이콘(assets/ai/*.svg, LobeHub icons)을 인라인으로 불러와 일렬로 둥실거리게 하고,
   자기 차례가 오면 폴짝 뛰며 축하 한마디를 건넨다. deploy 버튼을 누르면 전원이 환호한다.

   SVG를 <img>가 아니라 인라인으로 넣는 이유는, openai와 grok 아이콘이
   fill="currentColor" 단색이라 인라인이어야 테마의 글자색을 상속받기 때문이다. */

const AI_GUESTS = [
  { name: 'Claude', color: '#d97757', file: 'assets/ai/claude-color.svg',
    msg: '두 분의 merge, 제가 본 가장 아름다운 PR이었어요.' },
  { name: 'Codex', color: '#10a37f', file: 'assets/ai/openai.svg',
    msg: 'LGTM 🎉 approved — no changes requested.' },
  { name: 'Gemini', color: '#4796e3', file: 'assets/ai/gemini-color.svg',
    msg: '두 분의 context window가 평생 이어지길!' },
  { name: 'DeepSeek', color: '#4d6bfe', file: 'assets/ai/deepseek-color.svg',
    msg: '아무리 deep하게 탐색해도 이만한 짝은 없습니다.' },
  { name: 'Copilot', color: '#8b5cf6', file: 'assets/ai/copilot.svg',
    msg: '자동완성이 필요 없네요. 이미 완벽한 두 분이라.' },
  { name: 'Llama', color: '#0866ff', file: 'assets/ai/meta-color.svg',
    msg: '이 사랑, 오픈소스처럼 모두에게 공유되길.' },
  { name: 'Grok', color: '#8b97a5', file: 'assets/ai/grok.svg',
    msg: '우주적 스케일로 검증 완료. 축하합니다!' },
];

// 캐릭터 행렬을 만든다. 아이콘 SVG를 인라인으로 넣는다.
const aiCast = document.getElementById('aiCast');

AI_GUESTS.forEach(async (agent) => {
  const char = document.createElement('div');
  char.className = 'ai-char';
  char.style.setProperty('--c', agent.color);
  char.innerHTML = `<span class="ai-ico"></span><span class="ai-nm">${agent.name}</span>`;
  aiCast.appendChild(char);

  try {
    const res = await fetch(invAsset(agent.file));
    char.querySelector('.ai-ico').innerHTML = await res.text();
  } catch {
    // 아이콘 로드에 실패하면 브랜드색 점으로 대체한다.
    char.querySelector('.ai-ico').innerHTML =
      `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="${agent.color}"/></svg>`;
  }
});

const aiChars = [...aiCast.children];

// 축하 메시지를 돌아가며 보여준다. 말하는 캐릭터가 폴짝 뛴다.
const aiMsg = document.getElementById('aiMsg');
let aiIndex = 0;

function showAiMessage() {
  const agent = AI_GUESTS[aiIndex];

  aiChars.forEach((c, i) => c.classList.toggle('speaking', i === aiIndex));
  aiMsg.innerHTML =
    `<span class="who" style="color:${agent.color}">${agent.name}</span>` +
    `<span class="txt">"${agent.msg}"</span>`;

  aiIndex = (aiIndex + 1) % AI_GUESTS.length;
}

showAiMessage();

setInterval(() => {
  aiMsg.classList.add('fade');
  setTimeout(() => {
    showAiMessage();
    aiMsg.classList.remove('fade');
  }, 450);
}, 3400);

// deploy 승인 순간에 전원이 환호한다.
document.getElementById('deployBtn').addEventListener('click', () => {
  aiCast.classList.add('party');
  setTimeout(() => aiCast.classList.remove('party'), 2300);
});
