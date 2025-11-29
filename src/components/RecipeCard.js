import React from 'react';
import { Card, CardContent, Typography, Box, Button, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import FavoriteButton from './FavoriteButton';

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
  } catch (err) {
    // Non-critical error
  }

  const handleEdit = (e) => {
    e.stopPropagation();
    navigate(`/edit-recipe/${recipe.id}`);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    const confirmDelete = window.confirm("Are you sure you want to delete this recipe?");
    if (confirmDelete) {
      console.log(`Deleting recipe ${recipe.id}`);
      // Add API call to delete here
    }
  };

  return (
    <Card 
      onClick={() => navigate(`/recipes/${recipe.id}`)}
      sx={{ 
        width: '100%',
        // ----- THE CHANGE IS HERE -----
        maxWidth: 300, // Changed from 345 to 300
        // ------------------------------
        margin: 'auto', // Keeps it centered
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        borderRadius: 3, 
        boxShadow: 3, 
        cursor: 'pointer',
        transition: "transform 0.2s, box-shadow 0.2s",
        '&:hover': { 
          transform: "scale(1.02)", 
          boxShadow: 6 
        },
      }}
    >
      <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1, backgroundColor: 'rgba(255, 255, 255, 0.7)', borderRadius: '50%' }}>
        <FavoriteButton
          recipeId={recipe.id}
          isInitiallyFavorited={recipe.is_favorited}
        />
      </Box>

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
      
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" sx={{ fontFamily: "'Patrick Hand', cursive" }}>
          {recipe.recipe_name}
        </Typography>
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{ 
            height: 40,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {recipe.description}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="body2" sx={{ marginTop: 1 }}>
          <strong>Total Time:</strong> {recipe.prep_time + recipe.cook_time} mins
        </Typography>

        {isOwnerOrAdmin && (
          <Stack direction="row" spacing={1} sx={{ marginTop: 2 }}>
            <Button variant="outlined" size="small" onClick={handleEdit}>
              Edit
            </Button>
            <Button variant="outlined" color="error" size="small" onClick={handleDelete}>
              Delete
            </Button>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
};

export default RecipeCard;