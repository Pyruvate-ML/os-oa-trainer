import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CHAPTER_DIR = path.join(ROOT, "data", "chapters");
const TERMS_DIR = path.join(ROOT, "data", "terms");
const OUTPUT_FILE = path.join(ROOT, "data", "question-bank.generated.json");
const CHAPTER_FILE_RE = /^(os|coa)-ch(\d{2})-[a-z0-9-]+\.json$/i;
const TERMS_FILE_RE = /^(os|coa)-terms\.json$/i;

const SUBJECT_NAME_MAP = {
  os: "Operating Systems",
  coa: "Computer Organization"
};

function normalizeSubjectId(value) {
  return (value || "").toString().trim().toLowerCase();
}

function stripCodeFence(text) {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) return text;

  return trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
}

function extractJsonObjects(text) {
  const results = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === "\"") {
        inString = false;
      }
      continue;
    }

    if (ch === "\"") {
      inString = true;
      continue;
    }

    if (ch === "{") {
      if (depth === 0) start = i;
      depth += 1;
      continue;
    }

    if (ch === "}") {
      if (depth === 0) continue;
      depth -= 1;
      if (depth === 0 && start >= 0) {
        results.push(text.slice(start, i + 1));
        start = -1;
      }
    }
  }

  return results;
}

function scoreParsedObject(parsed) {
  const mcqCount = Array.isArray(parsed.mcq) ? parsed.mcq.length : 0;
  const tfCount = Array.isArray(parsed.tf) ? parsed.tf.length : 0;
  const termsCount = Array.isArray(parsed.terms) ? parsed.terms.length : 0;
  return mcqCount + tfCount + termsCount;
}

function chooseBestChapterObject(objects, fileSubjectId, fileChapterId) {
  const matching = objects.filter((item) => {
    const sameSubject = !item.subjectId || normalizeSubjectId(item.subjectId) === fileSubjectId;
    const sameChapter = !item.chapterId || normalizeChapterId(item.chapterId, fileChapterId.slice(2)) === fileChapterId;
    return sameSubject && sameChapter;
  });

  const pool = matching.length ? matching : objects;
  return pool.reduce((best, current) => {
    if (!best) return current;
    const currentScore = scoreParsedObject(current);
    const bestScore = scoreParsedObject(best);
    return currentScore >= bestScore ? current : best;
  }, null);
}

function chooseBestTermsObject(objects, fileSubjectId) {
  const matching = objects.filter((item) => !item.subjectId || normalizeSubjectId(item.subjectId) === fileSubjectId);
  const pool = matching.length ? matching : objects;
  return pool.reduce((best, current) => {
    if (!best) return current;
    const currentScore = scoreParsedObject(current);
    const bestScore = scoreParsedObject(best);
    return currentScore >= bestScore ? current : best;
  }, null);
}

function parseLooseJson(raw, chooser) {
  const cleaned = stripCodeFence(raw);
  try {
    return JSON.parse(cleaned);
  } catch {
    const objects = extractJsonObjects(cleaned).map((chunk) => JSON.parse(chunk));
    if (!objects.length) throw new Error("No valid JSON object found in file.");
    return chooser(objects);
  }
}

function normalizeChapterId(value, fallbackNumber) {
  if (value && /^ch\d{2}$/i.test(value)) return value.toLowerCase();
  return `ch${fallbackNumber}`;
}

function withChapterMeta(item, chapterId, chapterName, fallbackId) {
  return {
    id: item.id || fallbackId,
    chapterId,
    chapterName,
    ...item
  };
}

