import { useState, useEffect } from 'react'
import { Save, Settings } from 'lucide-react'
import { useApi, apiFetch } from '../hooks/useApi'

export default function SettingsPage() {
  const { data: settings, loading, refetch } = useApi('/api/settings/')
  const [form, setForm] = useState({})
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (settings) setForm(settings)
  }, [settings])

  async function handleSave() {
    await apiFetch('/api/settings/', {
      method: 'PUT',
      body: JSON.stringify({ settings: form }),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    refetch()
  }

  const fields = [
    { key: 'shop_name', label: 'Shop / Business Name', type: 'text', placeholder: 'My PisoNet Shop' },
    { key: 'cost_per_page', label: 'Print Cost Per Page (₱)', type: 'number', placeholder: '2.00', step: '0.50' },
    { key: 'currency', label: 'Currency Symbol', type: 'text', placeholder: 'PHP' },
    { key: 'scan_interval_seconds', label: 'Device Report Interval (seconds)', type: 'number', placeholder: '30' },
  ]

  return (
    <div className="p-6 max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Configure your pisonet business settings</p>
      </div>

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : (
        <div className="card space-y-5">
          {fields.map(({ key, label, type, placeholder, step }) => (
            <div key={key}>
              <label className="block text-sm text-gray-400 mb-1.5">{label}</label>
              <input
                type={type}
                step={step}
                value={form[key] || ''}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          ))}

          <button
            onClick={handleSave}
            className={`btn-primary flex items-center gap-2 w-full justify-center ${saved ? 'bg-green-600 hover:bg-green-600' : ''}`}
          >
            <Save size={15} />
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      )}

      <div className="card space-y-3">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Settings size={16} /> Agent Setup Guide
        </h3>
        <div className="text-sm text-gray-400 space-y-2">
          <p>1. Copy the <code className="bg-gray-800 px-1.5 py-0.5 rounded text-blue-400">agent/</code> folder to each pisonet PC.</p>
          <p>2. Install Python 3.10+ on each PC.</p>
          <p>3. Run: <code className="bg-gray-800 px-1.5 py-0.5 rounded text-blue-400">pip install -r requirements.txt</code></p>
          <p>4. Copy <code className="bg-gray-800 px-1.5 py-0.5 rounded text-blue-400">.env.example</code> to <code className="bg-gray-800 px-1.5 py-0.5 rounded text-blue-400">.env</code> and set your server URL and station name.</p>
          <p>5. Run: <code className="bg-gray-800 px-1.5 py-0.5 rounded text-blue-400">python agent.py</code></p>
          <p className="text-gray-500">To auto-start on Windows boot, add to Task Scheduler or create a startup shortcut.</p>
        </div>
      </div>
    </div>
  )
}
