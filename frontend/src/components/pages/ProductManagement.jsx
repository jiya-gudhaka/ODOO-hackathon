"use client"

import { useState, useEffect } from "react"
import { FiPlus, FiEdit2, FiPackage } from "react-icons/fi"
import FilterBar from "../FilterBar"
import { useSocket } from "../../context/SocketContext"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000"

export default function ProductManagement() {
  const socket = useSocket()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [filters, setFilters] = useState({})

  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    category_id: "",
    uom: "pcs",
    min_quantity: 10,
    initial_stock: 0,
    warehouse_id: "",
  })

  useEffect(() => {
    fetchProducts()
    fetchCategories()
    fetchWarehouses()

    if (socket) {
      socket.on("stockUpdated", () => fetchProducts())
    }

    return () => {
      if (socket) {
        socket.off("stockUpdated")
      }
    }
  }, [socket, filters])

  const fetchProducts = async () => {
    try {
      const params = new URLSearchParams(filters)
      const response = await fetch(`${API_URL}/api/products?${params}`)
      const data = await response.json()
      setProducts(data)
    } catch (err) {
      console.error("[v0] Failed to fetch products:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/api/categories`)
      const data = await response.json()
      setCategories(data)
    } catch (err) {
      console.error("[v0] Failed to fetch categories:", err)
    }
  }

  const fetchWarehouses = async () => {
    try {
      const response = await fetch(`${API_URL}/api/warehouses`)
      const data = await response.json()
      setWarehouses(data)
    } catch (err) {
      console.error("[v0] Failed to fetch warehouses:", err)
    }
  }

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      const token = localStorage.getItem("token")
      const url = editingProduct ? `${API_URL}/api/products/${editingProduct.id}` : `${API_URL}/api/products`

      const response = await fetch(url, {
        method: editingProduct ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        fetchProducts()
        setShowForm(false)
        resetForm()
      }
    } catch (err) {
      console.error("[v0] Failed to save product:", err)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      sku: "",
      category_id: "",
      uom: "pcs",
      min_quantity: 10,
      initial_stock: 0,
      warehouse_id: "",
    })
    setEditingProduct(null)
  }

  const handleEdit = (product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      sku: product.sku,
      category_id: product.category_id || "",
      uom: product.uom || "pcs",
      min_quantity: product.min_quantity || 10,
      initial_stock: 0,
      warehouse_id: "",
    })
    setShowForm(true)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-odoo-dark">Product Management</h1>
          <p className="text-sm text-odoo-medium">Manage your product catalog</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <FiPlus className="w-5 h-5" />
          Add Product
        </button>
      </div>

      <FilterBar onFilterChange={handleFilterChange} />

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold text-odoo-dark mb-4">
              {editingProduct ? "Edit Product" : "Add New Product"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-odoo-dark mb-2">Product Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="input-field w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-odoo-dark mb-2">SKU / Barcode *</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    required
                    className="input-field w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-odoo-dark mb-2">Category</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="input-field w-full"
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-odoo-dark mb-2">Unit of Measure</label>
                  <input
                    type="text"
                    value={formData.uom}
                    onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
                    className="input-field w-full"
                    placeholder="pcs, kg, m, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-odoo-dark mb-2">Min Quantity (Alert)</label>
                  <input
                    type="number"
                    value={formData.min_quantity}
                    onChange={(e) => setFormData({ ...formData, min_quantity: Number.parseInt(e.target.value) || 0 })}
                    min="0"
                    className="input-field w-full"
                  />
                </div>

                {!editingProduct && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-odoo-dark mb-2">Initial Stock</label>
                      <input
                        type="number"
                        value={formData.initial_stock}
                        onChange={(e) =>
                          setFormData({ ...formData, initial_stock: Number.parseInt(e.target.value) || 0 })
                        }
                        min="0"
                        className="input-field w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-odoo-dark mb-2">Warehouse</label>
                      <select
                        value={formData.warehouse_id}
                        onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
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
                  </>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">
                  {editingProduct ? "Update Product" : "Create Product"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    resetForm()
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-odoo-purple text-white">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">SKU</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Product Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Category</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">UOM</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Total Stock</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Min Qty</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product, idx) => (
                <tr key={product.id} className={idx % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                  <td className="px-6 py-4 text-sm text-odoo-dark font-mono">{product.sku}</td>
                  <td className="px-6 py-4 text-sm font-medium text-odoo-dark">{product.name}</td>
                  <td className="px-6 py-4 text-sm text-odoo-medium">{product.category_name || "-"}</td>
                  <td className="px-6 py-4 text-sm text-odoo-medium">{product.uom}</td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`font-semibold ${
                        product.total_stock < product.min_quantity ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {product.total_stock || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-odoo-medium">{product.min_quantity}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleEdit(product)}
                      className="text-odoo-purple hover:text-odoo-plum p-2"
                      title="Edit"
                    >
                      <FiEdit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {products.length === 0 && (
          <div className="text-center py-12">
            <FiPackage className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-odoo-medium">No products found</p>
          </div>
        )}
      </div>
    </div>
  )
}
