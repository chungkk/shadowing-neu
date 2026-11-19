/* Trợ lý HalloVN – widget chat nhúng vào website.
 * Nhúng: <script src="https://chat.hallovn.de/widget.js" defer></script>
 * Tuỳ chọn: data-api="https://chat.hallovn.de" data-color="#c8102e" data-title="Trợ lý HalloVN"
 */
(function () {
  if (window.__hallovnChat) return;
  window.__hallovnChat = true;

  var script = document.currentScript;
  var API = (script && script.dataset.api) || (script ? new URL(script.src).origin : "");
  var COLOR = (script && script.dataset.color) || "#c8102e";
  var TITLE = (script && script.dataset.title) || "Trợ lý HalloVN";
  var STORE = "hallovn-chat-v1";

  var history = [];
  try { history = JSON.parse(sessionStorage.getItem(STORE) || "[]"); } catch { /* bỏ qua */ }
  function save() { try { sessionStorage.setItem(STORE, JSON.stringify(history.slice(-12))); } catch { /* bỏ qua */ } }

  var host = document.createElement("div");
  host.style.cssText = "position:fixed;z-index:2147483000;right:16px;bottom:16px;";
  document.body.appendChild(host);
  var root = host.attachShadow({ mode: "open" });

  root.innerHTML =
    '<style>' +
    ':host{all:initial}*{box-sizing:border-box;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}' +
    '.fab{width:56px;height:56px;border-radius:50%;border:0;background:' + COLOR + ';color:#fff;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25);display:grid;place-items:center}' +
    '.fab svg{width:26px;height:26px}' +
    '.panel{position:absolute;right:0;bottom:68px;width:min(380px,calc(100vw - 32px));height:min(560px,calc(100vh - 100px));background:#fff;color:#1a1a1a;border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,.25);display:none;flex-direction:column;overflow:hidden}' +
    '.panel.open{display:flex}' +
    '.head{background:' + COLOR + ';color:#fff;padding:12px 14px;display:flex;align-items:center;gap:8px}' +
    '.head b{flex:1;font-size:15px}.head button{background:none;border:0;color:#fff;cursor:pointer;font-size:13px;opacity:.9}' +
    '.log{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:10px;background:#f6f6f7}' +
    '.msg{max-width:88%;padding:9px 12px;border-radius:12px;font-size:14px;line-height:1.5;white-space:normal;word-wrap:break-word}' +
    '.user{align-self:flex-end;background:' + COLOR + ';color:#fff;border-bottom-right-radius:4px}' +
    '.bot{align-self:flex-start;background:#fff;border:1px solid #e4e4e7;border-bottom-left-radius:4px}' +
    '.bot a{color:' + COLOR + '}.bot ul{margin:4px 0;padding-left:18px}.bot p{margin:0 0 6px}.bot p:last-child{margin:0}' +
    '.src{font-size:12px;color:#555;margin-top:6px;border-top:1px solid #eee;padding-top:6px}' +
    '.err{color:#b00020}' +
    '.typing:after{content:"…";animation:b 1s infinite}@keyframes b{50%{opacity:.2}}' +
    'form{display:flex;gap:6px;padding:10px;border-top:1px solid #e4e4e7;background:#fff}' +
    'textarea{flex:1;resize:none;border:1px solid #d4d4d8;border-radius:10px;padding:8px 10px;font-size:14px;max-height:110px;outline-color:' + COLOR + '}' +
    'form button{border:0;background:' + COLOR + ';color:#fff;border-radius:10px;padding:0 14px;cursor:pointer;font-size:14px}' +
    'form button:disabled{opacity:.5;cursor:default}' +
    '.note{font-size:11px;color:#71717a;text-align:center;padding:0 10px 8px;background:#fff}' +
    '.chips{display:flex;flex-wrap:wrap;gap:6px}.chip{border:1px solid #d4d4d8;background:#fff;border-radius:999px;padding:5px 10px;font-size:13px;cursor:pointer}' +
    '</style>' +
    '<div class="panel" role="dialog" aria-label="' + TITLE + '">' +
    '  <div class="head"><b>' + TITLE + '</b><button class="reset" title="Cuộc trò chuyện mới">Mới</button><button class="close" aria-label="Đóng">✕</button></div>' +
    '  <div class="log" aria-live="polite"></div>' +
    '  <form><textarea rows="1" placeholder="Hỏi về giấy tờ, cư trú, học nghề…" aria-label="Câu hỏi"></textarea><button type="submit">Gửi</button></form>' +
    '  <div class="note">Thông tin chung, không thay thế tư vấn pháp lý.</div>' +
    '</div>' +
    '<button class="fab" aria-label="Mở ' + TITLE + '"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2z"/></svg></button>';

  var panel = root.querySelector(".panel");
  var log = root.querySelector(".log");
  var form = root.querySelector("form");
  var input = root.querySelector("textarea");
  var sendBtn = root.querySelector("form button");
  var busy = false;

  function esc(s) { return s.replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  // Markdown tối giản và an toàn: escape trước, rồi mới thêm thẻ.
  function md(text) {
    var lines = esc(text).split("\n"), out = "", inList = false;
    lines.forEach(function (l) {
      var li = l.match(/^\s*[-*•]\s+(.*)/) || l.match(/^\s*\d+[.)]\s+(.*)/);
      if (li) { if (!inList) { out += "<ul>"; inList = true; } out += "<li>" + inline(li[1]) + "</li>"; return; }
      if (inList) { out += "</ul>"; inList = false; }
      if (l.trim()) out += "<p>" + inline(l.replace(/^#+\s*/, "")) + "</p>";
    });
    return out + (inList ? "</ul>" : "");
  }
  function inline(s) {
    return s
      .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
  }

  function bubble(role, text) {
    var el = document.createElement("div");
    el.className = "msg " + (role === "user" ? "user" : "bot");
    if (role === "user") el.textContent = text; else el.innerHTML = md(text);
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  function welcome() {
    log.innerHTML = "";
    bubble("bot", "Xin chào! Mình là " + TITLE + ". Bạn cần hỏi gì về thủ tục ở Đức?");
    var chips = document.createElement("div");
    chips.className = "chips";
    ["Anmeldung cần giấy tờ gì?", "Gia hạn thẻ cư trú thế nào?", "Báo ốm khi đang học nghề", "Khai thuế có được hoàn tiền không?"].forEach(function (q) {
      var c = document.createElement("button");
      c.className = "chip"; c.type = "button"; c.textContent = q;
      c.onclick = function () { ask(q); };
      chips.appendChild(c);
    });
    log.appendChild(chips);
  }

  function render() {
    if (!history.length) return welcome();
    log.innerHTML = "";
    history.forEach(function (m) { bubble(m.role, m.content); });
  }

  async function ask(q) {
    q = q.trim();
    if (!q || busy) return;
    busy = true; sendBtn.disabled = true;
    var chips = log.querySelector(".chips"); if (chips) chips.remove();
    history.push({ role: "user", content: q });
    bubble("user", q);
    var el = bubble("bot", ""); el.classList.add("typing");
    var answer = "", sources = [];
    try {
      var res = await fetch(API + "/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: history }) });
      if (!res.ok) {
        var j = {}; try { j = await res.json(); } catch { /* bỏ qua */ }
        throw new Error(j.error || "Không kết nối được, bạn thử lại nhé.");
      }
      var reader = res.body.getReader(), dec = new TextDecoder(), buf = "";
      while (true) {
        var r = await reader.read();
        if (r.done) break;
        buf += dec.decode(r.value, { stream: true });
        var parts = buf.split("\n\n"); buf = parts.pop();
        parts.forEach(function (p) {
          if (p.indexOf("data: ") !== 0) return;
          var ev = JSON.parse(p.slice(6));
          if (ev.type === "text") { answer += ev.text; el.classList.remove("typing"); el.innerHTML = md(answer); log.scrollTop = log.scrollHeight; }
          else if (ev.type === "sources") sources = ev.items || [];
          else if (ev.type === "error") throw new Error(ev.error);
        });
      }
      if (!answer) throw new Error("Không nhận được câu trả lời.");
      history.push({ role: "assistant", content: answer });
      save();
      var links = sources.filter(function (s) { return s.url; });
      if (links.length) {
        var src = document.createElement("div");
        src.className = "src";
        src.innerHTML = "Tham khảo: " + links.map(function (s) { return '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.title) + "</a>"; }).join(" · ");
        el.appendChild(src);
      }
    } catch (e) {
      el.classList.remove("typing");
      if (answer) history.push({ role: "assistant", content: answer });
      else history.pop(); // bỏ câu hỏi lỗi để lịch sử luôn xen kẽ user/assistant
      save();
      var err = document.createElement("div"); err.className = "err"; err.textContent = e.message;
      el.appendChild(err);
    } finally {
      busy = false; sendBtn.disabled = false; input.focus();
    }
  }

  root.querySelector(".fab").onclick = function () { panel.classList.toggle("open"); if (panel.classList.contains("open")) { render(); input.focus(); } };
  root.querySelector(".close").onclick = function () { panel.classList.remove("open"); };
  root.querySelector(".reset").onclick = function () { history = []; save(); welcome(); };
  form.onsubmit = function (e) { e.preventDefault(); var q = input.value; input.value = ""; ask(q); };
  input.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });
})();
