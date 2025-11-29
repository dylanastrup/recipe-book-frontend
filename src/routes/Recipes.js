import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Container,
  Grid,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Button,
  Typography,
  Alert,
  Box,
  CircularProgress
} from "@mui/material";
import RecipeCard from "../components/RecipeCard";

const API_URL = process.env.REACT_APP_API_URL;

const Recipes = () => {
  const [recipes, setRecipes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("");
  const navigate = useNavigate();

  const fetchRecipes = useCallback(async (query = "", sort = "") => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }
      const response = await axios.get(
        `${API_URL}/recipes?search=${query}&sort=${sort}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRecipes(response.data);
    } catch (err) {
      setError("Failed to fetch recipes.");
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  const handleSearchChange = (e) => setSearchQuery(e.target.value);
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchRecipes(searchQuery, sortBy);
  };
  const handleSortChange = (e) => {
    setSortBy(e.target.value);
    fetchRecipes(searchQuery, e.target.value);
  };

  return (
    <Container>
      <Typography variant="h4" gutterBottom sx={{ fontFamily: "'Patrick Hand', cursive", color: '#477491' }}>
        All Recipes
      </Typography>

      <form onSubmit={handleSearchSubmit} style={{ marginBottom: '30px', display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          label="Search Recipes"
          variant="outlined"
          value={searchQuery}
          onChange={handleSearchChange}
          sx={{ marginRight: 2, width: '250px', marginBottom: { xs: 2, sm: 0 } }}
        />
        <FormControl sx={{ minWidth: 220, marginRight: 2, marginBottom: { xs: 2, sm: 0 } }}>
          <InputLabel>Sort by</InputLabel>
          <Select value={sortBy} label="Sort by" onChange={handleSortChange}>
            <MenuItem value="">Default</MenuItem>
            <MenuItem value="recipe_name_asc">Name (A-Z)</MenuItem>
            <MenuItem value="recipe_name_desc">Name (Z-A)</MenuItem>
            <MenuItem value="cuisine_asc">Cuisine (A-Z)</MenuItem>
            <MenuItem value="cuisine_desc">Cuisine (Z-A)</MenuItem>
            <MenuItem value="total_time_asc">Time (Short-Long)</MenuItem>
            <MenuItem value="total_time_desc">Time (Long-Short)</MenuItem>
            <MenuItem value="difficulty_asc">Difficulty (Easy → Hard)</MenuItem>
            <MenuItem value="difficulty_desc">Difficulty (Hard → Easy)</MenuItem>
            <MenuItem value="servings_asc">Servings (Fewest First)</MenuItem>
            <MenuItem value="servings_desc">Servings (Most First)</MenuItem>
          </Select>
        </FormControl>
        <Button 
          variant="contained" 
          type="submit" 
          sx={{ 
            backgroundColor: '#D28415', 
            '&:hover': { backgroundColor: '#b36b10' }
          }}
        >
          Search
        </Button>
      </form>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {isLoading ? (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      ) : (
        // --- CHANGE IS HERE ---
        // Changed spacing from 3 to 2 to bring cards closer
        <Grid container spacing={2}>
          {recipes && recipes.map((recipe, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={recipe?.id || index} sx={{ display: 'flex', justifyContent: 'center' }}>
              <RecipeCard recipe={recipe} />
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default Recipes;