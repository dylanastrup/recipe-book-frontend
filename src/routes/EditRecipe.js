import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode";

// Dnd-kit imports for drag and drop
import { DndContext, closestCenter } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  Container, Paper, Typography, Grid, TextField, Button, Box, Select, MenuItem, InputLabel, FormControl, IconButton, CircularProgress, Alert, Autocomplete, Chip
} from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

const API_URL = process.env.REACT_APP_API_URL;

// List for the dropdown
const measurementOptions = ["tsp", "tbsp", "fl oz", "cup", "pint", "quart", "gallon", "ml", "l", "oz", "lb", "gram", "kg", "pinch", "dash"];

// Map for exact matches (Front-end Normalization)
const UNIT_MAPPINGS = {
    "tablespoon": "tbsp", "tablespoons": "tbsp", "tbsp": "tbsp", "t": "tbsp", "T": "tbsp",
    "teaspoon": "tsp", "teaspoons": "tsp", "tsp": "tsp", "t": "tsp",
    "cup": "cup", "cups": "cup", "c": "cup",
    "ounce": "oz", "ounces": "oz", "oz": "oz",
    "fluid ounce": "fl oz", "fluid ounces": "fl oz", "fl oz": "fl oz",
    "pound": "lb", "pounds": "lb", "lb": "lb", "lbs": "lb",
    "gram": "g", "grams": "g", "g": "g",
    "kilogram": "kg", "kilograms": "kg", "kg": "kg",
    "liter": "l", "liters": "l", "l": "l",
    "milliliter": "ml", "milliliters": "ml", "ml": "ml",
    "quart": "qt", "quarts": "qt", "qt": "qt",
    "pint": "pt", "pints": "pt", "pt": "pt",
    "gallon": "gal", "gallons": "gal", "gal": "gal",
    "pinch": "pinch", "pinches": "pinch",
    "clove": "clove", "cloves": "clove",
    "slice": "slice", "slices": "slice",
    "can": "can", "cans": "can"
};

// Levenshtein Distance Algorithm for Fuzzy Matching
const levenshtein = (a, b) => {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
    for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
            }
        }
    }
    return matrix[b.length][a.length];
};

// Sortable Step Component
const SortableStep = ({ step, index, handleStepChange, deleteStep }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: step.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <Box ref={setNodeRef} style={style} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 2 }}>
      <Box sx={{ pt: 1.5, cursor: 'grab' }} {...attributes} {...listeners}><DragIndicatorIcon /></Box>
      <Typography sx={{ pt: 2 }}>{index + 1}.</Typography>
      <TextField label={`Step ${index + 1}`} value={step.instruction} onChange={(e) => handleStepChange(index, e.target.value)} required fullWidth multiline />
      <IconButton onClick={() => deleteStep(index)} color="error" sx={{ mt: 1 }}><DeleteIcon /></IconButton>
    </Box>
  );
};

