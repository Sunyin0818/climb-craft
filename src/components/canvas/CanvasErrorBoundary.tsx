'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class CanvasErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('Canvas render error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full bg-neutral-900 flex flex-col items-center justify-center p-8 text-white font-sans">
          <svg className="w-16 h-16 text-amber-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-bold mb-3">3D 渲染异常</h2>
          <p className="text-white/60 text-center mb-6">场景渲染时发生错误，请刷新页面重试。</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-6 py-2 rounded-full transition-all font-medium"
          >
            刷新页面
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
