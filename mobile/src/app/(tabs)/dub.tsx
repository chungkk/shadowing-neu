import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { extractVideoId } from "@shared/youtube-id";
import { BrandBar } from "@/components/Brand";
import { Text } from "@/components/Text";
import { Button, Card, ErrorText, Input, LevelBadge, PageHeader, SectionTitle, Segmented, styles } from "@/components/ui";
import { api, thumb, type LessonSummary } from "@/lib/api";
import { DUB_VOICES, removeRecentDub, useRecentDubs, type DubVoiceId } from "@/lib/dub";
import { haptic } from "@/lib/haptics";
import { useI18n } from "@/lib/i18n";
import { CONTENT_MAX, useLayout } from "@/lib/layout";
import { C, R, SEC, STICKER } from "@/lib/theme";

/** Tab Thuyết minh YouTube: dán link YouTube bất kỳ → mở trình phát thuyết minh tiếng Việt trực tiếp */
export default function DubTab() {
  const { t } = useI18n();
  const { tablet } = useLayout();
  const recent = useRecentDubs();

  const [url, setUrl] = useState("");
  const [voiceId, setVoiceId] = useState<DubVoiceId>("edge:vi-VN-NamMinhNeural");
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<LessonSummary[]>([]);

  // Tải 4 bài miễn phí từ thư viện làm gợi ý nghe thử nhanh
  useFocusEffect(
    useCallback(() => {
      if (suggestions.length > 0) return;
      api<{ lessons: LessonSummary[] }>("/lessons")
        .then((r) => {
          const seen = new Set<string>();
          const free: LessonSummary[] = [];
          for (const l of r.lessons ?? []) {
            if (l.access === "locked") continue;
            if (seen.has(l.videoId)) continue;
            seen.add(l.videoId);
            free.push(l);
            if (free.length >= 4) break;
          }
          setSuggestions(free);
        })
        .catch(() => {});
    }, [suggestions.length]),
  );

  const openVideo = (videoId: string) => {
    Keyboard.dismiss();
    setError("");
    router.push({ pathname: "/dub/[videoId]", params: { videoId, voice: voiceId } });
  };

  const submit = () => {
    const id = extractVideoId(url.trim());
    if (!id) {
      setError(t("dub.invalidUrl"));
      return;
    }
    openVideo(id);
  };

  const sec = SEC.dub;

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <BrandBar />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: tablet ? 24 : 16,
            paddingTop: 12,
            paddingBottom: 36,
            gap: 20,
            width: "100%",
            maxWidth: CONTENT_MAX,
            alignSelf: "center",
          }}
        >
          <PageHeader sec="dub" icon="play.tv.fill" title={t("dub.title")} sub={t("dub.subtitle")} />

          {/* Ô dán link + chọn giọng Edge */}
          <Card>
            <Input
              value={url}
              onChangeText={(v) => {
                setUrl(v);
                if (error) setError("");
              }}
              placeholder={t("dub.placeholder")}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
              clearButtonMode="while-editing"
              onSubmitEditing={submit}
            />

            <Segmented
              options={DUB_VOICES.map((v) => [v.id, t(v.shortKey)] as const)}
              value={voiceId}
              onChange={setVoiceId}
              shrink
            />

            <Button
              title={t("dub.watch")}
              variant="primary"
              disabled={!url.trim()}
              onPress={submit}
              style={{ backgroundColor: url.trim() ? sec.sec : C.card2, borderColor: url.trim() ? sec.sec : C.line }}
              icon={<SymbolView name="play.fill" size={16} tintColor={url.trim() ? "#fff" : C.muted} weight="bold" />}
            />

            <Text style={{ color: C.muted, fontSize: 13, lineHeight: 19 }}>{t("dub.hint")}</Text>
            <ErrorText>{error}</ErrorText>
          </Card>

          {/* Đã xem gần đây */}
          {recent.length > 0 && (
            <View style={{ gap: 10 }}>
              <SectionTitle>{t("dub.recent")}</SectionTitle>
              <View style={{ backgroundColor: C.card, ...STICKER, borderRadius: R.lg, overflow: "hidden" }}>
                {recent.map((item, i) => (
                  <Pressable
                    key={item.videoId}
                    onPress={() => {
                      haptic.tap();
                      openVideo(item.videoId);
                    }}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      padding: 12,
                      backgroundColor: pressed ? C.card2 : "transparent",
                      borderBottomWidth: i === recent.length - 1 ? 0 : 1,
                      borderBottomColor: C.line,
                    })}
                  >
                    <Image
                      source={thumb(item.videoId)}
                      alt=""
                      style={{ width: 92, aspectRatio: 16 / 9, borderRadius: 8, backgroundColor: C.card2 }}
                      contentFit="cover"
                      transition={150}
                    />
                    <Text style={{ flex: 1, color: C.text, fontSize: 14, lineHeight: 19, fontWeight: "600" }} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        haptic.tap();
                        removeRecentDub(item.videoId);
                      }}
                      hitSlop={10}
                      accessibilityLabel={t("delete")}
                      style={{ padding: 6 }}
                    >
                      <SymbolView name="xmark.circle.fill" size={18} tintColor={C.muted} />
                    </Pressable>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Gợi ý nghe thử nhanh */}
          {suggestions.length > 0 && (
            <View style={{ gap: 10 }}>
              <SectionTitle>{t("dub.suggestions")}</SectionTitle>
              <Text style={{ color: C.muted, fontSize: 13, marginTop: -4 }}>{t("dub.suggestionsSub")}</Text>
              <View style={{ gap: 10 }}>
                {suggestions.map((item) => (
                  <Pressable
                    key={item.videoId}
                    onPress={() => {
                      haptic.tap();
                      openVideo(item.videoId);
                    }}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      padding: 12,
                      borderRadius: R.lg,
                      backgroundColor: pressed ? C.card2 : C.card,
                      ...STICKER,
                    })}
                  >
                    <Image
                      source={thumb(item.videoId)}
                      alt=""
                      style={{ width: 104, aspectRatio: 16 / 9, borderRadius: 8, backgroundColor: C.card2 }}
                      contentFit="cover"
                      transition={150}
                    />
                    <View style={{ flex: 1, gap: 6 }}>
                      <Text style={{ color: C.text, fontSize: 15, lineHeight: 20, fontWeight: "700" }} numberOfLines={2}>
                        {item.title}
                      </Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <LevelBadge level={item.level} />
                        <SymbolView name="play.circle.fill" size={18} tintColor={sec.secText} />
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
