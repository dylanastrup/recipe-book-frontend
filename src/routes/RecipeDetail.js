import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { Card, CardContent, Typography, Button, Grid, Box, Chip, GlobalStyles } from "@mui/material";
import {
  FacebookShareButton, TwitterShareButton, EmailShareButton, WhatsappShareButton,
  FacebookIcon, TwitterIcon, EmailIcon, WhatsappIcon
} from "react-share";
import PrintIcon from '@mui/icons-material/Print';

const API_URL = process.env.REACT_APP_API_URL;

const RecipeDetail = () => {
  const { id } = useParams();
  const [recipe, setRecipe] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const shareUrl = window.location.href;

  const checkAuth = () => {
    const token = localStorage.getItem("token");
    if (!token) return false;
    try {
      const decodedToken = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      if (decodedToken.exp < currentTime) {
        localStorage.removeItem("token");
        localStorage.removeItem("refresh_token");
        return false;
      }
      return decodedToken;
    } catch (error) {
      return false;
    }
  };

  useEffect(() => {
    const user = checkAuth();
    if (!user) { navigate("/login"); return; }

    const fetchRecipe = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${API_URL}/recipes/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRecipe(response.data);
      } catch (err) {
        setError("Failed to fetch recipe.");
      }
    };
    fetchRecipe();
  }, [id, navigate]);

  const handleDelete = async () => {
    const confirmDelete = window.confirm("Are you sure you want to delete this recipe?");
    if (!confirmDelete) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/recipes/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      navigate("/recipes");
    } catch (err) { setError("Failed to delete recipe."); }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!recipe) return <Typography sx={{ textAlign: 'center', marginTop: 4 }}>Loading...</Typography>;

  const currentUser = checkAuth();
  const currentUserId = currentUser ? parseInt(currentUser.sub || currentUser.id) : null;
  const isOwner = currentUserId === recipe.user_id;
  const isAdmin = currentUser && currentUser.role === "admin";
  const imageToShow = (recipe.images && recipe.images.length > 0) ? recipe.images[0] : "/no-image.png";
  const recipeTitle = `Check out this recipe for ${recipe.recipe_name}!`;

  return (
    <>
      {/* Print Styles: Global overrides for print view */}
      <GlobalStyles styles={{
        '@media print': {
          'header, .MuiAppBar-root': { display: 'none !important' }, // Hide Navbar
          'body': { backgroundColor: 'white' },
          // Remove card shadows and borders for a clean look
          '.MuiPaper-root': { boxShadow: 'none !important', border: 'none !important', margin: '0 !important' },
          // Ensure container is full width
          '.MuiContainer-root': { maxWidth: '100% !important', padding: '0 !important' }
        }
      }} />

      {/* 🔹 Banner Section (Image on screen, simple Title on print) */}
      <Box
        sx={{
          height: 300,
          backgroundImage: `url(${imageToShow})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
          borderBottomLeftRadius: 8,
          borderBottomRightRadius: 8,
          boxShadow: 3,
          // PRINT STYLES FOR OUTER BOX
          '@media print': {
             height: 'auto', // Let height adjust to content
             backgroundImage: 'none', // Hide image
             boxShadow: 'none',
             border: 'none',
             marginBottom: 2 // Add space below title
          }
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderBottomLeftRadius: 8, borderBottomRightRadius: 8,
            // PRINT STYLES FOR INNER OVERLAY BOX
            '@media print': {
                position: 'static', // No longer absolute overlay
                backgroundColor: 'transparent', // No dark overlay
                color: 'black', // Text becomes black
                p: 0,
                display: 'block' // Block display for normal flow
            }
          }}
        >
          <Typography 
            variant="h3" 
            sx={{ 
              color: 'white', 
              fontFamily: "'Patrick Hand', cursive",
              textShadow: '2px 2px 4px rgba(0,0,0,0.7)',
              textAlign: 'center', px: 2,
              // PRINT STYLES FOR TITLE TEXT
              '@media print': {
                  color: 'black',
                  textShadow: 'none',
                  textAlign: 'left', // Left align title on print
                  px: 0
              }
            }}
          >
            {recipe.recipe_name}
          </Typography>
        </Box>
      </Box>

      {/* 🔹 Recipe Details Card */}
      <Card sx={{ maxWidth: 800, margin: "20px auto", padding: 2, borderRadius: 3, boxShadow: 3 }}>
        <CardContent>
          {/* Header with Creator and Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
             {recipe.username ? (
                <Typography variant="subtitle1" color="textSecondary">Created by: {recipe.username}</Typography>
              ) : <Box />}
             
             {/* Hide Share & Print Buttons on print view */}
             <Box sx={{ display: 'flex', gap: 1, '@media print': { display: 'none' } }}>
                <Button variant="outlined" startIcon={<PrintIcon />} onClick={handlePrint} sx={{ mr: 2 }}>
                    Print
                </Button>
                <FacebookShareButton url={shareUrl} quote={recipeTitle}><FacebookIcon size={32} round /></FacebookShareButton>
                <TwitterShareButton url={shareUrl} title={recipeTitle}><TwitterIcon size={32} round /></TwitterShareButton>
                <WhatsappShareButton url={shareUrl} title={recipeTitle} separator=":: "><WhatsappIcon size={32} round /></WhatsappShareButton>
                <EmailShareButton url={shareUrl} subject={recipe.recipe_name} body={`${recipeTitle}\n\n${shareUrl}`}><EmailIcon size={32} round /></EmailShareButton>
             </Box>
          </Box>

          <Typography variant="body1" paragraph><strong>Description:</strong> {recipe.description}</Typography>
          
          {/* Info Grid */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
             <Grid item xs={6} sm={4}><Typography variant="body1"><strong>Cuisine:</strong> {recipe.cuisine}</Typography></Grid>
             <Grid item xs={6} sm={4}><Typography variant="body1"><strong>Prep Time:</strong> {recipe.prep_time} min</Typography></Grid>
             <Grid item xs={6} sm={4}><Typography variant="body1"><strong>Cook Time:</strong> {recipe.cook_time} min</Typography></Grid>
             <Grid item xs={6} sm={4}><Typography variant="body1"><strong>Servings:</strong> {recipe.servings}</Typography></Grid>
             <Grid item xs={6} sm={4}><Typography variant="body1"><strong>Difficulty:</strong> {recipe.difficulty}</Typography></Grid>
          </Grid>

          {/* Ingredients List */}
          <Typography variant="h5" sx={{ marginTop: 2, fontFamily: "'Patrick Hand', cursive" }}>Ingredients</Typography>
          {recipe.ingredients.length > 0 ? (
            <ul style={{ marginTop: '8px' }}>
              {recipe.ingredients.map((ingredient, index) => (
                <li key={index} style={{ marginBottom: '4px' }}>
                  {ingredient.amount} {ingredient.measurement_unit} of {ingredient.ingredient_name}
                </li>
              ))}
            </ul>
          ) : <Typography>No ingredients listed.</Typography>}

          {/* Steps Ordered List */}
          <Typography variant="h5" sx={{ marginTop: 2, fontFamily: "'Patrick Hand', cursive" }}>Steps</Typography>
          {recipe.steps.length > 0 ? (
            <ol style={{ marginTop: '8px' }}>
              {recipe.steps.map((step, index) => (
                <li key={index} style={{ marginBottom: '12px' }}>{step.instruction}</li>
              ))}
            </ol>
          ) : <Typography>No steps provided.</Typography>}

          {/* Tags Section */}
          <Typography variant="h6" sx={{ marginTop: 2 }}>Tags</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
            {recipe.tags.length > 0 ? (
                // Use simple text for tags on print instead of chips
                recipe.tags.map((tag, index) => (
                  <Chip 
                    key={index} 
                    label={tag} 
                    variant="outlined"
                    sx={{ '@media print': { border: 'none', padding: 0, margin: 0, '& .MuiChip-label': { paddingInline: 0 }, '&:not(:last-child):after': { content: '", "' } } }}
                  />
                ))
            ) : <Typography variant="body2" color="textSecondary">No tags available.</Typography>}
          </Box>

          {/* Hide Navigation Buttons on print view */}
          <Grid container spacing={2} sx={{ marginTop: 4, justifyContent: 'center', '@media print': { display: 'none' } }}>
            {(isOwner || isAdmin) && (
              <>
                <Grid item><Button variant="contained" color="primary" onClick={() => navigate(`/edit-recipe/${id}`)}>Edit Recipe</Button></Grid>
                <Grid item><Button variant="contained" color="error" onClick={handleDelete}>Delete Recipe</Button></Grid>
              </>
            )}
            <Grid item><Button variant="outlined" onClick={() => navigate("/recipes")}>Back to Recipes</Button></Grid>
          </Grid>

          {error && <Typography color="error" sx={{ marginTop: 2, textAlign: 'center' }}>{error}</Typography>}
        </CardContent>
      </Card>
    </>
  );
};

export default RecipeDetail;