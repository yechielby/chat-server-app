import express from 'express';
import controller from '../controllers/message';

const router = express.Router();

router.post('/create/message', controller.createMessage);
router.get('/get/messages', controller.getAllMessages);

export = router;
