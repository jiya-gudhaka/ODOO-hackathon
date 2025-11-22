"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { io } from "socket.io-client"

const SocketContext = createContext(null)

export const useSocket = () => {
  return useContext(SocketContext)
}

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null)

  useEffect(() => {
    const socketUrl = import.meta.env.VITE_API_URL || "http://localhost:5000"
    const newSocket = io(socketUrl, {
      transports: ["websocket"],
    })

    newSocket.on("connect", () => {
      console.log("[v0] Socket connected:", newSocket.id)
    })

    newSocket.on("disconnect", () => {
      console.log("[v0] Socket disconnected")
    })

    newSocket.on("error", (error) => {
      console.error("[v0] Socket error:", error)
    })

    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
    }
  }, [])

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
}
