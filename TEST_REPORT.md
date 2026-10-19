# Chatbot Test Report

**System:** AI-powered FAQ Chatbot — Department of Computer Science & Engineering, Riverdale Institute of Technology (sample data)  
**Knowledge base:** `data/faq-knowledge-base.json` (30 entries, categories: Admissions, Courses, Examinations, Placements)  
**Engine:** `src/answer-engine.js` (TF-IDF retrieval + typo-tolerant matching + grounded answer generation, confidence threshold 45%)  
**Executed:** 10/19/2026, 2:20:25 PM  
**Runner:** `node tests/run-tests.js`

## 1. Summary

| Metric | Value |
|---|---|
| Total checks | 112 |
| Passed | 111 |
| Failed | 1 |
| Result | **FAILURES PRESENT** |

## 2. Knowledge-base integrity checks

| # | Check | Status | Detail |
|---|---|---|---|
| 1 | Knowledge base contains at least 25 FAQ entries | Pass | found 30 entries |
| 2 | Category covered: Admissions | Pass | Admissions, Courses, Examinations, Placements |
| 3 | Category covered: Courses | Pass | Admissions, Courses, Examinations, Placements |
| 4 | Category covered: Examinations | Pass | Admissions, Courses, Examinations, Placements |
| 5 | Category covered: Placements | Pass | Admissions, Courses, Examinations, Placements |
| 6 | FAQ #1 has all required fields (id, category, question, answer, keywords) | Pass | ["id","category","question","answer","keywords"] |
| 7 | FAQ #2 has all required fields (id, category, question, answer, keywords) | Pass | ["id","category","question","answer","keywords"] |
| 8 | FAQ #3 has all required fields (id, category, question, answer, keywords) | Pass | ["id","category","question","answer","keywords"] |
| 9 | FAQ #4 has all required fields (id, category, question, answer, keywords) | Pass | ["id","category","question","answer","keywords"] |
| 10 | FAQ #5 has all required fields (id, category, question, answer, keywords) | Pass | ["id","category","question","answer","keywords"] |
| 11 | FAQ #6 has all required fields (id, category, question, answer, keywords) | Pass | ["id","category","question","answer","keywords"] |
| 12 | FAQ #7 has all required fields (id, category, question, answer, keywords) | Pass | ["id","category","question","answer","keywords"] |
| 13 | FAQ #8 has all required fields (id, category, question, answer, keywords) | Pass | ["id","category","question","answer","keywords"] |
| 14 | FAQ #9 has all required fields (id, category, question, answer, keywords) | Pass | ["id","category","question","answer","keywords"] |
| 15 | FAQ #10 has all required fields (id, category, question, answer, keywords) | Pass | ["id","category","question","answer","keywords"] |
| 16 | FAQ #11 has all required fields (id, category, question, answer, keywords) | Pass | ["id","category","question","answer","keywords"] |
| 17 | FAQ #12 has all required fields (id, category, question, answer, keywords) | Pass | ["id","category","question","answer","keywords"] |
| 18 | FAQ #13 has all required fields (id, category, question, answer, keywords) | Pass | ["id","category","question","answer","keywords"] |
| 19 | FAQ #14 has all required fields (id, category, question, answer, keywords) | Pass | ["id","category","question","answer","keywords"] |
| 20 | FAQ #15 has all required fields (id, category, question, answer, keywords) | Pass | ["id","category","question","answer","keywords"] |
| 21 | FAQ #16 has all required fields (id, category, question, answer, keywords) | Pass | ["id","category","question","answer","keywords"] |
| 22 | FAQ #17 has all required fields (id, category, question, answer, keywords) | Pass | ["id","category","question","answer","keywords"] |
| 23 | FAQ #18 has all required fields (id, category, question, answer, keywords) | Pass | ["id","category","question","answer","keywords"] |
| 24 | FAQ #19 has all required fields (id, category, question, answer, keywords) | Pass | ["id","category","question","answer","keywords"] |
| 25 | FAQ #20 has all required fields (id, category, question, answer, keywords) | Pass | ["id","category","question","answer","keywords"] |
| 26 | FAQ #21 has all required fields (id, category, question, answer, keywords) | Pass | ["id","category","question","answer","keywords"] |
| 27 | FAQ #22 has all required fields (id, category, question, answer, keywords) | Pass | ["id","category","question","answer","keywords"] |
| 28 | FAQ #23 has all required fields (id, category, question, answer, keywords) | Pass | ["id","category","question","answer","keywords"] |
| 29 | FAQ #24 has all required fields (id, category, question, answer, keywords) | Pass | ["id","category","question","answer","keywords"] |
| 30 | FAQ #25 has all required fields (id, category, question, answer, keywords) | Pass | ["id","category","question","answer","keywords"] |
| 31 | FAQ #26 has all required fields (id, category, question, answer, keywords) | Pass | ["id","category","question","answer","keywords"] |
| 32 | FAQ #27 has all required fields (id, category, question, answer, keywords) | Pass | ["id","category","question","answer","keywords"] |
| 33 | FAQ #28 has all required fields (id, category, question, answer, keywords) | Pass | ["id","category","question","answer","keywords"] |
| 34 | FAQ #29 has all required fields (id, category, question, answer, keywords) | Pass | ["id","category","question","answer","keywords"] |
| 35 | FAQ #30 has all required fields (id, category, question, answer, keywords) | Pass | ["id","category","question","answer","keywords"] |
| 36 | FAQ #1 question preserved verbatim in source document | Pass |  |
| 37 | FAQ #1 answer preserved verbatim in source document | Pass |  |
| 38 | FAQ #2 question preserved verbatim in source document | Pass |  |
| 39 | FAQ #2 answer preserved verbatim in source document | Pass |  |
| 40 | FAQ #3 question preserved verbatim in source document | Pass |  |
| 41 | FAQ #3 answer preserved verbatim in source document | Pass |  |
| 42 | FAQ #4 question preserved verbatim in source document | Pass |  |
| 43 | FAQ #4 answer preserved verbatim in source document | Pass |  |
| 44 | FAQ #5 question preserved verbatim in source document | Pass |  |
| 45 | FAQ #5 answer preserved verbatim in source document | Pass |  |
| 46 | FAQ #6 question preserved verbatim in source document | Pass |  |
| 47 | FAQ #6 answer preserved verbatim in source document | Pass |  |
| 48 | FAQ #7 question preserved verbatim in source document | Pass |  |
| 49 | FAQ #7 answer preserved verbatim in source document | Pass |  |
| 50 | FAQ #8 question preserved verbatim in source document | Pass |  |
| 51 | FAQ #8 answer preserved verbatim in source document | Pass |  |
| 52 | FAQ #9 question preserved verbatim in source document | Pass |  |
| 53 | FAQ #9 answer preserved verbatim in source document | Pass |  |
| 54 | FAQ #10 question preserved verbatim in source document | Pass |  |
| 55 | FAQ #10 answer preserved verbatim in source document | Pass |  |
| 56 | FAQ #11 question preserved verbatim in source document | Pass |  |
| 57 | FAQ #11 answer preserved verbatim in source document | Pass |  |
| 58 | FAQ #12 question preserved verbatim in source document | Pass |  |
| 59 | FAQ #12 answer preserved verbatim in source document | Pass |  |
| 60 | FAQ #13 question preserved verbatim in source document | Pass |  |
| 61 | FAQ #13 answer preserved verbatim in source document | Pass |  |
| 62 | FAQ #14 question preserved verbatim in source document | Pass |  |
| 63 | FAQ #14 answer preserved verbatim in source document | Pass |  |
| 64 | FAQ #15 question preserved verbatim in source document | Pass |  |
| 65 | FAQ #15 answer preserved verbatim in source document | Pass |  |
| 66 | FAQ #16 question preserved verbatim in source document | Pass |  |
| 67 | FAQ #16 answer preserved verbatim in source document | Pass |  |
| 68 | FAQ #17 question preserved verbatim in source document | Pass |  |
| 69 | FAQ #17 answer preserved verbatim in source document | Pass |  |
| 70 | FAQ #18 question preserved verbatim in source document | Pass |  |
| 71 | FAQ #18 answer preserved verbatim in source document | Pass |  |
| 72 | FAQ #19 question preserved verbatim in source document | Pass |  |
| 73 | FAQ #19 answer preserved verbatim in source document | Pass |  |
| 74 | FAQ #20 question preserved verbatim in source document | Pass |  |
| 75 | FAQ #20 answer preserved verbatim in source document | Pass |  |
| 76 | FAQ #21 question preserved verbatim in source document | Pass |  |
| 77 | FAQ #21 answer preserved verbatim in source document | Pass |  |
| 78 | FAQ #22 question preserved verbatim in source document | Pass |  |
| 79 | FAQ #22 answer preserved verbatim in source document | Pass |  |
| 80 | FAQ #23 question preserved verbatim in source document | Pass |  |
| 81 | FAQ #23 answer preserved verbatim in source document | Pass |  |
| 82 | FAQ #24 question preserved verbatim in source document | Pass |  |
| 83 | FAQ #24 answer preserved verbatim in source document | Pass |  |
| 84 | FAQ #25 question preserved verbatim in source document | Pass |  |
| 85 | FAQ #25 answer preserved verbatim in source document | Pass |  |
| 86 | FAQ #26 question preserved verbatim in source document | Pass |  |
| 87 | FAQ #26 answer preserved verbatim in source document | Pass |  |
| 88 | FAQ #27 question preserved verbatim in source document | Pass |  |
| 89 | FAQ #27 answer preserved verbatim in source document | Pass |  |
| 90 | FAQ #28 question preserved verbatim in source document | Pass |  |
| 91 | FAQ #28 answer preserved verbatim in source document | Pass |  |
| 92 | FAQ #29 question preserved verbatim in source document | Pass |  |
| 93 | FAQ #29 answer preserved verbatim in source document | Pass |  |
| 94 | FAQ #30 question preserved verbatim in source document | Pass |  |
| 95 | FAQ #30 answer preserved verbatim in source document | Fail |  |
| 96 | Every question in the source document made it into the knowledge base | Pass | document=30, kb=30 |
| 97 | Source document states the illustrative-data disclaimer | Pass |  |
| 98 | Browser bundle (data/faq-knowledge-base.js) is in sync with the JSON knowledge base | Pass |  |

