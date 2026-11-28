import { useEffect, useRef, useState, type ComponentRef } from "react";
import { Pressable, ScrollView, Share, View } from "react-native";
import { Stack, router, useLocalSearchParams, type Href } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { SymbolView } from "expo-symbols";
import { CaseLegend, GrammarText } from "@/components/grammar/GrammarText";
import { Text } from "@/components/Text";
import { Button, Card, LevelBadge, styles } from "@/components/ui";
import {
  getAdjacentLessons,
  getGrammarCategory,
  getGrammarLesson,
  stripGrammarMarkup,
  useGrammarDone,
  type GrammarBlock,
} from "@/lib/grammar";
import { haptic } from "@/lib/haptics";
import { useI18n } from "@/lib/i18n";
import { CONTENT_MAX, useLayout } from "@/lib/layout";
import { speakGerman, stopSpeaking } from "@/lib/speak";
import { C, R, STICKER, alpha } from "@/lib/theme";

/** Màn học chi tiết 1 bài Ngữ pháp (8 loại block + phát âm ví dụ + quiz tương tác) */
export default function GrammarLessonScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t } = useI18n();
  const { tablet } = useLayout();
  const headerHeight = useHeaderHeight();
  const { isDone, markDone, toggleDone } = useGrammarDone();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const sectionOffsets = useRef<Record<string, number>>({});

  const lesson = slug ? getGrammarLesson(slug) : undefined;
  const category = lesson ? getGrammarCategory(lesson.categoryId) : undefined;
  const { prev, next } = lesson ? getAdjacentLessons(lesson.slug) : { prev: null, next: null };

  const [curSlug, setCurSlug] = useState(slug);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  if (curSlug !== slug) {
    setCurSlug(slug);
    setAnswers({});
    setQuizSubmitted(false);
    setPlayingKey(null);
  }

  useEffect(() => {
    sectionOffsets.current = {};
    scrollRef.current?.scrollTo({ y: -headerHeight, animated: false });
    return () => {
      void stopSpeaking();
    };
  }, [slug, headerHeight]);

  const onSpeak = (key: string, text: string, slow = false) => {
    haptic.tap();
    if (playingKey === key) {
      setPlayingKey(null);
      void stopSpeaking();
      return;
    }
    setPlayingKey(key);
    void speakGerman(text, {
      slow,
      onEnd: () => setPlayingKey((cur) => (cur === key ? null : cur)),
    });
  };

  if (!lesson) {
    return (
      <View style={[styles.screen, { alignItems: "center", justifyContent: "center", padding: 24, gap: 12 }]}>
        <Stack.Screen options={{ title: t("grammar.title") }} />
        <Text style={{ color: C.muted, fontSize: 16 }}>{t("grammar.notFound")}</Text>
        <Button title={t("close")} onPress={() => router.back()} />
      </View>
    );
  }

  const done = isDone(lesson.slug);
  const quizCorrect = lesson.quiz.filter((q, i) => answers[i] === q.answer).length;
  const allAnswered = lesson.quiz.length > 0 && lesson.quiz.every((_, i) => answers[i] !== undefined);

  const shareLesson = () => {
    void Share.share({
      title: lesson.title,
      url: `https://hallovn.de/ngu-phap/${lesson.slug}`,
      message: `${lesson.title} (${lesson.germanTitle})\nhttps://hallovn.de/ngu-phap/${lesson.slug}`,
    }).catch(() => {});
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        padding: tablet ? 24 : 16,
        paddingBottom: 60,
        gap: 16,
        width: "100%",
        maxWidth: CONTENT_MAX,
        alignSelf: "center",
      }}
    >
      <Stack.Screen
        options={{
          title: `${lesson.code} · ${lesson.title}`,
          headerRight: () => (
            <Pressable onPress={shareLesson} hitSlop={8} style={{ padding: 6 }}>
              <SymbolView name="square.and.arrow.up" size={20} tintColor={C.link} weight="semibold" />
            </Pressable>
          ),
        }}
      />

      {/* Header bài học */}
      <Card>
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 }}>
            <LevelBadge level={lesson.level} />
            <Text style={{ color: C.muted, fontSize: 12, fontWeight: "700", flexShrink: 1 }}>
              {category?.title} · {lesson.code}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              haptic.select();
              toggleDone(lesson.slug);
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 999,
              backgroundColor: done ? C.okSoft : C.card2,
              borderWidth: 1,
              borderColor: done ? alpha(C.ok, 0.4) : C.line,
            }}
          >
            <SymbolView name={done ? "checkmark.circle.fill" : "circle"} size={14} tintColor={done ? C.okText : C.muted} />
            <Text style={{ color: done ? C.okText : C.muted, fontSize: 12, fontWeight: "700" }}>
              {done ? t("grammar.done") : t("grammar.markDone")}
            </Text>
          </Pressable>
        </View>

        <Text style={{ color: C.text, fontSize: 22, fontWeight: "800", lineHeight: 29 }}>{lesson.title}</Text>
        <Text style={{ color: C.accentText, fontSize: 14, fontWeight: "600" }}>{lesson.germanTitle}</Text>
        <Text style={{ color: C.muted, fontSize: 14, lineHeight: 20 }}>{lesson.summary}</Text>
      </Card>

      <CaseLegend />

      {/* Mục lục nhảy nhanh */}
      {(lesson.sections.length > 1 || lesson.quiz.length > 0) && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {lesson.sections.map((secItem, i) => (
            <Pressable
              key={secItem.id}
              onPress={() => {
                const y = sectionOffsets.current[secItem.id];
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
                {i + 1}. {secItem.heading}
              </Text>
            </Pressable>
          ))}
          {lesson.quiz.length > 0 && (
            <Pressable
              onPress={() => {
                const y = sectionOffsets.current.__quiz;
                if (typeof y === "number") scrollRef.current?.scrollTo({ y: Math.max(-headerHeight, y - headerHeight - 12), animated: true });
              }}
              style={{
                paddingHorizontal: 11,
                paddingVertical: 6,
                borderRadius: 10,
                backgroundColor: C.accentSoft,
                borderWidth: 1,
                borderColor: alpha(C.accent, 0.3),
              }}
            >
              <Text style={{ color: C.accentText, fontSize: 12, fontWeight: "700" }}>
                {t("grammar.quizChip", { n: lesson.quiz.length })}
              </Text>
            </Pressable>
          )}
        </ScrollView>
      )}

      {/* Các phần nội dung */}
      {lesson.sections.map((secItem, sIdx) => (
        <View
          key={secItem.id}
          onLayout={(e) => {
            sectionOffsets.current[secItem.id] = e.nativeEvent.layout.y;
          }}
          style={{ gap: 10 }}
        >
          <Text style={{ color: C.text, fontSize: 18, fontWeight: "800" }}>
            {sIdx + 1}. {secItem.heading}
          </Text>
          {secItem.blocks.map((block, bIdx) => (
            <BlockView
              key={`${secItem.id}-${bIdx}`}
              block={block}
              blockKey={`${secItem.id}-${bIdx}`}
              playingKey={playingKey}
              onSpeak={onSpeak}
            />
          ))}
        </View>
      ))}

      {/* Điểm cần nhớ */}
      {lesson.keyPoints.length > 0 && (
        <Card style={{ backgroundColor: C.accentSoft, borderColor: alpha(C.accent, 0.35) }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <SymbolView name="pin.fill" size={15} tintColor={C.accentText} />
            <Text style={{ color: C.accentText, fontSize: 15, fontWeight: "800" }}>{t("grammar.keyPoints")}</Text>
          </View>
          {lesson.keyPoints.map((kp, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
              <Text style={{ color: C.accentText, fontWeight: "800" }}>•</Text>
              <GrammarText text={kp} style={{ color: C.text, fontSize: 14, lineHeight: 20, flex: 1 }} />
            </View>
          ))}
        </Card>
      )}

      {/* Quiz luyện tập cuối bài */}
      {lesson.quiz.length > 0 && (
        <View
          onLayout={(e) => {
            sectionOffsets.current.__quiz = e.nativeEvent.layout.y;
          }}
        >
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ color: C.text, fontSize: 17, fontWeight: "800" }}>
              {t("grammar.quizTitle")} ({lesson.quiz.length})
            </Text>
            {quizSubmitted && (
              <Text style={{ color: quizCorrect === lesson.quiz.length ? C.okText : C.amber, fontWeight: "800" }}>
                {quizCorrect}/{lesson.quiz.length}
              </Text>
            )}
          </View>

          {lesson.quiz.map((q, qIdx) => {
            const picked = answers[qIdx];
            return (
              <View key={qIdx} style={{ gap: 8, paddingTop: 8, borderTopWidth: qIdx === 0 ? 0 : 1, borderTopColor: C.line }}>
                <GrammarText text={`${qIdx + 1}. ${q.question}`} style={{ color: C.text, fontSize: 15, fontWeight: "700", lineHeight: 21 }} />
                <View style={{ gap: 6 }}>
                  {q.options.map((opt, oIdx) => {
                    const isPicked = picked === oIdx;
                    const isCorrect = oIdx === q.answer;
                    const bg = quizSubmitted
                      ? isCorrect
                        ? C.okSoft
                        : isPicked
                          ? C.redSoft
                          : C.card2
                      : isPicked
                        ? C.accentSoft
                        : C.card2;
                    const border = quizSubmitted
                      ? isCorrect
                        ? C.ok
                        : isPicked
                          ? C.red
                          : C.line
                      : isPicked
                        ? C.accent
                        : C.line;
                    return (
                      <Pressable
                        key={oIdx}
                        disabled={quizSubmitted}
                        onPress={() => {
                          haptic.select();
                          setAnswers((prevAns) => ({ ...prevAns, [qIdx]: oIdx }));
                        }}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          borderRadius: 10,
                          borderWidth: 1,
                          backgroundColor: bg,
                          borderColor: border,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                        }}
                      >
                        <GrammarText text={opt} style={{ color: C.text, fontSize: 14, flex: 1 }} />
                        {quizSubmitted && (isCorrect || isPicked) && (
                          <SymbolView
                            name={isCorrect ? "checkmark.circle.fill" : "xmark.circle.fill"}
                            size={16}
                            tintColor={isCorrect ? C.okText : C.redText}
                          />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
                {quizSubmitted && (
                  <View style={{ padding: 10, borderRadius: 10, backgroundColor: C.goldSoft }}>
                    <GrammarText text={q.explanation} style={{ color: C.text, fontSize: 13, lineHeight: 19 }} />
                  </View>
                )}
              </View>
            );
          })}

          {!quizSubmitted ? (
            <Button
              title={t("grammar.quizCheck")}
              variant="primary"
              disabled={!allAnswered}
              onPress={() => {
                haptic.success();
                setQuizSubmitted(true);
                if (quizCorrect >= Math.ceil(lesson.quiz.length * 0.7)) {
                  markDone(lesson.slug);
                }
              }}
            />
          ) : (
            <Button
              title={t("grammar.quizRetry")}
              onPress={() => {
                setAnswers({});
                setQuizSubmitted(false);
              }}
            />
          )}
        </Card>
        </View>
      )}

      <Button
        title={done ? `✓ ${t("grammar.done")}` : t("grammar.markDone")}
        variant={done ? "plain" : "soft"}
        onPress={() => {
          haptic.tap();
          toggleDone(lesson.slug);
        }}
      />

      {/* Điều hướng Bài trước / Bài sau */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        {prev ? (
          <Button
            title={`← ${prev.code}`}
            onPress={() => router.replace(`/grammar/${prev.slug}` as Href)}
            style={{ flex: 1 }}
          />
        ) : (
          <View style={{ flex: 1 }} />
        )}
        {next ? (
          <Button
            title={`${next.code} →`}
            variant="primary"
            onPress={() => router.replace(`/grammar/${next.slug}` as Href)}
            style={{ flex: 1 }}
          />
        ) : (
          <Button
            title={t("grammar.backToCatalog")}
            variant="primary"
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/grammar" as Href))}
            style={{ flex: 1 }}
          />
        )}
      </View>
    </ScrollView>
  );
}

function BlockView({
  block,
  blockKey,
  playingKey,
  onSpeak,
}: {
  block: GrammarBlock;
  blockKey: string;
  playingKey: string | null;
  onSpeak: (key: string, text: string, slow?: boolean) => void;
}) {
  switch (block.type) {
    case "text":
      return <GrammarText text={block.content} style={{ color: C.text, fontSize: 15, lineHeight: 22 }} />;

    case "rule":
      return (
        <View style={{ borderRadius: R.lg, borderWidth: 1, borderColor: alpha(C.accent, 0.4), backgroundColor: C.accentSoft, padding: 14, gap: 6 }}>
          <Text style={{ color: C.accentText, fontSize: 12, fontWeight: "800", textTransform: "uppercase" }}>{block.title}</Text>
          <GrammarText text={block.formula} style={{ color: C.text, fontSize: 15, fontWeight: "700", lineHeight: 22 }} />
          {!!block.note && <GrammarText text={block.note} style={{ color: C.muted, fontSize: 13, lineHeight: 19 }} />}
        </View>
      );

    case "table": {
      const compact = block.headers.length <= 3;
      const colStyle = compact ? { flex: 1, minWidth: 0, padding: 10 } : { width: 156, padding: 10 };
      const inner = (
        <View style={compact ? { width: "100%" } : undefined}>
          <View style={{ flexDirection: "row", backgroundColor: C.card2, borderBottomWidth: 1, borderBottomColor: C.line }}>
            {block.headers.map((h, i) => (
              <View key={i} style={colStyle}>
                <GrammarText text={h} style={{ color: C.text, fontSize: 13, fontWeight: "800" }} />
              </View>
            ))}
          </View>
          {block.rows.map((row, rIdx) => (
            <View key={rIdx} style={{ flexDirection: "row", borderTopWidth: rIdx === 0 ? 0 : 1, borderTopColor: C.line }}>
              {row.map((cell, cIdx) => (
                <View key={cIdx} style={colStyle}>
                  <GrammarText text={cell} style={{ color: C.text, fontSize: 13, lineHeight: 18 }} />
                </View>
              ))}
            </View>
          ))}
        </View>
      );
      return (
        <View style={{ gap: 6 }}>
          {!!block.caption && (
            <Text style={{ color: C.muted, fontSize: 12, fontWeight: "800", textTransform: "uppercase" }}>{block.caption}</Text>
          )}
          {compact ? (
            <View style={{ borderRadius: R.md, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, overflow: "hidden" }}>
              {inner}
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator style={{ borderRadius: R.md, borderWidth: 1, borderColor: C.line, backgroundColor: C.card }}>
              {inner}
            </ScrollView>
          )}
        </View>
      );
    }

    case "examples":
      return (
        <View style={{ gap: 6 }}>
          {!!block.title && (
            <Text style={{ color: C.muted, fontSize: 12, fontWeight: "800", textTransform: "uppercase" }}>{block.title}</Text>
          )}
          <View style={{ backgroundColor: C.card, borderRadius: R.lg, ...STICKER, overflow: "hidden" }}>
            {block.items.map((item, idx) => {
              const normalKey = `${blockKey}-${idx}-n`;
              const slowKey = `${blockKey}-${idx}-s`;
              const cleanDe = stripGrammarMarkup(item.de);
              const nPlay = playingKey === normalKey;
              const sPlay = playingKey === slowKey;
              return (
                <View key={idx} style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12, borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: C.line }}>
                  <View style={{ flexDirection: "row", gap: 4, marginTop: 2 }}>
                    <Pressable
                      onPress={() => onSpeak(normalKey, cleanDe, false)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: nPlay ? C.accent : C.line,
                        backgroundColor: nPlay ? C.accentSoft : C.card2,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <SymbolView name={nPlay ? "stop.fill" : "speaker.wave.2.fill"} size={14} tintColor={nPlay ? C.accentText : C.muted} />
                    </Pressable>
                    <Pressable
                      onPress={() => onSpeak(slowKey, cleanDe, true)}
                      style={{
                        height: 32,
                        paddingHorizontal: 7,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: sPlay ? C.accent : C.line,
                        backgroundColor: sPlay ? C.accentSoft : C.card2,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ color: sPlay ? C.accentText : C.muted, fontSize: 11, fontWeight: "800" }}>0.7×</Text>
                    </Pressable>
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <GrammarText text={item.de} style={{ color: C.text, fontSize: 15, fontWeight: "600", lineHeight: 21 }} />
                    <GrammarText text={item.vi} style={{ color: C.muted, fontSize: 13, lineHeight: 19 }} />
                    {!!item.note && (
                      <GrammarText text={`→ ${item.note}`} style={{ color: C.accentText, fontSize: 12, lineHeight: 17 }} />
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      );

    case "steps":
      return (
        <View style={{ gap: 8 }}>
          {!!block.title && (
            <Text style={{ color: C.muted, fontSize: 12, fontWeight: "800", textTransform: "uppercase" }}>{block.title}</Text>
          )}
          {block.items.map((item, idx) => {
            const exKey = `${blockKey}-st-${idx}`;
            const cleanEx = item.example ? stripGrammarMarkup(item.example).replace(/\s*·\s*/g, ". ") : "";
            const isPlay = playingKey === exKey;
            return (
              <View key={idx} style={{ flexDirection: "row", gap: 10, padding: 12, borderRadius: R.md, backgroundColor: C.card, ...STICKER }}>
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: C.accentSoft, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: C.accentText, fontSize: 12, fontWeight: "800" }}>{idx + 1}</Text>
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <GrammarText text={item.step} style={{ color: C.text, fontSize: 14, fontWeight: "700" }} />
                  <GrammarText text={item.detail} style={{ color: C.muted, fontSize: 13, lineHeight: 19 }} />
                  {!!item.example && (
                    <Pressable
                      onPress={() => onSpeak(exKey, cleanEx, false)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        padding: 8,
                        borderRadius: 8,
                        backgroundColor: C.card2,
                        borderWidth: 1,
                        borderColor: isPlay ? C.accent : C.line,
                      }}
                    >
                      <SymbolView name={isPlay ? "stop.fill" : "speaker.wave.2"} size={14} tintColor={isPlay ? C.accentText : C.muted} />
                      <GrammarText text={item.example} style={{ color: C.text, fontSize: 13, flex: 1 }} />
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      );

    case "tip": {
      const bg = block.variant === "warning" ? C.goldSoft : block.variant === "note" ? C.accentSoft : C.okSoft;
      const fg = block.variant === "warning" ? C.amber : block.variant === "note" ? C.accentText : C.okText;
      const icon = block.variant === "warning" ? "exclamationmark.triangle.fill" : block.variant === "note" ? "info.circle.fill" : "lightbulb.fill";
      return (
        <View style={{ flexDirection: "row", gap: 10, padding: 12, borderRadius: R.md, backgroundColor: bg, borderWidth: 1, borderColor: alpha(fg, 0.35) }}>
          <SymbolView name={icon} size={16} tintColor={fg} />
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ color: fg, fontSize: 12, fontWeight: "800", textTransform: "uppercase" }}>{block.title}</Text>
            <GrammarText text={block.content} style={{ color: C.text, fontSize: 13, lineHeight: 19 }} />
          </View>
        </View>
      );
    }

    case "compare":
      return (
        <View style={{ gap: 10 }}>
          <View style={{ padding: 12, borderRadius: R.md, backgroundColor: C.card, ...STICKER, gap: 6 }}>
            <GrammarText text={block.leftTitle} style={{ color: C.accentText, fontSize: 14, fontWeight: "800" }} />
            {block.leftItems.map((x, i) => (
              <GrammarText key={i} text={`• ${x}`} style={{ color: C.text, fontSize: 13, lineHeight: 19 }} />
            ))}
          </View>
          <View style={{ padding: 12, borderRadius: R.md, backgroundColor: C.card, ...STICKER, gap: 6 }}>
            <GrammarText text={block.rightTitle} style={{ color: C.link, fontSize: 14, fontWeight: "800" }} />
            {block.rightItems.map((x, i) => (
              <GrammarText key={i} text={`• ${x}`} style={{ color: C.text, fontSize: 13, lineHeight: 19 }} />
            ))}
          </View>
        </View>
      );

    case "list":
      return (
        <View style={{ padding: 12, borderRadius: R.md, backgroundColor: C.card, ...STICKER, gap: 6 }}>
          {!!block.title && (
            <Text style={{ color: C.muted, fontSize: 12, fontWeight: "800", textTransform: "uppercase" }}>{block.title}</Text>
          )}
          {block.items.map((x, i) => (
            <GrammarText key={i} text={`• ${x}`} style={{ color: C.text, fontSize: 14, lineHeight: 20 }} />
          ))}
        </View>
      );
  }
}
