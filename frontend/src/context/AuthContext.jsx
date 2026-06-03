import React, { createContext, useContext, useState, useEffect } from "react";
import * as authService from "../services/authService.js";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const response = await authService.getMe();
      setUser(response.data.user);
    } catch (error) {
      console.error("Failed to restore session:", error);
      handleLocalLogout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      fetchCurrentUser();
    } else {
      setLoading(false);
    }

    // Handle token expiration event from Axios interceptor
    const handleAuthExpired = () => {
      handleLocalLogout();
    };

    window.addEventListener("auth_expired", handleAuthExpired);
    return () => {
      window.removeEventListener("auth_expired", handleAuthExpired);
    };
  }, []);

  const login = async (credentials) => {
    try {
      const response = await authService.login(credentials);
      const { user: loggedUser, accessToken, refreshToken } = response.data;
      
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      setUser(loggedUser);
      return loggedUser;
    } catch (error) {
      throw error;
    }
  };

  const register = async (payload) => {
    try {
      const response = await authService.register(payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const handleLocalLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Logout request failed on server:", error);
    } finally {
      handleLocalLogout();
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
