import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getHousehold, updateHousehold, inviteMember } from '../controllers/household.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(getHousehold));
router.put('/', asyncHandler(updateHousehold));
router.post('/invite', asyncHandler(inviteMember));

export default router;
