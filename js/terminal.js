/*
   terminal(terminal) version script. 녹색 phosphor CRT shell을 motif로 한 청첩장이다.
   날짜, 주소, API, 사진 같은 설정은 js/config.js에서 공유한다.

   목차
   01. 유틸 & 날짜
   02. phosphor theme toggle (green / amber)
   03. 상태바 시계
   04. boot sequence (typing) → 본문 노출
   05. ASCII heart banner
   06. weddingfetch (neofetch style)
   07. 신랑과 신부 whoami card
   08. CI/CD pipeline (순차 통과)
   09. LCD countdown + progress bar + 시계
   10. ASCII 달력
   11. 오시는 길
   12. 복사 button (주소 / 계좌)
   13. AI agent들의 축하 (회전 라인)
   14. 승인 log (공유 API / localStorage)
   15. RSVP + ASCII confetti
   16. scroll reveal
 */


/* 01. 유틸 & 날짜 */

const W = CONFIG.date;
const FIRST_COMMIT = CONFIG.firstMet;   // 두 사람이 처음 만난 날. invitation.conf 의 FIRST_MET_AT.
const pad = (n) => String(n).padStart(2, '0');

const DAY_KO = ['일', '월', '화', '수', '목', '금', '토'];
const DAY_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');


/* 02. phosphor theme toggle */

const themeToggle = document.getElementById('themeToggle');

function applyTheme(theme) {
  document.documentElement.dataset.asciiTheme = theme;
  themeToggle.textContent = theme === 'amber' ? 'P:AMBER' : 'P:GREEN';
  localStorage.setItem('ascii-theme', theme);
}

applyTheme(localStorage.getItem('ascii-theme') || 'green');

themeToggle.addEventListener('click', () => {
  const next =
    document.documentElement.dataset.asciiTheme === 'amber' ? 'green' : 'amber';
  applyTheme(next);
});


/* 03. 상태바 시계 */

const clockEl = document.getElementById('clock');

