#!/usr/bin/env node
/**
 * tests/run-tests.js
 * -----------------------------------------------------------------------------
 * 1) Knowledge-base integrity checks
 *      - the generated KB exists, has >= 25 entries and all 4 categories
 *      - every question/answer in the KB appears VERBATIM in the source
 *        document (nothing invented, nothing lost)
 *      - the browser bundle (data/faq-knowledge-base.js) matches the JSON
 * 2) Chatbot test cases
 *      - runs each question through the real answer engine and compares the
 *        actual response with the expected result
 *      - includes unsupported questions that MUST return the predefined
 *        fallback response
 *      - includes misspelt questions to verify typo tolerance
 *
 * Usage:  node tests/run-tests.js
 * Output: console summary + TEST_REPORT.md
 */

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const AnswerEngine = require(path.join(ROOT, "src", "answer-engine.js"));

const KB_JSON = path.join(ROOT, "data", "faq-knowledge-base.json");
const KB_JS = path.join(ROOT, "data", "faq-knowledge-base.js");
const SOURCE_DOC = path.join(ROOT, "docs", "FAQ_Document.md");
const REPORT = path.join(ROOT, "TEST_REPORT.md");

const FALLBACK = AnswerEngine.FALLBACK_RESPONSE;

/* ------------------------------------------------------------------ */

let passed = 0;
let failed = 0;
const integrityLog = [];

function check(name, ok, detail) {
  integrityLog.push({ name, ok, detail: detail || "" });
  if (ok) passed++;
  else failed++;
}

