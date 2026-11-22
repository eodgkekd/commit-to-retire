import { Component, type ErrorInfo, type ReactNode } from 'react'

const SAVE_KEY = 'commit-to-retire-save-v1'

/**
 * 화면을 그리다 오류가 나면 흰 화면 대신 안내와 복구 버튼을 보여준다.
 * 저장 데이터 때문에 계속 터지는 경우에 대비해 저장을 지우는 길을 남겨 둔다.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('화면 오류', error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children

    const button = 'w-full rounded-2xl py-4 text-base font-semibold'
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-4 bg-white px-5 py-6">
        <p className="text-5xl">🧯</p>
        <h1 className="text-2xl font-bold text-gray-900">문제가 생겼어요</h1>
        <p className="text-gray-600">
          화면을 그리다가 오류가 났어요. 다시 불러와도 같은 화면이 나오면 저장된 커리어를 지우고 처음부터 시작할 수 있어요.
        </p>
        <button type="button" className={`${button} bg-blue-500 text-white`} onClick={() => window.location.reload()}>
          다시 불러오기
        </button>
        <button
          type="button"
          className={`${button} bg-white text-red-500 ring-1 ring-red-200`}
          onClick={() => {
            try {
              window.localStorage.removeItem(SAVE_KEY)
            } catch {
              // 저장소를 못 쓰는 환경이면 그냥 새로 불러온다
            }
            window.location.reload()
          }}
        >
          저장을 지우고 처음부터
        </button>
      </div>
    )
  }
}
