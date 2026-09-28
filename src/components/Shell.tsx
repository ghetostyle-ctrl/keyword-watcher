import {
  Activity,
  ArrowUpRight,
  ChevronDown,
  CircleHelp,
  Database,
  LayoutDashboard,
  Settings2,
  Tag,
} from "lucide-react";
import type { ReactNode } from "react";
import type { AppStatus } from "../../shared/contracts";
import { Badge } from "./ui";
export type Page = "dashboard" | "keywords" | "activity" | "settings";
const items = [
  { id: "dashboard", label: "키워드 트렌드", icon: LayoutDashboard },
  { id: "keywords", label: "추적 키워드", icon: Tag },
  { id: "activity", label: "수집 기록", icon: Activity },
  { id: "settings", label: "데이터 연결", icon: Settings2 },
] as const;
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
    <>
      <a className="skip-link" href="#main-content">
        본문으로 건너뛰기
      </a>
      <aside className="sidebar">
        <a href="#dashboard" className="brand" aria-label="키워드와처 홈">
          <img
            className="brand-icon"
            src="/brand-mark.svg?v=orange-black"
            width={32}
            height={32}
            alt=""
          />
          <span className="brand-name">
            키워드<span className="brand-accent">와처</span>
          </span>
        </a>
        <details className="workspace app-switcher">
          <summary className="workspace-label" aria-label="앱 선택">
            <span className="workspace-avatar">K</span>
            <div>
              <strong>키워드워처</strong>
              <span>검색량·시장 트렌드 추적</span>
            </div>
            <ChevronDown size={14} />
          </summary>
          <div className="workspace-menu" role="menu" aria-label="앱 선택">
            <a href="/" role="menuitem" aria-current="page">
              <span className="workspace-avatar">K</span>
              <span>
                <strong>키워드와처</strong>
                <small>검색량·시장 트렌드 추적</small>
              </span>
            </a>
            <a href="http://127.0.0.1:3001/" role="menuitem">
              <span className="workspace-avatar">S</span>
              <span>
                <strong>Success AI 광고수집기</strong>
                <small>구글·메타 광고 레퍼런스 수집</small>
              </span>
            </a>
            <a
              href="http://127.0.0.1:4317/"
              role="menuitem"
            >
              <span className="workspace-avatar">A</span>
              <span>
                <strong>AD FACTORY</strong>
                <small>광고 설계·제작·배포 자동화</small>
              </span>
            </a>
          </div>
        </details>
        <p className="nav-label">WORKSPACE</p>
        <nav aria-label="주 메뉴">
          {items.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="nav-item"
              aria-current={page === item.id ? "page" : undefined}
            >
              <item.icon size={18} strokeWidth={1.7} />
              {item.label}
              {item.id === "keywords" && status?.activeKeywords ? (
                <span className="nav-count">{status.activeKeywords}</span>
              ) : null}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span className="tip-icon">
              <Database size={17} />
            </span>
            <strong>
              데이터가 쌓이면,
              <br />
              인사이트가 보입니다.
            </strong>
            <p>
              하루 한 번의 수집으로
              <br />
              시장의 변화를 놓치지 마세요.
            </p>
            <a href="#settings">
              수집 설정하기 <ArrowUpRight size={14} />
            </a>
          </div>
          <a className="nav-item help-link" href="#guide">
            <CircleHelp size={18} />
            시작 가이드
          </a>
          <div className="workspace-user">
            <span className="user-avatar">나</span>
            <div>
              <strong>개인 워크스페이스</strong>
              <span>로컬 데이터 · SQLite</span>
            </div>
            <Badge>LOCAL</Badge>
          </div>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div className="breadcrumb">
            워크스페이스 <span>/</span>{" "}
            <strong>{items.find((i) => i.id === page)?.label}</strong>
          </div>
          <span className="connection-state">
            <i className={status?.configured ? "dot connected" : "dot"} />
            {status?.configured ? "네이버 API 설정됨" : "데이터 소스 연결 전"}
          </span>
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
    </>
  );
}
