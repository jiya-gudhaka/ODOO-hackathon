"use client"

import { useState, useEffect } from "react"
import { FiPlus, FiTrash2, FiSave } from "react-icons/fi"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000"

export default function TransferForm() {
  const [warehouses, setWarehouses] = useState([])
  const [products, setProducts] = useState([])
  const [fromWarehouse, setFromWarehouse] = useState("")
  const [toWarehouse, setToWarehouse] = useState("")
  const [lines, setLines] = useState([{ product_id: "", qty: 1 }])
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
    setLines([...lines, { product_id: "", qty: 1 }])
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

    if (fromWarehouse === toWarehouse) {
      setMessage({ type: "error", text: "Source and destination warehouses must be different" })
      return
    }

    const validLines = lines.filter((l) => l.product_id && l.qty > 0)
    if (validLines.length === 0) {
      setMessage({ type: "error", text: "Add at least one product" })
      return
    }

    setLoading(true)

    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${API_URL}/api/stocks/transfer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          from_warehouse_id: fromWarehouse,
          to_warehouse_id: toWarehouse,
          lines: validLines,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: "success", text: `Transfer ${data.transfer.ref_no} created successfully!` })
        setLines([{ product_id: "", qty: 1 }])
        setFromWarehouse("")
        setToWarehouse("")
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
    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
      <h2 className="text-xl sm:text-2xl font-bold text-odoo-dark mb-6">Internal Transfer</h2>

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
            <label className="block text-sm font-medium text-odoo-dark mb-2">From Warehouse</label>
            <select
              value={fromWarehouse}
              onChange={(e) => setFromWarehouse(e.target.value)}
              required
              className="input-field w-full"
            >
              <option value="">Select source warehouse</option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-odoo-dark mb-2">To Warehouse</label>
            <select
              value={toWarehouse}
              onChange={(e) => setToWarehouse(e.target.value)}
              required
              className="input-field w-full"
            >
              <option value="">Select destination warehouse</option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name}
                </option>
              ))}
            </select>
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

          <div className="space-y-3">
            {lines.map((line, index) => (
              <div key={index} className="flex gap-3 items-start">
                <div className="flex-1">
                  <select
                    value={line.product_id}
                    onChange={(e) => updateLine(index, "product_id", e.target.value)}
                    required
                    className="input-field w-full"
                  >
                    <option value="">Select product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} ({product.sku})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-24">
                  <input
                    type="number"
                    value={line.qty}
                    onChange={(e) => updateLine(index, "qty", Number.parseInt(e.target.value) || 1)}
                    min="1"
                    required
                    className="input-field w-full"
                    placeholder="Qty"
                  />
                </div>
                {lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLine(index)}
                    className="p-3 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <FiTrash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
          <FiSave className="w-5 h-5" />
          {loading ? "Creating Transfer..." : "Create Transfer"}
        </button>
      </form>
    </div>
  )
}
