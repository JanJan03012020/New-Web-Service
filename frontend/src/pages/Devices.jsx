import { useState } from 'react'
import { Monitor, RefreshCw, Pencil, Trash2 } from 'lucide-react'
import DeviceCard from '../components/DeviceCard'
import { useApi, apiFetch } from '../hooks/useApi'

export default function Devices() {
  const { data: devices, loading, refetch } = useApi('/api/devices/')
  const [editId, setEditId] = useState(null)
  const [editName, setEditName] = useState('')
  const [filter, setFilter] = useState('all')

  const filtered = (devices || []).filter((d) => {
    if (filter === 'online') return d.is_online
    if (filter === 'offline') return !d.is_online
    if (filter === 'printer') return d.has_printer
    return true
  })

  async function saveEdit(id) {
    await apiFetch(`/api/devices/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ station_name: editName }),
    })
    setEditId(null)
    refetch()
  }

  async function deleteDevice(id) {
    if (!confirm('Remove this device from the system?')) return
    await apiFetch(`/api/devices/${id}`, { method: 'DELETE' })
    refetch()
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Devices</h1>
          <p className="text-gray-500 text-sm mt-0.5">{(devices || []).length} registered devices</p>
        </div>
        <button onClick={refetch} className="btn-ghost flex items-center gap-2">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'online', 'offline', 'printer'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-colors ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {f === 'printer' ? 'Has Printer' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-gray-500 text-center py-12">Loading devices...</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center text-gray-500 py-12">
          <Monitor size={40} className="mx-auto mb-3 text-gray-700" />
          <p>No devices found. Install the agent on each PC.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((d) => (
            <div key={d.id} className="relative group">
              <DeviceCard device={d} />
              <div className="absolute top-3 right-3 hidden group-hover:flex gap-1">
                <button
                  onClick={() => { setEditId(d.id); setEditName(d.station_name || '') }}
                  className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => deleteDevice(d.id)}
                  className="p-1.5 bg-gray-800 hover:bg-red-900 rounded-lg text-gray-400 hover:text-red-400"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="card w-80 space-y-4">
            <h3 className="font-semibold text-white">Rename Station</h3>
            <input
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Station name (e.g. PC-01)"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && saveEdit(editId)}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditId(null)} className="btn-ghost">Cancel</button>
              <button onClick={() => saveEdit(editId)} className="btn-primary">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
