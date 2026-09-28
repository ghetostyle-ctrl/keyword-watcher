import { ArrowRight, Check, Grid2X2 } from "lucide-react";
import { useState } from "react";
import type { TrackedKeyword } from "../../shared/contracts";
import { KeywordBatchResultSchema } from "../../shared/keyword-batch";
import { api, errorMessage } from "../api";
import { Badge, Button, Notice } from "../components/ui";
import { categoryPresets } from "../data/category-presets";
import "../styles/category-starter.css";

const identity = (value: string) =>
  value.normalize("NFKC").replace(/\s+/gu, "").toLowerCase();

export function CategoryStarter({
  keywords,
  onSaved,
}: {
  readonly keywords: readonly TrackedKeyword[];
  readonly onSaved: (message: string) => void;
}) {
  const [categoryId, setCategoryId] = useState("");
  const [selected, setSelected] = useState<readonly string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const preset = categoryPresets.find((item) => item.id === categoryId);
  const tracked = new Set(keywords.map((item) => identity(item.keyword)));
  const available =
    preset?.keywords.filter((item) => !tracked.has(identity(item))) ?? [];
  const pending = selected.filter((item) => !tracked.has(identity(item)));
  const remaining = Math.max(0, 100 - keywords.length);
  const overLimit = pending.length > remaining;

  function chooseCategory(id: string) {
    setCategoryId(id);
    setSelected(
      categoryPresets
        .find((item) => item.id === id)
        ?.keywords.filter((item) => !tracked.has(identity(item))) ?? [],
    );
    setError("");
  }
  async function register() {
    if (!preset || pending.length === 0 || overLimit || saving) return;
    setSaving(true);
    setError("");
    try {
      const raw: unknown = await api
        .post("keywords/batch", {
          json: {
            keywords: pending.map((keyword) => ({
              keyword,
              category: preset.name,
            })),
          },
        })
        .json();
      const result = KeywordBatchResultSchema.parse(raw);
      setSelected([]);
      onSaved(
        result.added > 0
          ? `${preset.name} 키워드 ${result.added}개를 등록했습니다. 지금 수집하거나 다음 자동 수집을 기다리세요.`
          : "선택한 키워드는 이미 등록되어 있습니다.",
      );
    } catch (caught) {
      if (!(caught instanceof Error)) throw caught;
      setError(await errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className="card category-starter"
      aria-labelledby="category-starter-title"
    >
      <div className="section-head">
        <div className="section-title">
          <Grid2X2 size={19} />
          <h2 id="category-starter-title">카테고리로 시작하기</h2>
        </div>
        <Badge>카테고리별 30개</Badge>
      </div>
      <p className="muted small">
        관심 분야를 고르고, 추적할 키워드를 선택하세요. 등록 전까지 수집 대상에
        추가되지 않습니다.
      </p>
      <div className="category-choice-grid">
        {categoryPresets.map((item) => (
          <button
            key={item.id}
            type="button"
            className="category-choice"
            aria-pressed={categoryId === item.id}
            disabled={saving}
            onClick={() => chooseCategory(item.id)}
          >
            <span className="category-choice-heading">
              <strong>{item.name}</strong>
              {categoryId === item.id ? (
                <Check size={17} aria-hidden="true" />
              ) : (
                <ArrowRight size={17} aria-hidden="true" />
              )}
            </span>
            <span>{item.description}</span>
          </button>
        ))}
      </div>
      {!preset ? (
        <p className="category-starter-hint">
          위에서 카테고리를 선택하면 시작용 키워드 목록이 열립니다.
        </p>
      ) : (
        <div className="category-preview">
          <div className="category-preview-heading">
            <div>
              <h3>{preset.name} 시작 키워드</h3>
              <p className="muted small">
                필요 없는 항목은 해제하세요. 브랜드명은 ‘키워드 등록’에서 직접
                추가할 수 있습니다.
              </p>
            </div>
            <div className="cluster">
              <Button
                variant="ghost"
                disabled={saving || available.length === 0}
                onClick={() => setSelected(available)}
              >
                전체 선택
              </Button>
              <Button
                variant="ghost"
                disabled={saving || pending.length === 0}
                onClick={() => setSelected([])}
              >
                선택 해제
              </Button>
            </div>
          </div>
          <fieldset className="starter-keyword-grid" disabled={saving}>
            <legend className="sr-only">등록할 {preset.name} 키워드</legend>
            {preset.keywords.map((keyword) => {
              const existing = tracked.has(identity(keyword));
              return (
                <label
                  key={keyword}
                  className={`starter-keyword ${existing ? "is-tracked" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={!existing && selected.includes(keyword)}
                    disabled={existing}
                    onChange={(event) =>
                      setSelected((current) =>
                        event.target.checked
                          ? [...current, keyword]
                          : current.filter((item) => item !== keyword),
                      )
                    }
                  />
                  <span>{keyword}</span>
                  {existing && <small>등록됨</small>}
                </label>
              );
            })}
          </fieldset>
          <p className="muted small">
            키워드와처가 준비한 시작 목록입니다. 검색량과 순위는 실제 수집 후
            확인할 수 있습니다.
          </p>
          {error && <Notice error>{error}</Notice>}
          {overLimit && (
            <Notice error>
              현재 {remaining}개를 더 등록할 수 있습니다. 선택한 키워드 수를
              줄여주세요.
            </Notice>
          )}
          <div className="category-register-row">
            <p role="status">
              <strong>{pending.length}개 선택</strong>
              <span className="muted small">
                {" "}
                · 전체 {keywords.length}/100개 등록됨
              </span>
            </p>
            <Button
              variant="primary"
              disabled={saving || pending.length === 0 || overLimit}
              onClick={() => void register()}
            >
              {saving
                ? "등록 중…"
                : pending.length
                  ? `선택한 ${pending.length}개 추적하기`
                  : available.length
                    ? "키워드를 선택하세요"
                    : "모두 등록된 키워드입니다"}
              <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
