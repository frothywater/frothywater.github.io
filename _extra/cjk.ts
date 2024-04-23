import {
  Document,
  DOMParser,
  Element,
  Node,
} from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

export default function processCJK(content: string): string {
  const doc = new DOMParser().parseFromString(content, "text/html");
  if (!doc) return content;
  format(doc.body, doc);
  correctAmbiguousPunc(doc.body);
  return doc.body.innerHTML;
}

enum SegmentClass {
  cjk = "cjk",
  cjkPunc = "cjk-punc",
  fullwidthAlphabet = "fullwidth-alphabet",
  latin = "latin",
  kana = "kana",
  ambiguous = "ambiguous",
}

enum PuncClass {
  dot = "dot-punc",
  middle = "middle-punc",
  full = "full-punc",
  opening = "opening-punc",
  closing = "closing-punc",
  connector = "connector-punc",
}

type Segment = {
  content: string;
  segmentClass: SegmentClass;
};

const STOP_TAGS = ["BR", "RUBY", "PRE", "CODE", "IMG"];

// ambiguous: ([/–·]+)
// cjk-punc:  ([‼⁇-⁉、。〝〟！，：；？〈-】〔-〛（）]+|——|⋯⋯)
// fullwidth: ([Ａ-Ｚａ-ｚ]+)
// latin:     ([p{Script=Latin}0-9 -#%-+,-.:;?@[-]_{} ¡§«²³¶¹»-¿‐-‒‘’“”†‡…‧‰′-‷‹›‽-‾⁎⁗⁰⁴-⁹₀-₉⅐⅓⅔⅛-⅞Ⅰ-ⅿ⑴-⒛⸘⸮]+)
// kana:      ([ぁ-ゟ゠-ヺーヿ]+)
const SEGMENT_REGEX =
  /([\u002f\u2013\u00b7]+)|([\u203c\u2047-\u2049\u3001\u3002\u301d\u301f\uff01\uff0c\uff1a\uff1b\uff1f\u3008-\u3011\u3014-\u301B\uff08\uff09]+|——|⋯⋯)|([\uff21-\uff3a\uff41-\uff5a]+)|([\p{Script=Latin}0-9\u0020-\u0023\u0025-\u002b\u002c-\u002e\u003a\u003b\u003f\u0040\u005b-\u005d\u005f\u007b\u007d\u00a0\u00a1\u00a7\u00ab\u00b2\u00b3\u00b6\u00b9\u00bb-\u00bf\u2010-\u2012\u2018\u2019\u201c\u201d\u2020\u2021\u2026\u2027\u2030\u2032-\u2037\u2039\u203a\u203d-\u203e\u204e\u2057\u2070\u2074-\u2079\u2080-\u2089\u2150\u2153\u2154\u215b-\u215e\u2160-\u217f\u2474-\u249b\u2e18\u2e2e]+)|([\u3041-\u309f\u30a0-\u30fa\u30fc\u30ff]+)/gu;

// dot: ([。、！，：；？])
const DOT_PUNC_REGEX = /[\u3001\u3002\uff01\uff0c\uff1a\uff1b\uff1f]/;
// full: ([‼⁇-⁉])
const FULL_PUNC_REGEX = /[\u203c\u2047-\u2049]/;

// Format text node recursively
function format(node: Node, doc: Document, depth = 0) {
  if (node.nodeType === Node.TEXT_NODE) {
    // Handle text node
    let text = node.nodeValue;
    if (!text || text.trim() === "") return;
    text = normalizePunc(text);

    const segments = segmentize(text);

    const parent = node.parentElement!;
    segments.forEach((segment) => {
      insertSegment(parent, node, doc, segment);
    });
    parent.removeChild(node);

    return;
  }

  if (STOP_TAGS.includes(node.nodeName)) return;
  // Recursively format child nodes
  // Note: Array.from is used to avoid infinite loop
  Array.from(node.childNodes).forEach((childNode) => {
    format(childNode, doc, depth + 1);
  });
}

