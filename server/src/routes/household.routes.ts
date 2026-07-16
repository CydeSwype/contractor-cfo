import { Router } from 'express';
import { authenticate, requireScope } from '../middleware/auth.middleware';
import { getHousehold, updateHousehold, inviteMember } from '../controllers/household.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(authenticate);
// No prefixes are invoice-related here, so invoice_only tokens can read but never write.
router.use(requireScope());

router.get('/', asyncHandler(getHousehold));
router.put('/', asyncHandler(updateHousehold));
router.post('/invite', asyncHandler(inviteMember));

export default router;
