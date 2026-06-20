import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { listTokens, createToken, deleteToken } from '../controllers/token.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(listTokens));
router.post('/', asyncHandler(createToken));
router.delete('/:id', asyncHandler(deleteToken));

export default router;
