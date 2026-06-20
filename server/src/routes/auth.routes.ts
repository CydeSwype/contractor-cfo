import { Router } from 'express';
import { signup, login, acceptInvite } from '../controllers/auth.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/signup', asyncHandler(signup));
router.post('/login', asyncHandler(login));
router.post('/invite/accept', asyncHandler(acceptInvite));

export default router;
