import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { extractChannelInput, extractVideoId } from "@shared/youtube-id";
import { BrandBar } from "@/components/Brand";
import { Text } from "@/components/Text";
import { Button, Card, ErrorText, Input, LevelBadge, PageHeader, SectionTitle, styles } from "@/components/ui";
import { api, thumb, type LessonSummary } from "@/lib/api";
import {
  DUB_VOICES,
  fetchDubChannelVideos,
  fetchDubChannels,
  fmtDuration,
  removeRecentDub,
  useDubVoice,
  useRecentDubs,
  type DubChannelInfo,
  type DubChannelVideo,
} from "@/lib/dub";
import { haptic } from "@/lib/haptics";
import { useI18n } from "@/lib/i18n";
import { CONTENT_MAX, useLayout } from "@/lib/layout";
import { C, R, SEC, STICKER } from "@/lib/theme";

/** Tab Thuyết minh YouTube: dán link video/kênh, duyệt kênh đề xuất → mở trình phát thuyết minh tiếng Việt */
export default function DubTab() {
  const { t } = useI18n();
  const { tablet } = useLayout();
  const recent = useRecentDubs();
  const [voiceId, setVoiceId] = useDubVoice();

  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<LessonSummary[]>([]);

  // Kênh YouTube đề xuất + kênh người dùng tự dán
  const [channels, setChannels] = useState<DubChannelInfo[]>([]);
  const [channelsErr, setChannelsErr] = useState("");
  const [customChannel, setCustomChannel] = useState<DubChannelInfo | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [channelVideos, setChannelVideos] = useState<Record<string, DubChannelVideo[]>>({});
  const [channelLoading, setChannelLoading] = useState(false);
  const [submittingChannel, setSubmittingChannel] = useState(false);
  const [channelError, setChannelError] = useState("");
  const channelReqSeq = useRef(0);
  const activeKeyRef = useRef<string | null>(null);
  useEffect(() => {
    activeKeyRef.current = activeKey;
  }, [activeKey]);

  const loadChannel = useCallback(async (ch: DubChannelInfo, refresh = false) => {
    const seq = ++channelReqSeq.current;
    setActiveKey(ch.key);
    setChannelError("");
    setChannelLoading(true);
    try {
      const res = await fetchDubChannelVideos({
        id: ch.dbId,
        channel: ch.dbId ? undefined : ch.url || ch.handle || ch.channelId,
        refresh,
      });
      if (seq !== channelReqSeq.current) return;
      setChannelVideos((prev) => ({ ...prev, [ch.key]: res.videos }));
    } catch (e) {
      if (seq !== channelReqSeq.current) return;
      setChannelError(e instanceof Error ? e.message : t("api.noConnection"));
    } finally {
      if (seq === channelReqSeq.current) setChannelLoading(false);
    }
  }, [t]);

  const loadChannels = useCallback(
    (cancelledRef?: { current: boolean }) => {
      setChannelsErr("");
      return fetchDubChannels()
        .then((r) => {
          if (cancelledRef?.current) return;
          const list = r.channels ?? [];
          setChannels(list);
          if (list.length > 0 && !activeKeyRef.current) {
            void loadChannel(list[0], false);
          }
        })
        .catch((e) => {
          if (cancelledRef?.current) return;
          setChannelsErr(e instanceof Error ? e.message : t("api.noConnection"));
        });
    },
    [loadChannel, t],
  );

  useFocusEffect(
    useCallback(() => {
      const cancelledRef = { current: false };
      if (channels.length === 0) {
        void loadChannels(cancelledRef);
      }
      if (suggestions.length === 0) {
        api<{ lessons: LessonSummary[] }>("/lessons")
          .then((r) => {
            if (cancelledRef.current) return;
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
      }
      return () => {
        cancelledRef.current = true;
      };
    }, [channels.length, loadChannels, suggestions.length]),
  );

  const openVideo = (videoId: string) => {
    Keyboard.dismiss();
    setError("");
    router.push({ pathname: "/dub/[videoId]", params: { videoId, voice: voiceId } });
  };

  const openCustomChannel = async (input: string) => {
    Keyboard.dismiss();
    const seq = ++channelReqSeq.current;
    setError("");
    setChannelError("");
    setChannelLoading(true);
    setSubmittingChannel(true);
    try {
      const res = await fetchDubChannelVideos({ channel: input });
      if (seq !== channelReqSeq.current) return;
      const existing = channels.find(
        (c) =>
          c.key === res.channel.key ||
          (res.channel.channelId && c.channelId === res.channel.channelId) ||
          (res.channel.handle && c.handle?.toLowerCase() === res.channel.handle.toLowerCase()),
      );
      if (existing) {
        setCustomChannel(null);
        setActiveKey(existing.key);
        setChannelVideos((prev) => ({ ...prev, [existing.key]: res.videos }));
      } else {
        setCustomChannel(res.channel);
        setActiveKey(res.channel.key);
        setChannelVideos((prev) => ({ ...prev, [res.channel.key]: res.videos }));
      }
      setUrl("");
    } catch (e) {
      if (seq !== channelReqSeq.current) return;
      setError(e instanceof Error ? e.message : t("dub.invalidUrl"));
    } finally {
      if (seq === channelReqSeq.current) {
        setChannelLoading(false);
        setSubmittingChannel(false);
      }
    }
  };

  const submit = () => {
    const raw = url.trim();
    if (!raw || submittingChannel) return;
    const id = extractVideoId(raw);
    if (id) {
      openVideo(id);
      return;
    }
    const ch = extractChannelInput(raw);
    if (ch) {
      void openCustomChannel(ch);
      return;
    }
    setError(t("dub.invalidUrl"));
  };

  const sec = SEC.dub;
  const allChannels = customChannel
    ? [
        customChannel,
        ...channels.filter(
          (c) => c.key !== customChannel.key && !(customChannel.channelId && c.channelId === customChannel.channelId),
        ),
      ]
    : channels;
  const selectedChannel = allChannels.find((c) => c.key === activeKey) ?? allChannels[0] ?? null;
  const videos = selectedChannel ? channelVideos[selectedChannel.key] ?? [] : [];

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

          {/* Ô dán link video hoặc kênh + chọn giọng (Edge & Piper) */}
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

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {DUB_VOICES.map((v) => {
                const active = v.id === voiceId;
                return (
                  <Pressable
                    key={v.id}
                    onPress={() => {
                      haptic.select();
                      setVoiceId(v.id);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 999,
                      borderWidth: 1,
                      backgroundColor: active ? sec.secSoft : C.card2,
                      borderColor: active ? sec.sec : C.line,
                    }}
                  >
                    <Text style={{ color: active ? sec.secText : C.text, fontSize: 13, fontWeight: "700" }}>
                      {t(v.shortKey)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Button
              title={t("dub.watch")}
              variant="primary"
              disabled={!url.trim() || submittingChannel}
              loading={submittingChannel}
              onPress={submit}
              style={{ backgroundColor: url.trim() ? sec.sec : C.card2, borderColor: url.trim() ? sec.sec : C.line }}
              icon={<SymbolView name="play.fill" size={16} tintColor={url.trim() ? "#fff" : C.muted} weight="bold" />}
            />

            <Text style={{ color: C.muted, fontSize: 13, lineHeight: 19 }}>{t("dub.hint")}</Text>
            <ErrorText>{error}</ErrorText>
          </Card>

          {allChannels.length === 0 && !!channelsErr && (
            <Card>
              <ErrorText>{channelsErr}</ErrorText>
              <Button title={t("retry")} onPress={() => void loadChannels()} />
            </Card>
          )}

          {/* Kênh YouTube đề xuất */}
          {allChannels.length > 0 && (
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <SectionTitle>{t("dub.channels")}</SectionTitle>
                {selectedChannel && (
                  <Pressable
                    disabled={channelLoading}
                    onPress={() => {
                      haptic.tap();
                      void loadChannel(selectedChannel, true);
                    }}
                    hitSlop={8}
                    style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4, paddingHorizontal: 8, opacity: channelLoading ? 0.5 : 1 }}
                  >
                    {channelLoading ? (
                      <ActivityIndicator size="small" color={sec.secText} />
                    ) : (
                      <SymbolView name="arrow.clockwise" size={13} tintColor={sec.secText} weight="semibold" />
                    )}
                    <Text style={{ color: sec.secText, fontSize: 13, fontWeight: "700" }}>{t("dub.channelRefresh")}</Text>
                  </Pressable>
                )}
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {allChannels.map((ch) => {
                  const active = selectedChannel?.key === ch.key;
                  const isCustom = customChannel?.key === ch.key;
                  return (
                    <Pressable
                      key={ch.key}
                      onPress={() => {
                        haptic.select();
                        setChannelError("");
                        if (channelVideos[ch.key]) {
                          channelReqSeq.current += 1;
                          setChannelLoading(false);
                          setActiveKey(ch.key);
                        } else {
                          void loadChannel(ch, false);
                        }
                      }}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        paddingHorizontal: 10,
                        paddingVertical: 7,
                        borderRadius: 999,
                        borderWidth: 1,
                        backgroundColor: active ? sec.secSoft : C.card,
                        borderColor: active ? sec.sec : C.line,
                      }}
                    >
                      {ch.avatar ? (
                        <Image source={ch.avatar} style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: C.card2 }} contentFit="cover" />
                      ) : (
                        <SymbolView name="tv" size={16} tintColor={active ? sec.secText : C.muted} />
                      )}
                      <Text style={{ color: active ? sec.secText : C.text, fontSize: 13, fontWeight: "700" }} numberOfLines={1}>
                        {ch.title}
                      </Text>
                      {isCustom && (
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation();
                            setCustomChannel(null);
                            setChannelError("");
                            const first = channels[0];
                            if (!first) {
                              channelReqSeq.current += 1;
                              setChannelLoading(false);
                              setActiveKey(null);
                            } else if (channelVideos[first.key]) {
                              channelReqSeq.current += 1;
                              setChannelLoading(false);
                              setActiveKey(first.key);
                            } else {
                              void loadChannel(first, false);
                            }
                          }}
                          hitSlop={8}
                          accessibilityRole="button"
                          accessibilityLabel={t("close")}
                        >
                          <SymbolView name="xmark.circle.fill" size={15} tintColor={C.muted} />
                        </Pressable>
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>

              {channelError && videos.length > 0 && (
                <Card>
                  <ErrorText>{channelError}</ErrorText>
                </Card>
              )}

              {channelLoading && videos.length === 0 ? (
                <Card style={{ alignItems: "center", paddingVertical: 24 }}>
                  <ActivityIndicator color={sec.secText} />
                </Card>
              ) : channelError && videos.length === 0 ? (
                <Card>
                  <ErrorText>{channelError}</ErrorText>
                  {selectedChannel && (
                    <Button title={t("retry")} onPress={() => void loadChannel(selectedChannel, false)} />
                  )}
                </Card>
              ) : videos.length === 0 ? (
                <Card>
                  <Text style={{ color: C.muted, fontSize: 13, textAlign: "center" }}>{t("dub.channelEmpty")}</Text>
                </Card>
              ) : (
                <View style={{ backgroundColor: C.card, ...STICKER, borderRadius: R.lg, overflow: "hidden" }}>
                  {videos.map((v, i) => {
                    const dur = fmtDuration(v.duration);
                    return (
                      <Pressable
                        key={v.id}
                        onPress={() => {
                          haptic.tap();
                          openVideo(v.id);
                        }}
                        style={({ pressed }) => ({
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 12,
                          padding: 12,
                          backgroundColor: pressed ? C.card2 : "transparent",
                          borderBottomWidth: i === videos.length - 1 ? 0 : 1,
                          borderBottomColor: C.line,
                        })}
                      >
                        <View style={{ position: "relative" }}>
                          <Image
                            source={thumb(v.id)}
                            alt=""
                            style={{ width: 100, aspectRatio: 16 / 9, borderRadius: 8, backgroundColor: C.card2 }}
                            contentFit="cover"
                            transition={150}
                          />
                          {!!dur && (
                            <View
                              style={{
                                position: "absolute",
                                right: 4,
                                bottom: 4,
                                paddingHorizontal: 5,
                                paddingVertical: 1,
                                borderRadius: 4,
                                backgroundColor: "rgba(0,0,0,0.75)",
                              }}
                            >
                              <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700", fontVariant: ["tabular-nums"] }}>
                                {dur}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={{ flex: 1, color: C.text, fontSize: 14, lineHeight: 19, fontWeight: "600" }} numberOfLines={2}>
                          {v.title}
                        </Text>
                        <SymbolView name="play.circle.fill" size={20} tintColor={sec.secText} />
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          )}

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
