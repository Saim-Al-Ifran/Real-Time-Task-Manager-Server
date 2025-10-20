import { Router } from 'express';
import { getAllTasks, createTask, updateTask, deleteTask } from '../controllers/task.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getAllTasks);
router.post('/', requireAuth, createTask);
router.put('/:id', requireAuth, updateTask);
router.delete('/:id', requireAuth, deleteTask);

export default router;

