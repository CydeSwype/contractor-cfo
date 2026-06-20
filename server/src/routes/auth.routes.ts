import { Router } from 'express';
import { signup, login, acceptInvite } from '../controllers/auth.controller';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/invite/accept', acceptInvite);

export default router;
