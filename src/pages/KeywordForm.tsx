import type { FormEvent } from "react";
import { useState } from "react";
import type { TrackedKeyword } from "../../shared/contracts";
import { KeywordInputSchema } from "../../shared/contracts";
import { api, errorMessage } from "../api";
import { Button, Modal, Notice } from "../components/ui";
import { categoryPresets } from "../data/category-presets";
export function KeywordForm({
  keywords,
  onClose,
  onSaved,
}: {
  readonly keywords: readonly TrackedKeyword[];
  readonly onClose: () => void;
  readonly onSaved: (keyword: string) => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  async function addKeyword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = KeywordInputSchema.safeParse({
      keyword,
      category: category === "__custom__" ? customCategory : category,
    });
    if (!parsed.success) {
      setFormError("키워드(최대 80자)와 카테고리(최대 40자)를 입력해 주세요.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await api.post("keywords", { json: parsed.data });
      onSaved(parsed.data.keyword);
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      setFormError(await errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="키워드 등록" onClose={onClose}>
      <form
        onSubmit={(event) => void addKeyword(event)}
        className="management-form"
      >
        <p className="muted small">
          등록한 키워드의 월간 검색량을 매일 스냅샷으로 저장합니다.
        </p>
        <label className="field">
          키워드
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            required
            maxLength={80}
            autoComplete="off"
            placeholder="추적할 키워드를 입력하세요"
          />
        </label>
        <label className="field">
          카테고리
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            required
          >
            <option value="" disabled>
              카테고리를 선택하세요
            </option>
            {[
              ...new Set([
                ...categoryPresets.map((item) => item.name),
                ...keywords.map((item) => item.category),
              ]),
            ]
              .sort()
              .map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            <option value="__custom__">직접 입력</option>
          </select>
          <small>카테고리별 흐름을 대시보드에서 비교하세요.</small>
        </label>
        {category === "__custom__" && (
          <label className="field">
            새 카테고리 이름
            <input
              value={customCategory}
              onChange={(event) => setCustomCategory(event.target.value)}
              required
              maxLength={40}
              placeholder="분류할 카테고리 이름"
            />
          </label>
        )}
        {formError && <Notice error>{formError}</Notice>}
        <div className="form-actions">
          <Button onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? "등록 중…" : "키워드 등록"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
