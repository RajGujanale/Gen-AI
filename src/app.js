/**
 * src/app.js — chatbot interface logic.
 *
 * Renders the conversation, handles the input form, suggested questions,
 * loading indicator, restart button, and calls the answer engine
 * (src/answer-engine.js) with the FAQ knowledge base (data/faq-knowledge-base.js).
 *
 * Optional generative-AI mode: define before this script runs, e.g.
 *   <script>
 *     window.CHATBOT_CONFIG = {
 *       llm: { endpoint: "https://api.openai.com/v1/chat/completions",
 *              apiKey: "sk-…", model: "gpt-4o-mini" }
 *     };
 *   </script>
 * Without it the chatbot answers with the grounded local generator, which is
 * fully deterministic and used for the automated test suite.
 */
(function () {
  "use strict";

  var FALLBACK =
    "I'm sorry, I couldn't find an answer to your question in the available college FAQ knowledge base. Please contact the college department office for further assistance.";

  var WELCOME_HTML =
    "Hello! 👋 Welcome to the <strong>Department FAQ Assistant</strong> of the Computer Science &amp; Engineering department, Riverdale Institute of Technology.<br><br>" +
    "I can answer your questions about <strong>Admissions</strong>, <strong>Courses</strong>, <strong>Examinations</strong> and <strong>Placements</strong> — straight from the department FAQ knowledge base. " +
    "If I don't have the information you need, I'll tell you honestly and refer you to the department office.<br><br>" +
    "How can I help you today?";

  var els = {};
  var engine = null;
  var busy = false;
  var messageCount = 0;

  /* ------------------------------------------------------------------ */
  /* Helpers                                                             */
  /* ------------------------------------------------------------------ */

  function el(tag, className, html) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (html !== undefined) node.innerHTML = html;
    return node;
  }

  function escapeHtml(text) {
    var div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function nowLabel() {
    var d = new Date();
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function scrollToEnd() {
    els.chatWindow.scrollTop = els.chatWindow.scrollHeight;
  }

  /* ------------------------------------------------------------------ */
  /* Message rendering                                                   */
  /* ------------------------------------------------------------------ */

  function addMessage(role, html, meta) {
    messageCount++;
    var row = el("div", "msg-row " + role);

    var avatar = el("div", "avatar " + (role === "user" ? "avatar-user" : "avatar-bot"));
    avatar.textContent = role === "user" ? "You" : "CS";
    avatar.setAttribute("aria-hidden", "true");

    var col = el("div", "msg-col");
    var bubble = el("div", "bubble bubble-" + role, html);
    col.appendChild(bubble);

    var metaRow = el("div", "meta");
    metaRow.appendChild(el("span", "", nowLabel()));
    if (meta && meta.source) {
      var chip = el(
        "span",
        "source-chip" + (meta.source.fallback ? " fallback" : ""),
        meta.source.fallback
          ? "No match in knowledge base"
          : "Source: FAQ #" + meta.source.id + " · " + meta.source.category
      );
      metaRow.appendChild(chip);
    } else if (meta && meta.pending) {
      metaRow.appendChild(el("span", "", "thinking…"));
    }
    col.appendChild(metaRow);

    row.appendChild(avatar);
    row.appendChild(col);
    els.chatWindow.appendChild(row);
    scrollToEnd();
    return row;
  }

  function addWelcome() {
    var row = el("div", "msg-row bot");
    var avatar = el("div", "avatar avatar-bot", "CS");
    avatar.setAttribute("aria-hidden", "true");
    var col = el("div", "msg-col");
    col.appendChild(el("div", "bubble bubble-bot bubble-welcome", WELCOME_HTML));
    var metaRow = el("div", "meta");
    metaRow.appendChild(el("span", "", "FAQ Assistant · " + nowLabel()));
    col.appendChild(metaRow);
    row.appendChild(avatar);
    row.appendChild(col);
    els.chatWindow.appendChild(row);
  }

  function setTyping(show) {
    els.typingIndicator.classList.toggle("hidden", !show);
    if (show) scrollToEnd();
  }

  function setBusy(state) {
    busy = state;
    els.sendBtn.disabled = state;
    els.userInput.disabled = state;
  }

  /* ------------------------------------------------------------------ */
  /* Conversation flow                                                   */
  /* ------------------------------------------------------------------ */

  function sendQuestion(text) {
    var question = (text || "").trim();
    if (!question || busy) return;

    addMessage("user", escapeHtml(question));
    els.userInput.value = "";
    setBusy(true);
    setTyping(true);

    // Small deliberate delay so the loading indicator is visible, matching
    // the user experience of a remote generative model.
    var started = Date.now();
    var pending = engine.ask(question);

    Promise.resolve(pending)
      .then(function (result) {
        var elapsed = Date.now() - started;
        var wait = Math.max(0, 650 - elapsed);
        return new Promise(function (resolve) {
          setTimeout(function () {
            resolve(result);
          }, wait);
        });
      })
      .then(function (result) {
        setTyping(false);
        addMessage(
          "bot",
          escapeHtml(result.answer).replace(/\n/g, "<br>"),
          {
            source: result.usedFallback
              ? { fallback: true }
              : result.source
              ? { id: result.source.id, category: result.source.category }
              : null,
          }
        );
      })
      .catch(function () {
        setTyping(false);
        addMessage("bot", escapeHtml(FALLBACK), { source: { fallback: true } });
      })
      .then(function () {
        setBusy(false);
        els.userInput.focus();
      });
  }

  function restartConversation() {
    els.chatWindow.innerHTML = "";
    messageCount = 0;
    addWelcome();
    els.userInput.value = "";
    els.userInput.focus();
  }

  /* ------------------------------------------------------------------ */
  /* Init                                                                */
  /* ------------------------------------------------------------------ */

  function init() {
    els.chatWindow = document.getElementById("chatWindow");
    els.typingIndicator = document.getElementById("typingIndicator");
    els.chatForm = document.getElementById("chatForm");
    els.userInput = document.getElementById("userInput");
    els.sendBtn = document.getElementById("sendBtn");
    els.restartBtn = document.getElementById("restartBtn");
    els.suggestions = document.getElementById("suggestions");

    if (typeof FAQ_KB === "undefined" || typeof AnswerEngine === "undefined") {
      els.chatWindow.appendChild(
        el("div", "msg-row bot",
          '<div class="avatar avatar-bot">CS</div><div class="msg-col">' +
          '<div class="bubble bubble-bot bubble-fallback">The FAQ knowledge base could not be loaded. ' +
          "Please run <code>node tools/build-kb.js</code> first and refresh the page.</div></div>"
        )
      );
      return;
    }

    var config = window.CHATBOT_CONFIG || {};
    engine = AnswerEngine.createEngine(FAQ_KB, config);

    addWelcome();

    // Sidebar statistics
    var categories = FAQ_KB.reduce(function (set, f) {
      if (set.indexOf(f.category) === -1) set.push(f.category);
      return set;
    }, []);
    document.getElementById("statCount").textContent = FAQ_KB.length;
    document.getElementById("statCategories").textContent = categories.length;
    document.getElementById("statThreshold").textContent =
      Math.round(AnswerEngine.CONFIDENCE_THRESHOLD * 100) + "%";

    // Events
    els.chatForm.addEventListener("submit", function (e) {
      e.preventDefault();
      sendQuestion(els.userInput.value);
    });

    els.restartBtn.addEventListener("click", restartConversation);

    els.suggestions.addEventListener("click", function (e) {
      var btn = e.target.closest(".chip");
      if (btn && btn.dataset.q) sendQuestion(btn.dataset.q);
    });

    els.userInput.focus();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
