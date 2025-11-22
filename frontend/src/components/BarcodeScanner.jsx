"use client"

import { useState, useEffect, useRef } from "react"
import { FiPlus, FiMinus, FiPackage, FiAlertCircle } from "react-icons/fi"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000"

export default function BarcodeScanner({ warehouseId, onScanComplete }) {
  const [barcode, setBarcode] = useState("")
  const [mode, setMode] = useState("ADD")
  const [qty, setQty] = useState(1)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    // Auto-focus input on mount
    inputRef.current?.focus()
  }, [])

  const handleScan = async (e) => {
    e.preventDefault()
    if (!barcode.trim()) return

    setLoading(true)
    setMessage(null)

    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${API_URL}/api/scan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          barcode: barcode.trim(),
          mode,
          warehouse_id: warehouseId,
          qty,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({
          type: "success",
          text: data.message,
          product: data.product,
        })
        setBarcode("")
        onScanComplete && onScanComplete(data)
      } else {
        setMessage({
          type: "error",
          text: data.error,
          available: data.available,
        })
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: "Network error. Please try again.",
      })
    } finally {
      setLoading(false)
      // Auto-focus and clear after scan
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-odoo-lavender rounded-lg flex items-center justify-center flex-shrink-0">
          <FiPackage className="w-6 h-6 text-odoo-purple" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-odoo-dark">Barcode Scanner</h2>
          <p className="text-sm text-odoo-medium">Scan to add or remove stock</p>
        </div>
      </div>

      <form onSubmit={handleScan} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-odoo-dark mb-2">Barcode / SKU</label>
          <input
            ref={inputRef}
            type="text"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Scan or type SKU..."
            className="input-field w-full text-lg"
            autoFocus
            disabled={loading}
          />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-odoo-dark mb-2">Mode</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode("ADD")}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                  mode === "ADD" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <FiPlus className="w-5 h-5" />
                Add
              </button>
              <button
                type="button"
                onClick={() => setMode("REMOVE")}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                  mode === "REMOVE" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <FiMinus className="w-5 h-5" />
                Remove
              </button>
            </div>
          </div>

          <div className="w-24">
            <label className="block text-sm font-medium text-odoo-dark mb-2">Qty</label>
            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number.parseInt(e.target.value) || 1))}
              min="1"
              className="input-field w-full text-center"
            />
          </div>
        </div>

        <button type="submit" disabled={loading || !barcode.trim()} className="btn-primary w-full">
          {loading ? "Processing..." : "Scan"}
        </button>
      </form>

      {message && (
        <div
          className={`mt-4 p-4 rounded-lg flex items-start gap-3 ${
            message.type === "success" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
          }`}
        >
          <FiAlertCircle
            className={`w-5 h-5 flex-shrink-0 mt-0.5 ${message.type === "success" ? "text-green-600" : "text-red-600"}`}
          />
          <div className="flex-1">
            <p className={`font-medium ${message.type === "success" ? "text-green-800" : "text-red-800"}`}>
              {message.text}
            </p>
            {message.product && (
              <p className="text-sm text-green-700 mt-1">
                {message.product.name} ({message.product.sku})
              </p>
            )}
            {message.available !== undefined && (
              <p className="text-sm text-red-700 mt-1">Available: {message.available} units</p>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-odoo-lavender rounded-lg">
        <p className="text-sm text-odoo-dark">
          <strong>Tip:</strong> Press Enter after scanning or typing the SKU. The field will auto-clear and refocus for
          rapid scanning.
        </p>
      </div>
    </div>
  )
}
