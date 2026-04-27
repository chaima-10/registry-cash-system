const categoryRepository = require('../repositories/categoryRepository');

class CategoryService {
    async createCategory(data) {
        return await categoryRepository.createCategory(data);
    }

    async getAllCategories() {
        return await categoryRepository.getAllCategories();
    }

    async createSubcategory(data) {
        const { name, categoryId } = data;

        if (!name) {
            throw new Error('Name is required');
        }
        if (!categoryId) {
            console.log('Missing categoryId. Received:', categoryId);
            throw new Error('categoryId is required');
        }

        const parsedCategoryId = parseInt(categoryId);
        if (isNaN(parsedCategoryId)) {
            throw new Error('categoryId must be a number');
        }

        return await categoryRepository.createSubcategory({
            name,
            categoryId: parsedCategoryId,
        });
    }

    async getAllSubcategories() {
        return await categoryRepository.getAllSubcategories();
    }
}

module.exports = new CategoryService();
