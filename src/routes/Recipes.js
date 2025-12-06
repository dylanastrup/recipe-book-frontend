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
  Typography,
  Alert,
  Box,
  CircularProgress,
  Autocomplete,
  Chip,
  InputAdornment,
  Pagination // <-- New Import
} from "@mui/material";
import SearchIcon from '@mui/icons-material/Search';
import RecipeCard from "../components/RecipeCard";

const API_URL = process.env.REACT_APP_API_URL;

const Recipes = () => {
  const [recipes, setRecipes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [selectedTags, setSelectedTags] = useState([]); 
  const [availableTags, setAvailableTags] = useState([]); 

  // Pagination States
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const navigate = useNavigate();

  // 1. Fetch Logic
  const fetchRecipes = useCallback(async (query, sort, tags, pageNum) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) { navigate("/login"); return; }
      
      const tagsParam = tags.join(',');

      const response = await axios.get(
        `${API_URL}/recipes?search=${query}&sort=${sort}&tags=${tagsParam}&page=${pageNum}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update state with the new response structure
      setRecipes(response.data.recipes);
      setTotalPages(response.data.total_pages);

    } catch (err) {
      setError("Failed to fetch recipes.");
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  // 2. Load Tags on Mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }
    
    axios.get(`${API_URL}/tags`, { 
        headers: { Authorization: `Bearer ${token}` } 
    }).then(res => {
        setAvailableTags(res.data);
    }).catch(err => console.error("Failed to load tags"));
  }, [navigate]);

  // 3. LIVE SEARCH EFFECT
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      // When searching/sorting changes, we usually want to reset to page 1
      // But if the 'page' state itself changed, we want to fetch that specific page.
      // To handle this simply: we fetch the current 'page' state.
      // NOTE: You might want to reset setPage(1) if searchQuery changes, 
      // but for now, let's just fetch.
      fetchRecipes(searchQuery, sortBy, selectedTags, page);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
    
  }, [searchQuery, sortBy, selectedTags, page, fetchRecipes]);

  // Handlers
  const handleSearchChange = (e) => {
      setSearchQuery(e.target.value);
      setPage(1); // Reset to page 1 on new search
  };
  
  const handleSortChange = (e) => {
      setSortBy(e.target.value);
      setPage(1); // Reset to page 1 on new sort
  };
  
  const handleTagsChange = (event, newValue) => {
      setSelectedTags(newValue);
      setPage(1); // Reset to page 1 on new filter
  };

  const handlePageChange = (event, value) => {
      setPage(value);
      window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top on page change
  };

  return (
    <Container>
      <Typography variant="h4" gutterBottom sx={{ fontFamily: "'Patrick Hand', cursive", color: '#477491' }}>
        All Recipes
      </Typography>

      {/* SEARCH & FILTER BAR */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 5 }}>
                <TextField
                  label="Search..."
                  variant="outlined"
                  fullWidth
                  value={searchQuery}
                  onChange={handleSearchChange}
                  size="small"
                  InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>) }}
                />
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
                <Autocomplete
                    multiple
                    options={availableTags}
                    value={selectedTags}
                    onChange={handleTagsChange}
                    renderTags={(value, getTagProps) => value.map((option, index) => (<Chip variant="outlined" label={option} size="small" {...getTagProps({ index })} />))}
                    renderInput={(params) => (<TextField {...params} variant="outlined" label="Filter by Tags" placeholder="Tags" size="small" />)}
                />
            </Grid>
            <Grid size={{ xs: 6, md: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Sort by</InputLabel>
                  <Select value={sortBy} label="Sort by" onChange={handleSortChange}>
                    <MenuItem value="">Newest</MenuItem>
                    <MenuItem value="recipe_name_asc">A-Z</MenuItem>
                    <MenuItem value="total_time_asc">Quickest</MenuItem>
                    <MenuItem value="difficulty_asc">Difficulty (Easy → Hard)</MenuItem>
                  </Select>
                </FormControl>
            </Grid>
        </Grid>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {isLoading ? (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Grid container spacing={2}>
            {recipes.length > 0 ? (
              recipes.map((recipe, index) => (
                  <Grid size={{ xs: 12, sm: 6, md: 3 }} key={recipe?.id || index} sx={{ display: 'flex', justifyContent: 'center' }}>
                    <RecipeCard recipe={recipe} />
                  </Grid>
              ))
            ) : (
              <Grid size={{ xs: 12 }}>
                  <Typography align="center" color="textSecondary" sx={{ mt: 4 }}>
                      No recipes found matching your search.
                  </Typography>
              </Grid>
            )}
          </Grid>

          {/* PAGINATION CONTROLS */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 4 }}>
                <Pagination 
                    count={totalPages} 
                    page={page} 
                    onChange={handlePageChange} 
                    color="primary" 
                    size="large"
                />
            </Box>
          )}
        </>
      )}
    </Container>
  );
};

export default Recipes;