## 3. Chatbot functional test cases

| ID | Group | Question | Expected result | Actual chatbot response | Status |
|---|---|---|---|---|---|
| T01 | Specification test cases | What are the eligibility criteria for admission? | Provide the eligibility criteria from the knowledge base. | To be eligible for the B.Tech Computer Science and Engineering programme, a candidate must have passed 10+2 (or an equivalent examination) with Physics, Mathematics and Chemistry or Computer Science, securing an aggregate of 50% marks (45% for candidates belonging to reserved categories as per state government norms). Admission is offered against the rank secured in the Riverd… | **Pass** |
| T02 | Specification test cases | Which courses are offered by the department? | List the courses available in the knowledge base. | The department offers four programmes: B.Tech Computer Science and Engineering, B.Tech Artificial Intelligence and Data Science, M.Tech Computer Science and Engineering, and a Doctor of Philosophy (PhD) programme in Computer Science and Engineering. The first two are undergraduate programmes, M.Tech is a postgraduate programme, and the PhD is a research programme. | **Pass** |
| T03 | Specification test cases | How can I apply for the semester examination? | Explain the examination application procedure based on the knowledge base. | Examination applications are submitted through the student portal. Log in with the enrolment number, open the Examination tab, select the current semester, verify the subject codes shown, pay the examination fee online, and submit the form before the notified last date. Applications submitted after the last date require a late fee of INR 200 and the approval of the examination… | **Pass** |
| T04 | Specification test cases | Does the college provide placement training? | Provide the placement training details from the knowledge base. | Yes. Pre-placement training begins in the fifth semester and covers aptitude and reasoning, communication and group discussion skills, resume writing, and technical preparation in data structures, DBMS, operating systems and programming. The training includes mock interviews, guest sessions from recruiters, and a resume-building workshop conducted by the Training and Placement… | **Pass** |
| T05 | Specification test cases (unsupported) | What was the exact placement percentage of the department in 2025? | Information absent from the knowledge base → predefined fallback response. | I'm sorry, I couldn't find an answer to your question in the available college FAQ knowledge base. Please contact the college department office for further assistance. | **Pass** |
| T06 | Unsupported questions (must not be guessed) | Do you provide hostel accommodation and mess food? | Hostel information is not in the knowledge base → fallback response. | I'm sorry, I couldn't find an answer to your question in the available college FAQ knowledge base. Please contact the college department office for further assistance. | **Pass** |
| T07 | Unsupported questions (must not be guessed) | What is the highest salary package offered this year? | Salary/package data is not in the knowledge base → fallback response. | I'm sorry, I couldn't find an answer to your question in the available college FAQ knowledge base. Please contact the college department office for further assistance. | **Pass** |
| T08 | Supported questions (extra coverage) | What are the fees for the programme? | Return the fee structure from the knowledge base. | The tuition fee for the B.Tech (CSE) programme is INR 85,000 per academic year. A one-time admission fee of INR 10,000 is payable at the time of admission, and a refundable caution deposit of INR 5,000 is collected once. Fees may be paid in two instalments, one at the beginning of each semester, through the college fee portal. | **Pass** |
| T09 | Supported questions (extra coverage) | How many seats are there in the department? | Return the seat intake from the knowledge base. | The department offers an intake of 120 seats in B.Tech Computer Science and Engineering, 60 seats in B.Tech Artificial Intelligence and Data Science, and 18 seats in M.Tech Computer Science and Engineering. Seats are filled on the basis of RCET rank in the order of merit, and the seat matrix is displayed on the admissions portal. --- | **Pass** |
| T10 | Supported questions (extra coverage) | How do I get my hall ticket? | Return the hall-ticket procedure from the knowledge base. | The hall ticket can be downloaded from the student portal three working days before the examination. It is generated only for candidates who have the required attendance and have cleared the semester fee. Students must carry the printed hall ticket together with the college identity card to every examination hall. | **Pass** |
| T11 | Supported questions (extra coverage) | Can I apply for revaluation of my answer script? | Return the revaluation procedure from the knowledge base. | Revaluation can be requested within seven days of the declaration of the result by submitting an online request through the student portal with a fee of INR 300 per subject. The revised result is communicated within 15 working days, and the revised marks are updated in the grade sheet. | **Pass** |
| T12 | Typo tolerance | What is the examnination schedual for this semster? | Misspelt words must still retrieve the examination schedule entry. | Internal unit tests are conducted in September-October and in March-April of each academic year, and the end-semester examinations are conducted in November-December and in May-June. The detailed datesheet is published on the student portal and on the department notice board at least 15 days before the examination begins. | **Pass** |
| T13 | Typo tolerance | Whch cours is bset for artifical inteligence? | Heavily misspelt question must still match the courses entry. | The department offers four programmes: B.Tech Computer Science and Engineering, B.Tech Artificial Intelligence and Data Science, M.Tech Computer Science and Engineering, and a Doctor of Philosophy (PhD) programme in Computer Science and Engineering. The first two are undergraduate programmes, M.Tech is a postgraduate programme, and the PhD is a research programme. | **Pass** |
| T14 | Phrasing variations | Tell me about attendance shortage rules | Paraphrased question must match the attendance entry. | A student must secure a minimum of 75% attendance in each subject and in aggregate to be permitted to write the end-semester examination. Shortages arising from medical grounds may be condoned by the department on the recommendation of the class adviser, with supporting medical certificates. | **Pass** |

