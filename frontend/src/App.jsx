import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { Monitor, Printer, LayoutDashboard, Settings, Wifi, ScanSearch } from 'lucide-react'
import Dashboard from './pages/Dashboard'
import Devices from './pages/Devices'
import PrintJobs from './pages/PrintJobs'
import SettingsPage from './pages/SettingsPage'
import NetworkScan from './pages/NetworkScan'

function Sidebar() {
  const links = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/devices', icon: Monitor, label: 'Devices' },
    { to: '/network', icon: ScanSearch, label: 'Network Scan' },
    { to: '/print-jobs', icon: Printer, label: 'Print Jobs' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ]

  return (
    <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col min-h-screen">
      <div className="p-5 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Wifi className="text-blue-500" size={22} />
          <span className="font-bold text-white text-lg">PisoNet</span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">Management System</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {links.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              isActive
                ? 'flex items-center gap-3 px-3 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium'
                : 'flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 text-sm transition-colors'
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-800 text-xs text-gray-600">
        v1.0.0
      </div>
    </aside>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/devices" element={<Devices />} />
            <Route path="/network" element={<NetworkScan />} />
            <Route path="/print-jobs" element={<PrintJobs />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
