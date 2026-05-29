# OS & COA 英文刷题网页（本地文件驱动）

你只需要维护本地 JSON 文件，不需要在网页里手动加题。

## 固定目录

选择题/判断题章节文件放在：
- `data/chapters/`

名词解释科目文件放在：
- `data/terms/`

## 固定命名规范

选择题每章一个文件，文件名必须符合：
- `os-chNN-xxx.json`
- `coa-chNN-xxx.json`

说明：
- `os` = 操作系统
- `coa` = 计算机组成
- `NN` = 两位章节号，例如 `01`、`02`
- `xxx` = 你自定义英文短名（小写+连字符）

示例：
- `os-ch01-process-thread.json`
- `coa-ch03-cache-memory.json`

名词解释每科一个文件，文件名固定为：
- `os-terms.json`
- `coa-terms.json`

## 题目章节 JSON 模板

```json
{
  "subjectId": "os",
  "subjectName": "Operating Systems",
  "chapterId": "ch01",
  "chapterName": "Process & Thread",
  "mcq": [
    {
      "id": "os-ch01-001",
      "stemEn": "Question in English",
      "stemCn": "中文题干",
      "options": [
        { "key": "A", "textEn": "Option A", "textCn": "选项A" },
        { "key": "B", "textEn": "Option B", "textCn": "选项B" },
        { "key": "C", "textEn": "Option C", "textCn": "选项C" },
        { "key": "D", "textEn": "Option D", "textCn": "选项D" }
      ],
      "answerKey": "B",
      "explanationCn": "中文解析"
    }
  ],
  "tf": [
    {
      "id": "os-ch01-tf-001",
      "stemEn": "An operating system manages computer resources.",
      "stemCn": "操作系统负责管理计算机资源。",
      "answer": "T",
      "explanationCn": "操作系统的核心任务之一就是统一管理计算机硬件与软件资源。",
      "explanationEn": ""
    }
  ],
  "terms": []
}
```

## 名词解释科目 JSON 模板

```json
{
  "subjectId": "os",
  "subjectName": "Operating Systems",
  "terms": [
    {
      "id": "os-term-001",
      "termEn": "Semaphore",
      "termCn": "信号量",
      "definitionCn": "中文概念解析",
      "definitionEn": ""
    }
  ]
}
```

## 题干内带选项（可选）

如果你不想单独写 `options`，也可以把选项写进题干：
- `stemWithOptionsEn` 支持如下格式：
  - `A. ...`
  - `B. ...`
  - `C. ...`
  - `D. ...`

系统会自动拆分选项。

## 每次新增题库后的流程

在项目根目录执行：

```bash
npm run build:bank
```

然后启动网页：

```bash
npm run serve
```

打开：
- [http://localhost:8080](http://localhost:8080)

## 现有示例文件

- `data/chapters/os-ch01-process-thread.json`
- `data/chapters/coa-ch01-data-representation.json`
- `data/terms/os-terms.json`
- `data/terms/coa-terms.json`
