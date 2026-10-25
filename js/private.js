/*
   private.js: 개인정보(계좌) client render러
   - 실제 계좌번호는 정적 파일에 평문으로 없다.
     invitation.conf 의 값을 읽어 난독화한 blob을 window.__GIFT__ 로 심는다.
     static은 build.sh 가, with-guestbook은 server가 요청마다 한다.
   - 이 script는 그 blob을 풀어서 사용자가 펼치거나 tap할 때에만 DOM에 그린다.
     그래서 검색엔진과 scraper가 평문 번호를 가져가지 못한다.
   - 사람이 늘거나 줄면 invitation.conf 의 GROOM_ACCOUNTS 와 BRIDE_ACCOUNTS 를 고친다.

   HTML container 규약:
     [data-acc="groom|bride"]   계좌 목록을 채울 곳
     data-copy-label="복사"      복사 button 글자. theme마다 복사, copy, cp를 쓴다.
     data-open                  tap이나 펼침 없이 즉시 render(terminal version)
     data-reveal-label="..."    펼침 button 글자. details 안에 있으면 필요 없다.
 */
(function () {
  'use strict';

  /* 1. 난독화 해제. static/build.sh 의 obfuscate 와
     with-guestbook/server/server.mjs 의 obfuscate 와 1:1로 대응한다. */
  function deobfuscate(blob) {
    if (!blob) return null;
    try {
      var bin = atob(blob);
      var u = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      var salt = u[0];
      var k = salt;
      var out = new Uint8Array(u.length - 1);
      for (var j = 0; j < out.length; j++) {
        k = (k * 31 + 17 + j) & 0xff;
        out[j] = u[j + 1] ^ k;
      }
      return JSON.parse(new TextDecoder().decode(out));
    } catch (e) {
      return null;
    }
  }

  var DATA = deobfuscate(window.__GIFT__);

  /* 2. clipboard 복사 (theme의 flashCopied 가 있으면 그대로 사용) */
  function copy(text, btn) {
    navigator.clipboard.writeText(text).then(function () {
      if (typeof window.flashCopied === 'function') {
        window.flashCopied(btn);
      } else {
        var o = btn.textContent;
        btn.textContent = '✓';
        setTimeout(function () { btn.textContent = o; }, 1500);
      }
    }).catch(function () {});
  }

  /* 3. 한 줄(.acc) 만들기: 이름, 은행과 번호, 복사 button
     은행(.bank)과 번호(.num)를 별도 span으로 나눠 담는다.
     기본은 사이에 공백을 둔 '은행 번호' 한 줄이다.
     개발자 version CSS만 .no를 세로 stack으로 만들어 은행 아래에 번호를 놓는다.
     복사되는 값은 어느 version이나 '은행 번호'로 같다. */
  function row(name, bank, number, copyLabel) {
    var el = document.createElement('div');
    el.className = 'acc';

    var nm = document.createElement('span');
    nm.className = 'nm';
    nm.textContent = name;

    var no = document.createElement('span');
    no.className = 'no';
    if (bank) {
      var bk = document.createElement('span');
      bk.className = 'bank';
      bk.textContent = bank;
      no.appendChild(bk);
      no.appendChild(document.createTextNode(' '));   // 한 줄 표시용 구분 공백. 개발자 version의 flex 세로 stack에서는 render되지 않는다.
    }
    var nu = document.createElement('span');
    nu.className = 'num';
    nu.textContent = number;
    no.appendChild(nu);

    var value = (bank ? bank + ' ' : '') + number;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = copyLabel;
    btn.addEventListener('click', function () { copy(value, btn); });

    el.append(nm, no, btn);
    return el;
  }

  /* 4. 계좌 목록 render */
  function renderAccounts(container) {
    if (!DATA || !DATA.accounts) return;
    var list = DATA.accounts[container.dataset.acc] || [];
    var copyLabel = container.dataset.copyLabel || '복사';
    list.forEach(function (a) {
      container.appendChild(row(a.name, a.bank, a.number, copyLabel));
    });
  }

  /* 5. 펼치거나 tap할 때에만 render한다. 검색과 자동수집 차단의 핵심이다.
     details 안이면 펼칠 때, 아니면 button을 눌렀을 때 한 번만 그린다. */
  function gate(container, render) {
    if (container.dataset.filled) return;

    // data-open이면 tap이나 펼침 없이 즉시 render한다. terminal의 '마음 전하실 곳'이 그렇다.
    if (container.hasAttribute('data-open')) {
      container.dataset.filled = '1';
      render(container);
      return;
    }

    var details = container.closest('details');

    if (details) {
      details.addEventListener('toggle', function () {
        if (details.open && !container.dataset.filled) {
          container.dataset.filled = '1';
          render(container);
        }
      });
      return;
    }

    var trig = document.createElement('button');
    trig.type = 'button';
    trig.className = 'btn reveal-btn';
    trig.textContent = container.dataset.revealLabel || '보기 ▾';
    trig.addEventListener('click', function () {
      container.dataset.filled = '1';
      trig.remove();
      render(container);
    });
    container.appendChild(trig);
  }

  /* 6. 초기화 */
  function init() {
    var accs = document.querySelectorAll('[data-acc]');

    if (!DATA) {
      // 주입이 없을 때다. src/ 를 build 없이 그대로 열면 여기로 온다.
      [].forEach.call(accs, function (c) {
        var n = document.createElement('div');
        n.className = 'acc-note';
        n.textContent = '계좌는 서버에서 안전하게 제공됩니다.';
        c.appendChild(n);
      });
      return;
    }

    [].forEach.call(accs, function (c) { gate(c, renderAccounts); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.Private = { data: function () { return DATA; } };
})();
