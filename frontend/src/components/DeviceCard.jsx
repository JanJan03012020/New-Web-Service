import { Monitor, Printer, Wifi, WifiOff } from 'lucide-react'

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

export default function DeviceCard({ device }) {
  return (
    <div className={`card transition-all ${device.is_online ? 'border-gray-700' : 'opacity-60'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Monitor size={18} className={device.is_online ? 'text-blue-400' : 'text-gray-600'} />
          <span className="font-semibold text-white">{device.station_name || device.hostname}</span>
        </div>
        {device.is_online ? (
          <span className="badge-online">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Online
          </span>
        ) : (
          <span className="badge-offline">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
            Offline
          </span>
        )}
      </div>

      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">IP Address</span>
          <span className="font-mono text-gray-300">{device.ip_address}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">MAC</span>
          <span className="font-mono text-gray-400 text-xs">{device.mac_address}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Hostname</span>
          <span className="text-gray-300">{device.hostname}</span>
        </div>
        {device.is_online && (
          <>
            <div className="flex justify-between">
              <span className="text-gray-500">↑ Sent</span>
              <span className="text-gray-300">{formatBytes(device.bytes_sent)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">↓ Received</span>
              <span className="text-gray-300">{formatBytes(device.bytes_received)}</span>
            </div>
          </>
        )}
      </div>

      {device.has_printer && (
        <div className="mt-3 pt-3 border-t border-gray-800 flex items-center gap-2 text-xs text-green-400">
          <Printer size={13} />
          <span>{device.printer_name || 'Printer connected'}</span>
        </div>
      )}
    </div>
  )
}