function tickClock() {
  const now = new Date();
  clockEl.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

tickClock();
setInterval(tickClock, 1000);


/* 04. boot sequence → 본문 노출 */

// kernel version 장식은 예식일에서 만든다. YYYY-MM-DD 를 YY.MM.DD 로 줄인 값이다.
const KERNEL = `${String(W.getFullYear()).slice(2)}.${pad(W.getMonth() + 1)}.${pad(W.getDate())}`;

const BOOT_LINES = [
  { t: 'cmd', s: 'ssh guest@' + siteHost() },
  { t: 'out', s: `Welcome to wedding-os ${KERNEL} (GNU/Love)` },
  { t: 'out', s: `GNU bash, version ${KERNEL}(1)-release` },
  { t: 'cmd', s: 'bash invite.sh --render' },
  { t: 'ok', s: 'mounting   /heart ............ done' },
  { t: 'ok', s: 'loading    couple.yaml ....... done' },
  { t: 'ok', s: 'verifying  vows.sig .......... done' },
  { t: 'out', s: 'rendering invitation [████████████] 100%' },
];

const bootEl = document.getElementById('boot');
const doc = document.getElementById('doc');
let bootIdx = 0;

function bootNext() {
  if (bootIdx >= BOOT_LINES.length) {
    // boot 완료 → 본문 켜기 (CRT turn-on)
    setTimeout(() => {
      doc.classList.add('show');
      bootEl.style.display = 'none';
      initRevealObserver();
    }, 450);
    return;
  }

  const line = BOOT_LINES[bootIdx++];
  const row = document.createElement('div');
  bootEl.appendChild(row);

  if (line.t === 'cmd') {
    // 명령: 한 글자씩 typing
    const prefix = '$ ';
    let i = 0;
    row.innerHTML = `<span class="ok">${prefix}</span><span class="cur"></span>`;
    const typed = document.createElement('span');
    row.insertBefore(typed, row.lastChild);

    (function type() {
      if (i < line.s.length) {
        typed.textContent += line.s[i++];
        setTimeout(type, 26 + Math.random() * 34);
      } else {
        row.querySelector('.cur').remove();
        setTimeout(bootNext, 240);
      }
    })();
  } else {
    // 출력/상태: 한 번에
    const tag = line.t === 'ok' ? '<span class="ok">[  OK  ]</span> ' : '';
    row.innerHTML = tag + esc(line.s);
    setTimeout(bootNext, 230);
  }
}

setTimeout(bootNext, 500);


/* 05. ASCII heart banner */

const HEART = [
  '  ███    ███  ',
  ' ████████████ ',
  ' ████████████ ',
  '  ██████████  ',
  '   ████████   ',
  '    ██████    ',
  '     ████     ',
  '      ██      ',
];

document.getElementById('banner').innerHTML =
  `<span class="heart">${HEART.join('\n')}</span>`;

document.getElementById('whenLine').textContent =
  `${W.getFullYear()}.${pad(W.getMonth() + 1)}.${pad(W.getDate())} ` +
  `${DAY_EN[W.getDay()].toUpperCase()} — ${W.getHours() < 12 ? 'AM' : 'PM'} ` +
  `${W.getHours() % 12 || 12}:${pad(W.getMinutes())}`;


/* 05b. ASCII 데이트 사진 (polaroid 안의 커플) */

(function renderPhoto() {
  const INNER = 28;
  const padIn = (s) => s + ' '.repeat(Math.max(0, INNER - s.length));
  // frame도 ASCII(+ - |)로 그린다. box드로잉(─│┌)은 JetBrains Mono에 glyph가 없어
  // system font로 fallback되며 폭이 ASCII와 달라져(기기별로 크게) 테두리가 어긋난다.
  const bar = (l, r) => l + '-'.repeat(INNER) + r;

  // frame 내부도 ASCII만 써서 정렬을 보존한다.
  // 좌: 신랑(턱시도 + 톱햇 ,===. + 보타이 =), 우: 신부(플라워 베일 .ooo. + V넥 + 드레스 :::)
  // 가운데 ______(6칸)는 두 사람을 잇는 '운명의 붉은 실'.
  const body = [
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

  const header = ' our_wedding.jpg'.padEnd(INNER - 6) + '[_][o]'; // 정확히 28칸

  // 테두리/header는 기본색(dim), 본문 줄은 bright(.ppl)로 감싼다.
  const lines = [
    esc(bar('+', '+')),
    esc('|' + header + '|'),
    esc(bar('+', '+')),
    ...body.map((b) => '|<span class="ppl">' + esc(padIn(b)) + '</span>|'),
    esc(bar('+', '+')),
  ];

  // token 강조: heart rose / 붉은 실 red / 파일명 accent
  const html = lines.join('\n')
    .replace(/&lt;3/g, '<span class="hk">&lt;3</span>')
    .replace(/_{6}/g, '<span class="thread">______</span>')
    .replace(/our_wedding\.jpg/g, '<span class="cap-in">our_wedding.jpg</span>');

  document.getElementById('photo').innerHTML = html;
})();


/* 06. weddingfetch */

/** key와 value 한 줄. key는 amber, value는 bright 색으로 준다. */
function kv(key, val, keyWidth = 7) {
  return `<span class="k">${key.padEnd(keyWidth)}</span>: <span class="v">${esc(val)}</span>`;
}

/** 좌측 ASCII 로고 + 우측 정보 줄을 나란히 합칩니다 (로고는 ASCII라 폭 고정) */
function sideBySide(logo, info, logoWidth = 13) {
  const rows = Math.max(logo.length, info.length);
  const out = [];
  for (let i = 0; i < rows; i++) {
    const l = (logo[i] || '').padEnd(logoWidth);
    const r = info[i] || '';
    out.push(`<span class="logo">${l}</span>${r}`);
  }
  return out.join('\n');
}

(function renderFetch() {
  const uptimeDays = Math.floor((Date.now() - FIRST_COMMIT) / 86400000);

  const logo = [
    '   __  __   ',
    '  /  \\/  \\  ',
    ' | M ♥ S  | ',
    '  \\      /  ',
    '   \\    /   ',
    '    \\  /    ',
    '     \\/     ',
  ];

  const info = [
    '<span class="v">guest</span>@<span class="v">wedding</span>',
    '─────────────────────',
    kv('host', [CONFIG.venue.name, CONFIG.venue.hall].filter(Boolean).join(' ')),
    kv('date', `${W.getFullYear()}-${pad(W.getMonth() + 1)}-${pad(W.getDate())} (${DAY_EN[W.getDay()]})`),
    kv('time', `${W.getHours() % 12 || 12}:${pad(W.getMinutes())} KST (${W.getHours() < 12 ? '오전' : '오후'})`),
    kv('addr', [CONFIG.venue.address, CONFIG.venue.floor].filter(Boolean).join(' ')),
    kv('uptime', `${uptimeDays}d (since ${FIRST_COMMIT.getFullYear()}-${pad(FIRST_COMMIT.getMonth() + 1)}-${pad(FIRST_COMMIT.getDate())})`),
    kv('kernel', KERNEL),
    kv('shell', '/bin/bash'),
    kv('locale', 'ko_KR.UTF-8'),
  ];

  document.getElementById('fetch').innerHTML = sideBySide(logo, info);
})();


/*
   07. 신랑과 신부: struct person (/proc 상태)
   부모는 배열로, 서열은 0-indexed 배열 접근으로 표현했다.
   차남은 sons[1], 장녀는 children[0]이고 그 남동생은 children[1]이다. */

const PEOPLE = CONFIG.people;

function renderPerson(elId, who, p) {
  const lines = [
    `<span class="dim">$ cat /proc/${who}/status</span>`,
    `struct person <span class="k">${who}</span> = {`,
    `  .name    = <span class="v">"${esc(p.name)}"</span>,   <span class="c">/* ${esc(p.en)} */</span>`,
    `  .parents = { <span class="v">"${esc(p.parents[0])}"</span>, <span class="v">"${esc(p.parents[1])}"</span> },`,
    `  .rank    = <span class="v">${p.rank}</span>,   <span class="c">/* ${p.rankKo} */</span>`,
    `  .role    = <span class="v">"${esc(p.role)}"</span>,`,
    `  .state   = <span class="k">TASK_MARRIED</span>,`,
    '};',
    `<span class="c">${esc(p.note)}</span>`,
  ];
  document.getElementById(elId).innerHTML = lines.join('\n');
}

renderPerson('cardGroom', 'groom', PEOPLE.groom);
renderPerson('cardBride', 'bride', PEOPLE.bride);


/* 08. CI/CD pipeline (순차 통과) */

const PIPE_STEPS = [
  'build: 두 사람의 마음을 하나로 build',
  'test: 연애 전 구간 test 통과',
  'security-scan: vulnerability 0건',
  'approve: 양가 부모님 승인 완료',
  'deploy: 결혼식 — 평생의 시작',
];

const pipeEl = document.getElementById('pipe');

/** state[i]: 'wait' | 'pass' | 'run' */
function renderPipe(state) {
  pipeEl.innerHTML = PIPE_STEPS.map((label, i) => {
    const s = state[i];
    if (s === 'pass') return `<span class="pass">[✓] PASS</span>  <span class="label">${esc(label)}</span>`;
    if (s === 'run') return `<span class="run">[~] RUN </span>  <span class="label">${esc(label)}</span>`;
    return `<span class="st">[ ] WAIT</span>  <span class="st">${esc(label)}</span>`;
  }).join('\n');
}

const pipeState = PIPE_STEPS.map(() => 'wait');
renderPipe(pipeState);

function runPipeline() {
  PIPE_STEPS.forEach((_, i) => {
    setTimeout(() => {
      pipeState[i] = i === PIPE_STEPS.length - 1 ? 'run' : 'pass';
      renderPipe(pipeState);
    }, 400 + i * 480);
  });
}


/* 09. LCD countdown + progress bar + 시계 */

// 3행 LCD segment font (각 글자 3칸)
const LCD = {
  '0': [' _ ', '| |', '|_|'],
  '1': ['   ', '  |', '  |'],
  '2': [' _ ', ' _|', '|_ '],
  '3': [' _ ', ' _|', ' _|'],
  '4': ['   ', '|_|', '  |'],
  '5': [' _ ', '|_ ', ' _|'],
  '6': [' _ ', '|_ ', '|_|'],
  '7': [' _ ', '  |', '  |'],
  '8': [' _ ', '|_|', '|_|'],
  '9': [' _ ', '|_|', ' _|'],
};

/** 숫자 문자열 → LCD 3줄 text */
function lcdRender(numStr) {
  const rows = ['', '', ''];
  [...numStr].forEach((ch, idx) => {
    const g = LCD[ch] || ['   ', '   ', '   '];
    for (let r = 0; r < 3; r++) rows[r] += g[r] + (idx < numStr.length - 1 ? ' ' : '');
  });
  return rows.join('\n');
}

const lcdEl = document.getElementById('lcd');
const cdClockEl = document.getElementById('cdClock');
const progressEl = document.getElementById('progress');

function tickCountdown() {
  const diff = Math.max(0, W - new Date());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000) % 24;
  const minutes = Math.floor(diff / 60000) % 60;
  const seconds = Math.floor(diff / 1000) % 60;

  lcdEl.textContent = lcdRender(String(days).padStart(3, '0'));
  cdClockEl.textContent = `${pad(hours)} : ${pad(minutes)} : ${pad(seconds)}`;

  // progress bar: 첫 만남 → 예식까지 경과 비율
  const total = W - FIRST_COMMIT;
  const elapsed = Math.min(total, Math.max(0, Date.now() - FIRST_COMMIT));
  const ratio = total > 0 ? elapsed / total : 1;
  const slots = 24;
  const filled = Math.round(ratio * slots);
  const bar = '█'.repeat(filled) + '░'.repeat(slots - filled);
  progressEl.innerHTML =
    `relationship: <span class="bar">[${bar}]</span> <span class="pct">${Math.round(ratio * 100)}%</span>`;
}

tickCountdown();
setInterval(tickCountdown, 1000);


/* 10. ASCII 달력 */

(function renderCalendar() {
  const year = W.getFullYear();
  const month = W.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const weddingDate = W.getDate();

  const title = `${MONTH_EN[month]} ${year}`;
  const pad2 = Math.floor((21 - title.length) / 2);

  let out =
    ' '.repeat(Math.max(0, pad2)) + `<span class="dow">${title}</span>\n` +
    `<span class="dow">Su Mo Tu We Th Fr Sa</span>\n`;

  let col = 0;
  let line = '   '.repeat(firstWeekday); // 빈 cell
  col = firstWeekday;

  for (let d = 1; d <= lastDate; d++) {
    const cell = String(d).padStart(2, ' ');
    if (d === weddingDate) {
      line += `<span class="day-mark">${cell}</span> `;
    } else if (col === 0) {
      line += `<span class="sun">${cell}</span> `;
    } else {
      line += `${cell} `;
    }

    col++;
    if (col === 7) {
      out += line.replace(/\s+$/, '') + '\n';
      line = '';
      col = 0;
    }
  }
  if (line.trim()) out += line.replace(/\s+$/, '') + '\n';

  document.getElementById('cal').innerHTML = out;
})();


/* 11. 오시는 길 */

document.getElementById('venue').innerHTML = [
  '<span class="dim">$ curl -s ' + siteHost() + '/api/venue</span>',
  '─────────────────────────────',
  kv('name', CONFIG.venue.name || '', 7),
  kv('hall', CONFIG.venue.hall || '', 7),
  kv('addr', [CONFIG.venue.address, CONFIG.venue.floor].filter(Boolean).join(' '), 7),
  kv('subway', CONFIG.venue.subway || '', 7),
].join('\n');


/* 12. 복사 button */

function flashCopied(button, label = 'ok!') {
  const original = button.textContent;
  button.textContent = label;
  button.classList.add('copied');
  setTimeout(() => {
    button.textContent = original;
    button.classList.remove('copied');
  }, 1500);
}

document.getElementById('copyAddr').addEventListener('click', (e) => {
  navigator.clipboard.writeText(CONFIG.address).then(() => flashCopied(e.target, 'copied'));
});

// 계좌 복사는 js/private.js가 맡는다. terminal version은 data-open이라 바로 render한다.


/* 13. AI agent들의 축하 (회전 라인) */

// 각 AI의 main 브랜드 색상
const AI_GUESTS = [
  { name: 'Claude', color: '#d97757', msg: '두 분의 merge, 제가 본 가장 아름다운 PR이었어요.' },
  { name: 'Codex', color: '#10a37f', msg: 'LGTM 🎉 approved — no changes requested.' },
  { name: 'Gemini', color: '#4796e3', msg: '두 분의 context window가 평생 이어지길!' },
  { name: 'DeepSeek', color: '#4d6bfe', msg: '아무리 deep하게 탐색해도 이만한 짝은 없습니다.' },
  { name: 'Copilot', color: '#a371f7', msg: '자동완성이 필요 없네요. 이미 완벽한 두 분이라.' },
  { name: 'Llama', color: '#3b8bff', msg: '이 사랑, 오픈소스처럼 모두에게 공유되길.' },
  { name: 'Grok', color: '#e6e6e6', msg: '우주적 스케일로 검증 완료. 축하합니다!' },
];

const aiLine = document.getElementById('aiLine');
let aiIndex = 0;

function showAi() {
  const a = AI_GUESTS[aiIndex];
  aiLine.innerHTML =
    `<span class="ai-who" style="color:${a.color};text-shadow:0 0 8px ${a.color}80">${a.name}</span> @ ai-guests<br />` +
    `<span class="ai-msg-txt">"${esc(a.msg)}"</span>`;
  aiIndex = (aiIndex + 1) % AI_GUESTS.length;
}

showAi();
setInterval(() => {
  aiLine.classList.add('fade');
  setTimeout(() => {
    showAi();
    aiLine.classList.remove('fade');
  }, 400);
}, 3400);


/* 14. 승인 log (공유 API / localStorage) */

const logLines = document.getElementById('logLines');
const logTotal = document.getElementById('logTotal');
// 표시 개수는 config.js의 스토어가 20건 단위로 관리한다. 여기서는 받아둔 만큼 전부 그린다.
// box 높이는 css .log-lines 의 max-height 가 잡고, 넘치면 scroll된다.

function timeAgo(iso) {
  const sec = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (sec < 60) return '방금 전';
  if (sec < 3600) return `${Math.floor(sec / 60)}분 전`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}시간 전`;
  return `${Math.floor(sec / 86400)}일 전`;
}

function readDemo() {
  return JSON.parse(localStorage.getItem('wedding-approvals-demo') || '[]');
}

// 축하 메시지 풀(bash와 kernel 톤). timestamp hash로 안정적으로 고른다.
const LOG_MSGS = [
  'approve ✓',
  '+1 ACK 🎉',
  '200 OK, congrats! 🎉',
  'git commit -m "congrats" ♥',
  'merged to main 🥳',
  'signal: SIGLOVE 💘',
  'echo "congratulations" 🎊',
  'state: BLESSED ✓',
  'kill -HUP loneliness 💍',
  'exit 0, happily ever after',
  'sudo apt install happiness ✓',
  'chmod +x marriage 🚀',
  'ping love → 0% packet loss 💕',
  'git merge --no-conflict 🎉',
  'systemctl start happiness ✓',
  'uptime: forever  load: ♥♥♥',
  'scp congrats → newlyweds ✓ 📡',
  '0 bugs, 100% love 🟢',
  'tail -f happiness.log 😊',
  'nohup love & forever in background 💗',
  'two branches, one main 🔀',
  'HTTP 201 Created: new home 🏡',
];

// 자동 축하 문구 선택은 config.js pickAutoMsg/resolveAutoMsgs 로 일원화(직전 2개 제외).

function pushDemo(msg) {
  const demo = readDemo();
  demo.push({ ts: new Date().toISOString(), msg });
  localStorage.setItem('wedding-approvals-demo', JSON.stringify(demo));
}

// recent 항목은 { ts, msg } (이전 version ISO 문자열 호환)
function renderApprovals(count, recent) {
  // 5초 polling 다시 render로 읽던 위치가 맨 위로 튀지 않게 scroll을 기억해 둔다.
  const keepScroll = logLines.scrollTop;

  // 빈 msg는 자동 문구로 채우되 '직전 2개'와 안 겹치게(config.js resolveAutoMsgs). render는 최신순 유지.
  let html = recent.length
    ? resolveAutoMsgs(recent, LOG_MSGS).map((it) =>
        `<div class="log-line"><span class="ts">[${timeAgo(it.ts)}]</span> <span class="ok">${esc(it.msg)}</span></div>`
      ).join('')
    : '<div class="log-line"># 첫 번째 축하를 deploy해 주세요!</div>';

  // 목록 맨 아래의 '더보기'. scroll을 끝까지 내리면 나오고, 누르면 20건씩 이어 붙는다.
  // 여기 끼워 넣는 값은 숫자뿐이라 이스케이프할 것이 없다. 메시지 본문은 위에서 esc()로 처리했다.
  const busy = approvalsBusy();
  if (approvalsHasMore()) {
    html += `<button class="log-more" type="button"${busy ? ' disabled' : ''}>`
      + '<span class="p">$</span> <span class="cmd">tail -n 20</span> '
      + (busy
        ? '<span class="cm"># 불러오는 중 …</span>'
        : `<span class="cm"># 더보기 (${(count - recent.length).toLocaleString()}개 남음)</span>`)
      + '</button>';
  }
  logLines.innerHTML = html;

  const more = logLines.querySelector('.log-more');
  if (more) more.addEventListener('click', () => loadMoreApprovals(renderApprovals));

  logLines.scrollTop = keepScroll;
  logTotal.innerHTML = `지금까지 <b>${count.toLocaleString()}</b>번의 축하를 받았어요`;
}

