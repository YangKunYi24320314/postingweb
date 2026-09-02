const postModel = require('../models/postModel');

const getPosts = async (req, res) => {
  try {
    const list = await postModel.findAll();
    res.json({ code: 200, data: list });
  } catch (err) {
    res.status(500).json({ code: 500, msg: err.message });
  }
};

const getPostById = async (req, res) => {
  try {
    const item = await postModel.findById(req.params.id);
    if (!item) return res.status(404).json({ code: 404, msg: '帖子不存在' });
    res.json({ code: 200, data: item });
  } catch (err) {
    res.status(500).json({ code: 500, msg: err.message });
  }
};

const addPost = async (req, res) => {
  const { title, content, categoryid, tag, authorid } = req.body;
  try {
    const newPost = await postModel.create(title, content, categoryid, tag, authorid);
    res.json({ code: 200, msg: '新增成功', data: newPost });
  } catch (err) {
    res.status(500).json({ code: 500, msg: err.message });
  }
};

const editPost = async (req, res) => {
  const { title, content, categoryid, tag } = req.body;
  try {
    const updated = await postModel.update(req.params.id, title, content, categoryid, tag);
    if (!updated) return res.status(404).json({ code: 404, msg: '帖子不存在' });
    res.json({ code: 200, msg: '修改成功', data: updated });
  } catch (err) {
    res.status(500).json({ code: 500, msg: err.message });
  }
};

const deletePost = async (req, res) => {
  try {
    const del = await postModel.remove(req.params.id);
    if (!del) return res.status(404).json({ code: 404, msg: '帖子不存在' });
    res.json({ code: 200, msg: '删除成功' });
  } catch (err) {
    res.status(500).json({ code: 500, msg: err.message });
  }
};

// 导出全部五个函数，名字严格对应路由里面
module.exports = {
  getPosts,
  getPostById,
  addPost,
  editPost,
  deletePost
};
