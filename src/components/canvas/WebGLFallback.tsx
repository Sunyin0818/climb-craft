'use client';

import { useState } from 'react';

let cachedWebGLSupport: boolean | null = null;

export const checkWebGLSupport = () => {
  if (cachedWebGLSupport !== null) return cachedWebGLSupport;
  if (typeof window === 'undefined') return true;
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    const support = !!(window.WebGLRenderingContext && gl);
    if (gl) {
      const loseContext = gl.getExtension('WEBGL_lose_context');
      if (loseContext) loseContext.loseContext();
    }
    cachedWebGLSupport = support;
    return support;
  } catch {
    cachedWebGLSupport = false;
    return false;
  }
};

export function useWebGLState() {
  const [hasWebGL] = useState(checkWebGLSupport);
  const [contextLost, setContextLost] = useState(false);
  return { hasWebGL, contextLost, setContextLost };
}

export default function WebGLFallback({ contextLost }: { contextLost: boolean }) {
  return (
    <div className="w-full h-full bg-neutral-900 border-none flex flex-col items-center justify-center p-8 m-0 text-white font-sans">
      <svg className="w-20 h-20 text-red-500 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <h2 className="text-2xl font-bold mb-4 tracking-wider">{contextLost ? 'WebGL 上下文丢失' : '3D 引擎启动失败'}</h2>
      <p className="text-white/70 max-w-lg text-center leading-relaxed mb-6">
        {contextLost
          ? '由于 GPU 资源不足或 RDP 连接环境变化，3D 视图已断开。'
          : '您的浏览器设备未能创建 WebGL 渲染上下文。'}
      </p>
      {contextLost && (
        <button
          onClick={() => window.location.reload()}
          className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white px-8 py-3 rounded-full transition-all font-bold"
        >
          刷新以恢复 (Reload)
        </button>
      )}
    </div>
  );
}
