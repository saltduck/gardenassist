import { Link, useLocation } from 'react-router-dom'

const links = [
  { to: '/', label: '仪表盘' },
  { to: '/plants', label: '植物' },
  { to: '/plants/new', label: '添加植物' },
  { to: '/tasks', label: '待办' },
  { to: '/calendar', label: '日历' },
]

export function Nav() {
  const location = useLocation()

  return (
    <nav className="bg-emerald-800 text-white shadow">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="flex items-center gap-6 h-12">
          <Link to="/" className="font-semibold text-emerald-100 hover:text-white">
            花园助手
          </Link>
          {links.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`px-2 py-1 rounded transition ${
                location.pathname === to || (to !== '/' && location.pathname.startsWith(to))
                  ? 'bg-emerald-700 text-white'
                  : 'text-emerald-100 hover:bg-emerald-700/50 hover:text-white'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
