const prisma = require('../config/prisma');

// Create Category
exports.createCategory = async (req, res) => {
    try {
        const { name } = req.body;
        const category = await prisma.category.create({
            data: { name },
        });
        res.status(201).json(category);
    } catch (error) {
        res.status(500).json({ message: 'Error creating category', error: error.message });
    }
};

// Get All Categories (with subcategories)
exports.getAllCategories = async (req, res) => {
    try {
        const categories = await prisma.category.findMany({
            include: { subcategories: true },
        });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching categories', error: error.message });
    }
};

// Create Subcategory
exports.createSubcategory = async (req, res) => {
    try {
        console.log('Received Create Subcategory Request:', req.body); // DEBUG LOG

        const { name, categoryId } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Name is required' });
        }
        if (!categoryId) {
            console.log('Missing categoryId. Received:', categoryId);
            return res.status(400).json({ message: 'categoryId is required' });
        }

        const parsedCategoryId = parseInt(categoryId);
        if (isNaN(parsedCategoryId)) {
            return res.status(400).json({ message: 'categoryId must be a number' });
        }

        const subcategory = await prisma.subcategory.create({
            data: {
                name,
                categoryId: parsedCategoryId,
            },
        });
        res.status(201).json(subcategory);
    } catch (error) {
        res.status(500).json({ message: 'Error creating subcategory', error: error.message });
    }
};
