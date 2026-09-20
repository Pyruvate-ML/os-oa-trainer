import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SOURCE_DIR = path.join(ROOT, "oa");
const CHAPTER_DIR = path.join(ROOT, "data", "chapters");

const SUBJECT_ID = "coa";
const SUBJECT_NAME = "Computer Organization";

const CHINESE_DIGITS = new Map([
  ["零", 0],
  ["一", 1],
  ["二", 2],
  ["三", 3],
  ["四", 4],
  ["五", 5],
  ["六", 6],
  ["七", 7],
  ["八", 8],
  ["九", 9]
]);

function pad2(num) {
  return String(num).padStart(2, "0");
}

function parseChineseNumber(raw) {
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return Number(raw);
  if (raw === "十") return 10;
  if (raw.startsWith("十")) return 10 + (CHINESE_DIGITS.get(raw.slice(1)) || 0);
  if (raw.endsWith("十")) return (CHINESE_DIGITS.get(raw[0]) || 0) * 10;
  if (raw.includes("十")) {
    const [left, right] = raw.split("十");
    return (CHINESE_DIGITS.get(left) || 0) * 10 + (CHINESE_DIGITS.get(right) || 0);
  }
  return CHINESE_DIGITS.get(raw) ?? null;
}

function extractChapterNumber(name) {
  const match = name.match(/^第(.+?)章/);
  return parseChineseNumber(match?.[1] || "");
}

function cleanInline(text) {
  return String(text || "")
    .replace(/^\*\*Question:\*\*\s*/i, "")
    .replace(/^Question:\s*/i, "")
    .replace(/^Options:\s*/i, "")
    .replace(/^\*\*/g, "")
    .replace(/\*\*$/g, "")
    .replace(/^>\s*/, "")
    .trim();
}

function joinLines(lines) {
  return lines
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractAnswer(line) {
  const cleaned = line
    .replace(/^>\s*/, "")
    .replace(/\*\*/g, "")
    .trim();
  const match = cleaned.match(/^(?:Correct Answer|Answer|正确答案)\s*[:：]\s*(.+)$/i);
  return match ? match[1].trim() : null;
}

function isQuestionHeader(line) {
  const cleaned = line.trim();
  const typePattern = "(Single Choice|Multiple Choice|True or False|True/False|Fill in the Blank|Fill-in-the-Blank|Short Answer|Calculation|Short Answer / Calculation)";
  return (
    new RegExp(`^##+\\s*\\d+\\.\\s*${typePattern}`, "i").test(cleaned) ||
    new RegExp(`^\\*\\*\\d+\\.\\s*${typePattern}\\*\\*$`, "i").test(cleaned) ||
    new RegExp(`^###\\s*\\d+\\.\\s*${typePattern}`, "i").test(cleaned) ||
    new RegExp(`^\\d+\\.\\s*${typePattern}$`, "i").test(cleaned)
  );
}

function detectType(line) {
  const cleaned = line.trim();
  if (/Single Choice|Multiple Choice/i.test(cleaned)) return "mcq";
  if (/True or False|True\/False/i.test(cleaned)) return "tf";
  return null;
}

function parseOptionStart(line) {
  const match = line.match(/^([A-D])[.)]\s*(.*)$/);
  if (!match) return null;
  return { key: match[1], text: match[2].trim() };
}

