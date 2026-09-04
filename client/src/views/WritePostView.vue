<template>
  <div class="write-page">
      <div class="form-card">
          <h2>发布新帖子</h2>
      
          <!-- 标题 -->
          <el-input
          v-model="form.title"
          placeholder="请输入帖子标题"
          class="input-item"
          />
      
          <!-- 正文内容 -->
          <el-input
          v-model="form.content"
          type="textarea"
          :rows="5"
          placeholder="写下你的内容..."
          class="input-item"
          />

          <!-- 分类选择（下拉单选） -->
          <el-select
              v-model="form.categoryId"
              placeholder="选择分类"
              clearable
              class="input-item"
          >
              <el-option
                  v-for="cat in categories"
                  :key="cat.id"
                  :label="cat.name"
                  :value="cat.id"
              />
          </el-select>

          <!-- 标签选择（下拉多选、可搜索、可手动输入新标签） -->
          <el-select
              v-model="form.tags"
              multiple
              filterable
              allow-create
              default-first-option
              placeholder="选择或输入标签（最多10个）"
              class="input-item"
          >
              <el-option
                  v-for="tag in tagList"
                  :key="tag"
                  :label="tag"
                  :value="tag"
              />
          </el-select>
      
          <!-- 文件上传组件：支持图片 / 文档 / 视频 / 压缩包 -->
          <el-upload
          class="upload-area input-item"
          action=""
          :http-request="uploadFile"
          :file-list="fileList"
          :limit="5"
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.mp4,.mov,.avi,.zip,.rar"
          list-type="text"
          >
          <el-button type="primary">选择图片 / 文档 / 视频</el-button>
          <template #tip>
              <div class="el-upload__tip">支持图片、PDF、Word、Excel、视频、压缩包，单文件最大100MB，最多5个</div>
          </template>
          </el-upload>
      
          <el-button
          type="primary"
          class="submit-btn"
          @click="submitPost"
          :loading="loading"
          >
          提交发布
          </el-button>
      </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
// 引入分类、标签查询接口
import { getCategories, getTags } from '../api/catalog'
// 引入发帖接口 + 附件上传接口
import { createPost, uploadAttachment } from '../api/post'

const router = useRouter()
const loading = ref(false)
const fileList = ref([])
// 保存上传成功后的附件ID数组，提交帖子时一起传给后端
const attachmentIds = ref([])

// 分类、标签下拉选项
const categories = ref([])
const tagList = ref([])

const form = ref({
  title: '',
  content: '',
  categoryId: null, // 分类ID
  tags: [] // 标签数组，不再是字符串
})

// 页面加载时拉取分类和已有标签
async function loadOptions() {
  try {
      const [catRes, tagRes] = await Promise.all([
          getCategories(),
          getTags()
      ])
      categories.value = catRes.data || []
      tagList.value = tagRes.data || []
  } catch (e) {
      console.error('加载分类/标签失败', e)
  }
}

onMounted(() => {
  loadOptions()
})

// 自定义上传请求：单文件上传
const uploadFile = async (options) => {
  const file = options.file
  // 单文件最大100MB，和后端限制保持一致
  const MAX_SIZE = 100 * 1024 * 1024
  if (file.size > MAX_SIZE) {
      ElMessage.error(`${file.name} 文件超过100MB，无法上传`)
      options.onError()
      return
  }

  const formData = new FormData()
  formData.append('file', file)

  try {
      // 调用附件上传接口，返回附件id、原始文件名、文件大小
      const res = await uploadAttachment(formData)
      // 只保存附件ID，提交帖子时用来绑定
      attachmentIds.value.push(res.id)
      ElMessage.success(`${file.name} 上传成功`)
      options.onSuccess()
  } catch (err) {
      ElMessage.error(`${file.name} 上传失败`)
      console.error(err)
      options.onError()
  }
}

// 提交发布帖子
const submitPost = async () => {
  if (!form.value.title || !form.value.content) {
      ElMessage.warning('标题和内容不能为空')
      return
  }
  loading.value = true
  try {
      await createPost({
          title: form.value.title,
          content: form.value.content,
          categoryId: form.value.categoryId,
          tags: form.value.tags, // 直接传数组，后端自动处理
          attachmentIds: attachmentIds.value
      })
      ElMessage.success('发帖成功！')
      // 跳转到帖子广场
      router.push('/post-page')
  } catch (err) {
      ElMessage.error('发布失败')
      console.error(err)
  } finally {
      loading.value = false
  }
}
</script>

<style scoped>
.write-page {
  min-height: calc(100vh - 120px);
  background-color: #f5f7fa;
  display: flex;
  justify-content: center;
  padding: 40px 16px;
}
.form-card {
  width: 420px;
  background: white;
  padding: 32px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
}
h2 {
  text-align: center;
  margin-bottom: 24px;
  font-size: 20px;
}
.input-item {
  margin-bottom: 18px;
  width: 100%;
}
.submit-btn {
  width: 100%;
}
.upload-area {
  margin-bottom:18px;
}
</style>