// 조회는 config.js의 loadApprovals()에 맡긴다. polling 실패나 일시적 빈 응답이 기존 render를
// 지우지 않게 방어(마지막 성공본 유지) + 첫 load 실패 시 재시도(cold start 흡수).
async function fetchApprovals() {
  await loadApprovals(renderApprovals, () => {
    const demo = readDemo();
    renderApprovals(demo.length, demo.slice().reverse());
  });
}

async function sendApproval() {
  // 직접 입력한 한마디(비우면 '' → terminal version 랜덤 문구로 표시)
  const input = document.getElementById('rsvpInput');
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

  if (input) { input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); }  // 글자수 counter도 리셋
  fetchApprovals();
}

fetchApprovals();
setInterval(fetchApprovals, 5000);   // 5초마다 polling(첫 load 즉시 + 실시간 반영)


/* 15. RSVP + ASCII confetti */

const CONFETTI = ['1', '0', '<3', '{}', '&&', '♥', '</>', '=>'];

/* 축하 button. 첫 축하 뒤 60초가 지나야 '한번 더'가 열린다.
   server는 경계 race를 피하려고 이보다 짧은 50초 창으로 검증한다(RATE_LIMIT_SECONDS). */
const rsvpBtn = document.getElementById('rsvpBtn');
const rsvpMsg = document.getElementById('rsvpMsg');
const RSVP_COOLDOWN = 60 * 1000;
let rsvpTick = null;

