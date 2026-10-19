#!/usr/bin/env node
/**
 * tools/build-kb.js
 * -----------------------------------------------------------------------------
 * Converts docs/FAQ_Document.md into a structured FAQ knowledge base.
 *
 * The script performs a *deterministic, verifiable* extraction:
 *   - The question text and answer text are copied VERBATIM from the source
 *     document (no rewriting, no invented facts).
 *   - IDs are assigned sequentially in document order.
 *   - The category is taken from the `## <Category>` section heading.
 *   - Relevant keywords are derived from the question + answer text
 *     (stop-word filtered, stemmed, ranked by TF-IDF) and enriched with
 *     synonym aliases so that common ways of phrasing a question still match.
 *
 * This mirrors what a generative-AI extraction pipeline does, but keeps the
 * result auditable: `node tests/run-tests.js` re-checks that every question and
 * every answer in the generated knowledge base appears verbatim in the source
 * document (i.e. nothing was invented).
 *
 * Usage:  node tools/build-kb.js
 * Output: data/faq-knowledge-base.json   (canonical, structured)
 *         data/faq-knowledge-base.js     (same data, loadable from file:// pages)
 */

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SOURCE_DOC = path.join(ROOT, "docs", "FAQ_Document.md");
const OUT_JSON = path.join(ROOT, "data", "faq-knowledge-base.json");
const OUT_JS = path.join(ROOT, "data", "faq-knowledge-base.js");

/* ------------------------------------------------------------------ */
/* Text utilities shared with the chatbot engine (kept in sync)        */
/* ------------------------------------------------------------------ */

const STOPWORDS = new Set(
  ("a an the and or but if then than so as of in on at to from by for with about into over under " +
    "is are was were be been being am do does did doing have has had having it its this that these those " +
    "i me my we our you your he she they them their us who whom whose what which when where why how " +
    "can could will would shall should may might must not no nor yes any some more most much many " +
    "please tell gives give showing show also very just too at all about out up down " +
    "there here get got make made")
    .split(/\s+/)
);

/** Simple, dependency-free stemmer (English, FAQ vocabulary). */
function stem(word) {
  let w = word;
  if (w.length > 4 && w.endsWith("ies")) w = w.slice(0, -3) + "y";
  else if (w.length > 4 && w.endsWith("ss")) w = w; // class, pass ...
  else if (w.length > 5 && /(s|x|z|ch|sh)es$/.test(w)) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith("s") && !w.endsWith("us") && !w.endsWith("is")) w = w.slice(0, -1);
  if (w.length > 5 && w.endsWith("ing")) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith("ed")) w = w.slice(0, -2);
  return w;
}

function tokenize(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9%]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/* ------------------------------------------------------------------ */
/* Parse the source document                                           */
/* ------------------------------------------------------------------ */

function parseDocument(markdown) {
  const lines = markdown.split(/\r?\n/);
  const entries = [];
  let category = null;
  let current = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const h2 = /^##\s+(.+)$/.exec(line);
    const q = /^###\s+Q(\d+)\.\s+(.+)$/.exec(line);
    const a = /^\*\*Answer:\*\*\s*(.+)$/.exec(line);

    if (h2) {
      category = h2[1].trim();
      continue;
    }
    if (q) {
      if (current) entries.push(current);
      current = {
        sourceNumber: Number(q[1]),
        category,
        question: q[2].trim(),
        answerLines: [],
      };
      continue;
    }
    if (current && a) {
      current.answerLines.push(a[1].trim());
      continue;
    }
    if (current && line === "" ) {
      continue; // blank line inside/after an answer block
    }
    if (current && current.answerLines.length && line !== "" && !line.startsWith("#") && !line.startsWith(">") && !line.startsWith("*")) {
      current.answerLines.push(line); // wrapped answer line
    }
  }
  if (current) entries.push(current);

  return entries.map((e) => {
    if (!e.category) throw new Error(`Question Q${e.sourceNumber} is not inside a "## Category" section.`);
    if (!e.answerLines.length) throw new Error(`Question Q${e.sourceNumber} has no answer.`);
    return {
      sourceNumber: e.sourceNumber,
      category: e.category,
      question: e.question,
      // Answers are single paragraphs; join wrapped lines with a space.
      answer: e.answerLines.join(" ").replace(/\s+/g, " ").trim(),
    };
  });
}

/* ------------------------------------------------------------------ */
/* Keyword derivation                                                  */
/* ------------------------------------------------------------------ */

