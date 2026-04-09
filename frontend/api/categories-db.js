// Categories serverless function for Vercel
let mockCategories = [
  { 
    id: 1, 
    name: 'Electronics', 
    subcategories: [
      { id: 1, name: 'Accessories' },
      { id: 2, name: 'Phones' }
    ] 
  },
  { 
    id: 2, 
    name: 'Food', 
    subcategories: [
      { id: 3, name: 'Snacks' },
      { id: 4, name: 'Beverages' }
    ] 
  }
];

let nextCategoryId = 3;
let nextSubcategoryId = 5;

export default function handler(req, res) {
  try {
    const { method } = req;
    const { id } = req.query;

    console.log(`[${new Date().toISOString()}] ${method} /api/categories${id ? '/' + id : ''}`);

    switch (method) {
      case 'GET':
        if (id) {
          const category = mockCategories.find(c => c.id === parseInt(id));
          if (!category) {
            return res.status(404).json({ message: 'Category not found' });
          }
          return res.json(category);
        }
        return res.json({ categories: mockCategories });

      case 'POST':
        const { name } = req.body;
        
        if (!name) {
          return res.status(400).json({ message: 'Category name is required' });
        }

        const newCategory = {
          id: nextCategoryId++,
          name: name.trim(),
          subcategories: []
        };

        mockCategories.push(newCategory);
        return res.status(201).json({
          message: 'Category created successfully',
          category: newCategory
        });

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ message: `Method ${method} not allowed` });
    }
  } catch (error) {
    console.error('Category API Error:', error);
    return res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
