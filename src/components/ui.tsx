import {
  ArrowRight,
  CircleAlert,
  CircleCheck,
  Database,
  Info,
  LoaderCircle,
  X,
} from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useEffect, useRef } from "react";
export function Button({
  variant = "secondary",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  children: ReactNode;
}) {
  return (
    <button
      {...props}
      className={`btn btn-${variant} ${props.className ?? ""}`}
      type={props.type ?? "button"}
    >
      {children}
    </button>
  );
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "positive" | "warning" | "error";
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
const noticeIcons = {
  info: Info,
  success: CircleCheck,
  error: CircleAlert,
} as const;
export function Notice({
  children,
  error = false,
  tone = error ? "error" : "info",
}: {
  children: ReactNode;
  error?: boolean;
  tone?: keyof typeof noticeIcons;
}) {
  const Icon = noticeIcons[tone];
  return (
    <div
      className={`notice notice-${tone}`}
      role={tone === "error" ? "alert" : "status"}
    >
      <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-symbol">
        <Database size={20} strokeWidth={1.75} aria-hidden="true" />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function LoadingState() {
  return (
    <div className="empty" role="status">
      <LoaderCircle size={16} className="loader" aria-hidden="true" />
      <p>저장된 데이터를 불러오고 있습니다.</p>
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="dialog"
      onCancel={onClose}
      onClose={onClose}
      aria-labelledby="dialog-title"
    >
      <div className="dialog-head">
        <h2 id="dialog-title">{title}</h2>
        <Button
          variant="ghost"
          className="btn-icon"
          onClick={onClose}
          aria-label="닫기"
        >
          <X size={16} />
        </Button>
      </div>
      <div className="dialog-body">{children}</div>
    </dialog>
  );
}
export function Showcase() {
  return (
    <main
      className="stack"
      style={{ padding: "var(--s6)", maxWidth: 1000, margin: "auto" }}
    >
      <h1>키워드와처 · 컴포넌트</h1>
      <div className="cluster">
        <Button variant="primary">
          키워드 등록 <ArrowRight size={16} />
        </Button>
        <Button>새로고침</Button>
        <Button disabled>수집 중</Button>
        <Button variant="ghost">닫기</Button>
        <Button variant="danger">삭제</Button>
        <Badge>대기</Badge>
        <Badge tone="accent">수집 중</Badge>
        <Badge tone="positive">연결됨</Badge>
        <Badge tone="warning">연결 필요</Badge>
        <Badge tone="error">실패</Badge>
      </div>
      <div className="card">
        <h2>데이터 상태</h2>
        <EmptyState
          title="첫 번째 스냅샷을 기다리고 있어요"
          description="실제 데이터가 저장되면 트렌드가 표시됩니다."
        />
      </div>
      <label className="field">
        키워드
        <input placeholder="추적할 키워드 입력" />
      </label>
      <Notice>설정이 저장되었습니다.</Notice>
      <Notice tone="success">수집을 완료했습니다.</Notice>
      <Notice error>연결 정보를 확인해 주세요.</Notice>
      <LoadingState />
    </main>
  );
}