## 4. Detailed observations

### T01 — Pass — What are the eligibility criteria for admission?

- **Group:** Specification test cases
- **Expected:** Provide the eligibility criteria from the knowledge base.
- **Actual:** To be eligible for the B.Tech Computer Science and Engineering programme, a candidate must have passed 10+2 (or an equivalent examination) with Physics, Mathematics and Chemistry or Computer Science, securing an aggregate of 50% marks (45% for candidates belonging to reserved categories as per state government norms). Admission is offered against the rank secured in the Riverdale Common Entrance Test (RCET), or through the management quota as per college rules.
- **Source FAQ:** #1 (retrieval confidence 1)
- **Note:** Answered from FAQ #1.

### T02 — Pass — Which courses are offered by the department?

- **Group:** Specification test cases
- **Expected:** List the courses available in the knowledge base.
- **Actual:** The department offers four programmes: B.Tech Computer Science and Engineering, B.Tech Artificial Intelligence and Data Science, M.Tech Computer Science and Engineering, and a Doctor of Philosophy (PhD) programme in Computer Science and Engineering. The first two are undergraduate programmes, M.Tech is a postgraduate programme, and the PhD is a research programme.
- **Source FAQ:** #8 (retrieval confidence 1)
- **Note:** Answered from FAQ #8.

