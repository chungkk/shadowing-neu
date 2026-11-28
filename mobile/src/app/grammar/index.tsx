import { useMemo, useRef, useState, type ComponentRef } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Stack, router, type Href } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { SymbolView } from "expo-symbols";
import { CaseLegend } from "@/components/grammar/GrammarText";
import { Text } from "@/components/Text";
import { Button, Card, Input, LevelBadge, PageHeader, styles } from "@/components/ui";
import {
  ALL_GRAMMAR_LESSONS,
  GRAMMAR_CATEGORIES,
  GRAMMAR_LEVELS,
  useGrammarDone,
  type GrammarLevel,
} from "@/lib/grammar";
import { haptic } from "@/lib/haptics";
import { useI18n } from "@/lib/i18n";
import { CONTENT_MAX, useLayout } from "@/lib/layout";
import { C, R, SEC, STICKER, alpha } from "@/lib/theme";

function normalizeVi(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ß/g, "ss");
}

type StatusFilter = "all" | "todo" | "done";

/** Danh mục Ngữ pháp tiếng Đức A1–B2 (9 chương · 58 bài, học offline) */
export default function GrammarCatalogScreen() {
  const { t } = useI18n();
  const { tablet } = useLayout();
  const headerHeight = useHeaderHeight();
  const { doneSlugs } = useGrammarDone();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const catOffsets = useRef<Record<string, number>>({});

  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<GrammarLevel | "ALL">("ALL");
  const [status, setStatus] = useState<StatusFilter>("all");

  const doneSet = useMemo(() => new Set(doneSlugs), [doneSlugs]);
  const total = ALL_GRAMMAR_LESSONS.length;
  const completedCount = useMemo(
    () => ALL_GRAMMAR_LESSONS.filter((l) => doneSet.has(l.slug)).length,
    [doneSet],
  );
  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;
  const nextLesson = useMemo(
    () => ALL_GRAMMAR_LESSONS.find((l) => !doneSet.has(l.slug)) ?? ALL_GRAMMAR_LESSONS[0],
    [doneSet],
  );

  const catMap = useMemo(() => new Map(GRAMMAR_CATEGORIES.map((c) => [c.id, c])), []);

  const filtered = useMemo(() => {
    const q = normalizeVi(query.trim());
    return ALL_GRAMMAR_LESSONS.filter((l) => {
      if (level !== "ALL" && l.level !== level) return false;
      const done = doneSet.has(l.slug);
      if (status === "done" && !done) return false;
      if (status === "todo" && done) return false;
      if (!q) return true;
      const cat = catMap.get(l.categoryId);
      const hay = normalizeVi(`${l.code} ${l.title} ${l.germanTitle} ${l.summary} ${cat?.title ?? ""} ${cat?.germanTitle ?? ""}`);
      return hay.includes(q);
    });
  }, [query, level, status, doneSet, catMap]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof ALL_GRAMMAR_LESSONS>();
    for (const l of filtered) {
      const arr = map.get(l.categoryId);
      if (arr) arr.push(l);
      else map.set(l.categoryId, [l]);
    }
    return GRAMMAR_CATEGORIES.map((cat) => ({
      cat,
      items: map.get(cat.id) ?? [],
      totalInCat: ALL_GRAMMAR_LESSONS.filter((l) => l.categoryId === cat.id).length,
      doneInCat: ALL_GRAMMAR_LESSONS.filter((l) => l.categoryId === cat.id && doneSet.has(l.slug)).length,
    })).filter((g) => g.items.length > 0);
  }, [filtered, doneSet]);

  const sec = SEC.de;

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        padding: tablet ? 24 : 16,
        paddingBottom: 60,
        gap: 16,
        width: "100%",
        maxWidth: CONTENT_MAX,
        alignSelf: "center",
      }}
    >
      <Stack.Screen options={{ title: t("grammar.title") }} />

      <PageHeader sec="de" icon="book.closed.fill" title={t("grammar.title")} sub={t("grammar.subtitle", { n: total })} />

      {/* Tiến độ tổng & nút tiếp tục */}
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: C.text, fontSize: 15, fontWeight: "700" }}>
            {t("grammar.progress", { done: completedCount, total, pct })}
          </Text>
          <Text style={{ color: sec.secText, fontSize: 14, fontWeight: "800", fontVariant: ["tabular-nums"] }}>
            {pct}%
          </Text>
        </View>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: C.card2, overflow: "hidden" }}>
          <View style={{ height: "100%", width: `${pct}%`, backgroundColor: C.ok }} />
        </View>
        {nextLesson && (
          <Button
            title={`${completedCount > 0 ? t("grammar.continue") : t("grammar.start")}: ${nextLesson.code} · ${nextLesson.title}`}
            variant="primary"
            onPress={() => router.push(`/grammar/${nextLesson.slug}` as Href)}
            icon={<SymbolView name="arrow.right.circle.fill" size={16} tintColor="#fff" />}
          />
        )}
      </Card>

      {/* Tìm kiếm & Lọc */}
      <View style={{ gap: 10 }}>
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder={t("grammar.searchPlaceholder")}
          clearButtonMode="while-editing"
          returnKeyType="search"
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {(["ALL", ...GRAMMAR_LEVELS] as const).map((lv) => {
            const on = level === lv;
            return (
              <Pressable
                key={lv}
                onPress={() => {
                  haptic.select();
                  setLevel(lv);
                }}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 999,
                  borderWidth: 1,
                  backgroundColor: on ? sec.secSoft : C.card,
                  borderColor: on ? sec.sec : C.line,
                }}
              >
                <Text style={{ color: on ? sec.secText : C.text, fontSize: 13, fontWeight: "700" }}>
                  {lv === "ALL" ? t("lessons.all") : lv}
                </Text>
              </Pressable>
            );
          })}

          {(
            [
              ["all", t("grammar.filterAll")],
              ["todo", t("grammar.filterTodo")],
              ["done", t("grammar.filterDone")],
            ] as const
          ).map(([st, label]) => {
            const on = status === st;
            return (
              <Pressable
                key={st}
                onPress={() => {
                  haptic.select();
                  setStatus(st);
                }}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 999,
                  borderWidth: 1,
                  backgroundColor: on ? C.goldSoft : C.card,
                  borderColor: on ? C.goldDark : C.line,
                }}
              >
                <Text style={{ color: on ? C.amber : C.muted, fontSize: 13, fontWeight: "700" }}>{label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <CaseLegend />

      {/* Thanh nhảy nhanh theo chương */}
      {grouped.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {grouped.map(({ cat }) => (
            <Pressable
              key={cat.id}
              onPress={() => {
                haptic.tap();
                const y = catOffsets.current[cat.id];
                if (typeof y === "number") scrollRef.current?.scrollTo({ y: Math.max(-headerHeight, y - headerHeight - 12), animated: true });
              }}
              style={{
                paddingHorizontal: 11,
                paddingVertical: 6,
                borderRadius: 10,
                backgroundColor: C.card,
                borderWidth: 1,
                borderColor: C.line,
              }}
            >
              <Text style={{ color: C.text, fontSize: 12, fontWeight: "700" }}>
                {cat.order}. {cat.title}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Danh sách theo 9 chương */}
      {grouped.length === 0 ? (
        <Card style={{ alignItems: "center", gap: 12, paddingVertical: 28 }}>
          <Text style={{ color: C.muted, fontSize: 14 }}>{t("grammar.empty")}</Text>
          {(query.trim() !== "" || status !== "all" || level !== "ALL") && (
            <Button
              title={t("grammar.resetFilter")}
              onPress={() => {
                setQuery("");
                setStatus("all");
                setLevel("ALL");
              }}
            />
          )}
        </Card>
      ) : (
        grouped.map(({ cat, items, doneInCat, totalInCat }) => (
          <View
            key={cat.id}
            onLayout={(e) => {
              catOffsets.current[cat.id] = e.nativeEvent.layout.y;
            }}
            style={{ gap: 8 }}
          >
            <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingHorizontal: 2 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontSize: 17, fontWeight: "800" }}>
                  {cat.order}. {cat.title}
                </Text>
                <Text style={{ color: C.muted, fontSize: 12 }}>
                  {cat.germanTitle} · {cat.levelRange}
                </Text>
              </View>
              <Text style={{ color: C.muted, fontSize: 12, fontWeight: "700", fontVariant: ["tabular-nums"] }}>
                {doneInCat}/{totalInCat}
              </Text>
            </View>

            <View style={{ backgroundColor: C.card, borderRadius: R.lg, ...STICKER, overflow: "hidden" }}>
              {items.map((l, idx) => {
                const done = doneSet.has(l.slug);
                return (
                  <Pressable
                    key={l.slug}
                    onPress={() => {
                      haptic.tap();
                      router.push(`/grammar/${l.slug}` as Href);
                    }}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      padding: 14,
                      backgroundColor: pressed ? C.card2 : "transparent",
                      borderTopWidth: idx === 0 ? 0 : 1,
                      borderTopColor: C.line,
                    })}
                  >
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: done ? C.okSoft : C.card2,
                        borderWidth: 1,
                        borderColor: done ? alpha(C.ok, 0.4) : C.line,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {done ? (
                        <SymbolView name="checkmark" size={13} tintColor={C.okText} weight="bold" />
                      ) : (
                        <Text style={{ color: C.muted, fontSize: 11, fontWeight: "800" }}>{l.code}</Text>
                      )}
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <LevelBadge level={l.level} />
                        <Text style={{ color: C.text, fontSize: 15, fontWeight: "700", flex: 1 }} numberOfLines={1}>
                          {l.title}
                        </Text>
                      </View>
                      <Text style={{ color: C.muted, fontSize: 12 }} numberOfLines={2}>
                        {l.germanTitle} — {l.summary}
                      </Text>
                    </View>
                    <SymbolView name="chevron.right" size={13} tintColor={C.muted} weight="semibold" />
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}
