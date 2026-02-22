import { Router } from 'express';
import * as machinesController from '../controllers/machinesController';

const router = Router();

router.get('/', machinesController.listMachines);
router.get('/:id', machinesController.getMachine);

export default router;