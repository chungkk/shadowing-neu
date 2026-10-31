import { Image } from "expo-image";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, FlatList, Keyboard, KeyboardAvoidingView, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { extractVideoId } from "@shared/youtube-id";
import type { VideoHit } from "@shared/youtube-search";
import { Button, Card, ErrorText, Input, styles } from "@/components/ui";
import { thumb } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { C } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";
import { FORM_MAX, useLayout } from "@/lib/layout";
import { searchVideos } from "@/lib/youtube-device";

/** Ô nhập là link (hoặc ID video) chứ không phải từ khoá. ID trần phải có số / "-" / "_" để không nhầm từ 11 chữ như "Deutschland". */
const looksLikeLink = (s: string) => /youtu\.?be|youtube\./i.test(s) || (/^[\w-]{11}$/.test(s) && /[\d_-]/.test(s));

/** 1 kết quả: ảnh bìa (kèm thời lượng) · tiêu đề · kênh · lượt xem */
function VideoRow({ v, onPress }: { v: VideoHit; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flexDirection: "row", gap: 12, opacity: pressed ? 0.7 : 1 })}>
      <View style={{ width: 150, borderRadius: 10, overflow: "hidden" }}>
        <Image source={thumb(v.videoId)} alt="" style={{ width: "100%", aspectRatio: 16 / 9, backgroundColor: C.card2 }} contentFit="cover" transition={150} />
        {!!v.duration && (
          <Text
            style={{
              position: "absolute",
              right: 4,
              bottom: 4,
              backgroundColor: "rgba(0,0,0,0.75)",
              color: "#fff",
              fontSize: 11,
              fontWeight: "700",
              paddingHorizontal: 4,
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            {v.duration}
          </Text>
        )}
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ color: C.text, fontWeight: "700", fontSize: 14, lineHeight: 19 }} numberOfLines={3}>
          {v.title}
        </Text>
        <Text style={{ color: C.muted, fontSize: 12 }} numberOfLines={1}>
          {v.channel}
        </Text>
        <Text style={{ color: C.muted, fontSize: 12 }} numberOfLines={1}>
          {[v.views, v.published].filter(Boolean).join(" · ")}
          {v.captions && <Text style={{ color: C.accent, fontWeight: "800" }}> · CC</Text>}
        </Text>
      </View>
    </Pressable>
  );
}

export default function YouTubeScreen() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [results, setResults] = useState<{ q: string; videos: VideoHit[] } | null>(null);
  const [searching, setSearching] = useState(false);
  const searchId = useRef(0); // chỉ nhận kết quả của lần tìm mới nhất
  const { tablet } = useLayout();
  const text = input.trim();
  const isLink = looksLikeLink(text);

  const watch = (id: string) => {
    Keyboard.dismiss();
    router.push(`/watch/${id}`);
  };

  const submit = async () => {
    if (!text) return;
    setError("");
    if (isLink) {
      const id = extractVideoId(text);
      return id ? watch(id) : setError(t("yt.invalid"));
    }
    Keyboard.dismiss();
    const my = ++searchId.current;
    setSearching(true);
    try {
      const videos = await searchVideos(text);
      if (my === searchId.current) setResults({ q: text, videos });
    } catch (e) {
      if (my === searchId.current) setError((e as Error).message);
    } finally {
      if (my === searchId.current) setSearching(false);
    }
  };

  const header = (
    <View style={{ gap: 16, marginBottom: 16 }}>
      <Text style={styles.h1}>{t("yt.title")}</Text>
      <Card>
        <Text style={styles.muted}>{user ? t("yt.introUser") : t("yt.introGuest")}</Text>
        <Input
          value={input}
          onChangeText={setInput}
          placeholder={t("yt.placeholder")}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          returnKeyType={isLink ? "go" : "search"}
          onSubmitEditing={submit}
        />
        <ErrorText>{error}</ErrorText>
        <Button
          title={isLink || !text ? t("yt.start") : t("yt.search")}
          variant="primary"
          onPress={submit}
          disabled={!text}
          loading={searching}
        />
      </Card>
      {results ? (
        <Text style={{ color: C.text, fontWeight: "800", fontSize: 16 }} numberOfLines={1}>
          {t("yt.results", { q: results.q })}
        </Text>
      ) : (
        <View style={{ gap: 6 }}>
          <Text style={styles.muted}>{t("yt.tip")}</Text>
          {!user && (
            <Text style={styles.muted}>
              {t("yt.guestCta")}{" "}
              <Text style={{ color: C.accent, fontWeight: "800" }} onPress={() => router.push("/account")}>
                {t("loginOrRegister")}
              </Text>
            </Text>
          )}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      {/* Chạm ra ngoài ô nhập → ẩn bàn phím (bàn phím không có nút "Xong", che mất thanh tab) */}
      <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
          <FlatList
            data={results?.videos ?? []}
            keyExtractor={(v) => v.videoId}
            renderItem={({ item }) => <VideoRow v={item} onPress={() => watch(item.videoId)} />}
            ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
            ListHeaderComponent={header}
            ListEmptyComponent={
              searching ? (
                <ActivityIndicator color={C.accent} style={{ marginTop: 24 }} />
              ) : results ? (
                <Text style={[styles.muted, { textAlign: "center", marginTop: 24 }]}>{t("yt.noResults")}</Text>
              ) : undefined
            }
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            // iPad: cột giữa, đẩy xuống một chút cho cân màn hình
            contentContainerStyle={{
              width: "100%",
              maxWidth: FORM_MAX,
              alignSelf: "center",
              padding: 16,
              paddingTop: tablet ? 48 : 16,
              paddingBottom: 40,
            }}
          />
        </KeyboardAvoidingView>
      </Pressable>
    </SafeAreaView>
  );
}
