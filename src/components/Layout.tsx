import { Outlet } from 'react-router-dom'
import { Nav } from './Nav'

declare const __BUILD_TIME__: string

export function Layout() {
  const buildTime = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : ''
  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1 container mx-auto px-4 py-6 max-w-4xl">
        <Outlet />
      </main>
      {buildTime && (
        <footer className="text-center text-xs text-stone-400 py-2">
          构建于 {new Date(buildTime).toLocaleString('zh-CN')} · 刷新后若此时间更新即已重新部署
        </footer>
      )}
    </div>
  )
}
