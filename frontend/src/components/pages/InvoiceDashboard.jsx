// frontend/src/components/pages/InvoiceDashboard.jsx
import { useState, useEffect } from "react"
import { FiPlus, FiSearch, FiEye } from "react-icons/fi"
import { API_URL } from "../../config"

export default function InvoiceDashboard({ setCurrentPage }) {
  const [invoices, setInvoices] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => { fetchInvoices() }, [])

  const fetchInvoices = async () => {
    try {
      const response = await fetch(`${API_URL}/api/invoices`)
      let data = []
      try {
        data = await response.json()
      } catch (_) {
        data = []
      }
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.invoices)
        ? data.invoices
        : Array.isArray(data?.data)
        ? data.data
        : []
      setInvoices(list)
    } catch (error) {
      console.error("Error fetching invoices:", error)
      setInvoices([])
    } finally {
      setLoading(false)
    }
  }

  const filtered = (Array.isArray(invoices) ? invoices : []).filter(
    (inv) =>
      (inv.invoicenumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.supplier || "").toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const uploadInvoice = async () => {
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch(`${API_URL}/api/invoices/upload`, { method: "POST", body: fd })
      const data = await res.json()
      if (data.id) {
        setShowUpload(false)
        setFile(null)
        setCurrentPage(`invoice-detail-${data.id}`)
      }
    } catch (e) {
      console.error("Upload error:", e)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-8 mt-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" style={{ color: "#714B67" }}>Invoices</h1>
        <p style={{ color: "#8F8F9F" }}>Upload, extract, verify and convert to receipts</p>
      </div>

      <div className="flex gap-4 mb-6">
        <button onClick={() => setShowUpload(true)} className="btn-primary flex items-center gap-2">
          <FiPlus className="w-5 h-5" /> Upload New Invoice
        </button>
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: "#8F8F9F" }} />
          <input
            type="text"
            placeholder="Search by invoice number or supplier..."
            className="input-field pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p style={{ color: "#8F8F9F" }}>Loading invoices...</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2" style={{ borderColor: "#714B67" }}>
                <th className="text-left py-3 px-4 font-semibold" style={{ color: "#714B67" }}>Invoice #</th>
                <th className="text-left py-3 px-4 font-semibold" style={{ color: "#714B67" }}>Supplier</th>
                <th className="text-left py-3 px-4 font-semibold" style={{ color: "#714B67" }}>Date</th>
                <th className="text-left py-3 px-4 font-semibold" style={{ color: "#714B67" }}>Total</th>
                <th className="text-left py-3 px-4 font-semibold" style={{ color: "#714B67" }}>Status</th>
                <th className="text-left py-3 px-4 font-semibold" style={{ color: "#714B67" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8" style={{ color: "#8F8F9F" }}>
                    No invoices found. Click Upload New Invoice.
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => (
                  <tr key={inv.id} className="table-row">
                    <td className="py-3 px-4 font-mono" style={{ color: "#714B67" }}>{inv.invoicenumber || "—"}</td>
                    <td className="py-3 px-4" style={{ color: "#4A4A4A" }}>{inv.supplier || "—"}</td>
                    <td className="py-3 px-4" style={{ color: "#8F8F9F" }}>
                      {inv.date ? new Date(inv.date).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-3 px-4" style={{ color: "#4A4A4A" }}>{inv.totalamount ?? "—"}</td>
                    <td className="py-3 px-4">
                      <span className="px-3 py-1 rounded-full text-sm font-semibold bg-gray-100" style={{ color: "#714B67" }}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setCurrentPage(`invoice-detail-${inv.id}`)}
                        className="flex items-center gap-1 text-sm font-semibold transition-colors"
                        style={{ color: "#714B67" }}
                      >
                        <FiEye className="w-4 h-4" /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-[480px] shadow-lg">
            <h3 className="text-xl font-bold mb-4" style={{ color: "#714B67" }}>Upload Invoice File</h3>
            <input
              type="file"
              accept=".pdf,image/jpeg,image/png"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button className="btn-secondary" onClick={() => setShowUpload(false)}>Cancel</button>
              <button className="btn-primary" disabled={uploading || !file} onClick={uploadInvoice}>
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}