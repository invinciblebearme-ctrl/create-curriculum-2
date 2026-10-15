# 📖 future-curriculum: CREATE 미래학교 3D 전자책 서재 플랫폼

> **Cloudflare Pages, Functions, R2, D1** 및 **초고해상도 3D 단면 플립북 뷰어**로 구축된 CREATE 수업설계 모형 단원설계안 공유 서재입니다.
> 관리자 센터는 보안 비밀번호 인증으로 보호됩니다.

---

## 🌟 주요 기능 및 특장점

### 1. 📚 실물 도서 같은 단일 페이지(Portrait) 3D 종이책 뷰어
- **단면 표시 고정 (Single-Page Portrait)**: PC 및 모바일 화면 모두에서 2페이지 펼침이 아닌 **한 번에 한 페이지씩** 종이책을 넘기는 집중형 독서 환경 제공
- **슈퍼샘플링 초고해상도 렌더링**: 250% 고배율 확대 시에도 텍스트와 도표가 전혀 깨지지 않는 선명한 고화질 보장
- **3D 종이 질감 및 곡면 쉐이딩**: 마우스 모서리 드래그, 클릭, 모바일 터치 스와이프로 부드럽게 휘어지는 3D 플립북 애니메이션
- **PDF 원본 비율 유지**: A4 세로형 문서는 물론 가로형 규격의 슬라이드/책자도 비율 왜곡 없이 완벽 지원
- **인터랙션 툴바**: 확대/축소, 100% 리셋, 페이지 점프, 목차 드로어, 전체화면 지원

### 2. 🏛️ 방문자용 반응형 전자책 서재 (`create.allforedu.kr` 스타일)
- 16종 CREATE 모형 단원설계안 및 길잡이 도서 기본 내장
- 학년별/교과별 필터 탭 (1·2학년, 3·4학년, 5·6학년, 전담교과, 수업설계 길잡이)
- 실시간 통합 검색 및 최신순/제목순 정렬

### 3. 🛡️ 관리자 센터
- **비밀번호 인증**: 단일 비밀번호 기반 안전한 대시보드 진입
- **Cloudflare Functions 보안 연동**: 서버리스 엣지 API 인증 검증 및 보호
- **PDF 업로드 & 관리**: 신규 도서 등록, 실시간 공개/비공개 토글, 정보 수정, 삭제 지원

### 4. ⚡ Cloudflare 서버리스 엣지 아키텍처
- **Cloudflare Pages Functions**: RESTful 백엔드 API (`/api/books`, `/api/admin/...`)
- **Cloudflare R2**: PDF 원본 및 고화질 표지 이미지 바이너리 저장 (HTTP 206 Partial Content / Range 스트리밍 지원)
- **Cloudflare D1**: SQLite 기반 글로벌 분산 메타데이터 데이터베이스
- **로컬 하이브리드 폴백**: Cloudflare 연결 전 로컬 개발(`npm run dev`) 환경에서도 모든 기능(서재, 뷰어, 업로드, 수정, 삭제)을 즉시 테스트할 수 있는 내장 모의 스토리지 지원

---

## 🛠️ 기술 스택

| 영역 | 사용 기술 |
| :--- | :--- |
| **프런트엔드** | React 18, TypeScript, Vite, Tailwind CSS, React Router v6, Lucide React, TanStack Query |
| **PDF & 3D 엔진** | PDF.js (`pdfjs-dist`), StPageFlip (`page-flip`), HTML5 Canvas |
| **백엔드 (API)** | Cloudflare Pages Functions, Cloudflare Access JWT 미들웨어 |
| **스토리지 & DB** | Cloudflare R2 (PDF/Cover 바이너리), Cloudflare D1 (도서 메타데이터) |
| **배포 & CI/CD** | Cloudflare Pages, GitHub Actions, Wrangler CLI |

---

## 🚀 로컬 개발 및 실행 방법

### 1. 요구사항
- Node.js (v18.0 이상 권장, v24 지원)
- npm (v9.0 이상)

### 2. 프로젝트 의존성 설치
```bash
npm install
```

### 3. 로컬 개발 서버 실행
```bash
npm run dev
```
브라우저에서 `http://localhost:5173`으로 접속하면 서재, 3D 단면 뷰어, 관리자 대시보드를 즉시 체험할 수 있습니다.

### 4. 프로덕션 빌드 검증
```bash
npm run build
```
TypeScript 컴파일 및 Vite 프로덕션 번들링(`dist/`)이 생성됩니다.

---

## ☁️ Cloudflare 및 GitHub 배포 가이드

실제 프로덕션 도메인에 배포하고 Cloudflare의 분산 인프라를 연결하는 단계별 가이드입니다.

