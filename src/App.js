import React, { useState, useEffect, useCallback } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Login from "./routes/Login";
import Register from "./routes/Register";
import Recipes from "./routes/Recipes";
import RecipeDetail from "./routes/RecipeDetail";
import CreateRecipe from "./routes/CreateRecipe";
import EditRecipe from "./routes/EditRecipe";
import Profile from "./routes/Profile";
import ForgotPassword from "./routes/ForgotPassword";
import ResetPassword from "./routes/ResetPassword";
import AdminDashboard from "./routes/AdminDashboard";
import Navbar from "./components/Navbar";
import { jwtDecode } from "jwt-decode";

import { ThemeProvider, CssBaseline, CircularProgress, Box } from '@mui/material';
import theme from './theme';

const API_URL = process.env.REACT_APP_API_URL;

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [currentUser, setCurrentUser] = useState(null); // <-- ADDED
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    setIsLoggedIn(false);
    setUserRole(null);
    setCurrentUser(null); // <-- ADDED
    navigate("/login");
  }, [navigate]);

  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const decodedToken = jwtDecode(token);
        const currentTime = Date.now() / 1000;
        let activeToken = token;
        let newDecodedToken = decodedToken;

        if (decodedToken.exp < currentTime) {
          console.warn("Token expired, attempting refresh...");
          const refresh_token = localStorage.getItem("refresh_token");
          if (!refresh_token) {
            handleLogout();
            return;
          }

          const response = await fetch(`${API_URL}/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${refresh_token}` },
          });

          const data = await response.json();
          if (response.ok) {
            localStorage.setItem("token", data.access_token);
            activeToken = data.access_token; // Use the new token for the profile fetch
            newDecodedToken = jwtDecode(activeToken);
          } else {
            handleLogout();
            return; // Exit if refresh fails
          }
        }
        
        // If we have a valid token (original or refreshed), set auth state and fetch user
        setIsLoggedIn(true);
        setUserRole(newDecodedToken.role || null);
        
        const userId = newDecodedToken.sub; // 'sub' is the standard JWT claim for user ID
        const userProfileResponse = await fetch(`${API_URL}/users/${userId}`, {
          headers: { Authorization: `Bearer ${activeToken}` },
        });

        if (userProfileResponse.ok) {
          const userData = await userProfileResponse.json();
          setCurrentUser(userData);
        }

      } catch (error) {
        console.error("Auth check failed:", error);
        handleLogout();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, [handleLogout]);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Navbar isLoggedIn={isLoggedIn} handleLogout={handleLogout} userRole={userRole} currentUser={currentUser} />
      <Routes>
        <Route path="/login" element={<Login setIsLoggedIn={setIsLoggedIn} />} />
        <Route path="/register" element={<Register />} />
        <Route path="/recipes" element={isLoggedIn ? <Recipes /> : <Navigate to="/login" />} />
        <Route path="/profile" element={isLoggedIn ? <Profile /> : <Navigate to="/login" />} />
        <Route path="/recipes/:id" element={isLoggedIn ? <RecipeDetail /> : <Navigate to="/login" />} />
        <Route path="/create-recipe" element={isLoggedIn ? <CreateRecipe /> : <Navigate to="/login" />} />
        <Route path="/edit-recipe/:id" element={isLoggedIn ? <EditRecipe /> : <Navigate to="/login" />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/admin" element={
          isLoggedIn && userRole === "admin" ? (
            <AdminDashboard />
          ) : isLoggedIn ? (
            <Navigate to="/recipes" />
          ) : (
            <Navigate to="/login" />
          )
        } />
        <Route path="/" element={isLoggedIn ? <Navigate to="/recipes" /> : <Navigate to="/login" />} />
      </Routes>
    </ThemeProvider>
  );
}

export default App;