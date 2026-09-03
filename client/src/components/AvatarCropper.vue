<script setup>
import { ref } from 'vue'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'

// 头像裁剪弹窗：传入图片 src，展示 1:1 裁剪框，支持缩放，确定后把裁剪结果（Blob）emit 出去
defineProps({
  modelValue: { type: Boolean, default: false },
  imageSrc: { type: String, default: '' },
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'confirm'])

const imgRef = ref(null)
const zoom = ref(1) // 相对缩放倍数：1 = 适配容器
let cropper = null
let baseRatio = 1 // 初始化「适配」时的缩放比（canvasData.width / naturalWidth）

function destroyCropper() {
  if (cropper) {
    cropper.destroy()
    cropper = null
  }
}

function createCropper() {
  if (!imgRef.value) return
  destroyCropper() // 防止重复初始化
  cropper = new Cropper(imgRef.value, {
    aspectRatio: 1, // 1:1 裁剪框
    viewMode: 1, // 裁剪框不超出画布
    autoCropArea: 1, // 初始裁剪框铺满
    zoomable: true,
    zoomOnWheel: true, // 鼠标滚轮缩放
    ready() {
      const canvasData = cropper.getCanvasData()
      baseRatio = canvasData.width / canvasData.naturalWidth
      zoom.value = 1
    },
    zoom(event) {
      // 滚轮/手势缩放后，把当前相对缩放同步到滑块
      zoom.value = Math.min(3, Math.max(1, event.detail.ratio / baseRatio))
    },
  })
}

// 弹窗完全打开后再初始化（cropperjs 要求 modal 显示完成后初始化，否则尺寸不对）
function onOpened() {
  const img = imgRef.value
  if (!img) return
  if (img.complete && img.naturalWidth > 0) {
    createCropper()
  } else {
    img.addEventListener('load', createCropper, { once: true })
  }
}

function onDialogVisibleChange(v) {
  emit('update:modelValue', v)
}

function onZoomChange(val) {
  if (cropper) cropper.zoomTo(baseRatio * val)
}

function handleConfirm() {
  if (!cropper) return
  const canvas = cropper.getCroppedCanvas({ width: 300, height: 300 })
  canvas.toBlob(
    (blob) => {
      if (blob) emit('confirm', blob)
    },
    'image/jpeg',
    0.9
  )
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="裁剪头像"
    width="420px"
    :close-on-click-modal="false"
    @update:model-value="onDialogVisibleChange"
    @opened="onOpened"
    @closed="destroyCropper"
  >
    <div class="avatar-cropper__box">
      <img ref="imgRef" :src="imageSrc" alt="裁剪原图" />
    </div>
    <div class="avatar-cropper__zoom">
      <span>缩放</span>
      <el-slider v-model="zoom" :min="1" :max="3" :step="0.1" @input="onZoomChange" />
    </div>
    <template #footer>
      <el-button @click="onDialogVisibleChange(false)">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleConfirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.avatar-cropper__box {
  height: 300px;
  overflow: hidden;
  background: var(--bg-page);
}
.avatar-cropper__box img {
  display: block;
  max-width: 100%;
}
.avatar-cropper__zoom {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-top: var(--space-md);
}
.avatar-cropper__zoom span {
  flex-shrink: 0;
  font-size: 13px;
  color: var(--text-secondary);
}
.avatar-cropper__zoom .el-slider {
  flex: 1;
}
</style>
