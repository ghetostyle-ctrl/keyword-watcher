import {
  Activity,
  ArrowUpRight,
  Check,
  ChevronRight,
  ChevronsUpDown,
  CircleHelp,
  LayoutDashboard,
  Settings2,
  Tag,
} from "lucide-react";
import type { ReactNode } from "react";
import type { AppStatus } from "../../shared/contracts";
export type Page = "dashboard" | "keywords" | "activity" | "settings";
const items = [
  { id: "dashboard", label: "키워드 트렌드", icon: LayoutDashboard },
  { id: "keywords", label: "추적 키워드", icon: Tag },
  { id: "activity", label: "수집 기록", icon: Activity },
  { id: "settings", label: "데이터 연결", icon: Settings2 },
] as const;
function ConnectionState({
  status,
  className,
}: {
  status: AppStatus | null;
  className: string;
}) {
  return (
    <span className={className}>
      <i className={status?.configured ? "dot connected" : "dot"} />
      {status?.configured ? "네이버 API 설정됨" : "데이터 소스 연결 전"}
    </span>
  );
}
export function Shell({
  page,
  status,
  children,
}: {
  page: Page;
  status: AppStatus | null;
  children: ReactNode;
}) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        본문으로 건너뛰기
      </a>
      <aside className="sidebar">
        <div className="sidebar-top">
          <a href="#dashboard" className="brand" aria-label="키워드와처 홈">
            <img
              className="brand-icon"
              src="/brand-mark.svg?v=suite1"
              width={32}
              height={32}
              alt=""
            />
            <span className="brand-text">
              <span className="brand-name">
                키워드<span className="brand-accent">와처</span>
              </span>
              <small className="brand-sub">검색량 흐름을 기록하는 곳</small>
            </span>
          </a>
          <ConnectionState
            status={status}
            className="connection-state sidebar-connection"
          />
          <details className="workspace app-switcher">
            <summary className="workspace-label" aria-label="앱 선택">
              <span className="workspace-avatar app-avatar-trendwatch">K</span>
              <div>
                <strong>키워드워처</strong>
                <span>검색량·시장 트렌드 추적</span>
              </div>
              <ChevronsUpDown size={14} strokeWidth={1.75} aria-hidden="true" />
            </summary>
            <div className="workspace-menu" role="menu" aria-label="앱 선택">
              <p className="workspace-menu-title" aria-hidden="true">
                AD 스위트
              </p>
              <a href="/" role="menuitem" aria-current="page">
                <span className="workspace-avatar app-avatar-trendwatch">
                  K
                </span>
                <span>
                  <strong>키워드와처</strong>
                  <small>검색량·시장 트렌드 추적</small>
                </span>
                <Check
                  className="workspace-current"
                  size={14}
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              </a>
              <a href="http://127.0.0.1:3001/" role="menuitem">
                <span className="workspace-avatar app-avatar-successai">S</span>
                <span>
                  <strong>Success AI 광고수집기</strong>
                  <small>구글·메타 광고 레퍼런스 수집</small>
                </span>
              </a>
              <a href="http://127.0.0.1:4317/" role="menuitem">
                <span className="workspace-avatar app-avatar-adfactory">A</span>
                <span>
                  <strong>AD FACTORY</strong>
                  <small>광고 설계·제작·배포 자동화</small>
                </span>
              </a>
            </div>
          </details>
        </div>
        <nav aria-label="주 메뉴">
          {items.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="nav-item"
              aria-current={page === item.id ? "page" : undefined}
            >
              <item.icon size={16} strokeWidth={1.75} aria-hidden="true" />
              {item.label}
              {item.id === "keywords" && status?.activeKeywords ? (
                <span className="nav-count">{status.activeKeywords}</span>
              ) : null}
            </a>
          ))}
        </nav>
        <div className="sidebar-footer">
          <a className="nav-item help-link" href="#guide">
            <CircleHelp size={16} strokeWidth={1.75} aria-hidden="true" />
            시작 가이드
          </a>
          <p className="sidebar-note">
            하루 한 번의 수집으로 시장의 변화를 놓치지 마세요.{" "}
            <a href="#settings">
              수집 설정하기 <ArrowUpRight size={12} aria-hidden="true" />
            </a>
          </p>
          <p className="local-note">
            <i className={status ? "dot connected" : "dot"} />
            개인 워크스페이스 · 로컬 데이터 · SQLite
          </p>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <nav className="breadcrumb" aria-label="현재 위치">
            <span>워크스페이스</span>
            <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
            <strong aria-current="page">
              {items.find((i) => i.id === page)?.label}
            </strong>
          </nav>
          <ConnectionState status={status} className="connection-state" />
        </header>
        <main id="main-content" className="content">
          {children}
        </main>
        <footer className="footer">
          <span>키워드와처 · 매일 발견하는 시장의 변화</span>
          <span>
            실제 저장 데이터 기준 <span className="footer-dot">·</span>{" "}
            Asia/Seoul
          </span>
        </footer>
      </div>
    </div>
  );
}
