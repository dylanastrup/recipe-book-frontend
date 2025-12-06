import React from 'react';
import { Card, CardContent, Typography, Box, Button, Stack, Chip, Rating } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import FavoriteButton from './FavoriteButton';
import axios from 'axios';
// CHANGED: Switched to AutoAwesome (Sparkles) which is a standard icon
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

const API_URL = process.env.REACT_APP_API_URL;

const RecipeCard = ({ recipe }) => {
  const navigate = useNavigate();
  const defaultImage = "/no-image.png";

  if (!recipe) {
    return null;
  }

  const imageToShow = (recipe.images && recipe.images.length > 0) ? recipe.images[0] : defaultImage;

  let isOwnerOrAdmin = false;
  try {
    const token = localStorage.getItem("token");
    if (token) {
      const decoded = jwtDecode(token);
      const currentUserId = parseInt(decoded.sub);
      const isAdmin = decoded.role === "admin";
      const isOwner = currentUserId === recipe.user_id;
      isOwnerOrAdmin = isAdmin || isOwner;
    }
  } catch (err) {}

  const handleEdit = (e) => {
    e.stopPropagation();
    navigate(`/edit-recipe/${recipe.id}`);
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    const confirmDelete = window.confirm("Are you sure you want to delete this recipe?");
    if (confirmDelete) {
      try {
        const token = localStorage.getItem("token");
        await axios.delete(`${API_URL}/recipes/${recipe.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        window.location.reload();
      } catch (err) {
        alert("Failed to delete recipe.");
      }
    }
  };

  return (
    <Card 
      onClick={() => navigate(`/recipes/${recipe.id}`)}
      sx={{ 
        width: '100%',
        maxWidth: 250, 
        margin: 'auto',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        borderRadius: 3, 
        boxShadow: 3, 
        cursor: 'pointer',
        transition: "transform 0.2s, box-shadow 0.2s",
        '&:hover': { transform: "scale(1.02)", boxShadow: 6 },
      }}
    >
      <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1, backgroundColor: 'rgba(255, 255, 255, 0.7)', borderRadius: '50%' }}>
        <FavoriteButton recipeId={recipe.id} isInitiallyFavorited={recipe.is_favorited} />
      </Box>

      {/* UPDATED: Spice Badge with Sparkle Icon */}
      {recipe.original_recipe_id && (
        <Chip 
            icon={<AutoAwesomeIcon style={{ color: '#D28415' }} />} 
            label="Spiced Up"
            size="small"
            sx={{ 
                position: 'absolute', 
                top: 8, 
                left: 8, 
                zIndex: 1, 
                backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                fontWeight: 'bold',
                color: '#D28415',
                boxShadow: 1
            }} 
        />
      )}

      <Box
        component="img"
        src={imageToShow}
        alt={recipe.recipe_name}
        onError={(e) => { e.target.src = defaultImage; }}
        sx={{
          width: '100%',
          height: 150,
          objectFit: 'cover',
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12
        }}
      />
      
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 2 }}>
        <Typography 
          variant="h6" 
          sx={{ 
            fontFamily: "'Patrick Hand', cursive",
            height: '3rem', lineHeight: '1.5rem', overflow: 'hidden', textOverflow: 'ellipsis',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', mb: 1
          }}
        >
          {recipe.recipe_name}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Rating value={recipe.rating || 0} precision={0.5} readOnly size="small" />
          <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
            ({recipe.rating_count || 0})
          </Typography>
        </Box>

        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{ 
            height: '2.5rem', overflow: 'hidden', textOverflow: 'ellipsis',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}
        >
          {recipe.description}
        </Typography>

        <Box sx={{ flexGrow: 1 }} />

        <Typography variant="body2" sx={{ marginTop: 2 }}>
          <strong>Total Time:</strong> {recipe.prep_time + recipe.cook_time} mins
        </Typography>

        {isOwnerOrAdmin && (
          <Stack direction="row" spacing={1} sx={{ marginTop: 2 }}>
            <Button variant="outlined" size="small" onClick={handleEdit} sx={{ minWidth: 'auto', px: 2 }}>Edit</Button>
            <Button variant="outlined" color="error" size="small" onClick={handleDelete} sx={{ minWidth: 'auto', px: 2 }}>Delete</Button>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
};

export default RecipeCard;