function fireRsvpConfetti() {
  for (let i = 0; i < 44; i++) {
    setTimeout(() => {
      const c = document.createElement('span');
      c.className = 'confetti';
      c.textContent = CONFETTI[Math.floor(Math.random() * CONFETTI.length)];
      c.style.left = Math.random() * 100 + 'vw';
      c.style.top = '-5vh';
      c.style.fontSize = 11 + Math.random() * 10 + 'px';
      c.style.animationDuration = 2.6 + Math.random() * 2.6 + 's';
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 5400);
    }, i * 55);
  }
}

function refreshRsvpBtn() {
  const at = +localStorage.getItem('wedding-bless-at') || 0;
  const remain = Math.ceil((RSVP_COOLDOWN - (Date.now() - at)) / 1000);
  if (at && remain > 0) {
    rsvpBtn.disabled = true;
    rsvpBtn.classList.add('done');
    rsvpBtn.textContent = `$ approve --again (${remain}s)`;
  } else {
    rsvpBtn.disabled = false;
    rsvpBtn.classList.remove('done');
    rsvpBtn.textContent = at ? '$ approve --again' : '$ approve --deploy wedding';   // 한 번이라도 축하했으면 '--again'
    if (rsvpTick) { clearInterval(rsvpTick); rsvpTick = null; }
  }
}

