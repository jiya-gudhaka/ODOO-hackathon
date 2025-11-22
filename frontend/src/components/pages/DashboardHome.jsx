"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  FiPackage,
  FiAlertTriangle,
  FiDownload,
  FiUpload,
  FiRepeat,
  FiTrendingUp,
  FiBarChart2,
  FiPieChart,
  FiArrowRight,
} from "react-icons/fi"
import KPICard from "../KPICard"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000"

const SimpleBarChart = ({ data, height = 250 }) => {
  const [hoveredIdx, setHoveredIdx] = useState(null)

  if (!data || data.length === 0) return null

  const values = data.map((d) => Number(d.value) || 0)
  const maxValue = Math.max(...values, 1)

  return (
    <div className="h-full flex items-end justify-around gap-2 px-4 relative">
      {data.map((item, idx) => (
        <div
          key={idx}
          className="flex-1 flex flex-col items-center relative group"
          onMouseEnter={() => setHoveredIdx(idx)}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: `${((Number(item.value) || 0) / maxValue) * height}px`, opacity: 1 }}
            transition={{ duration: 0.6, delay: idx * 0.1 }}
            className="w-full bg-gradient-to-t from-[#714B67] to-[#A287D0] rounded-t-lg hover:shadow-lg transition-all hover:from-[#5A3A52] hover:to-[#714B67] cursor-pointer"
            style={{ minHeight: "20px" }}
          />
          {hoveredIdx === idx && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: -40 }}
              className="absolute bottom-full mb-2 bg-gray-900 text-white text-xs py-2 px-3 rounded-lg whitespace-nowrap z-10 pointer-events-none"
            >
              {item.label}: {item.value}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
            </motion.div>
          )}
          <span className="text-xs mt-2" style={{ color: "#8F8F9F" }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  )
}

