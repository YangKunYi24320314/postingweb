<template>
    <div class="admin-deleted-posts">
      <div class="page-header">
        <h2>帖子回收站</h2>
      </div>
  
      <el-table
        v-loading="loading"
        :data="postList"
        border
        stripe
        style="width: 100%"
      >
        <el-table-column prop="id" label="帖子ID" width="100" />
        <el-table-column prop="title" label="帖子标题" min-width="200">
          <template #default="{ row }">
            <el-link type="primary" @click="goToDetail(row.id)">
              {{ row.title }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column prop="author_name" label="发布者" width="150" />
        <el-table-column prop="updated_at" label="删除时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.updated_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="handleRestore(row.id)">
              还原
            </el-button>
            <el-button size="small" @click="goToDetail(row.id)">
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
  
      <!-- 分页 -->
      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchList"
          @current-change="fetchList"
        />
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { getDeletedPosts, restorePost } from '../../api/admin'
  
  const router = useRouter()
  
  const loading = ref(false)
  const postList = ref([])
  const page = ref(1)
  const pageSize = ref(10)
  const total = ref(0)
  
  // 获取已删除帖子列表
  const fetchList = async () => {
    loading.value = true
    try {
      const res = await getDeletedPosts({
        page: page.value,
        pageSize: pageSize.value
      })
      postList.value = res.list
      total.value = Number(res.total)
    } catch (err) {
      ElMessage.error('获取列表失败')
    } finally {
      loading.value = false
    }
  }
  
  // 还原帖子
  const handleRestore = async (id) => {
    try {
      await ElMessageBox.confirm('确认还原该帖子？还原后将恢复正常显示', '提示', {
        type: 'warning'
      })
      await restorePost(id)
      ElMessage.success('还原成功')
      fetchList() // 刷新列表
    } catch (err) {
      if (err !== 'cancel') {
        ElMessage.error('还原失败')
      }
    }
  }
  
  // 跳转到详情页
  const goToDetail = (id) => {
    router.push(`/post/${id}`)
  }
  
  // 时间格式化
  const formatTime = (time) => {
    if (!time) return '-'
    return new Date(time).toLocaleString('zh-CN')
  }
  
  onMounted(() => {
    fetchList()
  })
  </script>
  
  <style scoped>
  .admin-deleted-posts {
    padding: 24px;
  }
  .page-header {
    margin-bottom: 20px;
  }
  .pagination-wrap {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }
  </style>
  