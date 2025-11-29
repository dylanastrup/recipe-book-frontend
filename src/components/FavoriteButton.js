import React, { useState } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

const FavoriteButton = ({ recipeId, isInitiallyFavorited }) => {
  const [isFavorited, setIsFavorited] = useState(isInitiallyFavorited);
  const token = localStorage.getItem('token');

  const handleFavoriteClick = async (e) => {
    e.stopPropagation(); // Prevent card navigation
    const wasFavorited = isFavorited;
    setIsFavorited(!wasFavorited);

    try {
      if (wasFavorited) {
        await axios.delete(`${API_URL}/users/favorites/${recipeId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post(`${API_URL}/users/favorites/${recipeId}`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (error) {
      console.error("Failed to update favorite status", error);
      setIsFavorited(wasFavorited); // Revert on error
    }
  };

  return (
    <Tooltip title={isFavorited ? "Remove from Favorites" : "Add to Favorites"}>
      <IconButton onClick={handleFavoriteClick} sx={{ color: '#D28415' }}>
        {isFavorited ? <FavoriteIcon /> : <FavoriteBorderIcon />}
      </IconButton>
    </Tooltip>
  );
};

export default FavoriteButton;