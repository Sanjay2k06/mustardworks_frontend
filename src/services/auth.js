import axios from "axios"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://mustardworks-backend.onrender.com/api"

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for cookies if you're using them
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("[AUTH API ERROR]", {
      status: error.response?.status,
      message: error.response?.data?.message,
      url: error.config?.url
    })
    
    if (error.response?.status === 401) {
      // Token expired or invalid
      console.warn("[AUTH] 401 Unauthorized - Clearing token and redirecting to login")
      localStorage.removeItem("token")
      
      // Only redirect if not already on auth page
      if (window.location.pathname !== "/auth") {
        window.location.href = "/auth"
      }
    }
    return Promise.reject(error)
  },
)

export const authService = {
  // Register new user
  register: async (userData) => {
    try {
      console.log("[AUTH SERVICE] Registering user:", { email: userData.email })
      const response = await api.post("/auth/register", userData)
      const data = response?.data || response
      
      console.log("[AUTH SERVICE] Register response:", {
        success: data?.success,
        hasToken: !!data?.token,
        hasUser: !!data?.data?.user || !!data?.user
      })
      
      // handle common backend variants for token key
      const token = data?.token || data?.accessToken || data?.jwt || data?.authToken || data?.data?.token

      if (token) {
        localStorage.setItem("token", token)
        console.log("[AUTH SERVICE] Token stored on register:", token.substring(0, 20) + "...")
      } else {
        console.error("[AUTH SERVICE] No token found in register response:", data)
      }

      return data
    } catch (error) {
      console.error("[AUTH SERVICE] Register failed:", error.response?.data || error.message)
      throw error
    }
  },

  // Login user
  login: async (credentials) => {
    try {
      console.log("[AUTH SERVICE] Logging in user:", { email: credentials.email })
      const response = await api.post("/auth/login", credentials)
      const data = response?.data || response

      console.log("[AUTH SERVICE] Login response:", {
        success: data?.success,
        hasToken: !!data?.token,
        hasUser: !!data?.data?.user || !!data?.user
      })

      const token = data?.token || data?.accessToken || data?.jwt || data?.authToken || data?.data?.token

      if (token) {
        localStorage.setItem("token", token)
        console.log("[AUTH SERVICE] Token stored on login:", token.substring(0, 20) + "...")
      } else {
        console.error("[AUTH SERVICE] No token found in login response:", data)
      }

      return data
    } catch (error) {
      console.error("[AUTH SERVICE] Login failed:", error.response?.data || error.message)
      throw error
    }
  },

  // Get current user
  getCurrentUser: async () => {
    try {
      console.log("[AUTH SERVICE] Fetching current user")
      const response = await api.get("/auth/me")
      const data = response?.data || response
      console.log("[AUTH SERVICE] getCurrentUser response:", {
        success: data?.success,
        hasUser: !!data?.user || !!data?.data?.user
      })
      return data?.user || data?.data?.user || data
    } catch (error) {
      console.error("[AUTH SERVICE] getCurrentUser failed:", error.response?.data || error.message)
      throw error
    }
  },

  // Upload profile image
  uploadProfileImage: async (file) => {
    try {
      const formData = new FormData()
      formData.append("image", file)
      const response = await api.post("/auth/upload-profile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      const data = response?.data || response
      return data
    } catch (error) {
      console.error("[AUTH SERVICE] uploadProfileImage failed:", error.response?.data || error.message)
      throw error
    }
  },

  // Update password
  updatePassword: async (passwordData) => {
    try {
      console.log("[AUTH SERVICE] Updating password")
      const response = await api.patch("/auth/update-password", passwordData)
      const data = response?.data || response
      
      // If new token is returned, update it
      const token = data?.token || data?.accessToken || data?.jwt
      if (token) {
        localStorage.setItem("token", token)
        console.log("[AUTH SERVICE] New token stored after password update")
      }
      
      return data
    } catch (error) {
      console.error("[AUTH SERVICE] updatePassword failed:", error.response?.data || error.message)
      throw error
    }
  },

  // Logout user
  logout: async () => {
    try {
      console.log("[AUTH SERVICE] Logging out user")
      const response = await api.post("/auth/logout")
      localStorage.removeItem("token")
      console.log("[AUTH SERVICE] Token removed, user logged out")
      return response.data
    } catch (error) {
      // Even if server logout fails, clear local token
      localStorage.removeItem("token")
      console.error("[AUTH SERVICE] Logout error (token cleared anyway):", error.message)
      throw error
    }
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    const token = localStorage.getItem("token")
    const isAuth = !!token
    console.log("[AUTH SERVICE] isAuthenticated check:", isAuth)
    return isAuth
  },

  // Get token for debugging
  getToken: () => {
    return localStorage.getItem("token")
  },
}

export default api
