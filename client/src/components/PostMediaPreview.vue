<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { CaretRight } from '@element-plus/icons-vue'

// 帖子卡片里的图片/视频缩略图预览。
// 最多展示 2 个；附件数 >=3 时，末尾追加一个「+」方框，点击进帖子详情。
const props = defineProps({
  attachments: { type: Array, default: () => [] },
  postId: { type: [Number, String], default: null },
})

const router = useRouter()

const media = computed(() => props.attachments.slice(0, 2))
const hasMore = computed(() => props.attachments.length >= 3)

// 视频播放弹窗
const videoVisible = ref(false)
const videoUrl = ref('')

// 后端返回的相对路径（如 /static/attachments/xxx.jpg）拼成可访问 URL
function fileUrl(file) {
  return '/' + String(file.file_path || '').replace(/^\/+/, '')
}

function isImage(file) {
  return (file.mime_type || '').startsWith('image/')
}

function openVideo(file) {
  videoUrl.value = fileUrl(file)
  videoVisible.value = true
}

// 点击缩略图：图片交给 el-image 自带预览，视频则打开播放弹窗
function onItemClick(file) {
  if (isImage(file)) return
  openVideo(file)
}

function goDetail() {
  if (props.postId != null) router.push(`/post/${props.postId}`)
}
</script>

<template>
  <div v-if="attachments.length" class="media-preview">
    <div
      v-for="file in media"
      :key="file.id"
      class="media-preview__item"
      @click.stop="onItemClick(file)"
    >
      <el-image
        v-if="isImage(file)"
        :src="fileUrl(file)"
        fit="cover"
        :preview-src-list="[fileUrl(file)]"
        preview-teleported
        class="media-preview__media"
      />
      <template v-else>
        <video
          :src="fileUrl(file)"
          class="media-preview__media"
          preload="metadata"
          muted
          playsinline
        />
        <span class="media-preview__play">
          <el-icon><CaretRight /></el-icon>
        </span>
      </template>
    </div>

    <div v-if="hasMore" class="media-preview__item media-preview__more" @click.stop="goDetail">
      <span class="media-preview__plus">+</span>
    </div>

    <!-- 视频播放弹窗 -->
    <el-dialog v-model="videoVisible" title="视频预览" width="80%" top="5vh" append-to-body>
      <video :src="videoUrl" controls autoplay style="width: 100%" />
    </el-dialog>
  </div>
</template>

<style scoped>
.media-preview {
  display: flex;
  gap: var(--space-sm);
  margin-top: var(--space-sm);
  flex-wrap: wrap;
}
.media-preview__item {
  position: relative;
  width: 228px;
  height: 228px;
  border-radius: var(--radius-md);
  overflow: hidden;
  cursor: pointer;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}
.media-preview__item:not(.media-preview__more):hover {
  transform: scale(1.05);
}
.media-preview__media {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.media-preview__play {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--bg-white);
  font-size: 30px;
  pointer-events: none;
}
.media-preview__play .el-icon {
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.6));
}
.media-preview__more {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--brand-primary);
  opacity: 0.4;
  transition: opacity 0.2s ease;
}
.media-preview__more:hover {
  opacity: 0.8;
}
.media-preview__plus {
  color: var(--bg-white);
  font-size: 30px;
  line-height: 1;
  font-weight: 700;
}
</style>
