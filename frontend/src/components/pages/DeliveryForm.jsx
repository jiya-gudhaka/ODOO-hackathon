"use client"

import { useState, useEffect } from "react"
import { FiSave, FiX, FiPlus, FiTrash2, FiTruck } from "react-icons/fi"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000"

export default function DeliveryForm({ setCurrentPage, deliveryId = null }) {
  const [delivery, setDelivery] = useState({
    reference: "",
    warehouse: "",
    contact: "",
    status: "Draft",
    lines: [],
  })
  const [warehouses, setWarehouses] = useState([])
  const [products, setProducts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState("")
  const [quantity, setQuantity] = useState("")

  useEffect(() => {
    generateReference()
    autoFillUser()
    fetchWarehouses()
    fetchProducts()

    if (deliveryId) {
      fetchDelivery(deliveryId)
    }
  }, [deliveryId])

  const generateReference = async () => {
    try {
      const response = await fetch(`${API_URL}/api/deliveries/generate-reference`)
      const data = await response.json()
      setDelivery((prev) => ({ ...prev, reference: data.reference }))
    } catch (err) {
      const timestamp = Date.now()
      setDelivery((prev) => ({ ...prev, reference: `WH/OUT/${timestamp}` }))
    }
  }

  const autoFillUser = () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}")
    if (user.name) {
      setDelivery((prev) => ({ ...prev, contact: user.name }))
    }
  }

  const fetchWarehouses = async () => {
    try {
      const response = await fetch(`${API_URL}/api/warehouses`)
      const data = await response.json()
      setWarehouses(data)
    } catch (err) {
      console.error("Failed to fetch warehouses")
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/products`)
      const data = await response.json()
      setProducts(data)
    } catch (err) {
      console.error("Failed to fetch products")
    }
  }

  const fetchDelivery = async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/deliveries/${id}`)
      const data = await response.json()
      setDelivery({
        reference: data.ref_no,
        warehouse: data.warehouse_id,
        contact: data.contact,
        status: data.status,
        lines: data.lines,
      })
    } catch (err) {
      console.error("Failed to fetch delivery")
    }
  }

  const addProduct = () => {
    if (!selectedProduct || !quantity) return

    const product = products.find((p) => p.id === Number.parseInt(selectedProduct))
    if (!product) return

    const newLine = {
      product_id: product.id,
      product_name: product.name,
      sku: product.sku,
      qty: Number.parseInt(quantity),
    }

    setDelivery((prev) => ({
      ...prev,
      lines: [...prev.lines, newLine],
    }))

    setSelectedProduct("")
    setQuantity("")
  }

  const removeProduct = (index) => {
    setDelivery((prev) => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index),
    }))
  }

  const handleValidate = async () => {
    if (!delivery.warehouse || delivery.lines.length === 0) {
      alert("Please select a warehouse and add at least one product")
      return
    }

    const token = localStorage.getItem("token")
    const response = await fetch(`${API_URL}/api/deliveries/${deliveryId || "new"}`, {
      method: deliveryId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        ref_no: delivery.reference,
        warehouse_id: delivery.warehouse,
        contact: delivery.contact,
        status: delivery.status,
        lines: delivery.lines,
      }),
    })

    const data = await response.json()
    if (response.ok) {
      alert("Delivery saved successfully!")
      setCurrentPage("delivery")
    } else {
      alert(data.error || "Failed to save delivery")
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleCancel = () => {
    if (confirm("Are you sure you want to cancel? Any unsaved changes will be lost.")) {
      setCurrentPage("delivery")
    }
  }

  const handleDone = async () => {
    if (!deliveryId) return

    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${API_URL}/api/deliveries/${deliveryId}/complete`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()
      if (response.ok) {
        alert("Delivery marked as Done!")
        setCurrentPage("delivery")
      } else {
        alert(data.error || "Failed to complete delivery")
      }
    } catch (err) {
      alert("Error completing delivery")
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      Draft: "bg-gray-100 text-gray-800",
      Waiting: "bg-yellow-100 text-yellow-800",
      Ready: "bg-blue-100 text-blue-800",
      Done: "bg-green-100 text-green-800",
      Canceled: "bg-red-100 text-red-800",
    }
    return colors[status] || colors.Draft
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <FiTruck className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-odoo-dark">
                {deliveryId ? "Edit Delivery" : "New Delivery Order"}
              </h2>
              <p className="text-sm text-odoo-medium">{delivery.reference}</p>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-lg font-medium ${getStatusColor(delivery.status)}`}>{delivery.status}</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-odoo-dark mb-2">Warehouse *</label>
            <select
              value={delivery.warehouse}
              onChange={(e) => setDelivery({ ...delivery, warehouse: e.target.value })}
              className="input-field w-full"
              disabled={delivery.status === "Done"}
            >
              <option value="">Select Warehouse</option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-odoo-dark mb-2">Contact Person</label>
            <input
              type="text"
              value={delivery.contact}
              onChange={(e) => setDelivery({ ...delivery, contact: e.target.value })}
              className="input-field w-full"
              disabled={delivery.status === "Done"}
            />
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-bold text-odoo-dark mb-4">Products</h3>

          {delivery.status !== "Done" && (
            <div className="bg-odoo-lavender rounded-lg p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="input-field"
                >
                  <option value="">Select Product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.sku})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Quantity"
                  className="input-field"
                  min="1"
                />
                <button onClick={addProduct} className="btn-primary flex items-center justify-center gap-2">
                  <FiPlus className="w-5 h-5" />
                  Add Product
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-odoo-dark">Product</th>
                  <th className="text-left py-3 px-4 font-semibold text-odoo-dark">SKU</th>
                  <th className="text-center py-3 px-4 font-semibold text-odoo-dark">Quantity</th>
                  {delivery.status !== "Done" && (
                    <th className="text-center py-3 px-4 font-semibold text-odoo-dark">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {delivery.lines.map((line, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">{line.product_name}</td>
                    <td className="py-3 px-4 text-odoo-medium">{line.sku}</td>
                    <td className="py-3 px-4 text-center font-semibold">{line.qty}</td>
                    {delivery.status !== "Done" && (
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => removeProduct(index)}
                          className="text-red-600 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <FiTrash2 className="w-5 h-5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {delivery.lines.length === 0 && (
              <div className="text-center py-12 text-odoo-medium">No products added yet</div>
            )}
          </div>
        </div>

        <div className="flex gap-4 mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={handleValidate}
            className="btn-primary flex items-center gap-2"
            disabled={delivery.status === "Done"}
          >
            <FiSave className="w-5 h-5" />
            Save Delivery
          </button>
          <button onClick={handlePrint} className="btn-secondary">
            Print
          </button>
          <button onClick={handleCancel} className="btn-secondary flex items-center gap-2">
            <FiX className="w-5 h-5" />
            Cancel
          </button>
          {deliveryId && delivery.status !== "Done" && (
            <button
              onClick={handleDone}
              className="ml-auto bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              Mark as Done
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