### T03 — Pass — How can I apply for the semester examination?

- **Group:** Specification test cases
- **Expected:** Explain the examination application procedure based on the knowledge base.
- **Actual:** Examination applications are submitted through the student portal. Log in with the enrolment number, open the Examination tab, select the current semester, verify the subject codes shown, pay the examination fee online, and submit the form before the notified last date. Applications submitted after the last date require a late fee of INR 200 and the approval of the examination in-charge.
- **Source FAQ:** #17 (retrieval confidence 1)
- **Note:** Answered from FAQ #17.

### T04 — Pass — Does the college provide placement training?

- **Group:** Specification test cases
- **Expected:** Provide the placement training details from the knowledge base.
- **Actual:** Yes. Pre-placement training begins in the fifth semester and covers aptitude and reasoning, communication and group discussion skills, resume writing, and technical preparation in data structures, DBMS, operating systems and programming. The training includes mock interviews, guest sessions from recruiters, and a resume-building workshop conducted by the Training and Placement Cell.
- **Source FAQ:** #27 (retrieval confidence 1)
- **Note:** Answered from FAQ #27.

### T05 — Pass — What was the exact placement percentage of the department in 2025?

- **Group:** Specification test cases (unsupported)
- **Expected:** Information absent from the knowledge base → predefined fallback response.
- **Actual:** I'm sorry, I couldn't find an answer to your question in the available college FAQ knowledge base. Please contact the college department office for further assistance.
- **Fallback used:** Yes — correct behaviour
- **Note:** Fallback returned exactly as specified.

