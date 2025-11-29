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
import Favorites from "./routes/Favorites";
import { ThemeProvider, CssBaseline, CircularProgress, Box } from '@mui/material';
import theme from './theme';
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL;

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    setIsLoggedIn(false);
    setUserRole(null);
    setCurrentUser(null);
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
          const refresh_token = localStorage.getItem("refresh_token");
          if (!refresh_token) { handleLogout(); return; }

          const response = await axios.post(`${API_URL}/refresh`, {}, {
            headers: { Authorization: `Bearer ${refresh_token}` },
          });

          localStorage.setItem("token", response.data.access_token);
          activeToken = response.data.access_token;
          newDecodedToken = jwtDecode(activeToken);
        }
        
        setIsLoggedIn(true);
        setUserRole(newDecodedToken.role || null);
        
        const userId = newDecodedToken.sub;
        const userProfileResponse = await axios.get(`${API_URL}/users/${userId}`, {
          headers: { Authorization: `Bearer ${activeToken}` },
        });
        
        setCurrentUser(userProfileResponse.data);

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
        <Route path="/favorites" element={isLoggedIn ? <Favorites /> : <Navigate to="/login" />} />
        <Route path="/recipes/:id" element={isLoggedIn ? <RecipeDetail /> : <Navigate to="/login" />} />
        <Route path="/create-recipe" element={isLoggedIn ? <CreateRecipe /> : <Navigate to="/login" />} />
        <Route path="/edit-recipe/:id" element={isLoggedIn ? <EditRecipe /> : <Navigate to="/login" />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route 
          path="/admin" 
          element={
            isLoggedIn && userRole === "admin" 
              ? <AdminDashboard /> 
              : <Navigate to="/login" />
          } 
        />
        {/* THIS IS THE CORRECTED LINE */}
        <Route path="/" element={isLoggedIn ? <Navigate to="/recipes" /> : <Navigate to="/login" />} />
      </Routes>
    </ThemeProvider>
  );
}

export default App;