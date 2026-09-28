import { Check, Database, ExternalLink, KeyRound } from "lucide-react";
import type { AppStatus } from "../../shared/contracts";
import { Badge, LoadingState } from "../components/ui";
export function SettingsSources({
  status,
}: {
  readonly status: AppStatus | null;
}) {
  return (
    <div className="settings-stack">
      <section className="card" aria-labelledby="api-title">
        <div className="section-head">
          <div className="section-title">
            <KeyRound size={16} />
            <h2 id="api-title">네이버 검색광고 API</h2>
          </div>
          {status && (
            <Badge tone={status.configured ? "positive" : "warning"}>
              {status.configured ? "설정 완료" : "설정 필요"}
            </Badge>
          )}
        </div>
        <p className="connection-description">
          키워드의 PC·모바일 월간{" "}검색량을 합산해 저장합니다. 아래 상태는
          인증 정보의 입력 여부이며, 실제 인증 결과는 수집 기록에서 확인하세요.
        </p>
        {!status ? (
          <LoadingState />
        ) : (
          <ul className="connection-list">
            {[
              { name: "API 라이선스 키", ready: status.apiKeySet },
              { name: "비밀 키", ready: status.secretKeySet },
              { name: "고객 ID", ready: status.customerIdSet },
            ].map((item) => (
              <li key={item.name}>
                <span>{item.name}</span>
                <Badge tone={item.ready ? "positive" : "neutral"}>
                  {item.ready && (
                    <Check size={12} strokeWidth={2} aria-hidden="true" />
                  )}{" "}
                  {item.ready ? "입력됨" : "미입력"}
                </Badge>
              </li>
            ))}
          </ul>
        )}
        <hr className="divider" />
        <ol className="settings-guide">
          <li>
            네이버 검색광고에서 API 이용 신청 후 라이선스 키, 비밀 키, 고객 ID를
            확인합니다.
          </li>
          <li>
            프로젝트의 <code>.env.example</code>을 <code>.env</code>로 복사하고
            아래 값을 입력합니다.
          </li>
        </ol>
        <pre className="code-block">
          <code>
            {
              "NAVER_SEARCHAD_API_KEY=\nNAVER_SEARCHAD_SECRET_KEY=\nNAVER_SEARCHAD_CUSTOMER_ID="
            }
          </code>
        </pre>
        <p className="muted small">
          저장 후 서버를 재시작하고, 키워드를 등록한 뒤 수집을 실행하세요.
        </p>
        <a
          className="settings-help"
          href="https://naver.github.io/searchad-apidoc/"
          target="_blank"
          rel="noreferrer"
        >
          검색광고 API 공식 문서
          <ExternalLink size={14} />
        </a>
      </section>
      <section className="card" aria-labelledby="source-title">
        <div className="section-head">
          <div className="section-title">
            <Database size={16} />
            <h2 id="source-title">데이터를 읽는 방법</h2>
          </div>
        </div>
        <p className="connection-description">
          검색광고 API는 월간{" "}검색량을, 데이터랩 Search Trend는 상대적인
          검색 추이를 제공합니다. 상대지수를 월간{" "}검색량으로 바꾸어 저장하지
          않습니다.
        </p>
        <p className="muted small">
          이 대시보드는 같은 키워드의 월간{" "}검색량 스냅샷을 날짜별로
          비교합니다. 7일 증감은 두 수집일의 월간{" "}검색량 차이이며, 지난
          7일간 발생한 검색 횟수가 아닙니다.
        </p>
        <a
          className="settings-help"
          href="https://developers.naver.com/notice/article/32530"
          target="_blank"
          rel="noreferrer"
        >
          Search Trend 발급 체계 변경 안내
          <ExternalLink size={14} />
        </a>
      </section>
    </div>
  );
}
