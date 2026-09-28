import { Plus, RefreshCw, Search, Tag } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import type { TrackedKeyword } from "../../shared/contracts";
import { TrackedKeywordSchema } from "../../shared/contracts";
import { api, errorMessage } from "../api";
import {
  Badge,
  Button,
  EmptyState,
  LoadingState,
  Notice,
} from "../components/ui";
import { useResource } from "../useResource";
import { CategoryStarter } from "./CategoryStarter";
import { KeywordForm } from "./KeywordForm";
import { KeywordRegistry } from "./KeywordRegistry";
import "../styles/management.css";

const KeywordsSchema = z.object({ keywords: z.array(TrackedKeywordSchema) });

export function Keywords({ onChanged }: { onChanged: () => void }) {
  const { data, error, loading, reload } = useResource(
    "keywords",
    KeywordsSchema,
  );
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [modal, setModal] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const keywords = data?.keywords ?? [];
  const search = query.trim().toLocaleLowerCase("ko-KR");
  const filtered = keywords.filter(
    (item) =>
      `${item.keyword} ${item.category}`
        .toLocaleLowerCase("ko-KR")
        .includes(search) &&
      (filter === "all" || item.active === (filter === "active")) &&
      (!categoryFilter || item.category === categoryFilter),
  );
  const activeCount = keywords.filter((item) => item.active).length;
  const openModal = () => setModal(true);
  async function toggle(item: TrackedKeyword) {
    setBusyId(item.id);
    setActionError("");
    setMessage("");
    try {
      await api.patch(`keywords/${item.id}`, {
        json: { active: !item.active },
      });
      setMessage(
        `‘${item.keyword}’ 수집을 ${item.active ? "일시 중지" : "재개"}했습니다.`,
      );
      reload();
      onChanged();
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      setActionError(await errorMessage(error));
    } finally {
      setBusyId(null);
    }
  }
  return (
    <div className="stack management-page">
      <header className="management-heading page-heading">
        <div>
          <p className="management-eyebrow eyebrow">내 키워드</p>
          <h1>추적 키워드</h1>
          <p className="muted page-description">
            관심 시장과 경쟁사의 키워드를 꾸준히 관찰하세요.
          </p>
        </div>
        <Button variant="primary" onClick={openModal}>
          <Plus size={16} />
          키워드 등록
        </Button>
      </header>
      {message && <Notice>{message}</Notice>}
      {actionError && <Notice error>{actionError}</Notice>}
      {data && (
        <CategoryStarter
          keywords={keywords}
          onSaved={(text) => {
            setMessage(text);
            setActionError("");
            reload();
            onChanged();
          }}
        />
      )}
      <div className="management-intro">
        <Tag size={16} />
        <div>
          <strong>작게 시작하고, 흐름을 쌓아보세요.</strong>
          <p>
            처음에는 카테고리별 핵심 키워드 30~50개를 추천합니다. 수집을
            중지해도 이전 스냅샷은 보관됩니다.
          </p>
        </div>
      </div>
      <section className="card registry-card" aria-labelledby="registry-title">
        <div className="section-head">
          <div className="section-title">
            <h2 id="registry-title">키워드 목록</h2>
            {data && <Badge tone="accent">수집 중 {activeCount}개</Badge>}
          </div>
          <Button variant="ghost" onClick={reload} disabled={loading}>
            <RefreshCw size={16} />
            새로고침
          </Button>
        </div>
        <div className="management-toolbar">
          <label className="management-search">
            <Search size={16} />
            <span className="sr-only">키워드 또는 카테고리 검색</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="키워드 또는 카테고리 검색"
            />
          </label>
          <label className="management-filter">
            <span className="sr-only">등록 키워드 카테고리</span>
            <select
              className="select"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="">전체 카테고리</option>
              {[...new Set(keywords.map((item) => item.category))]
                .sort()
                .map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
            </select>
          </label>
          <label className="management-filter">
            <span className="sr-only">수집 상태</span>
            <select
              className="select"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="all">전체 상태</option>
              <option value="active">수집 중</option>
              <option value="paused">일시 중지</option>
            </select>
          </label>
        </div>
        {loading ? (
          <LoadingState />
        ) : error ? (
          <Notice error>{error}</Notice>
        ) : keywords.length === 0 ? (
          <EmptyState
            title="첫 키워드를 등록해 보세요"
            description="브랜드명과 제품명을 등록하고, 검색량의 변화를 한곳에서 확인하세요."
            action={
              <Button variant="primary" onClick={openModal}>
                <Plus size={16} />
                키워드 등록
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="검색 결과가 없습니다"
            description="다른 검색어나 수집 상태로 다시 찾아보세요."
            action={
              <Button
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                  setCategoryFilter("");
                }}
              >
                필터 초기화
              </Button>
            }
          />
        ) : (
          <KeywordRegistry
            items={filtered}
            total={keywords.length}
            busyId={busyId}
            toggle={toggle}
          />
        )}
      </section>
      {modal && (
        <KeywordForm
          keywords={keywords}
          onClose={() => setModal(false)}
          onSaved={(keyword) => {
            setModal(false);
            setActionError("");
            setMessage(
              `‘${keyword}’ 키워드를 등록했습니다. 다음 수집부터 검색량이 저장됩니다.`,
            );
            reload();
            onChanged();
          }}
        />
      )}
    </div>
  );
}
