import { Stack, router, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Share, View } from "react-native";
import { Text } from "@/components/Text";
import Player from "@/components/Player";
import { Button } from "@/components/ui";
import { api, ApiError, type Transcript } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { askLogin, showError } from "@/lib/dialogs";
import { useI18n } from "@/lib/i18n";
import { rememberWatch } from "@/lib/watchRecent";
import { C, alpha } from "@/lib/theme";

export default function WatchScreen() {
  const { videoId } = useLocalSearchParams<{ videoId: string }>();
  const { user } = useAuth();
  const [data, setData] = useState<Transcript | null>(null);
  const [error, setError] = useState("");
  const [savingOwn, setSavingOwn] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const { t } = useI18n();

  const [curVid, setCurVid] = useState(videoId);
  if (curVid !== videoId) {
    setCurVid(videoId);
    setData(null);
    setError("");
    setSavingOwn(false);
  }
  const [curUid, setCurUid] = useState(user?.id);
  if (curUid !== user?.id) {
    setCurUid(user?.id);
    setData((prev) => (prev ? { ...prev, ownLessonId: null, ownLessonSlug: null } : null));
  }

  useEffect(() => {
    let cancelled = false;
    api<Transcript>(`/youtube/${encodeURIComponent(videoId)}`, { timeoutMs: 150_000 })
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setError("");
        rememberWatch(res.videoId, res.title || res.videoId);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        if (e instanceof ApiError && e.data.locked && typeof e.data.lessonId === "number")
          return router.replace(`/lesson/${e.data.lessonId}`);
        setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [videoId, retryKey, user?.id]);

  const saveAsOwn = async () => {
    if (!data) return;
    if (!user) {
      askLogin(t("player.needLogin"), t("player.needLoginBody"));
      return;
    }
    if (data.ownLessonId) {
      router.replace(`/lesson/${data.ownLessonId}`);
      return;
    }
    setSavingOwn(true);
    try {
      const res = await api<{ id: number | null; slug: string }>("/lessons/own", {
        method: "POST",
        body: { videoId: data.videoId },
        timeoutMs: 150_000,
      });
      if (res.id) {
        router.replace(`/lesson/${res.id}`);
      } else {
        setData((prev) => (prev ? { ...prev, ownLessonSlug: res.slug } : prev));
      }
    } catch (e) {
      showError(e);
    } finally {
      setSavingOwn(false);
    }
  };

  if (!data) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 }}>
        <Stack.Screen options={{ title: "" }} />
        {error ? (
          <>
            <Text style={{ color: C.redText, textAlign: "center" }}>{error}</Text>
            <Button
              title={t("retry")}
              onPress={() => {
                setError("");
                setRetryKey((k) => k + 1);
              }}
            />
          </>
        ) : (
          <>
            <ActivityIndicator color={C.accentText} />
            <Text style={{ color: C.muted, textAlign: "center" }}>{t("watch.finding")}</Text>
          </>
        )}
      </View>
    );
  }

  const shareWatch = () => {
    void Share.share({
      title: data.title,
      url: `https://hallovn.de/watch/${data.videoId}`,
      message: `${data.title}\nhttps://hallovn.de/watch/${data.videoId}`,
    }).catch(() => {});
  };

  const trackTag = data.track?.languageCode?.startsWith("whisper")
    ? t("watch.whisper")
    : data.track?.auto
      ? t("watch.autoCaption")
      : "";

  return (
    <Player
      key={`${data.videoId}-${user?.id ?? "guest"}`}
      title={data.title}
      videoId={data.videoId}
      segments={data.segments}
      sourceUrl={`/watch/${data.videoId}`}
      isWatch
      earnPoints={false}
      topBanner={
        <View style={{ backgroundColor: alpha(C.accent, 0.1), borderBottomWidth: 1, borderBottomColor: C.border }}>
          <Pressable
            onPress={() => void saveAsOwn()}
            disabled={savingOwn}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingHorizontal: 14,
              paddingVertical: 9,
              backgroundColor: pressed ? C.card2 : "transparent",
            })}
          >
            {savingOwn ? (
              <ActivityIndicator size="small" color={C.accentText} />
            ) : (
              <SymbolView name={data.ownLessonId ? "checkmark.circle.fill" : "plus.circle.fill"} size={16} tintColor={C.accentText} />
            )}
            <Text style={{ flex: 1, color: C.accentText, fontSize: 13, fontWeight: "700" }} numberOfLines={1}>
              {savingOwn ? t("watch.savingOwn") : data.ownLessonId ? t("watch.savedOwn") : t("watch.saveOwn")}
            </Text>
            {!!trackTag && (
              <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: C.card2, borderWidth: 1, borderColor: C.border }}>
                <Text style={{ color: C.muted, fontSize: 11, fontWeight: "700" }}>{trackTag}</Text>
              </View>
            )}
            <SymbolView name="chevron.right" size={12} tintColor={C.accentText} weight="semibold" />
          </Pressable>
        </View>
      }
      headerRight={
        <Pressable onPress={shareWatch} hitSlop={8} style={{ padding: 6 }}>
          <SymbolView name="square.and.arrow.up" size={20} tintColor={C.link} weight="semibold" />
        </Pressable>
      }
    />
  );
}
