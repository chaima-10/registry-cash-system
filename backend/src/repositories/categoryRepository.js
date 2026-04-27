const prisma = require('../config/prisma');

class CategoryRepository {
    async createCategory(data) {
        return await prisma.category.create({ data });
    }

    async getAllCategories() {
        return await prisma.category.findMany({
            include: { subcategories: true },
        });
    }

    async createSubcategory(data) {
        return await prisma.subcategory.create({ data });
    }

    async getAllSubcategories() {
        return await prisma.subcategory.findMany({
            include: { category: true }
        });
    }
}

module.exports = new CategoryRepository();