/** Synonym aliases collapsed to a single canonical word for keyword output. */
const SYNONYM_CANON = {
  exams: "examination", exam: "examination", tests: "test",
  fees: "fee", costs: "cost", tuition: "fee", payments: "payment",
  admissions: "admission", admit: "admission", admitted: "admission", applying: "application",
  programmes: "programme", programs: "program", courses: "course", degrees: "degree",
  seats: "seat", intakes: "seat", vacancies: "seat",
  scholarships: "scholarship", waivers: "scholarship",
  internships: "internship", interns: "internship",
  recruiters: "recruiter", companies: "company", employers: "company",
  jobs: "job", placements: "placement", drives: "drive",
  results: "result", grades: "grade", marks: "mark",
  interviews: "interview",
  timetables: "schedule", datesheets: "schedule",
  electives: "elective",
  credits: "credit",
  labs: "lab", laboratories: "lab", experiments: "experiment",
  certificates: "certificate", documents: "document",
  semesters: "semester", terms: "semester",
  revaluations: "revaluation", rechecks: "revaluation",
  workshops: "workshop",
  subjects: "subject",
  eligibility: "eligible", qualifications: "qualification",
  revaluations: "revaluation",
};

/** Word -> canonical alias used for the keyword field (display only). */
function canonicalKeyword(word) {
  return SYNONYM_CANON[word] || word;
}

function deriveKeywords(entry, idf) {
  const qTokens = tokenize(entry.question);
  const aTokens = tokenize(entry.answer);

  const freq = new Map(); // canonical word -> score
  const add = (word, weight) => {
    if (STOPWORDS.has(word) || word.length < 3 || /^\d+$/.test(word)) return;
    const key = canonicalKeyword(stem(word));
    freq.set(key, (freq.get(key) || 0) + weight);
  };

  // Question terms matter most (they are how users ask).
  qTokens.forEach((w) => add(w, 3));
  aTokens.forEach((w) => add(w, 1));

  const scored = [...freq.entries()]
    .map(([word, f]) => ({ word, score: f * (idf.get(word) || 1) }))
    .sort((a, b) => b.score - a.score || a.word.localeCompare(b.word));

  const picked = scored.slice(0, 8).map((s) => s.word);

  // Make sure the two most important question words are present.
  const topQuestionWords = qTokens
    .filter((w) => !STOPWORDS.has(w) && w.length > 2)
    .map((w) => canonicalKeyword(stem(w)));
  for (const w of topQuestionWords) {
    if (picked.length >= 9) break;
    if (!picked.includes(w)) picked.push(w);
  }

  return [...new Set(picked)].slice(0, 9);
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

function main() {
  const markdown = fs.readFileSync(SOURCE_DOC, "utf8");
  const parsed = parseDocument(markdown);

  if (parsed.length < 25) {
    throw new Error(`Only ${parsed.length} FAQ entries found; at least 25 are required.`);
  }

  // Document frequency for TF-IDF keyword ranking.
  const df = new Map();
  for (const e of parsed) {
    const words = new Set(
      tokenize(`${e.question} ${e.answer}`)
        .filter((w) => !STOPWORDS.has(w) && w.length > 3)
        .map((w) => canonicalKeyword(stem(w)))
    );
    for (const w of words) df.set(w, (df.get(w) || 0) + 1);
  }
  const N = parsed.length;
  const idf = new Map([...df.entries()].map(([w, d]) => [w, Math.log(1 + N / d)]));

  const kb = parsed.map((e, i) => ({
    id: i + 1,
    category: e.category,
    question: e.question,
    answer: e.answer,
    keywords: deriveKeywords(e, idf),
  }));

  const payload = {
    meta: {
      title: "FAQ Knowledge Base — Department of Computer Science & Engineering, Riverdale Institute of Technology",
      source: "docs/FAQ_Document.md",
      generatedAt: new Date().toISOString(),
      entryCount: kb.length,
      categories: [...new Set(kb.map((e) => e.category))],
      disclaimer:
        "ILLUSTRATIVE SAMPLE DATA. Replace with official college information before deployment.",
    },
    faqs: kb,
  };

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(payload, null, 2) + "\n", "utf8");
  fs.writeFileSync(
    OUT_JS,
    "/* Generated by tools/build-kb.js — DO NOT EDIT BY HAND. */\n" +
      "/* Source: docs/FAQ_Document.md */\n" +
      "const FAQ_KB = " +
      JSON.stringify(kb, null, 2) +
      ";\n",
    "utf8"
  );

  const byCategory = {};
  for (const e of kb) byCategory[e.category] = (byCategory[e.category] || 0) + 1;
  console.log(`Knowledge base built: ${kb.length} entries`);
  console.log(byCategory);
  console.log(`  -> ${path.relative(ROOT, OUT_JSON)}`);
  console.log(`  -> ${path.relative(ROOT, OUT_JS)}`);
}

main();