// Handle segment based on segment class
function insertSegment(
  parent: Element,
  currentNode: Node,
  doc: Document,
  segment: Segment,
) {
  const text = segment.content;
  if (text.trim() === "") return;

  if (segment.segmentClass === SegmentClass.cjkPunc) {
    if (text === "——" || text === "⋯⋯") {
      // CJK dash and ellipsis
      const span = doc.createElement("span") as unknown as Element;
      span.innerHTML = text;
      span.classList.add(SegmentClass.cjkPunc);
      parent.insertBefore(span, currentNode);
    } else {
      // CJK dot, whole, and brackets
      Array.from(text).forEach((punc) => {
        const span = doc.createElement("span") as unknown as Element;
        const puncClass = getPuncClass(punc);
        span.innerHTML = punc;
        span.classList.add(SegmentClass.cjkPunc, puncClass);
        parent.insertBefore(span, currentNode);
      });
    }
  } else {
    // Other segments
    const span = doc.createElement("span") as unknown as Element;
    // Override content to make sure it's normalized
    span.innerHTML = text;

    // Set lang attribute
    if (segment.segmentClass === SegmentClass.latin) {
      span.setAttribute("lang", "en");
      // Experimental: trim leading and trailing spaces
      span.innerHTML = text.trim();
    } else if (segment.segmentClass === SegmentClass.kana) {
      span.setAttribute("lang", "ja");
    }

    span.classList.add(segment.segmentClass);
    parent.insertBefore(span, currentNode);
  }
}

// Correct ambiguous punctuations: slash, dash, and ellipsis
function correctAmbiguousPunc(body: Element) {
  Array.from(body.getElementsByClassName(SegmentClass.ambiguous), (el) => {
    const text = el.innerHTML;
    if (!el.previousElementSibling || !el.nextElementSibling) {
      // Assume latin for single segment
      el.classList.add(SegmentClass.latin);
    } else if (
      el.previousElementSibling.classList.contains(SegmentClass.latin) &&
      el.nextElementSibling.classList.contains(SegmentClass.latin)
    ) {
      // Assume latin between latin segments
      el.classList.add(SegmentClass.latin);
    } else if (text === "/") {
      // CJK slash U+002F -> U+FF0F
      // Force full width slash
      el.innerHTML = "／";
      el.classList.add(SegmentClass.cjkPunc, PuncClass.connector);
    } else if (text === "–") {
      // CJK dash U+2013 -> U+2014
      // Force full width dash
      el.innerHTML = "—";
      el.classList.add(SegmentClass.cjkPunc, PuncClass.connector);
    } else if (text === "·") {
      // CJK middle dot U+00B7 -> U+30FB
      // Assume full width middle dot is not well supported
      el.innerHTML = "・";
      el.classList.add(SegmentClass.cjkPunc, PuncClass.middle);
    } else {
      // Assume latin for other ambiguous segments
      el.classList.add(SegmentClass.latin);
    }
    el.classList.remove(SegmentClass.ambiguous);
  });
}

function getPuncClass(punc: string): PuncClass {
  if (DOT_PUNC_REGEX.test(punc)) return PuncClass.dot;
  if (FULL_PUNC_REGEX.test(punc)) return PuncClass.full;
  // Brackets
  const isOpeningBracket = punc === "\u301d" || punc.charCodeAt(0) % 2 === 0;
  return isOpeningBracket ? PuncClass.opening : PuncClass.closing;
}

// Normalize punctuations
function normalizePunc(text: string): string {
  return text
    // Go evil with Apple Inc.
    .replace(/……/g, "⋯⋯")
    .replace(/！！|\!\!/g, "‼")
    .replace(/？？|\?\?/g, "⁇")
    .replace(/？！|\?\!/g, "⁈")
    .replace(/！？|\!\?/g, "⁉");
}

function segmentize(str: string): Segment[] {
  const segments: Segment[] = [];
  let index = 0;
  let match: RegExpExecArray | null;
  while ((match = SEGMENT_REGEX.exec(str)) !== null) {
    // Push previous segment
    if (index < match.index) {
      segments.push({
        content: str.slice(index, match.index),
        segmentClass: SegmentClass.cjk,
      });
    }

    let segmentClass: SegmentClass;
    if (match[1]) {
      segmentClass = SegmentClass.ambiguous;
    } else if (match[2]) {
      segmentClass = SegmentClass.cjkPunc;
    } else if (match[3]) {
      segmentClass = SegmentClass.fullwidthAlphabet;
    } else if (match[4]) {
      segmentClass = SegmentClass.latin;
    } else if (match[5]) {
      segmentClass = SegmentClass.kana;
    } else {
      segmentClass = SegmentClass.cjk;
    }

    // Push current segment
    segments.push({
      content: match[0],
      segmentClass,
    });

    index = match.index + match[0].length;
  }

  // Push remaining segment
  if (index < str.length) {
    segments.push({
      content: str.slice(index),
      segmentClass: SegmentClass.cjk,
    });
  }

  return segments;
}
