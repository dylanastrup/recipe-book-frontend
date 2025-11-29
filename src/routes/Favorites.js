// src/routes/Favorites.js

import React, { useEffect, useState } from 'react';
import { Container, Grid, Typography, Box, CircularProgress, Alert } from '@mui/material';
import axios from 'axios';
import RecipeCard from '../components/RecipeCard';

const API_URL = process.env.REACT_APP_API_URL;

const Favorites = () => {
  const [favoriteRecipes, setFavoriteRecipes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const response = await axios.get(`${API_URL}/users/favorites`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        // We add is_favorited: true so the heart icon is filled in
        const favorites = response.data.map(recipe => ({ ...recipe, is_favorited: true }));
        setFavoriteRecipes(favorites);
      } catch (err) {
        setError("Failed to fetch favorite recipes.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchFavorites();
  }, [token]);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        My Favorite Recipes
      </Typography>
      {favoriteRecipes.length === 0 ? (
        <Typography>You haven't favorited any recipes yet.</Typography>
      ) : (
        <Grid container spacing={3}>
          {favoriteRecipes.map((recipe) => (
            <Grid item xs={12} sm={6} md={4} key={recipe.id}>
              <RecipeCard recipe={recipe} />
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default Favorites;