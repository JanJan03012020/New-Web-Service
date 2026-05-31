import { useEffect, useState } from 'react'
import { Monitor, Wifi, WifiOff, Printer, Banknote, FileText, Activity } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line
} from 'recharts'
import StatCard from '../components/StatCard'
import DeviceCard from '../components/DeviceCard'
import { useWebSocket } from '../hooks/useWebSocket'
import { useApi } from '../hooks/useApi'
import { formatDistanceToNow } from 'date-fns'

export default function Dashboard() {
  const { data: wsData, connected } = useWebSocket()
  const { data: printStats } = useApi('/api/print-jobs/stats')
  const { data: dailySummary } = useApi('/api/print-jobs/daily-summary?days=7')

  const devices = wsData?.devices || []
  const stats = wsData?.stats || {}
  const recentJobs = wsData?.recent_print_jobs || []

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Real-time pisonet overview</p>
        </div>
        <div className={`flex items-center gap-2 text-sm ${connected ? 'text-green-400' : 'text-red-400'}`}>
          <Activity size={14} className={connected ? 'animate-pulse' : ''} />
          {connected ? 'Live' : 'Reconnecting...'}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Monitor} label="Total Devices" value={stats.total || 0} color="blue" />
        <StatCard icon={Wifi} label="Online Now" value={stats.online || 0} color="green" />
        <StatCard icon={WifiOff} label="Offline" value={stats.offline || 0} color="red" />
        <StatCard
          icon={Printer}
          label="Today Prints"
          value={printStats?.today_jobs || 0}
          sub={`${printStats?.today_pages || 0} pages`}
          color="purple"
        />
      </div>

      {/* Revenue + Print Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon={Banknote}
          label="Today Revenue"
          value={`₱${(printStats?.today_revenue || 0).toFixed(2)}`}
          sub="Print income today"
          color="yellow"
        />
        <StatCard
          icon={Banknote}
          label="Total Revenue"
          value={`₱${(printStats?.total_revenue || 0).toFixed(2)}`}
          sub="All time"
          color="yellow"
        />
        <StatCard
          icon={FileText}
          label="Total Pages"
          value={printStats?.total_pages || 0}
          sub="All time"
          color="purple"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-base font-semibold text-white mb-4">Daily Print Revenue (7 days)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailySummary || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
              <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} tickFormatter={v => `₱${v}`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                formatter={(v) => [`₱${v}`, 'Revenue']}
              />
              <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="text-base font-semibold text-white mb-4">Daily Pages Printed (7 days)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={dailySummary || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
              <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                formatter={(v) => [v, 'Pages']}
              />
              <Line type="monotone" dataKey="pages" stroke="#a855f7" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Devices Grid */}
      <div>
        <h2 className="text-base font-semibold text-white mb-3">
          Connected Devices ({devices.length})
        </h2>
        {devices.length === 0 ? (
          <div className="card text-center text-gray-500 py-10">
            No devices detected yet. Install the agent on each PC.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {devices.map((d) => <DeviceCard key={d.id} device={d} />)}
          </div>
        )}
      </div>

      {/* Recent Print Jobs */}
      <div>
        <h2 className="text-base font-semibold text-white mb-3">Recent Print Jobs</h2>
        {recentJobs.length === 0 ? (
          <div className="card text-center text-gray-500 py-8">No print jobs recorded yet.</div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-800 text-left">
                  <th className="pb-3 font-medium">Document</th>
                  <th className="pb-3 font-medium">Station</th>
                  <th className="pb-3 font-medium">Printer</th>
                  <th className="pb-3 font-medium text-right">Pages</th>
                  <th className="pb-3 font-medium text-right">Cost</th>
                  <th className="pb-3 font-medium text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {recentJobs.map((job) => (
                  <tr key={job.id} className="text-gray-300 hover:bg-gray-800/50">
                    <td className="py-2.5 pr-4 truncate max-w-[180px]">{job.document_name}</td>
                    <td className="py-2.5 pr-4">{job.station_name}</td>
                    <td className="py-2.5 pr-4 text-gray-500 text-xs">{job.printer_name}</td>
                    <td className="py-2.5 text-right">{job.total_pages}</td>
                    <td className="py-2.5 text-right text-green-400">₱{job.total_cost.toFixed(2)}</td>
                    <td className="py-2.5 text-right text-gray-500 text-xs">
                      {formatDistanceToNow(new Date(job.printed_at), { addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
