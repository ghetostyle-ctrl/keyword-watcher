import { useCallback, useState, useSyncExternalStore } from "react";
import { z } from "zod";
import { RunSchema, StatusSchema } from "../shared/contracts";
import { api, errorMessage } from "./api";
import type { Page } from "./components/Shell";
import { Shell } from "./components/Shell";
import { Button, Modal, Notice } from "./components/ui";
import { Activity } from "./pages/Activity";
import { DashboardPage } from "./pages/Dashboard";
import { Keywords } from "./pages/Keywords";
import { Settings } from "./pages/Settings";
import { useResource } from "./useResource";
import "./styles/layout.css";

const ResultSchema = z.object({ run: RunSchema, skipped: z.boolean() });
const subscribe = (callback: () => void) => {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
};
const getHash = () => window.location.hash.replace(/^#\/?/, "");
export function App() {
  const hash = useSyncExternalStore(subscribe, getHash);
  const page: Page =
    hash === "keywords" || hash === "settings" || hash === "activity"
      ? hash
      : "dashboard";
  const status = useResource("status", StatusSchema);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(
    null,
  );
  const onChanged = useCallback(() => {
    status.reload();
    setRevision((v) => v + 1);
  }, [status.reload]);
  async function collect() {
    setNotice(null);
    if (!status.data?.configured) {
      window.location.hash = "settings";
      setNotice({
        text: "API 연결 정보를 설정한 뒤 첫 수집을 시작할 수 있어요.",
        error: false,
      });
      return;
    }
    if (!status.data.activeKeywords) {
      window.location.hash = "keywords";
      setNotice({ text: "수집할 키워드를 먼저 등록해 주세요.", error: false });
      return;
    }
    setBusy(true);
    try {
      const raw: unknown = await api
        .post("collect", { json: {}, timeout: false })
        .json();
      const result = ResultSchema.parse(raw);
      setNotice({
        text: result.skipped
          ? "오늘의 데이터는 이미 수집되었습니다."
          : `${result.run.collected}개 키워드의 수집을 완료했습니다.`,
        error: false,
      });
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      setNotice({ text: await errorMessage(error), error: true });
    } finally {
      setBusy(false);
      onChanged();
    }
  }
  const pages = {
    dashboard: (
      <DashboardPage
        status={status.data}
        onCollect={() => void collect()}
        busy={busy || Boolean(status.data?.collecting)}
        revision={revision}
      />
    ),
    keywords: <Keywords onChanged={onChanged} />,
    settings: <Settings status={status.data} onChanged={onChanged} />,
    activity: <Activity />,
  } satisfies Record<Page, React.ReactNode>;
  return (
    <Shell page={page} status={status.data}>
      {notice && (
        <div className="app-notice">
          <Notice error={notice.error}>
            {notice.text}{" "}
            <button
              type="button"
              className="notice-dismiss"
              onClick={() => setNotice(null)}
              aria-label="알림 닫기"
            >
              닫기
            </button>
          </Notice>
        </div>
      )}
      {status.error && (
        <Notice error>
          {status.error}
          <Button onClick={status.reload}>다시 연결</Button>
        </Notice>
      )}
      {pages[page]}
      {hash === "guide" && (
        <Modal
          title="키워드와처 시작 가이드"
          onClose={() => {
            window.location.hash = "dashboard";
          }}
        >
          <ol className="guide-list">
            <li>
              <strong>관심 키워드를 등록하세요.</strong>
              <p>
                상품명이나 경쟁사 브랜드명을 카테고리와 함께 등록합니다.
                처음에는 30–50개를 권장합니다.
              </p>
            </li>
            <li>
              <strong>데이터를 연결하세요.</strong>
              <p>
                검색광고 API 키를 로컬 .env 파일에 넣거나, 실제 보유 데이터를
                CSV로 가져옵니다.
              </p>
            </li>
            <li>
              <strong>매일 스냅샷을 쌓으세요.</strong>
              <p>
                수집 설정에서 자동 수집을 켜고 서버를 실행해 두세요. 오늘과
                정확히 7일 전 데이터가 있으면 증감을 비교합니다.
              </p>
            </li>
          </ol>
          <div className="form-actions">
            <a className="btn btn-primary" href="#keywords">
              키워드 등록하러 가기
            </a>
          </div>
        </Modal>
      )}
    </Shell>
  );
}
