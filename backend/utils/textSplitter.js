import { RecursiveCharacterTextSplitter, MarkdownTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";

const DEFAULT_SEPARATORS = [
  "\n### ",
  "\n## ",
  "\n# ",
  "\n\n",
  ". ",
  " ",
  "",
];

const MARKDOWN_HEADING_REGEX = /(^|\n)#{1,6}\s+.+/;
const NUMBERED_HEADING_REGEX = /^(\d+[\.)]|[A-Z][\.)])\s+.+/;
const BULLET_HEADING_REGEX = /^[-*•]\s+.+/;
const UPPERCASE_HEADING_REGEX = /^[A-ZÁÉÍÓÚÜÑ0-9][A-ZÁÉÍÓÚÜÑ0-9\s,:;()'"-]{3,}$/;

/**
 * @typedef {Object} StructuredChunk
 * @property {string} id - Stable identifier for the chunk.
 * @property {string} content - Chunk text trimmed and ready for embedding.
 * @property {Record<string, any>} metadata - Rich metadata including inferred headings.
 */

/**
 * Decide whether the text likely contains markdown/structured headings.
 * @param {string} text
 * @returns {boolean}
 */
function hasStructuredHeadings(text) {
  return MARKDOWN_HEADING_REGEX.test(text) || NUMBERED_HEADING_REGEX.test(text);
}

function sanitiseHeading(rawHeading) {
  if (!rawHeading) return null;
  return rawHeading
    .replace(/^#{1,6}\s*/, "")
    .replace(/^\d+[\.)]\s*/, "")
    .replace(/^[-*•]\s*/, "")
    .trim() || null;
}

function isHeadingCandidate(line) {
  if (!line) return false;
  if (line.length > 160) return false;
  const trimmed = line.trim();
  return (
    MARKDOWN_HEADING_REGEX.test(`\n${trimmed}`) ||
    NUMBERED_HEADING_REGEX.test(trimmed) ||
    BULLET_HEADING_REGEX.test(trimmed) ||
    UPPERCASE_HEADING_REGEX.test(trimmed)
  );
}

function collectHeadings(lines) {
  const headings = new Map();
  lines.forEach((line, index) => {
    if (isHeadingCandidate(line)) {
      const normalised = sanitiseHeading(line);
      if (normalised) headings.set(index, normalised);
    }
  });
  return headings;
}

function inferHeadingFromContent(content) {
  const lines = content.split("\n").map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    if (isHeadingCandidate(line)) {
      return sanitiseHeading(line);
    }
    if (line.length <= 90) {
      return line;
    }
  }
  return null;
}

function findNearestHeading(startLine, headingsMap) {
  if (startLine == null) return null;
  for (let index = startLine; index >= 0; index -= 1) {
    if (headingsMap.has(index)) {
      return headingsMap.get(index);
    }
  }
  return null;
}

/**
 * Split incoming text into richly annotated LangChain documents.
 * @param {string} rawText
 * @param {object} [options]
 * @param {number} [options.chunkSize]
 * @param {number} [options.chunkOverlap]
 * @param {Record<string, any>} [options.metadata]
 * @param {string[]} [options.separators]
 * @returns {Promise<StructuredChunk[]>}
 */
export async function splitText(
  rawText,
  { chunkSize = 1200, chunkOverlap = Math.round(chunkSize * 0.15), metadata = {}, separators } = {},
) {
  const text = (rawText ?? "").replace(/\r\n/g, "\n").trim();
  if (!text) {
    return [];
  }

  const lines = text.split("\n");
  const headingsMap = collectHeadings(lines);

  const baseDocument = new Document({
    pageContent: text,
    metadata: {
      ...metadata,
      originalLength: text.length,
    },
  });

  const documentsToSplit = [];
  const useMarkdownStrategy = hasStructuredHeadings(text);

  if (useMarkdownStrategy) {
    const markdownSplitter = new MarkdownTextSplitter({
      chunkSize: Math.min(chunkSize * 2, 2000),
      chunkOverlap: Math.min(chunkOverlap, 200),
    });
    const markdownDocuments = await markdownSplitter.splitDocuments([baseDocument]);
    documentsToSplit.push(...markdownDocuments);
  } else {
    documentsToSplit.push(baseDocument);
  }

  const recursiveSplitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    separators: separators ?? DEFAULT_SEPARATORS,
    addStartIndex: true,
  });

  const splitDocuments = await recursiveSplitter.splitDocuments(documentsToSplit);

  const totalChunks = splitDocuments.length;

  return splitDocuments
    .map((doc, index) => {
      const cleanedContent = doc.pageContent.trim();
      if (!cleanedContent) return null;

      const startLine = doc.metadata?.loc?.lines?.from;
      const inferredHeading =
        doc.metadata?.heading ||
        doc.metadata?.title ||
        findNearestHeading(startLine, headingsMap) ||
        inferHeadingFromContent(cleanedContent);

      return {
        id: `${metadata?.sourceId || metadata?.source || "chunk"}-${index + 1}`,
        content: cleanedContent,
        metadata: {
          ...metadata,
          ...doc.metadata,
          heading: inferredHeading,
          chunkIndex: index,
          totalChunks,
          length: cleanedContent.length,
        },
      };
    })
    .filter(Boolean);
}

export default splitText;