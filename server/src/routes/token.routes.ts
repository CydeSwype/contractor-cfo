import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { listTokens, createToken, deleteToken } from '../controllers/token.controller';

const router = Router();
router.use(authenticate);

router.get('/', listTokens);
router.post('/', createToken);
router.delete('/:id', deleteToken);

export default router;
