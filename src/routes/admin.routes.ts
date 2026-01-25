import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { addUserValidator, editUserValidator } from '../middleware/validators';
import {
  addUser,
  getUsers,
  deleteUser,
  editUser,
  resetUserPassword,
} from '../handlers/admin.handler';

const router = Router();

// All admin routes require admin role
router.use(authMiddleware('admin'));

// User management
router.post('/addUser', addUserValidator, addUser);
router.get('/getUsers', getUsers);
router.delete('/deleteUser', deleteUser);
router.put('/updateUser', editUserValidator, editUser);
router.put('/:id/reset-password', resetUserPassword);

export default router;
