import { useState } from 'react'
import { Printer, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { format } from 'date-fns'

const PAGE_SIZE = 20

export default function PrintJobs() {
  const [page, setPage] = useState(0)
  const { data, loading, refetch } = useApi(
    `/api/print-jobs/?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`
  )
  const { data: stats } = useApi('/api/print-jobs/stats')

  const jobs = data?.jobs || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Print Jobs</h1>
          <p className="text-gray-500 text-sm mt-0.5">{total} total jobs recorded</p>
        </div>
        <button onClick={refetch} className="btn-ghost flex items-center gap-2">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Today's Jobs", value: stats.today_jobs },
            { label: "Today's Pages", value: stats.today_pages },
            { label: "Today's Revenue", value: `₱${stats.today_revenue?.toFixed(2)}` },
            { label: "Total Revenue", value: `₱${stats.total_revenue?.toFixed(2)}` },
          ].map(({ label, value }) => (
            <div key={label} className="card py-3">
              <p className="text-gray-500 text-xs">{label}</p>
              <p className="text-xl font-bold text-white mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Top Stations */}
      {stats?.top_stations?.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Top Stations This Week</h3>
          <div className="space-y-2">
            {stats.top_stations.map((s) => (
              <div key={s.station} className="flex items-center gap-3">
                <span className="text-sm text-gray-300 w-24 truncate">{s.station}</span>
                <div className="flex-1 bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full"
                    style={{ width: `${Math.min((s.pages / (stats.top_stations[0]?.pages || 1)) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-sm text-gray-400 w-16 text-right">{s.pages} pages</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-gray-500 text-center py-12">Loading print jobs...</div>
      ) : jobs.length === 0 ? (
        <div className="card text-center text-gray-500 py-12">
          <Printer size={40} className="mx-auto mb-3 text-gray-700" />
          <p>No print jobs recorded yet.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800 text-left">
                <th className="pb-3 font-medium">#</th>
                <th className="pb-3 font-medium">Document</th>
                <th className="pb-3 font-medium">Station</th>
                <th className="pb-3 font-medium">Printer</th>
                <th className="pb-3 font-medium text-right">Pages</th>
                <th className="pb-3 font-medium text-right">Copies</th>
                <th className="pb-3 font-medium text-right">Total</th>
                <th className="pb-3 font-medium text-right">Cost (₱)</th>
                <th className="pb-3 font-medium text-right">Date & Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {jobs.map((job, i) => (
                <tr key={job.id} className="text-gray-300 hover:bg-gray-800/40">
                  <td className="py-2.5 text-gray-600 pr-3">{page * PAGE_SIZE + i + 1}</td>
                  <td className="py-2.5 pr-4 max-w-[200px] truncate">{job.document_name}</td>
                  <td className="py-2.5 pr-4">
                    <span className="text-blue-400">{job.station_name}</span>
                    <span className="text-gray-600 text-xs ml-1">({job.device_ip})</span>
                  </td>
                  <td className="py-2.5 pr-4 text-gray-500 text-xs">{job.printer_name}</td>
                  <td className="py-2.5 text-right">{job.pages}</td>
                  <td className="py-2.5 text-right">{job.copies}</td>
                  <td className="py-2.5 text-right font-medium">{job.total_pages}</td>
                  <td className="py-2.5 text-right text-green-400 font-medium">
                    ₱{job.total_cost.toFixed(2)}
                  </td>
                  <td className="py-2.5 text-right text-gray-500 text-xs">
                    {format(new Date(job.printed_at), 'MMM d, yyyy HH:mm')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>Page {page + 1} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="btn-ghost disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="btn-ghost disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
