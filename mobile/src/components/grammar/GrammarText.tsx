import { Fragment, type ReactNode } from "react";
import { Text as RNText, View, type TextStyle } from "react-native";
import { Text } from "@/components/Text";
import { C, alpha } from "@/lib/theme";

type CaseTag = "nom" | "akk" | "dat" | "gen";

function caseColor(tag: CaseTag): string {
  if (tag === "nom") return C.okText;
  if (tag === "akk") return C.grapeText;
  if (tag === "dat") return C.redText;
  return C.amber;
}

function caseBg(tag: CaseTag): string {
  if (tag === "nom") return C.okSoft;
  if (tag === "akk") return C.grapeSoft;
  if (tag === "dat") return C.redSoft;
  return C.goldSoft;
}

const CASE_META: { id: CaseTag; label: string; question: string }[] = [
  { id: "nom", label: "Nominativ", question: "Wer? / Was?" },
  { id: "akk", label: "Akkusativ", question: "Wen? / Was?" },
  { id: "dat", label: "Dativ", question: "Wem?" },
  { id: "gen", label: "Genitiv", question: "Wessen?" },
];

function findClosingBrace(text: string, openIndex: number): number {
  let depth = 0;
  for (let i = openIndex; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function parseInline(text: string, keyPrefix: string, inCase = false): ReactNode[] {
  const nodes: ReactNode[] = [];
  let i = 0;
  let buf = "";
  let keyCounter = 0;

  const flush = () => {
    if (buf) {
      nodes.push(<Fragment key={`${keyPrefix}-t-${keyCounter++}`}>{buf}</Fragment>);
      buf = "";
    }
  };

  while (i < text.length) {
    if (text[i] === "{") {
      const m = text.slice(i).match(/^\{(nom|akk|dat|gen):/);
      if (m) {
        const closeIdx = findClosingBrace(text, i);
        if (closeIdx !== -1) {
          flush();
          const tag = m[1] as CaseTag;
          const inner = text.slice(i + m[0].length, closeIdx);
          const k = `${keyPrefix}-c-${keyCounter++}`;
          nodes.push(
            <RNText key={k} style={{ color: caseColor(tag), fontWeight: "700" }}>
              {parseInline(inner, k, true)}
            </RNText>,
          );
          i = closeIdx + 1;
          continue;
        }
      }
    }

    if (text[i] === "*" && text[i + 1] === "*") {
      const end = text.indexOf("**", i + 2);
      if (end !== -1 && end > i + 2) {
        flush();
        const inner = text.slice(i + 2, end);
        const k = `${keyPrefix}-b-${keyCounter++}`;
        nodes.push(
          <RNText key={k} style={inCase ? { fontWeight: "700" } : { fontWeight: "700", color: C.text }}>
            {parseInline(inner, k, inCase)}
          </RNText>,
        );
        i = end + 2;
        continue;
      }
    }

    if (text[i] === "*" && text[i + 1] !== "*" && text[i + 1] !== " ") {
      let end = -1;
      let inBold = false;
      for (let j = i + 1; j < text.length; j++) {
        if (text[j] === "*" && text[j + 1] === "*") {
          if (inBold && text[j + 2] === "*") {
            end = j + 2;
            break;
          }
          inBold = !inBold;
          j++;
          continue;
        }
        if (text[j] === "*" && !inBold && text[j - 1] !== " ") {
          end = j;
          break;
        }
      }
      if (end !== -1 && end > i + 1) {
        flush();
        const inner = text.slice(i + 1, end);
        const k = `${keyPrefix}-i-${keyCounter++}`;
        nodes.push(
          <RNText key={k} style={{ fontStyle: "italic" }}>
            {parseInline(inner, k, inCase)}
          </RNText>,
        );
        i = end + 1;
        continue;
      }
    }

    buf += text[i];
    i++;
  }

  flush();
  return nodes;
}

/**
 * Hiển thị chuỗi ngữ pháp hỗ trợ thẻ màu 4 cách ({nom:...}, {akk:...}, {dat:...}, {gen:...}), **đậm**, *nghiêng*.
 */
export function GrammarText({ text, style }: { text: string; style?: TextStyle }) {
  const lines = text.split("\n");
  return (
    <Text style={style}>
      {lines.map((line, idx) => (
        <Fragment key={idx}>
          {idx > 0 && "\n"}
          {parseInline(line, `l${idx}`)}
        </Fragment>
      ))}
    </Text>
  );
}

/** Chú giải màu 4 Cách (Nominativ · Akkusativ · Dativ · Genitiv) */
export function CaseLegend() {
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 6,
        padding: 10,
        borderRadius: 12,
        backgroundColor: C.card2,
        borderWidth: 1,
        borderColor: C.line,
      }}
    >
      {CASE_META.map((c) => {
        const fg = caseColor(c.id);
        return (
          <View
            key={c.id}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              paddingHorizontal: 9,
              paddingVertical: 4,
              borderRadius: 999,
              backgroundColor: caseBg(c.id),
              borderWidth: 1,
              borderColor: alpha(fg, 0.35),
            }}
          >
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: fg }} />
            <Text style={{ color: fg, fontSize: 12, fontWeight: "700" }}>{c.label}</Text>
            <Text style={{ color: fg, fontSize: 11, opacity: 0.8 }}>({c.question})</Text>
          </View>
        );
      })}
    </View>
  );
}
