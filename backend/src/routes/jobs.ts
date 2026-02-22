import { Router } from 'express';
import * as jobsController from '../controllers/jobsController';

const router = Router();

router.get('/', jobsController.listJobs);
router.post('/', jobsController.createJob);
router.get('/:id', jobsController.getJob);
router.patch('/:id/status', jobsController.updateJobStatus);

export default router;