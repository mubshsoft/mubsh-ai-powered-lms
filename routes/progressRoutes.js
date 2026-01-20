import express from 'express'
import  { getDashbaord } from '../controllers/progressController.js'
import protect from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/dashboard', getDashbaord);
export default router;