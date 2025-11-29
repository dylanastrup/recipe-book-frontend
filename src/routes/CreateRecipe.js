import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
const measurementOptions = ["tsp", "tbsp", "fl oz", "cup", "pint", "quart", "gallon", "ml", "l", "oz", "lb", "gram", "kg", "pinch", "dash"];

// Component for a single, sortable step
const SortableStep = ({ step, index, handleStepChange, deleteStep }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Box ref={setNodeRef} style={style} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 2 }}>
      <Box sx={{ pt: 1.5, cursor: 'grab' }} {...attributes} {...listeners}>
        <DragIndicatorIcon />
      </Box>
      <Typography sx={{ pt: 2 }}>{index + 1}.</Typography>
      <TextField
        label={`Step ${index + 1}`}
        value={step.instruction}
        onChange={(e) => handleStepChange(index, e.target.value)}
        required
        fullWidth
        multiline
      />
      <IconButton onClick={() => deleteStep(index)} color="error" sx={{ mt: 1 }}>
        <DeleteIcon />
      </IconButton>
    </Box>
  );
};


const CreateRecipe = () => {
  const [recipeData, setRecipeData] = useState({
    recipe_name: "", description: "", cuisine: "", prep_time: "", cook_time: "", servings: "", difficulty: "Easy",
    ingredients: [{ ingredient_name: "", amount: "", measurement_name: "" }],
    steps: [{ id: Date.now(), step_number: 1, instruction: "" }],
    images: [""],
    tags: [],
  });
  
  const [existingTags, setExistingTags] = useState([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${API_URL}/tags`, { headers: { Authorization: `Bearer ${token}` } });
        setExistingTags(response.data);
      } catch (err) { console.error("Failed to fetch tags", err); }
    };
    fetchTags();
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => { window.removeEventListener('beforeunload', handleBeforeUnload); };
  }, [isDirty]);

  const getUserId = () => {
    const token = localStorage.getItem("token"); if (!token) return null;
    try { const decodedToken = jwtDecode(token); return decodedToken.sub; }
    catch (error) { console.error("Invalid token:", error); return null; }
  };
  
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
    setError(null);
    setIsSubmitting(true);
    const token = localStorage.getItem("token");
    const userId = getUserId();
    if (!userId) {
      setError("User not authenticated.");
      setIsSubmitting(false);
      return;
    }
    const submissionData = { ...recipeData, user_id: userId, images: recipeData.images.filter(img => img.trim() !== "") };
    try {
      const response = await axios.post(`${API_URL}/recipes`, submissionData, { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } });
      if (response.status === 201) {
        setIsDirty(false); // Important: Reset dirty state after successful submission
        navigate("/recipes");
      }
    } catch (err) {
      setError("Failed to create recipe. Please check all fields and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Create a New Recipe
        </Typography>
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
                options={measurementOptions}
                value={ing.measurement_name}
                onChange={(event, newValue) => { handleIngredientChange(index, "measurement_name", newValue || ""); }}
                renderInput={(params) => <TextField {...params} label="Unit" />}
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

          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Button type="submit" variant="contained" size="large" disabled={isSubmitting} sx={{ minWidth: 200 }}>
              {isSubmitting ? <CircularProgress size={24} /> : "Submit Recipe"}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default CreateRecipe;