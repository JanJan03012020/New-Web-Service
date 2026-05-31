import { useState, useEffect, useRef } from 'react'
import {
  ScanSearch, Wifi, Network, Router, Monitor, Laptop,
  RefreshCw, CheckCircle, Clock, AlertCircle, Server
} from 'lucide-react'
import { apiFetch } from '../hooks/useApi'
import { formatDistanceToNow } from 'date-fns'

function DeviceTypeIcon({ device }) {
  if (device.is_gateway) return <Router size={18} className="text-orange-400" />
  if (device.is_self)    return <Server size={18} className="text-blue-400" />
  return <Monitor size={18} className="text-gray-400" />
}

function ConnectionBadge({ type }) {
  const isWifi = type === 'Wireless'
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
      isWifi ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
    }`}>
      {isWifi ? <Wifi size={10} /> : <Network size={10} />}
      {type}
    </span>
  )
}

export default function NetworkScan() {
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [percent, setPercent] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [netInfo, setNetInfo] = useState(null)
  const [history, setHistory] = useState([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const pollRef = useRef(null)

  useEffect(() => {
    apiFetch('/api/network/info').then(setNetInfo).catch(() => {})
    loadHistory()
    return () => clearInterval(pollRef.current)
  }, [])

  async function loadHistory() {
    try {
      const h = await apiFetch('/api/network/scan/history')
      setHistory(h)
    } catch {}
  }

  async function startScan() {
    setScanning(true)
    setError(null)
    setResult(null)
    setProgress(0)
    setPercent(0)

    try {
      await apiFetch('/api/network/scan/start', { method: 'POST' })
    } catch (e) {
      setError('Failed to start scan')
      setScanning(false)
      return
    }

    // Poll for status
    pollRef.current = setInterval(async () => {
      try {
        const status = await apiFetch('/api/network/scan/status')
        setProgress(status.progress)
        setPercent(status.percent)

        if (status.error) {
          setError(status.error)
          setScanning(false)
          clearInterval(pollRef.current)
          return
        }

        if (!status.running && status.has_result) {
          clearInterval(pollRef.current)
          const res = await apiFetch('/api/network/scan/result')
          setResult(res)
          setScanning(false)
          loadHistory()
        }
      } catch {}
    }, 800)
  }

  async function loadHistoryScan(id) {
    try {
      const res = await apiFetch(`/api/network/scan/history/${id}`)
      setResult(res)
    } catch {}
  }

  const devices = result?.devices || []

  const filtered = devices.filter((d) => {
    if (filter === 'gateway' && !d.is_gateway) return false
    if (filter === 'wireless' && d.connection_type !== 'Wireless') return false
    if (search) {
      const q = search.toLowerCase()
      return (
        d.ip_address.includes(q) ||
        d.mac_address.toLowerCase().includes(q) ||
        d.hostname.toLowerCase().includes(q) ||
        d.vendor.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Network Scanner</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Detect all devices connected to the router — wired and wireless
          </p>
        </div>
        <button
          onClick={startScan}
          disabled={scanning}
          className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {scanning
            ? <RefreshCw size={15} className="animate-spin" />
            : <ScanSearch size={15} />
          }
          {scanning ? `Scanning… ${percent}%` : 'Start Scan'}
        </button>
      </div>

      {/* Network Info Banner */}
      {netInfo && (
        <div className="card flex flex-wrap gap-6 py-3">
          <div>
            <p className="text-xs text-gray-500">Server IP</p>
            <p className="font-mono text-white font-semibold">{netInfo.local_ip}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Network Range</p>
            <p className="font-mono text-white font-semibold">{netInfo.network}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Hosts to Scan</p>
            <p className="font-mono text-white font-semibold">{netInfo.total_hosts}</p>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {scanning && (
        <div className="card space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Scanning network…</span>
            <span className="text-blue-400 font-mono">{percent}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-xs text-gray-600">{progress} of {result?.total_scanned || netInfo?.total_hosts || '...'} hosts checked</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <AlertCircle size={16} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Result Summary */}
      {result && !scanning && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Devices Found', value: result.devices_found, color: 'text-green-400' },
            { label: 'Network', value: result.network, color: 'text-blue-400' },
            { label: 'Hosts Scanned', value: result.total_scanned, color: 'text-gray-300' },
            {
              label: 'Scanned At',
              value: formatDistanceToNow(new Date(result.scanned_at), { addSuffix: true }),
              color: 'text-gray-400',
            },
          ].map(({ label, value, color }) => (
            <div key={label} className="card py-3">
              <p className="text-gray-500 text-xs">{label}</p>
              <p className={`font-semibold mt-0.5 text-sm ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters + Search */}
      {result && (
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex gap-1.5">
            {['all', 'gateway', 'wireless'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-colors ${
                  filter === f ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {f === 'all' ? `All (${devices.length})` : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <input
            className="flex-1 min-w-[180px] bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
            placeholder="Search IP, MAC, hostname, vendor…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* Device Table */}
      {result && filtered.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800 text-left">
                <th className="pb-3 font-medium w-8">#</th>
                <th className="pb-3 font-medium">IP Address</th>
                <th className="pb-3 font-medium">MAC Address</th>
                <th className="pb-3 font-medium">Hostname</th>
                <th className="pb-3 font-medium">Vendor</th>
                <th className="pb-3 font-medium">Connection</th>
                <th className="pb-3 font-medium">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtered.map((d, i) => (
                <tr
                  key={d.ip_address}
                  className={`hover:bg-gray-800/40 transition-colors ${
                    d.is_self ? 'bg-blue-500/5' : d.is_gateway ? 'bg-orange-500/5' : ''
                  }`}
                >
                  <td className="py-2.5 text-gray-600 pr-3">{i + 1}</td>
                  <td className="py-2.5 pr-4">
                    <span className="font-mono text-white font-semibold">{d.ip_address}</span>
                    {d.is_self && (
                      <span className="ml-2 text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">This Server</span>
                    )}
                    {d.is_gateway && (
                      <span className="ml-2 text-xs bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded">Gateway</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-gray-400 text-xs">{d.mac_address}</td>
                  <td className="py-2.5 pr-4 text-gray-300 max-w-[180px] truncate">{d.hostname}</td>
                  <td className="py-2.5 pr-4 text-gray-400 text-xs">{d.vendor}</td>
                  <td className="py-2.5 pr-4"><ConnectionBadge type={d.connection_type} /></td>
                  <td className="py-2.5">
                    <DeviceTypeIcon device={d} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result && filtered.length === 0 && (
        <div className="card text-center text-gray-500 py-10">No devices match the filter.</div>
      )}

      {/* Scan History */}
      {history.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-white mb-3">Scan History</h2>
          <div className="card divide-y divide-gray-800">
            {history.map((h) => (
              <button
                key={h.id}
                onClick={() => loadHistoryScan(h.id)}
                className="w-full flex items-center justify-between py-3 hover:bg-gray-800/40 px-2 rounded-lg text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Clock size={14} className="text-gray-600" />
                  <span className="text-gray-400 text-sm">
                    {formatDistanceToNow(new Date(h.scanned_at), { addSuffix: true })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-400 text-sm font-medium">{h.devices_found} devices</span>
                  <CheckCircle size={13} className="text-green-500" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {!result && !scanning && (
        <div className="card text-center text-gray-500 py-16">
          <ScanSearch size={48} className="mx-auto mb-4 text-gray-700" />
          <p className="text-lg font-medium text-gray-400">No scan results yet</p>
          <p className="text-sm mt-1">Click <span className="text-blue-400">Start Scan</span> to discover all devices on your network</p>
        </div>
      )}
    </div>
  )
}
