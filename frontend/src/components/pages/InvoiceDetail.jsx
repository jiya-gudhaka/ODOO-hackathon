// frontend/src/components/pages/InvoiceDetail.jsx
import { useEffect, useState } from "react"
import { API_URL } from "../../config"

export default function InvoiceDetail({ setCurrentPage, invoiceId }) {
  const [invoice, setInvoice] = useState(null)
  const [items, setItems] = useState([])
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)
  const [warehouseId, setWarehouseId] = useState("")

  useEffect(() => { fetchInvoice() }, [invoiceId])

  const fetchInvoice = async () => {
    const res = await fetch(`${API_URL}/api/invoices/${invoiceId}`)
    const data = await res.json()
    setInvoice(data)
    setItems(data.items || [])
  }

  const addRow = () => setItems([...items, { productName: "", sku: "", quantity: 1, unitPrice: 0, total: 0 }])
  const deleteRow = (idx) => setItems(items.filter((_, i) => i !== idx))

  const updateItem = (idx, field, value) => {
    const next = [...items]
    next[idx][field] = field === "quantity" || field === "unitPrice" || field === "total" ? Number(value) : value
    setItems(next)
  }

  const extractInvoice = async () => {
    const payload = {
      invoiceNumber: invoice?.invoiceNumber || null,
      supplier: invoice?.supplier || null,
      date: invoice?.date || null,
      totalAmount: invoice?.totalAmount || null,
      items: items.map((it) => ({
        productName: it.productName,
        sku: it.sku,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        total: it.total,
      })),
    }
    await fetch(`${API_URL}/api/invoices/${invoiceId}/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: payload }),
    })
    await fetchInvoice()
  }

  const saveInvoice = async (status = "Verified") => {
    setSaving(true)
    try {
      const body = {
        invoiceNumber: invoice?.invoiceNumber || null,
        supplier: invoice?.supplier || null,
        date: invoice?.date || null,
        totalAmount: invoice?.totalAmount || null,
        status,
        items,
      }
      await fetch(`${API_URL}/api/invoices/${invoiceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      await fetchInvoice()
    } finally {
      setSaving(false)
    }
  }

  const createReceipt = async () => {
    if (!warehouseId) return
    setCreating(true)
    try {
      const res = await fetch(`${API_URL}/api/invoices/${invoiceId}/create-receipt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ warehouseId }),
      })
      const data = await res.json()
      if (data.success) setCurrentPage("receipts")
    } finally {
      setCreating(false)
    }
  }

  if (!invoice) return <div className="p-8 mt-16">Loading...</div>

  return (
    <div className="p-8 mt-16">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "#714B67" }}>
          Invoice {invoice.invoicenumber || `#${invoice.id}`}
        </h1>
        {invoice.fileurl && (
          <div className="mt-3">
            <a href={invoice.fileurl} target="_blank" className="text-sm font-semibold" style={{ color: "#714B67" }}>
              View Uploaded File
            </a>
          </div>
        )}
      </div>

      <div className="card mb-6 p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm" style={{ color: "#8F8F9F" }}>Invoice Number</label>
            <input
              className="input-field"
              value={invoice.invoicenumber || ""}
              onChange={(e) => setInvoice({ ...invoice, invoicenumber: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm" style={{ color: "#8F8F9F" }}>Supplier</label>
            <input
              className="input-field"
              value={invoice.supplier || ""}
              onChange={(e) => setInvoice({ ...invoice, supplier: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm" style={{ color: "#8F8F9F" }}>Date</label>
            <input
              type="date"
              className="input-field"
              value={invoice.date ? invoice.date.split("T")[0] : ""}
              onChange={(e) => setInvoice({ ...invoice, date: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm" style={{ color: "#8F8F9F" }}>Total Amount</label>
            <input
              type="number"
              step="0.01"
              className="input-field"
              value={invoice.totalamount ?? ""}
              onChange={(e) => setInvoice({ ...invoice, totalamount: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="text-sm" style={{ color: "#8F8F9F" }}>Status</label>
            <input className="input-field" value={invoice.status} readOnly />
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <button className="btn-secondary" onClick={extractInvoice}>Extract Invoice</button>
          <button className="btn-primary" disabled={saving} onClick={() => saveInvoice("Verified")}>
            {saving ? "Saving..." : "Save (Verified)"}
          </button>
          <button className="btn-secondary" disabled={saving} onClick={() => saveInvoice("Extracted")}>
            Save as Extracted
          </button>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold" style={{ color: "#714B67" }}>Items</h3>
          <button className="btn-secondary" onClick={addRow}>Add Row</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3">Product Name</th>
                <th className="text-left py-2 px-3">SKU</th>
                <th className="text-left py-2 px-3">Qty</th>
                <th className="text-left py-2 px-3">Unit Price</th>
                <th className="text-left py-2 px-3">Total</th>
                <th className="text-left py-2 px-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={idx} className="table-row">
                  <td className="py-2 px-3">
                    <input className="input-field" value={it.productName || it.productname || ""} onChange={(e) => updateItem(idx, "productName", e.target.value)} />
                  </td>
                  <td className="py-2 px-3">
                    <input className="input-field" value={it.sku || ""} onChange={(e) => updateItem(idx, "sku", e.target.value)} />
                  </td>
                  <td className="py-2 px-3">
                    <input type="number" className="input-field" value={it.quantity || 0} onChange={(e) => updateItem(idx, "quantity", e.target.value)} />
                  </td>
                  <td className="py-2 px-3">
                    <input type="number" step="0.01" className="input-field" value={it.unitPrice ?? 0} onChange={(e) => updateItem(idx, "unitPrice", e.target.value)} />
                  </td>
                  <td className="py-2 px-3">
                    <input type="number" step="0.01" className="input-field" value={it.total ?? 0} onChange={(e) => updateItem(idx, "total", e.target.value)} />
                  </td>
                  <td className="py-2 px-3">
                    <button className="btn-secondary" onClick={() => deleteRow(idx)}>Delete</button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-4 text-center" style={{ color: "#8F8F9F" }}>
                    No items. Add rows to continue.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-4 mt-6">
        <h3 className="font-semibold mb-2" style={{ color: "#714B67" }}>Create Receipt from Invoice</h3>
        <div className="grid grid-cols-3 gap-3">
          <input
            type="number"
            className="input-field"
            placeholder="Warehouse ID"
            value={warehouseId}
            onChange={(e) => setWarehouseId(Number(e.target.value))}
          />
          <button className="btn-primary" disabled={creating || !warehouseId} onClick={createReceipt}>
            {creating ? "Creating..." : "Create Receipt"}
          </button>
        </div>
      </div>
    </div>
  )
}