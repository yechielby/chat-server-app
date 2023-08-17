import express from 'express';
import controller from '../controllers/user';

const router = express.Router();

router.post('/login', controller.loginUser);
router.post('/logout', controller.logoutUser);
router.get('/get/all', controller.getOnlineUsers);

export = router;