### T06 — Pass — Do you provide hostel accommodation and mess food?

- **Group:** Unsupported questions (must not be guessed)
- **Expected:** Hostel information is not in the knowledge base → fallback response.
- **Actual:** I'm sorry, I couldn't find an answer to your question in the available college FAQ knowledge base. Please contact the college department office for further assistance.
- **Fallback used:** Yes — correct behaviour
- **Note:** Fallback returned exactly as specified.

### T07 — Pass — What is the highest salary package offered this year?

- **Group:** Unsupported questions (must not be guessed)
- **Expected:** Salary/package data is not in the knowledge base → fallback response.
- **Actual:** I'm sorry, I couldn't find an answer to your question in the available college FAQ knowledge base. Please contact the college department office for further assistance.
- **Fallback used:** Yes — correct behaviour
- **Note:** Fallback returned exactly as specified.

### T08 — Pass — What are the fees for the programme?

- **Group:** Supported questions (extra coverage)
- **Expected:** Return the fee structure from the knowledge base.
- **Actual:** The tuition fee for the B.Tech (CSE) programme is INR 85,000 per academic year. A one-time admission fee of INR 10,000 is payable at the time of admission, and a refundable caution deposit of INR 5,000 is collected once. Fees may be paid in two instalments, one at the beginning of each semester, through the college fee portal.
- **Source FAQ:** #5 (retrieval confidence 1)
- **Note:** Answered from FAQ #5.

