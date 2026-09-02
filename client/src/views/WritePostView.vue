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
  
        <!-- 标签 -->
        <el-input
          v-model="form.tag"
          placeholder="例如：分享、求助"
          class="input-item"
        />
  
        <!-- 文件上传组件：支持图片 / 文档 / 视频 -->
        <el-upload
          class="upload-area input-item"
          action=""
          :http-request="uploadFile"
          :file-list="fileList"
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.mp4,.mov,.avi"
          list-type="text"
        >
          <el-button type="primary">选择图片 / 文档 / 视频</el-button>
          <template #tip>
            <div class="el-upload__tip">支持图片、PDF、Word、Excel、MP4视频（单文件最大10MB）</div>
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
  import { ref } from 'vue'
  import axios from 'axios'
  import { ElMessage } from 'element-plus'
  import { useRouter } from 'vue-router'
  
  const router = useRouter()
  const loading = ref(false)
  const fileList = ref([])
  // 保存上传成功后的文件url数组
  const uploadUrls = ref([])
  
  const form = ref({
    title: '',
    content: '',
    tag: ''
  })
  
  // 自定义上传请求：单文件上传
  const uploadFile = async (options) => {
    const file = options.file
    // 限制单文件最大10MB
    const MAX_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      ElMessage.error(`${file.name} 文件超过10MB，无法上传`)
      options.onError()
      return
    }
  
    const formData = new FormData()
    formData.append('file', file)
  
    try {
        const res = await axios.post('http://127.0.0.1:3000/upload', formData)
      // 后端返回文件访问路径，存入数组
      const fileUrl = res.data.data.url
      uploadUrls.value.push(fileUrl)
      ElMessage.success(`${file.name} 上传成功`)
      options.onSuccess()
    } catch (err) {
      ElMessage.error(`${file.name} 上传失败`)
      console.error(err)
      options.onError()
    }
  }
  
  // 提交整个帖子（携带文件url列表）
  const submitPost = async () => {
    if (!form.value.title || !form.value.content) {
      ElMessage.warning('标题和内容不能为空')
      return
    }
    loading.value = true
    try {
      await axios.post('/posts', {
        title: form.value.title,
        content: form.value.content,
        tag: form.value.tag,
        files: uploadUrls.value // 传给后端保存文件地址
      })
      ElMessage.success('发帖成功！')
      router.push('/posts')
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
  }
  .submit-btn {
    width: 100%;
  }
  .upload-area {
    margin-bottom:18px;
  }
  </style>
  