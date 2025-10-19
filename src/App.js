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

import { ThemeProvider, CssBaseline, CircularProgress, Box, Typography } from '@mui/material';
import theme from './theme';

const API_URL = process.env.REACT_APP_API_URL;

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // <-- ADDED LOADING STATE
  const navigate = useNavigate();

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    setIsLoggedIn(false);
    setUserRole(null);
    navigate("/login");
  }, [navigate]);

  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setIsLoggedIn(false);
        setUserRole(null);
        setIsLoading(false); // Done loading, not logged in
        return;
      }

      try {
        const decodedToken = jwtDecode(token);
        const currentTime = Date.now() / 1000;

        if (decodedToken.exp < currentTime) {
          console.warn("Token expired, attempting refresh...");
          
          const refresh_token = localStorage.getItem("refresh_token");
          if (!refresh_token) {
            handleLogout();
            return;
          }

          const response = await fetch(`${API_URL}/refresh`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${refresh_token}`,
            },
          });

          const data = await response.json();
          if (response.ok) {
            localStorage.setItem("token", data.access_token);
            const decoded = jwtDecode(data.access_token);
            setUserRole(decoded.role || null);
            setIsLoggedIn(true);
          } else {
            handleLogout();
          }

        } else {
          setIsLoggedIn(true);
          setUserRole(decodedToken.role || null);
        }
      } catch (error) {
        console.error("Invalid token:", error);
        handleLogout();
      } finally {
        // CRUCIAL: Set loading to false after all checks are complete
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, [handleLogout]); // handleLogout is memoized with useCallback

  // While checking auth, show a loading screen
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  // Once loading is complete, render the app
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Navbar isLoggedIn={isLoggedIn} handleLogout={handleLogout} userRole={userRole} />
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