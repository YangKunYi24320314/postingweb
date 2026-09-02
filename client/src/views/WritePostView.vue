<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { createPost } from '../api/post'
import { getCategories, getTags } from '../api/catalog'
import { uploadFile } from '../api/upload'
import { getToken } from '../api/request'

const router = useRouter()
const loading = ref(false)
const categories = ref([])
const tags = ref([])

const form = reactive({
  title: '',
  content: '',
  categoryId: null,
  tags: [],
})

// 上传：走统一的封装，返回 data 里就是 { url }
async function uploadFileHandler(options) {
  const file = options.file
  const MAX_SIZE = 10 * 1024 * 1024
  if (file.size > MAX_SIZE) {
    ElMessage.error(`${file.name} 文件超过 10MB，无法上传`)
    options.onError()
    return
  }

  const formData = new FormData()
  formData.append('file', file)

  try {
    await uploadFile(formData)
    ElMessage.success(`${file.name} 上传成功`)
    options.onSuccess()
  } catch (err) {
    ElMessage.error(err.message || `${file.name} 上传失败`)
    options.onError()
  }
}

// 提交：只提交契约里的字段（标题/正文/分类/标签）。注意：附件 URL 不在契约内，暂不随帖保存。
async function submitPost() {
  if (!form.title.trim()) {
    ElMessage.warning('请输入标题')
    return
  }
  if (!form.content.trim()) {
    ElMessage.warning('请输入正文')
    return
  }
  loading.value = true
  try {
    await createPost({
      title: form.title.trim(),
      content: form.content.trim(),
      categoryId: form.categoryId || null,
      tags: form.tags,
    })
    ElMessage.success('发帖成功！')
    router.push({ name: 'PostPage' })
  } catch (e) {
    ElMessage.error(e.message || '发布失败')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  // 未登录直接跳登录页（发帖需要登录）
  if (!getToken()) {
    router.push({ name: 'Login' })
    return
  }
  try {
    const [cats, tgs] = await Promise.all([getCategories(), getTags()])
    categories.value = cats
    tags.value = tgs
  } catch (e) {
    ElMessage.error(e.message || '分类/标签加载失败')
  }
})
</script>

<template>
  <div class="page-container">
    <el-card shadow="never" class="write-card">
      <h2 class="write-card__title">发布新帖子</h2>

      <el-form :model="form" label-position="top">
        <el-form-item label="标题">
          <el-input
            v-model="form.title"
            placeholder="请输入帖子标题"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="正文">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="6"
            placeholder="写下你的内容..."
          />
        </el-form-item>

        <el-form-item label="分类">
          <el-select
            v-model="form.categoryId"
            placeholder="选择分类"
            clearable
            class="write-card__select"
          >
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>

        <el-form-item label="标签（可多选，最多 10 个）">
          <el-select
            v-model="form.tags"
            multiple
            filterable
            allow-create
            default-first-option
            placeholder="选择或输入标签"
            class="write-card__select"
          >
            <el-option v-for="t in tags" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>

        <el-form-item label="附件（可选）">
          <el-upload
            class="write-card__upload"
            action="#"
            :http-request="uploadFileHandler"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.mp4,.mov,.avi"
          >
            <el-button>选择文件</el-button>
            <template #tip>
              <div class="el-upload__tip">支持图片、PDF、Word、Excel、视频（单文件最大 10MB）</div>
            </template>
          </el-upload>
        </el-form-item>

        <el-button type="primary" class="write-card__submit" :loading="loading" @click="submitPost">
          提交发布
        </el-button>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.write-card {
  max-width: 640px;
  margin: 0 auto;
  padding: var(--space-lg);
}

.write-card__title {
  font-size: 20px;
  color: var(--text-primary);
  margin-bottom: var(--space-lg);
}

.write-card__select {
  width: 100%;
}

.write-card__upload {
  width: 100%;
}

.write-card__submit {
  width: 100%;
  margin-top: var(--space-sm);
}
</style>
