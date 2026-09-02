const express = require('express');
const router = express.Router();
const controller = require('../controllers/postController');

router.get('/', controller.getPosts);
router.get('/:id', controller.getPostById);
router.post('/', controller.addPost);
router.put('/:id', controller.editPost);
router.delete('/:id', controller.deletePost);

module.exports = router;