### T09 — Pass — How many seats are there in the department?

- **Group:** Supported questions (extra coverage)
- **Expected:** Return the seat intake from the knowledge base.
- **Actual:** The department offers an intake of 120 seats in B.Tech Computer Science and Engineering, 60 seats in B.Tech Artificial Intelligence and Data Science, and 18 seats in M.Tech Computer Science and Engineering. Seats are filled on the basis of RCET rank in the order of merit, and the seat matrix is displayed on the admissions portal. ---
- **Source FAQ:** #7 (retrieval confidence 1)
- **Note:** Answered from FAQ #7.

### T10 — Pass — How do I get my hall ticket?

- **Group:** Supported questions (extra coverage)
- **Expected:** Return the hall-ticket procedure from the knowledge base.
- **Actual:** The hall ticket can be downloaded from the student portal three working days before the examination. It is generated only for candidates who have the required attendance and have cleared the semester fee. Students must carry the printed hall ticket together with the college identity card to every examination hall.
- **Source FAQ:** #19 (retrieval confidence 1)
- **Note:** Answered from FAQ #19.

### T11 — Pass — Can I apply for revaluation of my answer script?

- **Group:** Supported questions (extra coverage)
- **Expected:** Return the revaluation procedure from the knowledge base.
- **Actual:** Revaluation can be requested within seven days of the declaration of the result by submitting an online request through the student portal with a fee of INR 300 per subject. The revised result is communicated within 15 working days, and the revised marks are updated in the grade sheet.
- **Source FAQ:** #21 (retrieval confidence 1)
- **Note:** Answered from FAQ #21.

### T12 — Pass — What is the examnination schedual for this semster?

- **Group:** Typo tolerance
- **Expected:** Misspelt words must still retrieve the examination schedule entry.
- **Actual:** Internal unit tests are conducted in September-October and in March-April of each academic year, and the end-semester examinations are conducted in November-December and in May-June. The detailed datesheet is published on the student portal and on the department notice board at least 15 days before the examination begins.
- **Source FAQ:** #16 (retrieval confidence 0.77)
- **Note:** Answered from FAQ #16.

### T13 — Pass — Whch cours is bset for artifical inteligence?

- **Group:** Typo tolerance
- **Expected:** Heavily misspelt question must still match the courses entry.
- **Actual:** The department offers four programmes: B.Tech Computer Science and Engineering, B.Tech Artificial Intelligence and Data Science, M.Tech Computer Science and Engineering, and a Doctor of Philosophy (PhD) programme in Computer Science and Engineering. The first two are undergraduate programmes, M.Tech is a postgraduate programme, and the PhD is a research programme.
- **Source FAQ:** #8 (retrieval confidence 0.63)
- **Note:** Answered from FAQ #8.

### T14 — Pass — Tell me about attendance shortage rules

- **Group:** Phrasing variations
- **Expected:** Paraphrased question must match the attendance entry.
- **Actual:** A student must secure a minimum of 75% attendance in each subject and in aggregate to be permitted to write the end-semester examination. Shortages arising from medical grounds may be condoned by the department on the recommendation of the class adviser, with supporting medical certificates.
- **Source FAQ:** #14 (retrieval confidence 0.62)
- **Note:** Answered from FAQ #14.

## 5. Conclusion

Some checks failed. See the detailed observations above.

> **Reminder:** the knowledge base contains illustrative sample data only and must be
> replaced with official college information before deployment.
