# 기여 안내

**hwpx-ts**에 기여해 주셔서 감사합니다. 이 문서는 TypeScript 모노레포 기준으로
로컬 개발 환경을 빠르게 준비하고, PR 전에 반드시 확인할 점을 정리합니다.

## 개발 워크플로우

1. 저장소를 포크/클론한 뒤 기능 브랜치를 만듭니다.
2. Node.js 20+와 pnpm 10을 준비합니다.
3. 루트에서 의존성을 설치합니다.

```bash
corepack enable
pnpm install
```

4. 변경한 패키지 기준으로 검증을 실행합니다.

```bash
# core 패키지 기본 검증
pnpm --filter @masteroflearning/hwpxcore typecheck
pnpm --filter @masteroflearning/hwpxcore test
pnpm --filter @masteroflearning/hwpxcore build
```

```bash
# editor/mcp/cli/tools를 수정했다면 해당 패키지도 같은 방식으로 검증
pnpm --filter @masteroflearning/hwpxeditor build
pnpm --filter @masteroflearning/hwpx-mcp test
pnpm --filter @masteroflearning/hwpx-cli build
pnpm --filter @masteroflearning/hwpx-tools build
```

## PR 체크리스트

- 동작이 바뀌면 관련 문서(README, 패키지 README, 필요 시 docs)도 함께 업데이트합니다.
- 커밋은 작고 명확하게 유지하고, PR 설명에는 변경 이유와 검증 명령을 포함합니다.
- PR 전에 `git status`로 불필요한 파일이 섞이지 않았는지 확인합니다.

## 문서 경로 안내

- TypeScript 사용법은 루트 `README.md`와 `packages/*/README.md`가 기준입니다.
- `docs/`는 현재 Sphinx 기반 문서 파이프라인이므로, 예제가 Python 중심일 수 있습니다.

작은 오타 수정부터 큰 기능 개선까지 모두 환영합니다. 함께 더 좋은 HWPX 도구를
만들어 갑시다.