function startRsvpTick() {
  if (!rsvpTick) rsvpTick = setInterval(refreshRsvpBtn, 1000);
}

rsvpBtn.addEventListener('click', function () {
  const at = +localStorage.getItem('wedding-bless-at') || 0;
  if (at && Date.now() - at < RSVP_COOLDOWN) return; // cooldown 중

  // 50자 초과를 막는다. cooldown timestamp를 먼저 쓰지 않도록 전송 전에 검사한다.
  if (typeof blessExceeded === 'function' && blessExceeded('rsvpInput')) {
    rsvpMsg.textContent = '# error: 50자를 넘기는 축하 메세지는 보낼 수 없어요';
    rsvpMsg.classList.add('show');
    return;
  }

  localStorage.setItem('wedding-bless-at', String(Date.now()));

  rsvpMsg.textContent = '축하의 마음이 전달되었습니다 — 200 OK';
  rsvpMsg.classList.add('show');
  sendApproval();
  fireRsvpConfetti();

  refreshRsvpBtn();
  startRsvpTick();
});

refreshRsvpBtn();
startRsvpTick();


/* 16. scroll reveal (boot 후 초기화) */

function initRevealObserver() {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
          // pipeline이 보이면 순차 통과 시작
          if (e.target.classList.contains('pipe')) runPipeline();
        }
      });
    },
    { threshold: 0.2 }
  );
  document.querySelectorAll('#doc .rv').forEach((el) => io.observe(el));
}