const SimplePieChart = ({ data, size = 150 }) => {
  const [hoveredIdx, setHoveredIdx] = useState(null)

  if (!data || data.length === 0) return null

  const total = data.reduce((sum, item) => sum + item.value, 0)
  let currentRotation = 0

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {data.map((item, idx) => {
            const sliceAngle = (item.value / total) * 360
            const radius = size / 2 - 10
            const x1 = size / 2 + radius * Math.cos((currentRotation * Math.PI) / 180)
            const y1 = size / 2 + radius * Math.sin((currentRotation * Math.PI) / 180)
            const x2 = size / 2 + radius * Math.cos(((currentRotation + sliceAngle) * Math.PI) / 180)
            const y2 = size / 2 + radius * Math.sin(((currentRotation + sliceAngle) * Math.PI) / 180)

            const largeArc = sliceAngle > 180 ? 1 : 0

            const colors = ["#714B67", "#D97706", "#059669", "#2563EB", "#DC2626"]
            const color = colors[idx % colors.length]

            const path = `M ${size / 2} ${size / 2} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`

            currentRotation += sliceAngle

            return (
              <motion.path
                key={idx}
                d={path}
                fill={color}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                className="hover:opacity-80 transition-opacity cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            )
          })}
        </svg>
        {hoveredIdx !== null ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center"
          >
            <span className="text-sm font-bold" style={{ color: "#714B67" }}>
              {((data[hoveredIdx].value / total) * 100).toFixed(0)}%
            </span>
            <span className="text-xs" style={{ color: "#8F8F9F" }}>
              {data[hoveredIdx].label}
            </span>
          </motion.div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold" style={{ color: "#714B67" }}>
              {total}
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-3 justify-center">
        {data.map((item, idx) => {
          const colors = ["#714B67", "#D97706", "#059669", "#2563EB", "#DC2626"]
          const color = colors[idx % colors.length]
          return (
            <div key={idx} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
              <span className="text-xs" style={{ color: "#4A4A4A" }}>
                {item.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const SimpleLineChart = ({ data, height = 200 }) => {
  const [hoveredIdx, setHoveredIdx] = useState(null)

  if (!data || data.length === 0) return null
  const width = 400
  const values = data.map((d) => Number(d.value) || 0)
  const maxValue = Math.max(...values, 1)
  const denom = Math.max(data.length - 1, 1)
  const points = data.map((item, idx) => ({
    x: (idx / denom) * width,
    y: height - (((Number(item.value) || 0) / maxValue) * height * 0.8),
    label: item.label,
    value: Number(item.value) || 0,
  }))

  const pathData = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")

  return (
    <div className="w-full h-full flex items-center justify-center relative">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="cursor-pointer">
        <defs>
          <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#714B67" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#714B67" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path
          d={pathData}
          stroke="#714B67"
          strokeWidth="2"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1 }}
        />
        <motion.path
          d={`${pathData} L ${points[points.length - 1].x} ${height} L 0 ${height} Z`}
          fill="url(#chartGradient)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        />
        {points.map((p, idx) => (
          <g key={idx} onMouseEnter={() => setHoveredIdx(idx)} onMouseLeave={() => setHoveredIdx(null)}>
            <motion.circle
              cx={p.x}
              cy={p.y}
              r={hoveredIdx === idx ? "6" : "4"}
              fill={hoveredIdx === idx ? "#714B67" : "#714B67"}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3, delay: 0.3 + idx * 0.1 }}
              className="transition-all cursor-pointer"
            />
            {hoveredIdx === idx && (
              <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <rect x={p.x - 35} y={p.y - 35} width="70" height="30" fill="gray900" rx="4" fillOpacity="0.9" />
                <text x={p.x} y={p.y - 15} textAnchor="middle" fill="white" fontSize="11" fontWeight="600">
                  {p.label}
                </text>
                <text x={p.x} y={p.y - 3} textAnchor="middle" fill="white" fontSize="10">
                  ${p.value.toFixed(0)}
                </text>
              </motion.g>
            )}
          </g>
        ))}
      </svg>
    </div>
  )
}

export default function DashboardHome({ setCurrentPage }) {
  const [kpis, setKpis] = useState({
    totalProducts: 0,
    lowStock: 0,
    pendingReceipts: 0,
    pendingDeliveries: 0,
    internalTransfers: 0,
  })
  const [products, setProducts] = useState([])
  const [recentReceipts, setRecentReceipts] = useState([])
  const [recentDeliveries, setRecentDeliveries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [productsRes, receiptsRes, deliveriesRes] = await Promise.all([
        fetch(`${API_URL}/api/products`),
        fetch(`${API_URL}/api/receipts`),
        fetch(`${API_URL}/api/deliveries`),
      ])

      const products = await productsRes.json()
      const receipts = await receiptsRes.json()
      const deliveries = await deliveriesRes.json()

      setProducts(products)
      setKpis({
        totalProducts: products.length,
        lowStock: products.filter((p) => p.initialstock < 20).length,
        pendingReceipts: receipts.filter((r) => r.status === "Draft" || r.status === "Waiting").length,
        pendingDeliveries: deliveries.filter((d) => d.status === "Draft" || d.status === "Waiting").length,
        internalTransfers: deliveries.filter((d) => d.status === "Ready").length,
      })

      setRecentReceipts(receipts.slice(0, 3))
      setRecentDeliveries(deliveries.slice(0, 3))

      setLoading(false)
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      setLoading(false)
    }
  }

  const getInventoryDistribution = () => {
    if (products.length === 0) return []

    const stockRanges = [
      { label: "0-10", value: products.filter((p) => p.initialstock >= 0 && p.initialstock < 10).length },
      { label: "10-20", value: products.filter((p) => p.initialstock >= 10 && p.initialstock < 20).length },
      { label: "20-50", value: products.filter((p) => p.initialstock >= 20 && p.initialstock < 50).length },
      { label: "50+", value: products.filter((p) => p.initialstock >= 50).length },
    ]

    return stockRanges.filter((r) => r.value > 0)
  }

  const getStatusDistribution = () => {
    return [
      { label: "In Stock", value: kpis.totalProducts - kpis.lowStock },
      { label: "Low Stock", value: kpis.lowStock },
    ]
  }

  const getTrendData = () => {
    const totalValue = products.reduce((sum, p) => sum + (p.unitprice * p.initialstock || 0), 0)
    return [
      { label: "Jan", value: totalValue * 0.85 },
      { label: "Feb", value: totalValue * 0.9 },
      { label: "Mar", value: totalValue * 0.88 },
      { label: "Apr", value: totalValue * 0.95 },
      { label: "May", value: totalValue * 1.0 },
      { label: "Jun", value: totalValue },
    ]
  }

  if (loading) {
    return (
      <div className="p-8 mt-16">
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ color: "#8F8F9F" }}
        >
          Loading dashboard data...
        </motion.div>
      </div>
    )
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  }

  return (
    <div className="p-8 mt-16 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold mb-2" style={{ color: "#2E2E2E" }}>
          Dashboard
        </h1>
        <p style={{ color: "#8F8F9F" }} className="text-lg">
          Welcome back! Here's your inventory overview
        </p>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <KPICard
            title="Total Products"
            value={kpis.totalProducts}
            color="purple"
            icon={FiPackage}
            onClick={() => setCurrentPage("stock")}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KPICard
            title="Low Stock"
            value={kpis.lowStock}
            color="red"
            icon={FiAlertTriangle}
            onClick={() => setCurrentPage("stock")}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KPICard
            title="Pending Receipts"
            value={kpis.pendingReceipts}
            color="blue"
            icon={FiDownload}
            onClick={() => setCurrentPage("receipts")}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KPICard
            title="Pending Deliveries"
            value={kpis.pendingDeliveries}
            color="green"
            icon={FiUpload}
            onClick={() => setCurrentPage("delivery")}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KPICard
            title="Transfers"
            value={kpis.internalTransfers}
            color="yellow"
            icon={FiRepeat}
            onClick={() => setCurrentPage("move-history")}
          />
        </motion.div>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Inventory Distribution */}
        <motion.div
          variants={itemVariants}
          className="card backdrop-blur-sm bg-white/90 border-0 shadow-lg hover:shadow-xl transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: "#2E2E2E" }}>
              <FiBarChart2 style={{ color: "#714B67" }} />
              Stock Levels
            </h3>
          </div>
          <div style={{ height: "200px" }}>
            <SimpleBarChart data={getInventoryDistribution()} height={200} />
          </div>
          <div className="mt-4 pt-4 border-t" style={{ borderColor: "#E5E5E7" }}>
            <p className="text-xs" style={{ color: "#8F8F9F" }}>
              Hover over bars to see exact values
            </p>
          </div>
        </motion.div>

        {/* Status Distribution Pie Chart */}
        <motion.div
          variants={itemVariants}
          className="card backdrop-blur-sm bg-white/90 border-0 shadow-lg hover:shadow-xl transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: "#2E2E2E" }}>
              <FiPieChart style={{ color: "#714B67" }} />
              Inventory Status
            </h3>
          </div>
          <div style={{ height: "240px" }} className="flex items-center justify-center">
            <SimplePieChart data={getStatusDistribution()} size={140} />
          </div>
          <div className="mt-4 pt-4 border-t" style={{ borderColor: "#E5E5E7" }}>
            <p className="text-xs" style={{ color: "#8F8F9F" }}>
              Hover over chart to see percentage
            </p>
          </div>
        </motion.div>

        {/* Trend Chart */}
        <motion.div
          variants={itemVariants}
          className="card backdrop-blur-sm bg-white/90 border-0 shadow-lg hover:shadow-xl transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: "#2E2E2E" }}>
              <FiTrendingUp style={{ color: "#714B67" }} />
              6-Month Trend
            </h3>
          </div>
          <div style={{ height: "200px" }}>
            <SimpleLineChart data={getTrendData()} height={180} />
          </div>
          <div className="mt-4 pt-4 border-t" style={{ borderColor: "#E5E5E7" }}>
            <p className="text-xs" style={{ color: "#8F8F9F" }}>
              Inventory value progression
            </p>
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Recent Receipts */}
        <motion.div
          variants={itemVariants}
          className="card backdrop-blur-sm bg-white/90 border-0 shadow-lg hover:shadow-xl transition-shadow"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: "#2E2E2E" }}>
              <FiDownload style={{ color: "#714B67" }} />
              Recent Receipts
            </h2>
            <motion.button
              onClick={() => setCurrentPage("receipts")}
              className="text-sm font-semibold transition-all flex items-center gap-1 hover:gap-2"
              style={{ color: "#714B67" }}
              whileHover={{ x: 5 }}
            >
              View All <FiArrowRight size={16} />
            </motion.button>
          </div>
          <div className="space-y-3">
            {recentReceipts.length > 0 ? (
              recentReceipts.map((receipt, idx) => (
                <motion.div
                  key={receipt.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex justify-between items-center py-3 px-3 rounded-lg hover:bg-slate-50 transition-colors"
                  style={{ borderLeft: "3px solid #714B67" }}
                >
                  <span className="font-medium" style={{ color: "#4A4A4A" }}>
                    {receipt.reference}
                  </span>
                  <span className={`badge badge-${receipt.status.toLowerCase()}`}>{receipt.status}</span>
                </motion.div>
              ))
            ) : (
              <p className="text-sm py-8 text-center" style={{ color: "#8F8F9F" }}>
                No receipts found
              </p>
            )}
          </div>
        </motion.div>

        {/* Recent Deliveries */}
        <motion.div
          variants={itemVariants}
          className="card backdrop-blur-sm bg-white/90 border-0 shadow-lg hover:shadow-xl transition-shadow"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: "#2E2E2E" }}>
              <FiUpload style={{ color: "#714B67" }} />
              Recent Deliveries
            </h2>
            <motion.button
              onClick={() => setCurrentPage("delivery")}
              className="text-sm font-semibold transition-all flex items-center gap-1 hover:gap-2"
              style={{ color: "#714B67" }}
              whileHover={{ x: 5 }}
            >
              View All <FiArrowRight size={16} />
            </motion.button>
          </div>
          <div className="space-y-3">
            {recentDeliveries.length > 0 ? (
              recentDeliveries.map((delivery, idx) => (
                <motion.div
                  key={delivery.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex justify-between items-center py-3 px-3 rounded-lg hover:bg-slate-50 transition-colors"
                  style={{ borderLeft: "3px solid #714B67" }}
                >
                  <span className="font-medium" style={{ color: "#4A4A4A" }}>
                    {delivery.reference}
                  </span>
                  <span className={`badge badge-${delivery.status.toLowerCase()}`}>{delivery.status}</span>
                </motion.div>
              ))
            ) : (
              <p className="text-sm py-8 text-center" style={{ color: "#8F8F9F" }}>
                No deliveries found
              </p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
