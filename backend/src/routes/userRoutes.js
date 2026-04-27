const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validateMiddleware');
const { updateProfileSchema, changePasswordSchema } = require('../validators/authValidators');
const upload = require('../middlewares/upload');

// Public routes (none for now)

// Protected routes
router.use(protect); // Apply to all routes below

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management and profile operations
 */

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get current authenticated user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile data
 *       404:
 *         description: User not found
 */
router.get('/profile', userController.getProfile);

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Update current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               username:
 *                 type: string
 *               theme:
 *                 type: string
 *                 enum: [light, dark]
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error or username taken
 */
router.put('/profile', upload.single('profilePicture'), validate(updateProfileSchema), userController.updateProfile);

/**
 * @swagger
 * /api/users/change-password:
 *   put:
 *     summary: Change current user password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Incorrect specific current password or invalid new password
 */
router.put('/change-password', validate(changePasswordSchema), userController.changePassword);

// Admin routes (should ideally use admin middleware too)

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all users
 */
router.get('/', userController.getAllUsers);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update a user (Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               salary:
 *                 type: number
 *               workingDays:
 *                 type: integer
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated successfully
 */
router.put('/:id', userController.updateUser);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete a user (Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       403:
 *         description: Cannot delete the only administrator
 */
router.delete('/:id', userController.deleteUser);

/**
 * @swagger
 * /api/users/distribute-prime:
 *   post:
 *     summary: Distribute prime to all active users (Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.post('/distribute-prime', userController.distributePrime);

module.exports = router;
