const categoryService = require('../services/categoryService');

// Create Category
exports.createCategory = async (req, res) => {
    try {
        const category = await categoryService.createCategory(req.body);
        res.status(201).json(category);
    } catch (error) {
        res.status(500).json({ message: 'Error creating category', error: error.message });
    }
};

// Get All Categories (with subcategories)
exports.getAllCategories = async (req, res) => {
    try {
        const categories = await categoryService.getAllCategories();
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching categories', error: error.message });
    }
};

// Create Subcategory
exports.createSubcategory = async (req, res) => {
    try {
        console.log('Received Create Subcategory Request:', req.body); // DEBUG LOG
        const subcategory = await categoryService.createSubcategory(req.body);
        res.status(201).json(subcategory);
    } catch (error) {
        if (error.message === 'Name is required' || error.message === 'categoryId is required' || error.message === 'categoryId must be a number') {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Error creating subcategory', error: error.message });
    }
};

// Get All Subcategories
exports.getAllSubcategories = async (req, res) => {
    try {
        const subcategories = await categoryService.getAllSubcategories();
        res.json(subcategories);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching subcategories', error: error.message });
    }
};
