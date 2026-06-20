import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getHousehold, updateHousehold, inviteMember } from '../controllers/household.controller';

const router = Router();
router.use(authenticate);

router.get('/', getHousehold);
router.put('/', updateHousehold);
router.post('/invite', inviteMember);

export default router;