function normalise(text) {
  return String(text)
    .replace(/[*#`>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/* ------------------------------------------------------------------ */
/* 1. Knowledge-base integrity                                         */
/* ------------------------------------------------------------------ */

if (!fs.existsSync(KB_JSON)) {
  console.error("Missing data/faq-knowledge-base.json — run `node tools/build-kb.js` first.");
  process.exit(1);
}

const payload = JSON.parse(fs.readFileSync(KB_JSON, "utf8"));
const kb = payload.faqs;
const source = fs.readFileSync(SOURCE_DOC, "utf8");
const sourceNorm = normalise(source);

check("Knowledge base contains at least 25 FAQ entries", kb.length >= 25, `found ${kb.length} entries`);

const requiredCategories = ["Admissions", "Courses", "Examinations", "Placements"];
const categories = [...new Set(kb.map((e) => e.category))];
requiredCategories.forEach((cat) => {
  check(`Category covered: ${cat}`, categories.includes(cat), categories.join(", "));
});

kb.forEach((e) => {
  check(`FAQ #${e.id} has all required fields (id, category, question, answer, keywords)`,
    Number.isInteger(e.id) &&
      !!e.category &&
      !!e.question &&
      !!e.answer &&
      Array.isArray(e.keywords) &&
      e.keywords.length > 0,
    JSON.stringify(Object.keys(e)));
});

/* Verbatim preservation: no invented facts, nothing lost. */
kb.forEach((e) => {
  check(`FAQ #${e.id} question preserved verbatim in source document`,
    sourceNorm.includes(normalise(e.question)));
  check(`FAQ #${e.id} answer preserved verbatim in source document`,
    sourceNorm.includes(normalise(e.answer)));
});

const declaredCount = (source.match(/^###\s+Q\d+\./gm) || []).length;
check("Every question in the source document made it into the knowledge base",
  declaredCount === kb.length, `document=${declaredCount}, kb=${kb.length}`);

check("Source document states the illustrative-data disclaimer",
  /illustrative/i.test(source) && /before deployment/i.test(source));

/* Browser bundle must match the JSON. */
if (fs.existsSync(KB_JS)) {
  const jsText = fs.readFileSync(KB_JS, "utf8");
  const match = /const FAQ_KB = (\[[\s\S]*\]);/.exec(jsText);
  let jsOk = false;
  if (match) {
    try {
      jsOk = JSON.stringify(JSON.parse(match[1])) === JSON.stringify(kb);
    } catch (_) { jsOk = false; }
  }
  check("Browser bundle (data/faq-knowledge-base.js) is in sync with the JSON knowledge base", jsOk);
} else {
  check("Browser bundle (data/faq-knowledge-base.js) exists", false, "file not found");
}

/* ------------------------------------------------------------------ */
/* 2. Chatbot test cases                                               */
/* ------------------------------------------------------------------ */

const engine = AnswerEngine.createEngine(kb);

const TEST_CASES = [
  {
    id: "T01",
    group: "Specification test cases",
    question: "What are the eligibility criteria for admission?",
    expect: "match",
    expectedText: "eligibility requirements",
    expectedHint: "Provide the eligibility criteria from the knowledge base.",
    expectIncludes: ["10+2", "50%"],
  },
  {
    id: "T02",
    group: "Specification test cases",
    question: "Which courses are offered by the department?",
    expect: "match",
    expectedHint: "List the courses available in the knowledge base.",
    expectIncludes: ["B.Tech Computer Science", "M.Tech", "Doctor of Philosophy"],
  },
  {
    id: "T03",
    group: "Specification test cases",
    question: "How can I apply for the semester examination?",
    expect: "match",
    expectedHint: "Explain the examination application procedure based on the knowledge base.",
    expectIncludes: ["student portal"],
  },
  {
    id: "T04",
    group: "Specification test cases",
    question: "Does the college provide placement training?",
    expect: "match",
    expectedHint: "Provide the placement training details from the knowledge base.",
    expectIncludes: ["aptitude", "mock interviews"],
  },
  {
    id: "T05",
    group: "Specification test cases (unsupported)",
    question: "What was the exact placement percentage of the department in 2025?",
    expect: "fallback",
    expectedHint: "Information absent from the knowledge base → predefined fallback response.",
  },
  /* ---- extra coverage ---- */
  {
    id: "T06",
    group: "Unsupported questions (must not be guessed)",
    question: "Do you provide hostel accommodation and mess food?",
    expect: "fallback",
    expectedHint: "Hostel information is not in the knowledge base → fallback response.",
  },
  {
    id: "T07",
    group: "Unsupported questions (must not be guessed)",
    question: "What is the highest salary package offered this year?",
    expect: "fallback",
    expectedHint: "Salary/package data is not in the knowledge base → fallback response.",
  },
  {
    id: "T08",
    group: "Supported questions (extra coverage)",
    question: "What are the fees for the programme?",
    expect: "match",
    expectedHint: "Return the fee structure from the knowledge base.",
    expectIncludes: ["85,000"],
  },
  {
    id: "T09",
    group: "Supported questions (extra coverage)",
    question: "How many seats are there in the department?",
    expect: "match",
    expectedHint: "Return the seat intake from the knowledge base.",
    expectIncludes: ["120 seats"],
  },
  {
    id: "T10",
    group: "Supported questions (extra coverage)",
    question: "How do I get my hall ticket?",
    expect: "match",
    expectedHint: "Return the hall-ticket procedure from the knowledge base.",
    expectIncludes: ["hall ticket"],
  },
  {
    id: "T11",
    group: "Supported questions (extra coverage)",
    question: "Can I apply for revaluation of my answer script?",
    expect: "match",
    expectedHint: "Return the revaluation procedure from the knowledge base.",
    expectIncludes: ["INR 300", "seven days"],
  },
  {
    id: "T12",
    group: "Typo tolerance",
    question: "What is the examnination schedual for this semster?",
    expect: "match",
    expectedHint: "Misspelt words must still retrieve the examination schedule entry.",
    expectIncludes: ["September-October"],
  },
  {
    id: "T13",
    group: "Typo tolerance",
    question: "Whch cours is bset for artifical inteligence?",
    expect: "match",
    expectedHint: "Heavily misspelt question must still match the courses entry.",
    expectIncludes: ["B.Tech Artificial Intelligence and Data Science"],
  },
  {
    id: "T14",
    group: "Phrasing variations",
    question: "Tell me about attendance shortage rules",
    expect: "match",
    expectedHint: "Paraphrased question must match the attendance entry.",
    expectIncludes: ["75%"],
  },
];

const results = [];

TEST_CASES.forEach((tc) => {
  let answer, usedFallback, confidence, sourceId, error;
  try {
    const res = engine.askSync(tc.question);
    answer = res.answer;
    usedFallback = res.usedFallback;
    confidence = res.confidence;
    sourceId = res.source ? res.source.id : null;
  } catch (err) {
    error = err.message;
    answer = "(engine error)";
    usedFallback = false;
  }

  let ok = false;
  let note = "";

  if (tc.expect === "fallback") {
    ok = usedFallback && answer === FALLBACK;
    note = ok
      ? "Fallback returned exactly as specified."
      : "Expected the predefined fallback response, got something else.";
  } else {
    const missing = (tc.expectIncludes || []).filter((frag) => !answer.includes(frag));
    ok = !usedFallback && missing.length === 0 && !error;
    note = ok
      ? `Answered from FAQ #${sourceId}.`
      : usedFallback
      ? "Unexpectedly returned the fallback response."
      : "Missing expected content: " + missing.join(", ");
  }

  if (ok) passed++;
  else failed++;

  results.push({
    ...tc,
    answer,
    usedFallback,
    confidence,
    sourceId,
    status: ok ? "Pass" : "Fail",
    note,
    error,
  });
});

/* ------------------------------------------------------------------ */
/* 3. Report                                                           */
/* ------------------------------------------------------------------ */

function truncate(text, n = 340) {
  const t = String(text).replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

const now = new Date();
const lines = [];
lines.push("# Chatbot Test Report");
lines.push("");
lines.push("**System:** AI-powered FAQ Chatbot — Department of Computer Science & Engineering, Riverdale Institute of Technology (sample data)  ");
lines.push("**Knowledge base:** `data/faq-knowledge-base.json` (" + kb.length + " entries, categories: " + categories.join(", ") + ")  ");
lines.push("**Engine:** `src/answer-engine.js` (TF-IDF retrieval + typo-tolerant matching + grounded answer generation, confidence threshold " + Math.round(AnswerEngine.CONFIDENCE_THRESHOLD * 100) + "%)  ");
lines.push("**Executed:** " + now.toLocaleString() + "  ");
lines.push("**Runner:** `node tests/run-tests.js`");
lines.push("");
lines.push("## 1. Summary");
lines.push("");
lines.push("| Metric | Value |");
lines.push("|---|---|");
lines.push("| Total checks | " + (passed + failed) + " |");
lines.push("| Passed | " + passed + " |");
lines.push("| Failed | " + failed + " |");
lines.push("| Result | **" + (failed === 0 ? "ALL TESTS PASSED" : "FAILURES PRESENT") + "** |");
lines.push("");

lines.push("## 2. Knowledge-base integrity checks");
lines.push("");
lines.push("| # | Check | Status | Detail |");
lines.push("|---|---|---|---|");
integrityLog.forEach((c, i) => {
  lines.push("| " + (i + 1) + " | " + c.name + " | " + (c.ok ? "Pass" : "Fail") + " | " + truncate(c.detail, 120) + " |");
});
lines.push("");

lines.push("## 3. Chatbot functional test cases");
lines.push("");
lines.push("| ID | Group | Question | Expected result | Actual chatbot response | Status |");
lines.push("|---|---|---|---|---|---|");
results.forEach((r) => {
  lines.push(
    "| " + r.id +
    " | " + r.group +
    " | " + truncate(r.question, 160).replace(/\|/g, "\\|") +
    " | " + truncate(r.expectedHint, 170).replace(/\|/g, "\\|") +
    " | " + truncate(r.answer, 380).replace(/\|/g, "\\|") +
    " | **" + r.status + "** |"
  );
});
lines.push("");

lines.push("## 4. Detailed observations");
lines.push("");
results.forEach((r) => {
  lines.push("### " + r.id + " — " + r.status + " — " + truncate(r.question, 120));
  lines.push("");
  lines.push("- **Group:** " + r.group);
  lines.push("- **Expected:** " + r.expectedHint);
  lines.push("- **Actual:** " + truncate(r.answer, 700));
  if (r.expect === "match") lines.push("- **Source FAQ:** #" + r.sourceId + " (retrieval confidence " + r.confidence + ")");
  if (r.expect === "fallback") lines.push("- **Fallback used:** " + (r.usedFallback ? "Yes — correct behaviour" : "No — INCORRECT"));
  lines.push("- **Note:** " + r.note);
  if (r.error) lines.push("- **Error:** " + r.error);
  lines.push("");
});

lines.push("## 5. Conclusion");
lines.push("");
if (failed === 0) {
  lines.push("All knowledge-base integrity checks and all functional test cases passed. The chatbot");
  lines.push("answers supported questions from the FAQ knowledge base, tolerates spelling mistakes and");
  lines.push("phrasing variations, and returns **exactly** the predefined fallback response for any");
  lines.push("question whose answer is not present in the knowledge base (T05, T06, T07) — it never");
  lines.push("guesses unsupported facts.");
} else {
  lines.push("Some checks failed. See the detailed observations above.");
}
lines.push("");
lines.push("> **Reminder:** the knowledge base contains illustrative sample data only and must be");
lines.push("> replaced with official college information before deployment.");
lines.push("");

fs.writeFileSync(REPORT, lines.join("\n"), "utf8");

console.log("\n=== FAQ CHATBOT TEST RUN ===");
console.log("Knowledge base: " + kb.length + " entries | categories: " + categories.join(", "));
console.log("");
results.forEach((r) => {
  console.log(
    (r.status === "Pass" ? "  [PASS] " : "  [FAIL] ") +
      r.id + " " + r.question
  );
  console.log("         -> " + truncate(r.answer, 200));
});
console.log("");
console.log("Integrity checks: " + integrityLog.filter((c) => c.ok).length + "/" + integrityLog.length + " passed");
console.log("Functional tests: " + results.filter((r) => r.status === "Pass").length + "/" + results.length + " passed");
console.log("TOTAL: " + passed + " passed, " + failed + " failed");
console.log("Report written to " + path.relative(ROOT, REPORT));

process.exit(failed === 0 ? 0 : 1);