const EditRecipe = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [recipeData, setRecipeData] = useState(null);
  const [existingTags, setExistingTags] = useState([]);
  
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // --- 1. Fetch Initial Data (Recipe + Tags) ---
  useEffect(() => {
    const fetchInitialData = async () => {
        if (!token) { navigate('/login'); return; }
        try {
            const tagsResponse = await axios.get(`${API_URL}/tags`, { headers: { Authorization: `Bearer ${token}` } });
            setExistingTags(tagsResponse.data);

            const recipeResponse = await axios.get(`${API_URL}/recipes/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            
            setRecipeData({
                recipe_name: recipeResponse.data.recipe_name || "",
                description: recipeResponse.data.description || "",
                cuisine: recipeResponse.data.cuisine || "",
                prep_time: recipeResponse.data.prep_time || "",
                cook_time: recipeResponse.data.cook_time || "",
                servings: recipeResponse.data.servings || "",
                difficulty: recipeResponse.data.difficulty || "Easy",
                // Map ingredients to match form structure
                ingredients: recipeResponse.data.ingredients.map(ing => ({
                    ingredient_name: ing.ingredient_name,
                    amount: ing.amount,
                    measurement_name: ing.measurement_unit || "",
                })),
                // Give steps unique IDs for drag-and-drop
                steps: recipeResponse.data.steps.map(step => ({
                    ...step,
                    id: Date.now() + Math.random(), 
                })),
                images: recipeResponse.data.images.length > 0 ? recipeResponse.data.images : [""],
                tags: recipeResponse.data.tags || [],
            });
        } catch (err) {
            setError("Failed to load recipe data.");
        } finally {
            setIsLoading(false);
        }
    };
    fetchInitialData();
  }, [id, token, navigate]);

  // --- 2. Unsaved Changes Warning ---
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => { window.removeEventListener('beforeunload', handleBeforeUnload); };
  }, [isDirty]);

  // --- 3. Handlers ---
  const handleChange = (e) => {
    setIsDirty(true);
    setRecipeData({ ...recipeData, [e.target.name]: e.target.value });
  };
  
  const handleTagsChange = (event, newValue) => {
    setIsDirty(true);
    setRecipeData({ ...recipeData, tags: newValue });
  };

  const handleIngredientChange = (index, field, value) => {
    setIsDirty(true);
    const updatedIngredients = [...recipeData.ingredients];
    updatedIngredients[index][field] = value;
    setRecipeData({ ...recipeData, ingredients: updatedIngredients });
  };

  // Fuzzy Matching logic for units
  const handleUnitBlur = (index, value) => {
    if (!value) return;
    const normalizedInput = value.toLowerCase().trim();

    // Exact match check
    if (UNIT_MAPPINGS[normalizedInput]) {
        if (UNIT_MAPPINGS[normalizedInput] !== value) {
            handleIngredientChange(index, "measurement_name", UNIT_MAPPINGS[normalizedInput]);
        }
        return;
    }
    // Fuzzy match check
    const potentialMatches = Object.keys(UNIT_MAPPINGS);
    let bestMatch = null;
    let lowestDistance = Infinity;
    for (const key of potentialMatches) {
        const dist = levenshtein(normalizedInput, key);
        if (dist < lowestDistance && dist <= 2 && key.length > 2) {
            lowestDistance = dist;
            bestMatch = key;
        }
    }
    if (bestMatch) {
        handleIngredientChange(index, "measurement_name", UNIT_MAPPINGS[bestMatch]);
    }
  };

  const handleStepChange = (index, value) => {
    setIsDirty(true);
    const updatedSteps = [...recipeData.steps];
    updatedSteps[index].instruction = value;
    setRecipeData({ ...recipeData, steps: updatedSteps });
  };

  const handleImageChange = (index, value) => {
    setIsDirty(true);
    const updatedImages = [...recipeData.images];
    updatedImages[index] = value;
    setRecipeData({ ...recipeData, images: updatedImages });
  };

  const addIngredientField = () => {
    setIsDirty(true);
    setRecipeData({ ...recipeData, ingredients: [...recipeData.ingredients, { ingredient_name: "", amount: "", measurement_name: "" }] });
  };

  const deleteIngredient = (index) => {
    setIsDirty(true);
    const updatedIngredients = recipeData.ingredients.filter((_, i) => i !== index);
    setRecipeData({ ...recipeData, ingredients: updatedIngredients });
  };

  const addStepField = () => {
    setIsDirty(true);
    setRecipeData({ ...recipeData, steps: [...recipeData.steps, { id: Date.now(), step_number: recipeData.steps.length + 1, instruction: "" }] });
  };

  const deleteStep = (index) => {
    setIsDirty(true);
    const updatedSteps = recipeData.steps.filter((_, i) => i !== index).map((step, i) => ({ ...step, step_number: i + 1 }));
    setRecipeData({ ...recipeData, steps: updatedSteps });
  };

  const addImageField = () => {
    setIsDirty(true);
    setRecipeData({ ...recipeData, images: [...recipeData.images, ""] });
  };

  const deleteImage = (index) => {
    setIsDirty(true);
    const updatedImages = recipeData.images.filter((_, i) => i !== index);
    setRecipeData({ ...recipeData, images: updatedImages });
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
        setIsDirty(true);
        setRecipeData((prevData) => {
            const oldIndex = prevData.steps.findIndex((step) => step.id === active.id);
            const newIndex = prevData.steps.findIndex((step) => step.id === over.id);
            const reorderedSteps = arrayMove(prevData.steps, oldIndex, newIndex).map((step, index) => ({ ...step, step_number: index + 1 }));
            return { ...prevData, steps: reorderedSteps };
        });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    const submissionData = { ...recipeData, images: recipeData.images.filter(img => img.trim() !== "") };

    try {
      await axios.put(`${API_URL}/recipes/${id}`, submissionData, { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } });
      setIsDirty(false);
      navigate(`/recipes/${id}`);
    } catch (err) {
      setError("Failed to update recipe. Please check all fields.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading State
  if (isLoading) {
    return <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh"><CircularProgress /></Box>;
  }

  // Error State
  if (error || !recipeData) {
    return <Container maxWidth="sm"><Alert severity="error" sx={{ mt: 4 }}>{error || "Recipe not found"}</Alert><Button onClick={() => navigate('/recipes')} sx={{mt: 2}}>Back to Recipes</Button></Container>;
  }

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">Edit Recipe</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Grid container spacing={3}>
            <Grid item xs={12}><TextField name="recipe_name" label="Recipe Name" value={recipeData.recipe_name} onChange={handleChange} fullWidth required /></Grid>
            <Grid item xs={12}><TextField name="description" label="Description" value={recipeData.description} onChange={handleChange} fullWidth multiline rows={4} required /></Grid>
            <Grid item xs={12} sm={6}><TextField name="cuisine" label="Cuisine Type" value={recipeData.cuisine} onChange={handleChange} fullWidth required /></Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Difficulty</InputLabel>
                <Select name="difficulty" value={recipeData.difficulty} label="Difficulty" onChange={handleChange}>
                  <MenuItem value="Easy">Easy</MenuItem>
                  <MenuItem value="Medium">Medium</MenuItem>
                  <MenuItem value="Hard">Hard</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}><TextField type="number" name="prep_time" label="Prep Time (mins)" value={recipeData.prep_time} onChange={handleChange} fullWidth required /></Grid>
            <Grid item xs={12} sm={4}><TextField type="number" name="cook_time" label="Cook Time (mins)" value={recipeData.cook_time} onChange={handleChange} fullWidth required /></Grid>
            <Grid item xs={12} sm={4}><TextField type="number" name="servings" label="Servings" value={recipeData.servings} onChange={handleChange} fullWidth required /></Grid>
          </Grid>
          
          <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>Tags</Typography>
          <Autocomplete
              multiple
              freeSolo
              options={existingTags}
              value={recipeData.tags}
              onChange={handleTagsChange}
              renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                      <Chip variant="outlined" label={option} {...getTagProps({ index })} />
                  ))
              }
              renderInput={(params) => (
                  <TextField {...params} variant="outlined" label="Tags" placeholder="e.g., Dinner, Quick, Vegetarian" />
              )}
          />

          <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>Ingredients</Typography>
          {recipeData.ingredients.map((ing, index) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <TextField label="Amount" value={ing.amount} onChange={(e) => handleIngredientChange(index, "amount", e.target.value)} sx={{ width: '20%' }} />
              <Autocomplete
                freeSolo
                options={measurementOptions}
                value={ing.measurement_name}
                onChange={(event, newValue) => { handleIngredientChange(index, "measurement_name", newValue || ""); }}
                onInputChange={(event, newInputValue) => { handleIngredientChange(index, "measurement_name", newInputValue); }}
                renderInput={(params) => (
                    <TextField 
                        {...params} 
                        label="Unit" 
                        onBlur={(e) => handleUnitBlur(index, e.target.value)}
                    />
                )}
                sx={{ width: '30%' }}
              />
              <TextField label="Ingredient Name" value={ing.ingredient_name} onChange={(e) => handleIngredientChange(index, "ingredient_name", e.target.value)} required fullWidth />
              <IconButton onClick={() => deleteIngredient(index)} color="error"><DeleteIcon /></IconButton>
            </Box>
          ))}
          <Button startIcon={<AddIcon />} onClick={addIngredientField}>Add Ingredient</Button>

          <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>Steps</Typography>
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={recipeData.steps.map(s => s.id)} strategy={verticalListSortingStrategy}>
              {recipeData.steps.map((step, index) => (
                <SortableStep key={step.id} step={step} index={index} handleStepChange={handleStepChange} deleteStep={deleteStep} />
              ))}
            </SortableContext>
          </DndContext>
          <Button startIcon={<AddIcon />} onClick={addStepField}>Add Step</Button>

          <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>Images</Typography>
          {recipeData.images.map((image, index) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <TextField label="Image URL" value={image} onChange={(e) => handleImageChange(index, e.target.value)} fullWidth />
              {image && (
                <Box component="img" sx={{ height: 56, width: 56, objectFit: 'cover', borderRadius: 1, ml: 1 }} src={image}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  onLoad={(e) => { e.currentTarget.style.display = 'block'; }} alt="preview" />
              )}
              <IconButton onClick={() => deleteImage(index)} color="error"><DeleteIcon /></IconButton>
            </Box>
          ))}
          <Button startIcon={<AddIcon />} onClick={addImageField}>Add Image</Button>

          <Box sx={{ mt: 4, textAlign: 'center', display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button type="submit" variant="contained" size="large" disabled={isSubmitting} sx={{ minWidth: 200 }}>
              {isSubmitting ? <CircularProgress size={24} /> : "Update Recipe"}
            </Button>
            <Button variant="outlined" size="large" onClick={() => navigate(`/recipes/${id}`)} sx={{ minWidth: 200 }}>
                Cancel
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default EditRecipe;