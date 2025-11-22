"use client"

import { useState, useEffect } from "react"
import { FiPlus, FiTrash2, FiSave } from "react-icons/fi"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000"

export default function StockAdjustment() {
  const [warehouses, setWarehouses] = useState([])
  const [products, setProducts] = useState([])
  const [warehouse, setWarehouse] = useState("")
  const [reason, setReason] = useState("")
  const [lines, setLines] = useState([{ product_id: "", counted_qty: 0, actual_qty: 0 }])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    fetchWarehouses()
    fetchProducts()
  }, [])

  const fetchWarehouses = async () => {
    try {
      const response = await fetch(`${API_URL}/api/warehouses`)
      const data = await response.json()
      setWarehouses(data)
    } catch (err) {
      console.error("Failed to fetch warehouses:", err)
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/products`)
      const data = await response.json()
      setProducts(data)
    } catch (err) {
      console.error("Failed to fetch products:", err)
    }
  }

  const addLine = () => {
    setLines([...lines, { product_id: "", counted_qty: 0, actual_qty: 0 }])
  }

  const removeLine = (index) => {
    setLines(lines.filter((_, i) => i !== index))
  }

  const updateLine = (index, field, value) => {
    const newLines = [...lines]
    newLines[index][field] = value
    setLines(newLines)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage(null)

    const validLines = lines.filter((l) => l.product_id && l.counted_qty >= 0)
    if (validLines.length === 0) {
      setMessage({ type: "error", text: "Add at least one product adjustment" })
      return
    }

    setLoading(true)

    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${API_URL}/api/stocks/adjust`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          warehouse_id: warehouse,
          reason,
          lines: validLines,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: "success", text: "Stock adjustment created successfully!" })
        setLines([{ product_id: "", counted_qty: 0, actual_qty: 0 }])
        setReason("")
      } else {
        setMessage({ type: "error", text: data.error })
      }
    } catch (err) {
      setMessage({ type: "error", text: "Network error. Please try again." })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold text-odoo-dark mb-6">Stock Adjustment</h2>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === "success"
                ? "bg-green-50 border border-green-200 text-green-800"
                : "bg-red-50 border border-red-200 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-odoo-dark mb-2">Warehouse</label>
              <select
                value={warehouse}
                onChange={(e) => setWarehouse(e.target.value)}
                required
                className="input-field w-full"
              >
                <option value="">Select warehouse</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-odoo-dark mb-2">Reason</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                className="input-field w-full"
                placeholder="e.g., Physical count, Damaged goods"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-odoo-dark">Products</h3>
              <button type="button" onClick={addLine} className="btn-secondary flex items-center gap-2">
                <FiPlus className="w-4 h-4" />
                Add Product
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-2 text-sm font-medium text-odoo-dark">Product</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-odoo-dark">Counted Qty</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-odoo-dark">Actual Qty</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-odoo-dark">Difference</th>
                    <th className="w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-3 px-2">
                        <select
                          value={line.product_id}
                          onChange={(e) => updateLine(index, "product_id", e.target.value)}
                          required
                          className="input-field w-full min-w-[200px]"
                        >
                          <option value="">Select product</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name} ({product.sku})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-2">
                        <input
                          type="number"
                          value={line.counted_qty}
                          onChange={(e) => updateLine(index, "counted_qty", Number.parseInt(e.target.value) || 0)}
                          min="0"
                          required
                          className="input-field w-full"
                        />
                      </td>
                      <td className="py-3 px-2">
                        <input
                          type="number"
                          value={line.actual_qty}
                          onChange={(e) => updateLine(index, "actual_qty", Number.parseInt(e.target.value) || 0)}
                          min="0"
                          required
                          className="input-field w-full"
                        />
                      </td>
                      <td className="py-3 px-2">
                        <span
                          className={`font-medium ${
                            line.counted_qty - line.actual_qty > 0
                              ? "text-green-600"
                              : line.counted_qty - line.actual_qty < 0
                                ? "text-red-600"
                                : "text-gray-600"
                          }`}
                        >
                          {line.counted_qty - line.actual_qty > 0 ? "+" : ""}
                          {line.counted_qty - line.actual_qty}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        {lines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLine(index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <FiTrash2 className="w-5 h-5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <FiSave className="w-5 h-5" />
            {loading ? "Creating Adjustment..." : "Create Adjustment"}
          </button>
        </form>
      </div>
    </div>
  )
}
