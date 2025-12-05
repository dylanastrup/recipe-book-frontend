import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode";

// Dnd-kit imports for drag and drop
import { DndContext, closestCenter } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  Container, Paper, Typography, Grid, TextField, Button, Box, Select, MenuItem, InputLabel, FormControl, IconButton, CircularProgress, Alert, Autocomplete, Chip, Divider, InputAdornment
} from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import LinkIcon from '@mui/icons-material/Link';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'; // Icon for AI

const API_URL = process.env.REACT_APP_API_URL;

// List for the dropdown
const measurementOptions = ["tsp", "tbsp", "fl oz", "cup", "pint", "quart", "gallon", "ml", "l", "oz", "lb", "gram", "kg", "pinch", "dash"];

// Map for exact matches
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
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) matrix[i][j] = matrix[i - 1][j - 1];
            else matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
        }
    }
    return matrix[b.length][a.length];
};

const SortableStep = ({ step, index, handleStepChange, deleteStep, error }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: step.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
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
        fullWidth
        multiline
        error={!!error}
        helperText={error}
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
  
  const [importUrl, setImportUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  
  // --- AI Image Upload State ---
  const [uploadingImage, setUploadingImage] = useState(false);
  // -----------------------------

  const [existingTags, setExistingTags] = useState([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({}); 

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
    const handleBeforeUnload = (e) => { if (isDirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => { window.removeEventListener('beforeunload', handleBeforeUnload); };
  }, [isDirty]);

  const getUserId = () => {
    const token = localStorage.getItem("token"); if (!token) return null;
    try { const decodedToken = jwtDecode(token); return decodedToken.sub; }
    catch (error) { return null; }
  };
  
  const handleChange = (e) => {
    setIsDirty(true);
    setRecipeData({ ...recipeData, [e.target.name]: e.target.value });
    if (validationErrors[e.target.name]) {
        setValidationErrors({ ...validationErrors, [e.target.name]: null });
    }
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
    
    const key = `ingredients[${index}].${field}`;
    if (validationErrors[key]) {
        const newErrors = { ...validationErrors };
        delete newErrors[key];
        setValidationErrors(newErrors);
    }
  };

  const handleUnitBlur = (index, value) => {
    if (!value) return;
    const normalizedInput = value.toLowerCase().trim();
    if (UNIT_MAPPINGS[normalizedInput]) {
        if (UNIT_MAPPINGS[normalizedInput] !== value) handleIngredientChange(index, "measurement_name", UNIT_MAPPINGS[normalizedInput]);
        return;
    }
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
    if (bestMatch) handleIngredientChange(index, "measurement_name", UNIT_MAPPINGS[bestMatch]);
  };

  const handleStepChange = (index, value) => {
    setIsDirty(true);
    const updatedSteps = [...recipeData.steps];
    updatedSteps[index].instruction = value;
    setRecipeData({ ...recipeData, steps: updatedSteps });
    
    const key = `steps[${index}]`;
    if (validationErrors[key]) {
        const newErrors = { ...validationErrors };
        delete newErrors[key];
        setValidationErrors(newErrors);
    }
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

  // --- NEW: AI Image Handler ---
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadingImage(true);
    setError(null);
    const formData = new FormData();
    formData.append('image', file);
    
    const token = localStorage.getItem("token");
    
    try {
        const response = await axios.post(`${API_URL}/analyze-recipe-image`, formData, {
             headers: { 
                 Authorization: `Bearer ${token}`,
                 'Content-Type': 'multipart/form-data' 
             }
        });
        
        const aiData = response.data;
        setRecipeData(prev => ({
            ...prev,
            recipe_name: aiData.recipe_name || prev.recipe_name,
            description: aiData.description || prev.description,
            prep_time: aiData.prep_time || prev.prep_time,
            cook_time: aiData.cook_time || prev.cook_time,
            servings: aiData.servings || prev.servings,
            steps: aiData.steps ? aiData.steps.map((s, i) => ({ ...s, id: Date.now() + i })) : prev.steps,
            ingredients: aiData.ingredients || prev.ingredients
        }));
        setIsDirty(true);
    } catch (err) {
        console.error(err);
        
        // --- NEW: Check for 429 Status ---
        if (err.response && err.response.status === 429) {
            setError("⏳ usage limit reached. Please wait 1 minute before scanning again.");
        } else {
            setError("Could not analyze image. Please try again.");
        }
        // ---------------------------------
        
    } finally {
        setUploadingImage(false);
    }
  };
  // ----------------------------

  const handleImport = async () => {
    if (!importUrl) return;
    setIsImporting(true);
    setError(null);
    try {
        const token = localStorage.getItem("token");
        const response = await axios.post(`${API_URL}/import-recipe`, { url: importUrl }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const imported = response.data;
        setRecipeData({
            ...recipeData,
            recipe_name: imported.recipe_name || "",
            description: imported.description || "",
            prep_time: imported.prep_time || "",
            cook_time: imported.cook_time || "",
            servings: imported.servings || "",
            steps: imported.steps.map((s, i) => ({ ...s, id: Date.now() + i })) || [{ id: Date.now(), step_number: 1, instruction: "" }],
            ingredients: imported.ingredients || [{ ingredient_name: "", amount: "", measurement_name: "" }],
            images: imported.images.length > 0 ? imported.images : [""]
        });
        setIsDirty(true);
    } catch (err) {
        setError("Could not import from this URL. Please try another site or enter manually.");
    } finally {
        setIsImporting(false);
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!recipeData.recipe_name.trim()) errors.recipe_name = "Recipe name is required";
    if (!recipeData.description.trim()) errors.description = "Description is required";
    if (!recipeData.cuisine.trim()) errors.cuisine = "Cuisine is required";
    if (!recipeData.prep_time) errors.prep_time = "Prep time is required";
    if (!recipeData.cook_time) errors.cook_time = "Cook time is required";
    if (!recipeData.servings) errors.servings = "Servings is required";

    recipeData.ingredients.forEach((ing, index) => {
        if (!ing.ingredient_name.trim()) errors[`ingredients[${index}].ingredient_name`] = "Required";
        if (!ing.amount) {
            errors[`ingredients[${index}].amount`] = "Required";
        } else if (isNaN(ing.amount)) {
            errors[`ingredients[${index}].amount`] = "Must be a number";
        }
    });

    recipeData.steps.forEach((step, index) => {
        if (!step.instruction.trim()) errors[`steps[${index}]`] = "Step instruction cannot be empty";
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!validateForm()) {
        setError("Please fix the errors above before submitting.");
        window.scrollTo(0, 0);
        return;
    }

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
        setIsDirty(false); 
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
        
        {/* --- IMPORT & AI SECTION --- */}
        <Box sx={{ mb: 4, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Auto-Import Tools</Typography>
            <Grid container spacing={2} alignItems="center">
                {/* 1. URL Import */}
                <Grid item xs={12} md={8}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <TextField 
                            size="small" fullWidth placeholder="Paste recipe URL..." value={importUrl} onChange={(e) => setImportUrl(e.target.value)}
                            InputProps={{ startAdornment: <InputAdornment position="start"><LinkIcon /></InputAdornment> }}
                        />
                        <Button 
                            variant="contained" onClick={handleImport} disabled={isImporting || !importUrl}
                            startIcon={isImporting ? <CircularProgress size={20} color="inherit"/> : <CloudDownloadIcon />}
                        >
                            Import
                        </Button>
                    </Box>
                </Grid>
                
                <Grid item xs={12} md={1} sx={{ textAlign: 'center' }}><Typography variant="caption">OR</Typography></Grid>
                
                {/* 2. AI Image Upload */}
                <Grid item xs={12} md={3}>
                    <Button
                        component="label"
                        variant="contained"
                        color="success"
                        fullWidth
                        startIcon={uploadingImage ? <CircularProgress size={20} color="inherit"/> : <AutoFixHighIcon />}
                        disabled={uploadingImage}
                    >
                        Scan Image
                        <input type="file" hidden accept="image/*,.pdf" onChange={handleImageUpload} />
                    </Button>
                </Grid>
            </Grid>
        </Box>
        <Divider sx={{ mb: 3 }} />

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Grid container spacing={3}>
            <Grid item xs={12}><TextField name="recipe_name" label="Recipe Name" value={recipeData.recipe_name} onChange={handleChange} fullWidth required error={!!validationErrors.recipe_name} helperText={validationErrors.recipe_name}/></Grid>
            <Grid item xs={12}><TextField name="description" label="Description" value={recipeData.description} onChange={handleChange} fullWidth multiline rows={4} required error={!!validationErrors.description} helperText={validationErrors.description}/></Grid>
            <Grid item xs={12} sm={6}><TextField name="cuisine" label="Cuisine Type" value={recipeData.cuisine} onChange={handleChange} fullWidth required error={!!validationErrors.cuisine} helperText={validationErrors.cuisine}/></Grid>
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
            <Grid item xs={12} sm={4}><TextField type="number" name="prep_time" label="Prep Time (mins)" value={recipeData.prep_time} onChange={handleChange} fullWidth required error={!!validationErrors.prep_time} helperText={validationErrors.prep_time}/></Grid>
            <Grid item xs={12} sm={4}><TextField type="number" name="cook_time" label="Cook Time (mins)" value={recipeData.cook_time} onChange={handleChange} fullWidth required error={!!validationErrors.cook_time} helperText={validationErrors.cook_time}/></Grid>
            <Grid item xs={12} sm={4}><TextField type="number" name="servings" label="Servings" value={recipeData.servings} onChange={handleChange} fullWidth required error={!!validationErrors.servings} helperText={validationErrors.servings}/></Grid>
          </Grid>
          
          <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>Tags</Typography>
          <Autocomplete
              multiple freeSolo options={existingTags} value={recipeData.tags} onChange={handleTagsChange}
              renderTags={(value, getTagProps) => value.map((option, index) => (<Chip variant="outlined" label={option} {...getTagProps({ index })} />))}
              renderInput={(params) => (<TextField {...params} variant="outlined" label="Tags" placeholder="e.g., Dinner, Quick, Vegetarian" />)}
          />

          <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>Ingredients</Typography>
          {recipeData.ingredients.map((ing, index) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <TextField 
                label="Amount" value={ing.amount} onChange={(e) => handleIngredientChange(index, "amount", e.target.value)} sx={{ width: '20%' }} 
                error={!!validationErrors[`ingredients[${index}].amount`]}
              />
              <Autocomplete
                freeSolo options={measurementOptions} value={ing.measurement_name}
                onChange={(event, newValue) => { handleIngredientChange(index, "measurement_name", newValue || ""); }}
                onInputChange={(event, newInputValue) => { handleIngredientChange(index, "measurement_name", newInputValue); }}
                renderInput={(params) => (<TextField {...params} label="Unit" onBlur={(e) => handleUnitBlur(index, e.target.value)} />)}
                sx={{ width: '30%' }}
              />
              <TextField 
                label="Ingredient Name" value={ing.ingredient_name} onChange={(e) => handleIngredientChange(index, "ingredient_name", e.target.value)} required fullWidth 
                error={!!validationErrors[`ingredients[${index}].ingredient_name`]}
                helperText={validationErrors[`ingredients[${index}].ingredient_name`]}
              />
              <IconButton onClick={() => deleteIngredient(index)} color="error"><DeleteIcon /></IconButton>
            </Box>
          ))}
          <Button startIcon={<AddIcon />} onClick={addIngredientField}>Add Ingredient</Button>

          <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>Steps</Typography>
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={recipeData.steps.map(s => s.id)} strategy={verticalListSortingStrategy}>
              {recipeData.steps.map((step, index) => (
                <SortableStep 
                    key={step.id} 
                    step={step} 
                    index={index} 
                    handleStepChange={handleStepChange} 
                    deleteStep={deleteStep} 
                    error={validationErrors[`steps[${index}]`]} 
                />
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