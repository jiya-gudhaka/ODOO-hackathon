"use client"

import { useState, useEffect } from "react"
import { FiSearch, FiFilter, FiEdit } from "react-icons/fi"
import { API_URL } from "../../config"

export default function StockPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCategory, setFilterCategory] = useState("All")

  const categories = ["All", "Furniture", "Raw Materials", "Electronics"]

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/products`)
      const data = await response.json()
      setProducts(data)
      setLoading(false)
    } catch (error) {
      console.error("Error fetching products:", error)
      setLoading(false)
    }
  }

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === "All" || product.category === filterCategory
    return matchesSearch && matchesCategory
  })

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 pt-20">
        <div className="text-center" style={{ color: "#8F8F9F" }}>
          Loading products...
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-20">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-4" style={{ color: "#714B67" }}>
          Stock Management
        </h1>
        <p className="text-sm sm:text-base" style={{ color: "#8F8F9F" }}>
          Warehouse details & location
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="relative flex-1">
          <FiSearch
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 flex-shrink-0 pointer-events-none"
            style={{ color: "#8F8F9F" }}
          />
          <input
            type="text"
            placeholder="Search products..."
            className="input-field pl-12 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative w-full sm:w-auto">
          <FiFilter
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 flex-shrink-0 pointer-events-none"
            style={{ color: "#8F8F9F" }}
          />
          <select
            className="input-field pl-12 pr-8 w-full sm:w-48"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stock Table */}
      <div className="card overflow-x-auto -mx-4 sm:mx-0">
        <div className="min-w-[640px]">
          <table className="w-full">
            <thead>
              <tr className="border-b-2" style={{ borderColor: "#714B67" }}>
                <th
                  className="text-left py-3 px-3 sm:px-4 font-semibold text-sm sm:text-base"
                  style={{ color: "#714B67" }}
                >
                  Product
                </th>
                <th className="text-left py-3 px-3 sm:px-4 font-mono text-xs sm:text-sm" style={{ color: "#8F8F9F" }}>
                  SKU
                </th>
                <th
                  className="text-left py-3 px-3 sm:px-4 font-semibold text-sm sm:text-base"
                  style={{ color: "#714B67" }}
                >
                  Category
                </th>
                <th
                  className="text-left py-3 px-3 sm:px-4 font-semibold text-sm sm:text-base"
                  style={{ color: "#714B67" }}
                >
                  On Hand
                </th>
                <th
                  className="text-left py-3 px-3 sm:px-4 font-semibold text-sm sm:text-base"
                  style={{ color: "#714B67" }}
                >
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="table-row">
                    <td className="py-3 px-3 sm:px-4 text-sm sm:text-base" style={{ color: "#4A4A4A" }}>
                      {product.name}
                    </td>
                    <td className="py-3 px-3 sm:px-4 font-mono text-xs sm:text-sm" style={{ color: "#8F8F9F" }}>
                      {product.sku}
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-sm sm:text-base" style={{ color: "#4A4A4A" }}>
                      {product.category}
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-sm sm:text-base" style={{ color: "#4A4A4A" }}>
                      {product.onHand}
                    </td>
                    <td className="py-3 px-3 sm:px-4">
                      <button
                        className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold transition-colors"
                        style={{ color: "#714B67" }}
                      >
                        <FiEdit className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span>Update</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-sm" style={{ color: "#8F8F9F" }}>
                    No products found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-center mt-4 text-xs sm:text-sm px-4" style={{ color: "#8F8F9F" }}>
        User must be able to update the stock from here.
      </p>
    </div>
  )
}
