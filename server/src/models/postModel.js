const db = require('../db/index');
// 运行时再获取真实pool，不是初始化阶段拿
const getPool = db.getPool;

const findAll = async () => {
  const pool = getPool();
  const res = await pool.query('SELECT * FROM posts ORDER BY create_time DESC');
  return res.rows;
};

const findById = async (id) => {
  const pool = getPool();
  const res = await pool.query('SELECT * FROM posts WHERE id = $1', [id]);
  return res.rows[0];
};

const create = async (title, content, categoryid, tag, authorid) => {
  const pool = getPool();
  const sql = `INSERT INTO posts(title, content, categoryid, tag, authorid) VALUES($1,$2,$3,$4,$5) RETURNING *`;
  const res = await pool.query(sql, [title, content, categoryid, tag, authorid]);
  return res.rows[0];
};

const update = async (id, title, content, categoryid, tag) => {
  const pool = getPool();
  const sql = `UPDATE posts SET title=$1,content=$2,categoryid=$3,tag=$4,update_time=NOW() WHERE id=$5 RETURNING *`;
  const res = await pool.query(sql, [title, content, categoryid, tag, id]);
  return res.rows[0];
};

const remove = async (id) => {
  const pool = getPool();
  const sql = `UPDATE posts SET is_deleted=true WHERE id=$1 RETURNING *`;
  const res = await pool.query(sql, [id]);
  return res.rows[0];
};

module.exports = {
  findAll,
  findById,
  create,
  update,
  remove
};