### 1단계: Cloudflare 계정 및 Wrangler 로그인
1. [Cloudflare 대시보드](https://dash.cloudflare.com/)에 회원가입 또는 로그인합니다.
2. 터미널에서 Cloudflare 계정에 로그인합니다:
   ```bash
   npx wrangler login
   ```

### 2단계: Cloudflare R2 버킷 생성
PDF 원본 문서와 표지 이미지를 보관할 R2 버킷을 생성합니다.
```bash
npx wrangler r2 bucket create flipbook-storage
```

### 3단계: Cloudflare D1 데이터베이스 생성 및 마이그레이션
1. D1 데이터베이스 생성:
   ```bash
   npx wrangler d1 create flipbook_db
   ```
2. 출력되는 `database_id`를 복사하여 `wrangler.jsonc` 파일의 `database_id` 항목에 입력합니다:
   ```jsonc
   "d1_databases": [
     {
       "binding": "DB",
       "database_name": "flipbook_db",
       "database_id": "여기에_출력된_DATABASE_ID_입력"
     }
   ]
   ```
3. SQL 스키마 마이그레이션 및 초기 시드 데이터 적용:
   ```bash
   # 로컬 개발용 적용 (선택)
   npx wrangler d1 execute flipbook_db --local --file=./migrations/0001_initial_schema.sql

   # 실제 Cloudflare 프로덕션 D1에 적용
   npx wrangler d1 execute flipbook_db --remote --file=./migrations/0001_initial_schema.sql
   ```

### 4단계: Cloudflare Access 관리자 인증 설정
1. Cloudflare 대시보드에서 **Zero Trust** > **Access** > **Applications**로 이동합니다.
2. **Add an application** > **Self-hosted**를 선택합니다.
3. 애플리케이션 이름: `Flipbook Admin` 입력
4. 애플리케이션 경로: `your-domain.pages.dev/admin*` 및 `your-domain.pages.dev/api/admin*` 지정
5. **Policy** 생성:
   - Action: `Allow`
   - Include: `Emails` 선택 후 **본인의 관리자 이메일** 입력
6. 애플리케이션 생성 후 발급되는 **Application Audience (AUD)** 값을 확인합니다.

### 5단계: GitHub 저장소 생성 및 푸시
1. GitHub에서 신규 레포지토리를 생성합니다.
2. 로컬 코드를 푸시합니다:
   ```bash
   git init
   git add .
   git commit -m "feat: initial commit of 3d flipbook platform"
   git branch -M main
   git remote add origin https://github.com/사용자이름/저장소이름.git
   git push -u origin main
   ```

### 6단계: Cloudflare Pages 연결 및 배포
1. Cloudflare 대시보드에서 **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**을 선택합니다.
2. 방금 푸시한 GitHub 저장소를 선택합니다.
3. 빌드 설정:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. **Environment Variables (환경 변수)** 설정:
   - `ADMIN_EMAIL`: 관리자 이메일 주소 (예: `admin@yourdomain.com`)
   - `CF_ACCESS_AUD`: 4단계에서 확인한 Access AUD 태그
   - `CF_ACCESS_TEAM_DOMAIN`: `your-team.cloudflareaccess.com`
5. **R2 및 D1 바인딩 연결**:
   - Pages 프로젝트의 **Settings** > **Functions** 메뉴로 이동합니다.
   - **D1 database bindings**: Variable name = `DB`, Database = `flipbook_db`
   - **R2 bucket bindings**: Variable name = `R2_BUCKET`, Bucket = `flipbook-storage`
6. **Save and Deploy**를 클릭하면 빌드 및 전 세계 엣지 네트워크 배포가 완료됩니다!

---

## 🔒 보안 아키텍처

- **Cloudflare Access JWT 검증**: 관리자 API 요청마다 `Cf-Access-Jwt-Assertion` 헤더의 유효성, 만료 시간(exp), 발급자, Audience(aud), 허용된 관리자 이메일을 서버 사이드에서 엄격히 검증합니다.
- **R2 비공개 격리**: R2 버킷의 퍼블릭 읽기 액세스는 비활성화되어 있으며, Pages Functions가 도서의 공개 여부(`is_published`)를 확인한 후 스트리밍합니다.
- **안전한 스트리밍**: HTTP Range 헤더 지원을 통해 대용량 PDF 문서도 필요한 바이트 범위만 부분 다운로드(HTTP 206)하여 메모리와 대역폭을 최적화합니다.
- **SQL Injection 방지**: D1 질의 시 `prepare().bind(...)` 매개변수화 바인딩을 전면 적용하였습니다.

---

## 📁 프로젝트 디렉터리 구조

```text
├── functions/                     # Cloudflare Pages Functions (백엔드 API)
│   ├── api/
│   │   ├── admin/
│   │   │   ├── auth/verify.ts     # 관리자 인증 검증
│   │   │   └── books/             # 관리자 도서 등록/수정/삭제
│   │   └── books/                 # 방문자용 도서 조회 및 R2 PDF/표지 스트리밍
│   ├── middleware/                # Cloudflare Access JWT 미들웨어
│   └── types.ts                   # Functions 환경 바인딩 타입
├── migrations/                    # Cloudflare D1 마이그레이션 SQL
│   └── 0001_initial_schema.sql
├── src/
│   ├── components/
│   │   ├── admin/                 # 관리자 대시보드 & 스마트 업로드 모달
│   │   ├── common/                # 글로벌 헤더 등 공통 컴포넌트
│   │   ├── library/               # 방문자 서재 책 카드 및 필터 바
│   │   └── viewer/                # StPageFlip 단면 3D 종이책 뷰어
│   ├── lib/                       # PDF.js 워커 및 첫 페이지 표지 자동 추출기
│   ├── pages/                     # 서재, 관리자, 전용 뷰어 라우트
│   ├── services/api.ts            # Cloudflare & 로컬 하이브리드 API 계층
│   ├── types/                     # TypeScript 데이터 모델
│   ├── App.tsx                    # React Router 라우팅
│   └── main.tsx                   # 메인 진입점
├── wrangler.jsonc                 # Cloudflare 바인딩 설정
├── tailwind.config.js             # 감성 디지털 서재 디자인 테마
├── vite.config.ts                 # Vite 번들러 설정
└── package.json
```
