const { Pool } = require('pg');

const pool = new Pool({
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: "(kexi)buneng88c",
  database: "post_db"
});

// 测试连接
(async () => {
  try {
    const client = await pool.connect();
    console.log("✅ PostgreSQL 数据库连接成功！");
    client.release();
  } catch (err) {
    console.error("❌ 数据库连接失败：", err.message);
  }
})();

// 导出一个函数，调用时才返回真实pool（解决空对象问题）
function getPool() {
  return pool;
}

module.exports = { getPool };
