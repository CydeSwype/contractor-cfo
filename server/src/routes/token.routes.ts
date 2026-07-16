import { Router } from 'express';
import { authenticate, requireScope } from '../middleware/auth.middleware';
import { listTokens, createToken, deleteToken } from '../controllers/token.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(authenticate);
// Only 'full'-scope auth (browser session or a full PAT) can mint or revoke tokens —
// otherwise a read_only/invoice_only PAT could mint itself a full-scope replacement.
router.use(requireScope());

router.get('/', asyncHandler(listTokens));
router.post('/', asyncHandler(createToken));
router.delete('/:id', asyncHandler(deleteToken));

export default router;
