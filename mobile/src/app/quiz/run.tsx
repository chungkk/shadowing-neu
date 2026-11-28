import { useEffect, useState } from "react";
import { Stack, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { Text } from "@/components/Text";
import { Button, ErrorText, styles } from "@/components/ui";
import { QuizRunner } from "@/components/quiz/QuizRunner";
import { useAuth } from "@/lib/auth";
import { C } from "@/lib/theme";
import { buildRun, buildRunFromRemoteExam, buildWrongLastFromRemoteExam, isRunMode, type Run } from "@/lib/quiz/run";
import { fetchRemoteExam, syncQuiz, useModule, useQuizData } from "@/lib/quiz/store";
import { useL } from "@/lib/quiz/strings";

/** /quiz/run?module=fuehrerschein|lid&mode=lesen|ueben|exam|review&scope=… */
export default function QuizRunScreen() {
  const L = useL();
  const { user } = useAuth();
  const p = useLocalSearchParams<{ module: string; mode: string; scope?: string; t?: string }>();
  const module = p.module === "lid" ? "lid" : "fuehrerschein";
  const mode = isRunMode(p.mode) ? p.mode : "ueben";
  const scope = p.scope ?? (module === "lid" ? "hoc" : "all");
  const owner = useQuizData().owner;
  const mod = useModule(module);
  const latestLocal = mod.exams[0];
  const latestRemote = mod.remote[0];
  const remoteWrongLastId =
    scope === "wrong-last" && latestRemote && (!latestLocal || latestRemote.at > latestLocal.at) ? latestRemote.id : null;
  const isWrongRemote = mode === "ueben" && scope.startsWith("wrong-remote:");
  const rawRemoteId = scope.startsWith("remote:")
    ? Number(scope.slice(7))
    : isWrongRemote
      ? Number(scope.slice(13))
      : NaN;
  const validRemoteId = Number.isInteger(rawRemoteId) && rawRemoteId > 0 ? rawRemoteId : null;
  const isRemoteReview = (mode === "review" && scope.startsWith("remote:")) || isWrongRemote || remoteWrongLastId !== null;
  const serverId = remoteWrongLastId ?? validRemoteId;

  const [syncDoneFor, setSyncDoneFor] = useState<number | null>(null);
  const waitingForSync = !!user && owner !== user.id && syncDoneFor !== user.id;

  useEffect(() => {
    if (!user || owner === user.id) return;
    let alive = true;
    void syncQuiz(user).finally(() => {
      if (alive) setSyncDoneFor(user.id);
    });
    return () => {
      alive = false;
    };
  }, [user, owner]);

  const [retryKey, setRetryKey] = useState(0);
  const remoteKey = `${module}:${scope}:${serverId ?? ""}:${retryKey}`;
  const localKey = `${isRemoteReview ? "r" : "l"}:${module}:${mode}:${scope}:${owner ?? "guest"}:${syncDoneFor ?? "none"}:${p.t ?? ""}`;
  const [cachedLocal, setCachedLocal] = useState<{ key: string; run: Run | null }>(() => ({
    key: localKey,
    run: isRemoteReview ? null : buildRun(module, mode, scope),
  }));
  if (cachedLocal.key !== localKey) {
    setCachedLocal({ key: localKey, run: isRemoteReview ? null : buildRun(module, mode, scope) });
  }
  const localRun = cachedLocal.run;
  const [remoteState, setRemoteState] = useState<{ key: string; run: Run | null; error: string } | null>(null);

  useEffect(() => {
    if (!isRemoteReview || serverId == null) return;
    let cancelled = false;
    fetchRemoteExam(module, serverId)
      .then((rec) => {
        if (!cancelled) {
          const built = remoteWrongLastId !== null || isWrongRemote ? buildWrongLastFromRemoteExam(module, rec) : buildRunFromRemoteExam(module, rec);
          setRemoteState({ key: remoteKey, run: built, error: "" });
        }
      })
      .catch((e) => {
        if (!cancelled) setRemoteState({ key: remoteKey, run: null, error: e instanceof Error ? e.message : L("Không tải được bài thi.", "Prüfung konnte nicht geladen werden.") });
      });
    return () => {
      cancelled = true;
    };
  }, [isRemoteReview, isWrongRemote, module, serverId, remoteWrongLastId, remoteKey, L]);

  const run = isRemoteReview ? (remoteState?.key === remoteKey ? remoteState.run : null) : localRun;
  const loading = waitingForSync || (isRemoteReview && serverId != null && remoteState?.key !== remoteKey);
  const error = isRemoteReview && remoteState?.key === remoteKey ? remoteState.error : "";

  if (loading) {
    return (
      <View style={[styles.screen, { alignItems: "center", justifyContent: "center", padding: 24 }]}>
        <Stack.Screen options={{ title: L("Đang tải…", "Wird geladen…") }} />
        <ActivityIndicator size="large" color={C.accentText} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.screen, { alignItems: "center", justifyContent: "center", padding: 24, gap: 12 }]}>
        <Stack.Screen options={{ title: "" }} />
        <ErrorText>{error}</ErrorText>
        <Button title={L("Thử lại", "Erneut versuchen")} onPress={() => setRetryKey((k) => k + 1)} />
      </View>
    );
  }

  if (!run) {
    return (
      <View style={[styles.screen, { alignItems: "center", justifyContent: "center", padding: 24 }]}>
        <Stack.Screen options={{ title: "" }} />
        <Text style={{ color: C.muted, fontSize: 16 }}>{L("Không tìm thấy bộ câu hỏi này.", "Diese Fragen wurden nicht gefunden.")}</Text>
      </View>
    );
  }

  return <QuizRunner key={`${module}-${mode}-${scope}-${p.t ?? ""}-${retryKey}`} module={module} mode={mode} run={run} />;
}
