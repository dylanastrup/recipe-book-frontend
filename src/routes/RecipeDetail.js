import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { 
  Card, CardContent, Typography, Button, Grid, Box, Chip, GlobalStyles, Rating, Divider, Link 
} from "@mui/material";
import {
  FacebookShareButton, TwitterShareButton, EmailShareButton, WhatsappShareButton,
  FacebookIcon, TwitterIcon, EmailIcon, WhatsappIcon
} from "react-share";
import PrintIcon from '@mui/icons-material/Print';
import StarIcon from '@mui/icons-material/Star';
// CHANGED: Switched to AutoAwesome (Sparkles)
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

const API_URL = process.env.REACT_APP_API_URL;

const RecipeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [recipe, setRecipe] = useState(null);
  const [error, setError] = useState(null);
  const [userRating, setUserRating] = useState(0); 

  const shareUrl = window.location.href;

  const checkAuth = useCallback(() => {
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
  }, []);

  const fetchRecipe = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/recipes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRecipe(response.data);
      setUserRating(response.data.user_rating || 0);
    } catch (err) {
      setError("Failed to fetch recipe.");
    }
  }, [id]);

  useEffect(() => {
    const user = checkAuth();
    if (!user) { navigate("/login"); return; }
    fetchRecipe();
  }, [checkAuth, fetchRecipe, navigate]);

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

  const handleSpice = async () => {
    const token = localStorage.getItem("token");
    if (!token) return navigate('/login');
    
    const confirmSpice = window.confirm("Ready to Spice It Up? This creates a copy for you to edit.");
    if (!confirmSpice) return;

    try {
        const response = await axios.post(`${API_URL}/recipes/${id}/spice`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        navigate(`/edit-recipe/${response.data.new_recipe_id}`);
    } catch (err) {
        alert("Failed to spice up recipe.");
    }
  };

  const handleRatingChange = async (event, newValue) => {
    setUserRating(newValue);
    try {
        const token = localStorage.getItem("token");
        await axios.post(`${API_URL}/recipes/${id}/rate`, 
            { score: newValue },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        await fetchRecipe(); 
    } catch (err) {
        console.error("Failed to rate", err);
    }
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
      <GlobalStyles styles={{
        '@media print': {
          'header, .MuiAppBar-root': { display: 'none !important' },
          'body': { backgroundColor: 'white' },
          '.MuiPaper-root': { boxShadow: 'none !important', border: 'none !important', margin: '0 !important' },
          '.MuiContainer-root': { maxWidth: '100% !important', padding: '0 !important' }
        }
      }} />

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
          '@media print': {
             height: 'auto', backgroundImage: 'none', boxShadow: 'none', border: 'none', marginBottom: 2
          }
        }}
      >
        <Box
          sx={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            borderBottomLeftRadius: 8, borderBottomRightRadius: 8,
            '@media print': { position: 'static', backgroundColor: 'transparent', color: 'black', p: 0, display: 'block' }
          }}
        >
          <Typography 
            variant="h3" 
            sx={{ 
              color: 'white', fontFamily: "'Patrick Hand', cursive", textShadow: '2px 2px 4px rgba(0,0,0,0.7)', textAlign: 'center', px: 2,
              '@media print': { color: 'black', textShadow: 'none', textAlign: 'left', px: 0 }
            }}
          >
            {recipe.recipe_name}
          </Typography>
          
          {/* UPDATED: Attribution Link with Sparkle Icon */}
          {recipe.original_recipe && (
            <Typography 
                variant="subtitle1" 
                onClick={() => navigate(`/recipes/${recipe.original_recipe.id}`)}
                sx={{ 
                    color: '#ffb74d', 
                    cursor: 'pointer', textDecoration: 'underline', mt: 1, fontWeight: 'bold',
                    '&:hover': { color: '#fff' },
                    '@media print': { color: 'black', textDecoration: 'none' }
                }}
            >
                ✨ Spiced Up from {recipe.original_recipe.name} by {recipe.original_recipe.username}
            </Typography>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, '@media print': { display: 'none' } }}>
             <Rating value={recipe.rating} readOnly precision={0.5} icon={<StarIcon fontSize="inherit" sx={{ color: '#ffc107' }} />} emptyIcon={<StarIcon fontSize="inherit" sx={{ color: 'rgba(255, 255, 255, 0.3)' }} />} />
             <Typography variant="body1" sx={{ color: 'white', ml: 1, fontWeight: 'bold' }}>
                 {recipe.rating} ({recipe.rating_count} reviews)
             </Typography>
          </Box>

        </Box>
      </Box>

      <Card sx={{ maxWidth: 800, margin: "20px auto", padding: 2, borderRadius: 3, boxShadow: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
             {recipe.username ? (
                <Typography variant="subtitle1" color="textSecondary">Created by: {recipe.username}</Typography>
              ) : <Box />}
             
             <Box sx={{ display: 'flex', gap: 1, '@media print': { display: 'none' } }}>
                {/* --- UPDATED BUTTON with Sparkle Icon --- */}
                <Button 
                    variant="contained" 
                    startIcon={<AutoAwesomeIcon />} // Sparkle Icon
                    onClick={handleSpice} 
                    sx={{ mr: 2, backgroundColor: '#D28415', '&:hover': { backgroundColor: '#b36b10' } }}
                >
                    Spice It Up
                </Button>
                {/* ---------------------- */}

                <Button variant="outlined" startIcon={<PrintIcon />} onClick={handlePrint} sx={{ mr: 2 }}>Print</Button>
                <FacebookShareButton url={shareUrl} quote={recipeTitle}><FacebookIcon size={32} round /></FacebookShareButton>
                <TwitterShareButton url={shareUrl} title={recipeTitle}><TwitterIcon size={32} round /></TwitterShareButton>
                <WhatsappShareButton url={shareUrl} title={recipeTitle} separator=":: "><WhatsappIcon size={32} round /></WhatsappShareButton>
                <EmailShareButton url={shareUrl} subject={recipe.recipe_name} body={`${recipeTitle}\n\n${shareUrl}`}><EmailIcon size={32} round /></EmailShareButton>
             </Box>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, p: 2, backgroundColor: '#f9f9f9', borderRadius: 2, '@media print': { display: 'none' } }}>
             <Typography component="legend" sx={{ mr: 2, fontWeight: 'bold' }}>
                {userRating > 0 ? "Your Rating:" : "Rate this recipe:"}
             </Typography>
             <Rating name="user-rating" value={userRating} onChange={handleRatingChange} size="large" />
            {userRating > 0 && <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>(Click to change)</Typography>}
          </Box>

          <Typography variant="body1" paragraph><strong>Description:</strong> {recipe.description}</Typography>
          
          <Grid container spacing={2} sx={{ mb: 2 }}>
             <Grid item xs={6} sm={4}><Typography variant="body1"><strong>Cuisine:</strong> {recipe.cuisine}</Typography></Grid>
             <Grid item xs={6} sm={4}><Typography variant="body1"><strong>Prep Time:</strong> {recipe.prep_time} min</Typography></Grid>
             <Grid item xs={6} sm={4}><Typography variant="body1"><strong>Cook Time:</strong> {recipe.cook_time} min</Typography></Grid>
             <Grid item xs={6} sm={4}><Typography variant="body1"><strong>Servings:</strong> {recipe.servings}</Typography></Grid>
             <Grid item xs={6} sm={4}><Typography variant="body1"><strong>Difficulty:</strong> {recipe.difficulty}</Typography></Grid>
          </Grid>

          <Typography variant="h5" sx={{ marginTop: 2, fontFamily: "'Patrick Hand', cursive" }}>Ingredients</Typography>
          {recipe.ingredients.length > 0 ? (
            <ul style={{ marginTop: '8px' }}>
              {recipe.ingredients.map((ingredient, index) => (
                <li key={index} style={{ marginBottom: '4px' }}>{ingredient.amount} {ingredient.measurement_unit} of {ingredient.ingredient_name}</li>
              ))}
            </ul>
          ) : <Typography>No ingredients listed.</Typography>}

          <Typography variant="h5" sx={{ marginTop: 2, fontFamily: "'Patrick Hand', cursive" }}>Steps</Typography>
          {recipe.steps.length > 0 ? (
            <ol style={{ marginTop: '8px' }}>
              {recipe.steps.map((step, index) => (
                <li key={index} style={{ marginBottom: '12px' }}>{step.instruction}</li>
              ))}
            </ol>
          ) : <Typography>No steps provided.</Typography>}

          <Typography variant="h6" sx={{ marginTop: 2 }}>Tags</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
            {recipe.tags.length > 0 ? (
                recipe.tags.map((tag, index) => <Chip key={index} label={tag} variant="outlined" sx={{ '@media print': { border: 'none', padding: 0, margin: 0 } }} />)
            ) : <Typography variant="body2" color="textSecondary">No tags available.</Typography>}
          </Box>

          {/* Versions Section with Sparkle Icon */}
          {recipe.remixes && recipe.remixes.length > 0 && (
            <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid #eee', '@media print': { display: 'none' } }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AutoAwesomeIcon sx={{ color: '#D28415' }} /> Spiced Up Versions
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    See how others have adjusted this recipe!
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    {recipe.remixes.map((remix) => (
                        <Card key={remix.id} variant="outlined" sx={{ minWidth: 200, cursor: 'pointer', '&:hover': { bgcolor: '#f9f9f9' } }} onClick={() => navigate(`/recipes/${remix.id}`)}>
                            <CardContent>
                                <Typography variant="subtitle1" fontWeight="bold">{remix.name}</Typography>
                                <Typography variant="caption" color="textSecondary">by {remix.username}</Typography>
                            </CardContent>
                        </Card>
                    ))}
                </Box>
            </Box>
          )}

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