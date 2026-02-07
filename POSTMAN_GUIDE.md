# Postman Testing Guide

## 1. Setup
- Ensure your backend is running:
  ```bash
  cd backend
  npm run dev
  ```
- URL: `http://localhost:5000/api`

## 2. Authentication Flow
**Step 1: Register Admin**
- **Method**: POST
- **URL**: `{{url}}/auth/register`
- **Body** (JSON):
  ```json
  {
    "username": "admin",
    "password": "password123",
    "role": "admin"
  }
  ```

**Step 2: Login**
- **Method**: POST
- **URL**: `{{url}}/auth/login`
- **Body**:
  ```json
  {
    "username": "admin",
    "password": "password123"
  }
  ```
- **Response**: Keep the `token` from the response.

**Step 3: Authenticated Requests**
- For all subsequent requests, go to the **Authorization** tab in Postman.
- Type: **Bearer Token**
- Paste your token.

## 3. Product Management (Stock)
**Create Product**:
- **Method**: POST
- **URL**: `{{url}}/products`
- **Body**:
  ```json
  {
    "barcode": "123456789",
    "name": "Coca Cola 33cl",
    "price": 2.50,
    "stockQuantity": 100,
    "category": "Drinks"
  }
  ```

**Get Product by Barcode**:
- **Method**: GET
- **URL**: `{{url}}/products/barcode/123456789`

## 4. Categories & Hierarchies
**Create Category**:
- **Method**: POST
- **URL**: `{{url}}/categories`
- **Body**: `{ "name": "Drinks" }`
- **Note**: The ID will be saved automatically in the collection variable `last_category_id`.

**Create Subcategory**:
- **Method**: POST
- **URL**: `{{url}}/categories/sub`
- **Body**: `{ "name": "Sodas", "categoryId": {{last_category_id}} }`

**Create Product (Linked)**:
- **Method**: POST
- **URL**: `{{url}}/products`
- **Body**:
  ```json
  {
    "barcode": "9999",
    "name": "Pepsi",
    "price": 2.00,
    "stockQuantity": 50,
    "categoryId": {{last_category_id}},
    "subcategoryId": {{last_subcategory_id}}
  }
  ```

## 5. Logout
- **Method**: POST
- **URL**: `{{url}}/auth/logout`

## 6. Swagger Documentation
- You can also test everything natively in your browser!
- Go to: http://localhost:5000/api-docs
