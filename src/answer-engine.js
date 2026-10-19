/**
 * src/answer-engine.js
 * -----------------------------------------------------------------------------
 * FAQ question-answering engine.
 *
 * Pipeline:
 *   1. NORMALISE   – lowercase, strip punctuation, drop stop-words, expand
 *                    synonyms to a canonical form, stem words (tolerates
 *                    spelling mistakes and phrasing variations).
 *   2. RETRIEVE    – TF-IDF weighted coverage of the question against every
 *                    knowledge-base entry, with fuzzy (Levenshtein) matching
 *                    for typos. Question-field matches are weighted higher.
 *   3. GATE        – if the best coverage is below the confidence threshold,
 *                    the predefined fallback response is returned. The model is
 *                    NEVER allowed to guess an answer that is not supported by
 *                    the knowledge base.
 *   4. GENERATE    – (default) a concise, natural-language answer composed
 *                    strictly from the retrieved entry/entries; or
 *                    (optional) an external generative-AI (LLM) model that is
 *                    given ONLY the retrieved text and must answer from it.
 *
 * Works both in the browser (window.AnswerEngine) and in Node.js (require).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.AnswerEngine = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /** Exact fallback wording required by the project specification. */
  var FALLBACK_RESPONSE =
    "I'm sorry, I couldn't find an answer to your question in the available college FAQ knowledge base. Please contact the college department office for further assistance.";

  /** Minimum retrieval coverage required before any answer is given. */
  var CONFIDENCE_THRESHOLD = 0.45;

  var STOPWORDS = new Set(
    ("a an the and or but if then than so as of in on at to from by for with about into over under " +
      "is are was were be been being am do does did doing have has had having it its this that these those " +
      "i me my we our you your he she they them their us who whom whose what which when where why how " +
      "can could will would shall should may might must not no nor yes any some more most much many " +
      "please tell gives give showing show also very just too out up down there here get got make made " +
      "actually basically really thing things stuff want need know looking ask asking")
      .split(/\s+/)
  );

  /**
   * Synonym groups. Every variant maps to the FIRST element of its group so a
   * question like "exam schedule" matches "examination datesheet".
   */
  var SYNONYM_GROUPS = [
    ["examinations", "exam", "exams", "test", "tests", "unit test"],
    ["schedules", "schedule", "timetable", "datesheet"],
    ["fees", "fee", "tuition", "cost", "costs", "payments", "charges"],
    ["admission", "admissions", "admit", "admitted", "admision"],
    ["applications", "application", "apply", "applying", "register", "registration"],
    ["placements", "placement", "placed", "jobs", "job", "job placements"],
    ["recruitment", "recruitments", "hiring", "drive", "drives"],
    ["courses", "course", "programme", "program", "programs", "curriculum", "degrees", "degree"],
    ["eligibility", "eligible", "qualification", "qualifications"],
    ["scholarships", "scholarship", "waivers", "waiver"],
    ["internships", "internship", "intern"],
    ["training", "trainings"],
    ["results", "result", "grades", "grade"],
    ["revaluation", "revaluations", "recheck", "rechecking", "rechecked"],
    ["supplementary", "supplementaries"],
    ["attendance", "attend"],
    ["electives", "elective"],
    ["credits", "credit", "cgpa", "gpa"],
    ["semesters", "semester", "terms"],
    ["seats", "seat", "intake", "vacancies", "vacancy"],
    ["interviews", "interview"],
    ["companies", "company", "recruiters", "recruiter", "employers", "employer"],
    ["labs", "lab", "laboratories", "laboratory", "practical", "practicals", "experiments", "experiment"],
    ["deadlines", "deadline", "last date"],
    ["syllabus", "syllabuses"],
    ["certificates", "certificate", "documents", "document"],
    ["workshops", "workshop"],
    ["subjects", "subject"],
    ["halltickets", "hallticket", "admitcards", "admitcard"],
  ];

  var SYNONYM_MAP = (function () {
    var map = {};
    SYNONYM_GROUPS.forEach(function (group) {
      var canonical = group[0];
      group.forEach(function (variant) {
        map[variant] = canonical;
        map[stem(variant)] = canonical;
      });
    });
    return map;
  })();

  function stem(word) {
    var w = word;
    if (w.length > 4 && w.endsWith("ies")) w = w.slice(0, -3) + "y";
    else if (w.length > 4 && w.endsWith("ss")) w = w;
    else if (w.length > 5 && /(s|x|z|ch|sh)es$/.test(w)) w = w.slice(0, -2);
    else if (w.length > 3 && w.endsWith("s") && !w.endsWith("us") && !w.endsWith("is")) w = w.slice(0, -1);
    if (w.length > 5 && w.endsWith("ing")) w = w.slice(0, -3);
    else if (w.length > 4 && w.endsWith("ed")) w = w.slice(0, -2);
    return w;
  }

  /** lower-case -> synonym canonical -> stem. Applied to queries AND documents. */
  function normaliseToken(raw) {
    var t = raw.toLowerCase();
    if (SYNONYM_MAP[t]) t = SYNONYM_MAP[t];
    t = stem(t);
    if (SYNONYM_MAP[t]) t = SYNONYM_MAP[t];
    return stem(t);
  }

  function tokenize(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9%]+/g, " ")
      .split(/\s+/)
      .filter(Boolean);
  }

  var STOPWORD_LIST = Array.from(STOPWORDS);

  /**
   * True when a token looks like a misspelt stop-word (e.g. "whch" -> "which").
   * Such tokens are dropped so they do not distort the retrieval score.
   */
  function looksLikeStopword(token) {
    if (STOPWORDS.has(token)) return true;
    if (token.length < 4) return false;
    for (var i = 0; i < STOPWORD_LIST.length; i++) {
      var sw = STOPWORD_LIST[i];
      if (sw.length < 3 || Math.abs(sw.length - token.length) > 1) continue;
      if (levenshtein(token, sw, 1) <= 1) return true;
    }
    return false;
  }

  /**
   * Normalised content tokens of a text.
   * Returns objects: { t: normalised+stemmed form used for exact matching,
   *                    raw: normalised form before stemming (used to rescue
   *                         stemmed-away typos such as "cours" -> "course") }
   */
  function contentTokenDetails(text) {
    var seen = {};
    var out = [];
    tokenize(text).forEach(function (t) {
      if (looksLikeStopword(t)) return;
      var raw = t;
      if (SYNONYM_MAP[raw]) raw = SYNONYM_MAP[raw];
      var n = normaliseToken(t);
      if (!n || n.length < 2) return;
      if (seen[n]) return;
      seen[n] = true;
      out.push({ t: n, raw: stem(raw) === n || raw === n ? n : raw });
    });
    return out;
  }

  function contentTokens(text) {
    return contentTokenDetails(text).map(function (d) {
      return d.t;
    });
  }

  /* ------------------------------ fuzzy matching ---------------------- */

  function levenshtein(a, b, cap) {
    if (Math.abs(a.length - b.length) > cap) return cap + 1;
    var prev = new Array(b.length + 1);
    var cur = new Array(b.length + 1);
    for (var j = 0; j <= b.length; j++) prev[j] = j;
    for (var i = 1; i <= a.length; i++) {
      cur[0] = i;
      var best = cur[0];
      for (var k = 1; k <= b.length; k++) {
        var cost = a[i - 1] === b[k - 1] ? 0 : 1;
        cur[k] = Math.min(prev[k] + 1, cur[k - 1] + 1, prev[k - 1] + cost);
        if (cur[k] < best) best = cur[k];
      }
      if (best > cap) return cap + 1;
      var tmp = prev;
      prev = cur;
      cur = tmp;
    }
    return prev[b.length];
  }

  function typoBudget(len) {
    if (len >= 8) return 2;
    if (len >= 4) return 1;
    return 0;
  }

  /* ------------------------------ engine ------------------------------ */

  function createEngine(faqList, options) {
    options = options || {};
    var faqs = (faqList || []).map(function (f, idx) {
      var question = String(f.question || "");
      var answer = String(f.answer || "");
      var qSet = {};
      contentTokens(question).forEach(function (t) {
        qSet[t] = true;
      });
      var aSet = {};
      contentTokens(answer).forEach(function (t) {
        aSet[t] = true;
      });
      var allSet = {};
      Object.keys(qSet).forEach(function (t) {
        allSet[t] = true;
      });
      Object.keys(aSet).forEach(function (t) {
        allSet[t] = true;
      });
      return {
        position: idx,
        id: f.id,
        category: f.category,
        question: question,
        answer: answer,
        keywords: f.keywords || [],
        qSet: qSet,
        aSet: aSet,
        allSet: allSet,
      };
    });

    /* document frequency + idf over the collection */
    var df = {};
    faqs.forEach(function (f) {
      Object.keys(f.allSet).forEach(function (t) {
        df[t] = (df[t] || 0) + 1;
      });
    });
    var N = faqs.length || 1;
    var idf = {};
    Object.keys(df).forEach(function (t) {
      idf[t] = Math.log(1 + N / df[t]);
    });
    function idfOf(token) {
      return idf[token] !== undefined ? idf[token] : Math.log(1 + N);
    }

    function hasToken(entry, token) {
      return !!(entry.qSet[token] || entry.aSet[token]);
    }

    /** Returns {score, coverage, matches:[...]} for a query against an entry. */
    function scoreEntry(entry, queryTokenDetails) {
      var totalW = 0;
      var matchedW = 0;
      var questionBonusW = 0;
      var matched = [];
      var unmatched = [];

      queryTokenDetails.forEach(function (detail) {
        var token = detail.t;
        var w = idfOf(token);
        totalW += w;

        if (hasToken(entry, token)) {
          matchedW += w;
          matched.push(token);
          if (entry.qSet[token]) {
            questionBonusW += 0.25 * w;
          }
          return;
        }

        /* fuzzy (typo) matching, skipped for purely numeric tokens */
        if (!/^\d+$/.test(token)) {
          var variants = detail.raw && detail.raw !== token ? [token, detail.raw] : [token];
          var candidates = Object.keys(entry.allSet);
          for (var vi = 0; vi < variants.length; vi++) {
            var variant = variants[vi];
            var budget = typoBudget(variant.length);
            if (budget === 0) continue;
            for (var i = 0; i < candidates.length; i++) {
              var c = candidates[i];
              if (Math.abs(c.length - variant.length) > budget) continue;
              var dist = levenshtein(variant, c, budget);
              if (dist <= budget) {
                var credit = dist <= 1 ? 0.85 : 0.6;
                matchedW += credit * w;
                if (entry.qSet[c]) questionBonusW += 0.15 * w;
                matched.push(token + "~" + c);
                return;
              }
            }
          }
        }
        unmatched.push(token);
      });

      var coverage = totalW > 0 ? matchedW / totalW : 0;
      var score = totalW > 0 ? (matchedW + questionBonusW) / totalW : 0;
      return {
        coverage: coverage,
        score: score,
        matched: matched,
        unmatched: unmatched,
        matchedCount: matched.length,
        queryCount: queryTokenDetails.length,
      };
    }

    /* ------------------------------------------------------------------ */
    /* RETRIEVE                                                           */
    /* ------------------------------------------------------------------ */
    function retrieve(question, limit) {
      limit = limit || 3;
      var details = contentTokenDetails(question);
      if (!details.length) return { tokens: [], results: [] };

      var results = faqs
        .map(function (entry) {
          var s = scoreEntry(entry, details);
          return {
            entry: entry,
            coverage: s.coverage,
            score: s.score,
            matched: s.matched,
            unmatched: s.unmatched,
          };
        })
        .filter(function (r) {
          return r.coverage >= CONFIDENCE_THRESHOLD;
        })
        .sort(function (a, b) {
          return b.score - a.score || b.coverage - a.coverage || a.entry.position - b.entry.position;
        })
        .slice(0, limit);

      return {
        tokens: details.map(function (d) {
          return d.t;
        }),
        results: results,
      };
    }

    /* ------------------------------------------------------------------ */
    /* GENERATE (grounded, local)                                          */
    /* ------------------------------------------------------------------ */
    function generateLocal(results) {
      if (!results.length) return "";
      var top = results[0];
      var parts = [top.entry.answer];

      // A second entry is merged only when it is nearly as relevant, so the
      // reply stays concise and nothing unsupported is introduced.
      if (results.length > 1) {
        var second = results[1];
        var closeEnough = second.score >= 0.92 * top.score && second.entry.answer !== top.entry.answer;
        var differentCategoryTopic =
          second.entry.category !== top.entry.category ||
          second.unmatched.length < top.unmatched.length;
        if (closeEnough && differentCategoryTopic) {
          parts.push(second.entry.answer);
        }
      }
      return parts.join(" ");
    }

    /* ------------------------------------------------------------------ */
    /* GENERATE (optional external generative-AI / LLM mode)               */
    /* ------------------------------------------------------------------ */
    async function generateWithLLM(question, results) {
      var cfg = options.llm;
      var context = results
        .map(function (r, i) {
          return (
            "[FAQ " +
            r.entry.id +
            " | " +
            r.entry.category +
            "] Q: " +
            r.entry.question +
            "\nA: " +
            r.entry.answer
          );
        })
        .join("\n\n");

      var system =
        "You are a college department FAQ assistant. Answer ONLY from the numbered FAQ context " +
        "provided by the user. Rules: (1) Never invent, estimate or guess facts that are not " +
        "explicitly stated in the context. (2) Keep the answer concise and in natural language. " +
        "(3) If the context does not contain the answer, reply with exactly: " +
        JSON.stringify(FALLBACK_RESPONSE);

      var body = {
        model: cfg.model,
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: "FAQ context:\n\n" + context + "\n\nStudent question: " + question,
          },
        ],
        temperature: 0,
      };

      var res = await fetch(cfg.endpoint, {
        method: "POST",
        headers: Object.assign(
          { "Content-Type": "application/json" },
          cfg.apiKey ? { Authorization: "Bearer " + cfg.apiKey } : {}
        ),
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("LLM HTTP " + res.status);
      var data = await res.json();
      var text =
        (data.choices &&
          data.choices[0] &&
          data.choices[0].message &&
          data.choices[0].message.content) ||
        (data.output && data.output.text) ||
        "";
      return String(text).trim();
    }

    /* ------------------------------------------------------------------ */
    /* PUBLIC: ASK                                                         */
    /* ------------------------------------------------------------------ */
    async function ask(question) {
      var retrieval = retrieve(question, 3);
      var results = retrieval.results;

      if (!results.length) {
        return {
          question: question,
          answer: FALLBACK_RESPONSE,
          usedFallback: true,
          mode: "knowledge-base",
          source: null,
          confidence: retrieval.tokens.length ? 0 : 0,
          debug: { tokens: retrieval.tokens, candidates: [] },
        };
      }

      var answer;
      var mode = "knowledge-base";

      if (options.llm && typeof options.llm === "object" && options.llm.endpoint) {
        mode = "generative-ai";
        try {
          answer = await generateWithLLM(question, results);
          if (!answer) throw new Error("empty model response");
          // Never let the model drift away from the knowledge base.
          if (answer !== FALLBACK_RESPONSE && answer.length > 2000) answer = answer.slice(0, 2000);
        } catch (err) {
          // Graceful degradation to the grounded local generator.
          mode = "knowledge-base (local fallback after model error)";
          answer = generateLocal(results);
        }
      } else {
        answer = generateLocal(results);
      }

      var usedFallback = answer === FALLBACK_RESPONSE;
      return {
        question: question,
        answer: usedFallback ? FALLBACK_RESPONSE : answer,
        usedFallback: usedFallback,
        mode: mode,
        source: usedFallback
          ? null
          : {
              id: results[0].entry.id,
              category: results[0].entry.category,
              question: results[0].entry.question,
              alsoFrom:
                results.length > 1 && results[1].score >= 0.92 * results[0].score
                  ? { id: results[1].entry.id, category: results[1].entry.category }
                  : null,
            },
        confidence: Math.round(results[0].coverage * 100) / 100,
        debug: {
          tokens: retrieval.tokens,
          candidates: results.map(function (r) {
            return {
              id: r.entry.id,
              coverage: Math.round(r.coverage * 100) / 100,
              score: Math.round(r.score * 100) / 100,
              unmatched: r.unmatched,
            };
          }),
        },
      };
    }

    /** Synchronous convenience wrapper (knowledge-base mode only). */
    function askSync(question) {
      var retrieval = retrieve(question, 3);
      var results = retrieval.results;
      if (!results.length) {
        return {
          question: question,
          answer: FALLBACK_RESPONSE,
          usedFallback: true,
          mode: "knowledge-base",
          source: null,
          confidence: 0,
          debug: { tokens: retrieval.tokens, candidates: [] },
        };
      }
      return {
        question: question,
        answer: generateLocal(results),
        usedFallback: false,
        mode: "knowledge-base",
        source: {
          id: results[0].entry.id,
          category: results[0].entry.category,
          question: results[0].entry.question,
        },
        confidence: Math.round(results[0].coverage * 100) / 100,
        debug: {
          tokens: retrieval.tokens,
          candidates: results.map(function (r) {
            return {
              id: r.entry.id,
              coverage: Math.round(r.coverage * 100) / 100,
              score: Math.round(r.score * 100) / 100,
              unmatched: r.unmatched,
            };
          }),
        },
      };
    }

    return {
      ask: ask,
      askSync: askSync,
      retrieve: retrieve,
      size: faqs.length,
      threshold: CONFIDENCE_THRESHOLD,
    };
  }

  return {
    createEngine: createEngine,
    FALLBACK_RESPONSE: FALLBACK_RESPONSE,
    CONFIDENCE_THRESHOLD: CONFIDENCE_THRESHOLD,
  };
});
