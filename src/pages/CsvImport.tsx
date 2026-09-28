import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";
import { z } from "zod";
import { api, errorMessage } from "../api";
import { Button, Modal, Notice } from "../components/ui";

const ImportSchema = z.object({ imported: z.number().int().nonnegative() });
export const csvHeader = "keyword,category,monthly_volume,snapshot_date";
export function CsvImport({
  onClose,
  onImported,
}: {
  readonly onClose: () => void;
  readonly onImported: (count: number) => void;
}) {
  const [csv, setCsv] = useState("");
  const [saving, setSaving] = useState(false);
  const [reading, setReading] = useState(false);
  const [formError, setFormError] = useState("");
  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setCsv("");
    if (file.size > 2 * 1024 * 1024) {
      setFormError("CSV 파일은 2MB 이하여야 합니다.");
      return;
    }
    setReading(true);
    try {
      setCsv(await file.text());
      setFormError("");
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      setFormError(await errorMessage(error));
    } finally {
      setReading(false);
    }
  }
  async function importCsv(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const raw: unknown = await api.post("import", { json: { csv } }).json();
      const result = ImportSchema.parse(raw);
      onImported(result.imported);
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      setFormError(await errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="CSV 데이터 가져오기" onClose={onClose}>
      <form
        onSubmit={(event) => void importCsv(event)}
        className="management-form"
      >
        <p className="muted small">
          파일을 선택하거나 헤더를 포함한 CSV를 붙여 넣으세요. 최대 2MB,
          10,000행까지 가져올 수 있습니다.
        </p>
        <label className="field import-file">
          CSV 파일
          <input
            type="file"
            disabled={reading || saving}
            accept=".csv,text/csv"
            onChange={(event) => void readFile(event)}
          />
        </label>
        <label className="field">
          CSV 내용
          <textarea
            className="csv-input"
            disabled={reading || saving}
            value={csv}
            onChange={(event) => setCsv(event.target.value)}
            required
            spellCheck={false}
            placeholder={csvHeader.trim()}
          />
          <small>
            monthly_volume에는 0 이상의 정수를 입력합니다. 실제 원본의 &lt;10
            값도 지원합니다.
          </small>
        </label>
        <p className="muted small">
          동일 키워드의 같은 수집일 데이터는 가져온 값으로 갱신됩니다. 원본을
          확인한 뒤 가져와 주세요.
        </p>
        {formError && <Notice error>{formError}</Notice>}
        <div className="form-actions">
          <Button onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={reading || saving || !csv.trim()}
          >
            {reading
              ? "파일 읽는 중…"
              : saving
                ? "가져오는 중…"
                : "데이터 가져오기"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
