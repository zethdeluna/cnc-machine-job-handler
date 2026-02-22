/**
 * A single file that wires all route groups together
 */
import { Router } from 'express';
import machinesRouter from './machines';
import jobsRouter from './jobs';

const router = Router();

router.use('/machines', machinesRouter);
router.use('/jobs', jobsRouter);

export default router;