function parseBlock(block, chapterId, questionNo, tfNo) {
  const type = detectType(block.header);
  if (!type) return null;

  const lines = block.lines.map((line) => line.replace(/\r/g, ""));
  const questionLines = [];
  const explanationLines = [];
  const options = [];
  let currentOption = null;
  let answerRaw = "";
  let inExplanation = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line === "---") continue;

    if (/^```/.test(line)) continue;

    if (/^(?:\*\*解析[:：]?\*\*|解析[:：]|>\s*\*\*解析[:：]?\*\*)/.test(line)) {
      inExplanation = true;
      const tail = line
        .replace(/^(?:\*\*解析[:：]?\*\*|解析[:：]|>\s*\*\*解析[:：]?\*\*)\s*/i, "")
        .trim();
      if (tail) explanationLines.push(tail);
      continue;
    }

    const extractedAnswer = extractAnswer(line);
    if (extractedAnswer) {
      answerRaw = extractedAnswer;
      continue;
    }

    if (inExplanation) {
      explanationLines.push(
        line
          .replace(/^>\s*/, "")
          .replace(/^\*\s*/, "")
          .trim()
      );
      continue;
    }

    const optionStart = parseOptionStart(line);
    if (type === "mcq" && optionStart) {
      currentOption = {
        key: optionStart.key,
        textEn: optionStart.text,
        textCn: ""
      };
      options.push(currentOption);
      continue;
    }

    if (type === "mcq" && currentOption && !extractAnswer(line) && !/^Options:\s*$/i.test(line)) {
      if (!/^(?:Question:|\*\*Question:\*\*)/i.test(line)) {
        currentOption.textEn = `${currentOption.textEn} ${cleanInline(line)}`.trim();
        continue;
      }
    }

    currentOption = null;
    if (!/^Options:\s*$/i.test(line)) {
      questionLines.push(cleanInline(line));
    }
  }

  const stemEn = joinLines(questionLines);
  const explanationCn = joinLines(explanationLines);

  if (type === "mcq") {
    if (!stemEn || options.length < 2) return null;
    const answerKey = String(answerRaw).trim().toUpperCase().replace(/[^A-D]/g, "");
    return {
      bucket: "mcq",
      payload: {
        id: `${SUBJECT_ID}-${chapterId}-${String(questionNo).padStart(3, "0")}`,
        stemEn,
        stemCn: "",
        options,
        answerKey,
        explanationCn,
        explanationEn: ""
      }
    };
  }

  const answerText = String(answerRaw).trim().toLowerCase();
  const answer = answerText.startsWith("t") ? "T" : answerText.startsWith("f") ? "F" : "";
  if (!stemEn || !answer) return null;

  return {
    bucket: "tf",
    payload: {
      id: `${SUBJECT_ID}-${chapterId}-tf-${String(tfNo).padStart(3, "0")}`,
      stemEn,
      stemCn: "",
      answer,
      explanationCn,
      explanationEn: ""
    }
  };
}

function parseMarkdown(text, chapterId) {
  const lines = text.split("\n");
  const blocks = [];
  let current = null;

  for (const line of lines) {
    if (isQuestionHeader(line)) {
      if (current) blocks.push(current);
      current = { header: line.trim(), lines: [] };
      continue;
    }
    if (current) current.lines.push(line);
  }
  if (current) blocks.push(current);

  const mcq = [];
  const tf = [];
  let mcqNo = 1;
  let tfNo = 1;

  for (const block of blocks) {
    const parsed = parseBlock(block, chapterId, mcqNo, tfNo);
    if (!parsed) continue;
    if (parsed.bucket === "mcq") {
      mcq.push(parsed.payload);
      mcqNo += 1;
    } else if (parsed.bucket === "tf") {
      tf.push(parsed.payload);
      tfNo += 1;
    }
  }

  return { mcq, tf };
}

async function removeOldCoaChapterFiles() {
  const names = await fs.readdir(CHAPTER_DIR);
  await Promise.all(
    names
      .filter((name) => /^coa-ch\d{2}-[a-z0-9-]+\.json$/i.test(name))
      .map((name) => fs.unlink(path.join(CHAPTER_DIR, name)))
  );
}

async function main() {
  const sourceFiles = (await fs.readdir(SOURCE_DIR))
    .filter((name) => name.endsWith(".md"))
    .sort((a, b) => extractChapterNumber(a) - extractChapterNumber(b));

  await removeOldCoaChapterFiles();

  for (const name of sourceFiles) {
    const chapterNo = extractChapterNumber(name);
    if (!chapterNo) continue;
    const chapterId = `ch${pad2(chapterNo)}`;
    const chapterName = path.basename(name, ".md");
    const markdown = await fs.readFile(path.join(SOURCE_DIR, name), "utf8");
    const { mcq, tf } = parseMarkdown(markdown, chapterId);

    const output = {
      subjectId: SUBJECT_ID,
      subjectName: SUBJECT_NAME,
      chapterId,
      chapterName,
      mcq,
      tf,
      terms: []
    };

    const filename = `${SUBJECT_ID}-${chapterId}-oa.json`;
    await fs.writeFile(path.join(CHAPTER_DIR, filename), `${JSON.stringify(output, null, 2)}\n`, "utf8");
    console.log(`${filename}: mcq=${mcq.length}, tf=${tf.length}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
