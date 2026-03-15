import { Outlet } from 'react-router-dom'
import { Nav } from './Nav'

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1 container mx-auto px-4 py-6 max-w-4xl">
        <Outlet />
      </main>
    </div>
  )
}
