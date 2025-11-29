import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

// Dnd-kit and MUI imports
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
    
    const [recipeData, setRecipeData] = useState(null); // Start as null to indicate loading
    const [isLoading, setIsLoading] = useState(true);
    const [existingTags, setExistingTags] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const token = localStorage.getItem("token"); // Get token once

    useEffect(() => {
        const fetchInitialData = async () => {
            if (!token) {
                navigate('/login');
                return;
            }
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
                    ingredients: recipeResponse.data.ingredients.map(ing => ({
                        ingredient_name: ing.ingredient_name,
                        amount: ing.amount,
                        measurement_name: ing.measurement_unit || "",
                    })),
                    steps: recipeResponse.data.steps.map(step => ({
                        ...step,
                        id: Date.now() + Math.random(),
                    })),
                    images: recipeResponse.data.images.length > 0 ? recipeResponse.data.images.map(img => img.image_url) : [""],
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

    // Handler functions
    const handleChange = (e) => setRecipeData({ ...recipeData, [e.target.name]: e.target.value });
    const handleTagsChange = (event, newValue) => setRecipeData({ ...recipeData, tags: newValue });
    const handleIngredientChange = (index, field, value) => { const updated = [...recipeData.ingredients]; updated[index][field] = value; setRecipeData({ ...recipeData, ingredients: updated }); };
    const addIngredientField = () => setRecipeData({ ...recipeData, ingredients: [...recipeData.ingredients, { ingredient_name: "", amount: "", measurement_name: "" }] });
    const deleteIngredient = (index) => setRecipeData({ ...recipeData, ingredients: recipeData.ingredients.filter((_, i) => i !== index) });
    const handleStepChange = (index, value) => { const updated = [...recipeData.steps]; updated[index].instruction = value; setRecipeData({ ...recipeData, steps: updated }); };
    const addStepField = () => setRecipeData({ ...recipeData, steps: [...recipeData.steps, { id: Date.now(), step_number: recipeData.steps.length + 1, instruction: "" }] });
    const deleteStep = (index) => setRecipeData({ ...recipeData, steps: recipeData.steps.filter((_, i) => i !== index).map((step, i) => ({ ...step, step_number: i + 1 })) });
    const handleImageChange = (index, value) => { const updated = [...recipeData.images]; updated[index] = value; setRecipeData({ ...recipeData, images: updated }); };
    const addImageField = () => setRecipeData({ ...recipeData, images: [...recipeData.images, ""] });
    const deleteImage = (index) => setRecipeData({ ...recipeData, images: recipeData.images.filter((_, i) => i !== index) });
    const handleDragEnd = useCallback((event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setRecipeData((prevData) => {
                const oldIndex = prevData.steps.findIndex((step) => step.id === active.id);
                const newIndex = prevData.steps.findIndex((step) => step.id === over.id);
                const reorderedSteps = arrayMove(prevData.steps, oldIndex, newIndex).map((step, index) => ({ ...step, step_number: index + 1 }));
                return { ...prevData, steps: reorderedSteps };
            });
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        
        const submissionData = { ...recipeData, images: recipeData.images.filter(img => img && img.trim() !== "") };

        try {
            await axios.put(`${API_URL}/recipes/${id}`, submissionData, { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } });
            navigate(`/recipes/${id}`);
        } catch (err) {
            setError("Failed to update recipe.");
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (isLoading) {
        return <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh"><CircularProgress /></Box>;
    }

    if (error) {
        return <Container maxWidth="sm"><Alert severity="error" sx={{ mt: 4 }}>{error}</Alert></Container>;
    }
    
    return (
        <Container maxWidth="md">
            <Paper elevation={3} sx={{ p: 4, mt: 4, mb: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom align="center">Edit Recipe</Typography>
                <Box component="form" onSubmit={handleSubmit} noValidate>
                    <Grid container spacing={3}>
                        <Grid item xs={12}><TextField name="recipe_name" label="Recipe Name" value={recipeData.recipe_name} onChange={handleChange} fullWidth required /></Grid>
                        <Grid item xs={12}><TextField name="description" label="Description" value={recipeData.description} onChange={handleChange} fullWidth multiline rows={4} required /></Grid>
                        <Grid item xs={12} sm={6}><TextField name="cuisine" label="Cuisine Type" value={recipeData.cuisine} onChange={handleChange} fullWidth required /></Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth><InputLabel>Difficulty</InputLabel>
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
                    <Autocomplete multiple freeSolo options={existingTags} value={recipeData.tags} onChange={handleTagsChange}
                        renderTags={(value, getTagProps) => value.map((option, index) => (<Chip variant="outlined" label={option} {...getTagProps({ index })} />))}
                        renderInput={(params) => (<TextField {...params} variant="outlined" label="Tags" placeholder="e.g., Dinner, Quick, Vegetarian" />)} />

                    <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>Ingredients</Typography>
                    {recipeData.ingredients.map((ing, index) => (
                        <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <TextField label="Amount" value={ing.amount} onChange={(e) => handleIngredientChange(index, "amount", e.target.value)} sx={{ width: '20%' }} />
                            <Autocomplete options={measurementOptions} value={ing.measurement_name} onChange={(event, newValue) => { handleIngredientChange(index, "measurement_name", newValue || ""); }}
                                renderInput={(params) => <TextField {...params} label="Unit" />} sx={{ width: '30%' }} />
                            <TextField label="Ingredient Name" value={ing.ingredient_name} onChange={(e) => handleIngredientChange(index, "ingredient_name", e.target.value)} required fullWidth />
                            <IconButton onClick={() => deleteIngredient(index)} color="error"><DeleteIcon /></IconButton>
                        </Box>
                    ))}
                    <Button startIcon={<AddIcon />} onClick={addIngredientField}>Add Ingredient</Button>

                    <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>Steps</Typography>
                    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={recipeData.steps.map(s => s.id)} strategy={verticalListSortingStrategy}>
                            {recipeData.steps.map((step, index) => (<SortableStep key={step.id} step={step} index={index} handleStepChange={handleStepChange} deleteStep={deleteStep} />))}
                        </SortableContext>
                    </DndContext>
                    <Button startIcon={<AddIcon />} onClick={addStepField}>Add Step</Button>

                    <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>Images</Typography>
                    {recipeData.images.map((image, index) => (
                        <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <TextField label="Image URL" value={image} onChange={(e) => handleImageChange(index, e.target.value)} fullWidth />
                            {image && (<Box component="img" sx={{ height: 56, width: 56, objectFit: 'cover', borderRadius: 1, ml: 1 }} src={image}
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                onLoad={(e) => { e.currentTarget.style.display = 'block'; }} alt="preview" />)}
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