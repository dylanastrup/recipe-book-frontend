import React, { useState, useEffect } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import { 
  Container, Grid, Paper, Typography, TextField, Button, Box, Avatar, Alert, Divider 
} from "@mui/material";
import PersonIcon from '@mui/icons-material/Person';
import RecipeCard from "../components/RecipeCard"; // Importing your existing card component

const API_URL = process.env.REACT_APP_API_URL;

const Profile = () => {
  const [user, setUser] = useState({ 
    username: "", email: "", first_name: "", last_name: "" 
  });
  
  const [recipes, setRecipes] = useState([]);
  const [error, setError] = useState(null);
  
  // State for the edit form
  const [updatedUser, setUpdatedUser] = useState({ 
    username: "", email: "", first_name: "", last_name: "", password: "" 
  });
  
  const [editing, setEditing] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) { navigate("/login"); return; }

    try {
      const decodedToken = jwtDecode(token);
      const userId = decodedToken.sub; 

      // 1. Fetch User Info
      axios.get(`${API_URL}/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(response => {
        setUser(response.data);
        // Initialize the form with current data
        setUpdatedUser({ 
            username: response.data.username, 
            email: response.data.email, 
            first_name: response.data.first_name || "", 
            last_name: response.data.last_name || "", 
            password: "" 
        });
      })
      .catch(() => setError("Failed to load user info."));

      // 2. Fetch User's Recipes
      // Note: We might need to update the backend route to return full recipe data 
      // if RecipeCard needs images/prep_time/etc. For now, we assume it does.
      axios.get(`${API_URL}/recipes?search=`, { 
        headers: { Authorization: `Bearer ${token}` } 
      }).then(res => {
          // Filter to only show MY recipes locally if the API returns all
          // Ideally, your backend /users/id/recipes route should return full objects
          // But here is a fallback if you reuse the main search endpoint:
          const myRecipes = res.data.filter(r => r.user_id === parseInt(userId));
          setRecipes(myRecipes);
      }).catch(() => setError("Failed to load recipes."));
      
    } catch (error) {
      localStorage.removeItem("token");
      navigate("/login");
    }
  }, [navigate, token]);

  const handleChange = (e) => {
    setUpdatedUser({ ...updatedUser, [e.target.name]: e.target.value });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError(null);

    // Basic password validation
    if (updatedUser.password) {
      if (updatedUser.password.length < 8) return setError("Password must be at least 8 chars.");
      if (!/\d/.test(updatedUser.password)) return setError("Password must contain a number.");
      if (!/[A-Z]/.test(updatedUser.password)) return setError("Password must contain an uppercase letter.");
    }

    try {
      const response = await axios.put(`${API_URL}/update-profile`, updatedUser, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      });

      if (response.status === 200) {
        alert("Profile updated successfully!");
        setUser({ 
            ...user, 
            username: updatedUser.username, 
            email: updatedUser.email,
            first_name: updatedUser.first_name,
            last_name: updatedUser.last_name
        });
        setEditing(false);

        if (updatedUser.password) {
          alert("Password updated. Please log in again.");
          localStorage.removeItem("token");
          navigate("/login");
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update profile.");
    }
  };

  // Helper to generate initials for Avatar
  const getInitials = () => {
    const f = user.first_name ? user.first_name[0] : "";
    const l = user.last_name ? user.last_name[0] : "";
    return (f + l).toUpperCase() || <PersonIcon />;
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        
        {/* LEFT COLUMN: User Profile Card */}
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3, textAlign: 'center' }}>
            <Box display="flex" justifyContent="center" mb={2}>
              <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main', fontSize: '2rem' }}>
                {getInitials()}
              </Avatar>
            </Box>
            
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {!editing ? (
              // DISPLAY MODE
              <>
                <Typography variant="h5">
                  {user.first_name && user.last_name 
                    ? `${user.first_name} ${user.last_name}` 
                    : user.username}
                </Typography>
                <Typography variant="body1" color="textSecondary" gutterBottom>
                  {user.email}
                </Typography>
                
                <Divider sx={{ my: 2 }} />
                
                <Button variant="contained" fullWidth onClick={() => setEditing(true)}>
                  Edit Profile
                </Button>
              </>
            ) : (
              // EDIT MODE
              <form onSubmit={handleUpdate}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField label="First Name" name="first_name" value={updatedUser.first_name} onChange={handleChange} size="small" />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField label="Last Name" name="last_name" value={updatedUser.last_name} onChange={handleChange} size="small" />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField label="Username" name="username" value={updatedUser.username} onChange={handleChange} fullWidth size="small" required />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField label="Email" name="email" value={updatedUser.email} onChange={handleChange} fullWidth size="small" required />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField 
                        label="New Password" 
                        name="password" 
                        type="password" 
                        placeholder="Leave blank to keep current" 
                        onChange={handleChange} 
                        fullWidth 
                        size="small" 
                        helperText="Min 8 chars, 1 number, 1 uppercase"
                    />
                  </Grid>
                </Grid>
                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <Button type="submit" variant="contained" fullWidth>Save</Button>
                  <Button variant="outlined" fullWidth onClick={() => setEditing(false)}>Cancel</Button>
                </Box>
              </form>
            )}
          </Paper>
        </Grid>

        {/* RIGHT COLUMN: User's Recipes */}
        <Grid item xs={12} md={8}>
          <Typography variant="h4" gutterBottom sx={{ fontFamily: "'Patrick Hand', cursive", color: '#477491' }}>
            My Recipes
          </Typography>
          <Divider sx={{ mb: 3 }} />

          {recipes.length === 0 ? (
            <Typography variant="body1" color="textSecondary">
                You haven't posted any recipes yet.
            </Typography>
          ) : (
            <Grid container spacing={3}>
              {recipes.map(recipe => (
                <Grid item xs={12} sm={6} key={recipe.id}>
                  {/* Reusing your existing RecipeCard */}
                  <RecipeCard recipe={recipe} />
                </Grid>
              ))}
            </Grid>
          )}
        </Grid>

      </Grid>
    </Container>
  );
};

export default Profile;