async function loadChapterFile(filename) {
  const full = path.join(CHAPTER_DIR, filename);
  const raw = await fs.readFile(full, "utf8");

  const match = filename.match(CHAPTER_FILE_RE);
  if (!match) throw new Error(`Invalid filename: ${filename}`);

  const fileSubjectId = match[1].toLowerCase();
  const fileChapterNo = match[2];
  const fileChapterId = `ch${fileChapterNo}`;
  const parsed = parseLooseJson(raw, (objects) => chooseBestChapterObject(objects, fileSubjectId, fileChapterId));

  const subjectId = fileSubjectId;
  if (!SUBJECT_NAME_MAP[subjectId]) {
    throw new Error(`Unsupported subjectId in ${filename}: ${subjectId}`);
  }

  const chapterId = fileChapterId;
  const chapterName = parsed.chapterName || `Chapter ${fileChapterNo}`;

  const mcqRaw = Array.isArray(parsed.mcq) ? parsed.mcq : [];
  const tfRaw = Array.isArray(parsed.tf) ? parsed.tf : [];
  const mcq = mcqRaw.map((q, idx) =>
    withChapterMeta(q, chapterId, chapterName, `${subjectId}-${chapterId}-mcq-${idx + 1}`)
  );
  const tf = tfRaw.map((q, idx) =>
    withChapterMeta(q, chapterId, chapterName, `${subjectId}-${chapterId}-tf-${idx + 1}`)
  );

  return {
    subjectId,
    subjectName: parsed.subjectName || SUBJECT_NAME_MAP[subjectId],
    chapterId,
    chapterName,
    mcq,
    tf,
    filename
  };
}

async function loadTermsFile(filename) {
  const full = path.join(TERMS_DIR, filename);
  const raw = await fs.readFile(full, "utf8");

  const match = filename.match(TERMS_FILE_RE);
  if (!match) throw new Error(`Invalid terms filename: ${filename}`);

  const fileSubjectId = match[1].toLowerCase();
  const parsed = parseLooseJson(raw, (objects) => chooseBestTermsObject(objects, fileSubjectId));
  const subjectId = fileSubjectId;
  if (!SUBJECT_NAME_MAP[subjectId]) {
    throw new Error(`Unsupported subjectId in ${filename}: ${subjectId}`);
  }

  const termsRaw = Array.isArray(parsed.terms) ? parsed.terms : [];
  const terms = termsRaw.map((item, idx) => ({
    id: item.id || `${subjectId}-term-${idx + 1}`,
    ...item
  }));

  return {
    subjectId,
    subjectName: parsed.subjectName || SUBJECT_NAME_MAP[subjectId],
    terms,
    filename
  };
}

function sortByChapterThenId(list) {
  return [...list].sort((a, b) => {
    const c = (a.chapterId || "").localeCompare(b.chapterId || "");
    if (c !== 0) return c;
    return (a.id || "").localeCompare(b.id || "");
  });
}

async function main() {
  const chapterNames = await fs.readdir(CHAPTER_DIR);
  const termsNames = await fs.readdir(TERMS_DIR);
  const chapterFiles = chapterNames.filter((name) => CHAPTER_FILE_RE.test(name)).sort();
  const termsFiles = termsNames.filter((name) => TERMS_FILE_RE.test(name)).sort();

  if (!chapterFiles.length && !termsFiles.length) {
    throw new Error(
      "No bank files found. Put MCQ files in data/chapters and terms files in data/terms."
    );
  }

  const chapterChunks = await Promise.all(chapterFiles.map(loadChapterFile));
  const termsChunks = await Promise.all(termsFiles.map(loadTermsFile));

  const bySubject = new Map();
  [...chapterChunks, ...termsChunks].forEach((chunk) => {
    if (!bySubject.has(chunk.subjectId)) {
      bySubject.set(chunk.subjectId, {
        id: chunk.subjectId,
        name: chunk.subjectName,
        mcq: [],
        tf: [],
        terms: []
      });
    }

    const target = bySubject.get(chunk.subjectId);
    if (Array.isArray(chunk.mcq)) target.mcq.push(...chunk.mcq);
    if (Array.isArray(chunk.tf)) target.tf.push(...chunk.tf);
    if (Array.isArray(chunk.terms)) target.terms.push(...chunk.terms);
  });

  const subjects = [...bySubject.values()]
    .map((subject) => ({
      ...subject,
      mcq: sortByChapterThenId(subject.mcq),
      tf: sortByChapterThenId(subject.tf),
      terms: sortByChapterThenId(subject.terms)
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const out = { subjects };
  await fs.writeFile(OUTPUT_FILE, `${JSON.stringify(out, null, 2)}\n`, "utf8");

  const summary = subjects
    .map((s) => `${s.id}: mcq=${s.mcq.length}, tf=${s.tf.length}, terms=${s.terms.length}`)
    .join(" | ");

  console.log(`Generated: ${OUTPUT_FILE}`);
  console.log(`Subjects: ${summary}`);
  console.log(`MCQ files: ${chapterFiles.join(", ") || "(none)"}`);
  console.log(`Terms files: ${termsFiles.join(", ") || "(none)"}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
