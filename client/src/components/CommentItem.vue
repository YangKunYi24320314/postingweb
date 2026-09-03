<script setup>
// 单条评论组件：显示 + 点赞 + 回复 + 编辑 + 删除。
// 通过 name 声明可以自身引用自己（实现"楼中楼"无限嵌套回复）。
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import InteractionButtons from './InteractionButtons.vue'
import { createComment, deleteComment, updateComment } from '../api/comments'

defineOptions({ name: 'CommentItem' })

const props = defineProps({
  comment: {
    type: Object,
    required: true,
  },
  postId: {
    type: [Number, String],
    default: null,
  },
  myUserId: {
    type: [Number, String],
    default: null,
  },
})

// 通知父级刷新（发表回复/删除/编辑后，让父级重新拉取最新评论和帖子计数）
const emit = defineEmits(['reload'])

const saving = ref(false)
const replyOpen = ref(false)
const replyContent = ref('')
const editing = ref(false)
const editContent = ref('')

// 是不是我自己的评论（只有作者能编辑/删除）
const isMine = computed(() => {
  const me = Number(props.myUserId)
  const authorId = Number(props.comment.user?.id)
  return me && authorId && me === authorId
})

// 格式化时间：ISO → "2026-09-01 08:54"
function formatTime(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function toggleReply() {
  replyOpen.value = !replyOpen.value
}

function startEdit() {
  editContent.value = props.comment.content
  editing.value = true
}

function cancelEdit() {
  editing.value = false
  editContent.value = ''
}

// 保存编辑
async function saveEdit() {
  if (!editContent.value.trim()) {
    ElMessage.warning('评论内容不能为空')
    return
  }
  saving.value = true
  try {
    await updateComment(props.comment.id, { content: editContent.value.trim() })
    ElMessage.success('评论已更新')
    editing.value = false
    emit('reload')
  } catch (e) {
    ElMessage.error(e.message || '编辑失败')
  } finally {
    saving.value = false
  }
}

// 删除评论（软删除，需登录，仅作者或管理员）
async function removeComment() {
  saving.value = true
  try {
    await deleteComment(props.comment.id)
    ElMessage.success('评论已删除')
    emit('reload')
  } catch (e) {
    ElMessage.error(e.message || '删除失败')
  } finally {
    saving.value = false
  }
}

// 发表回复（楼中楼，parentId = 当前这条评论）
async function submitReply() {
  if (!replyContent.value.trim()) {
    ElMessage.warning('请输入回复内容')
    return
  }
  saving.value = true
  try {
    await createComment(props.postId, {
      content: replyContent.value.trim(),
      parentId: props.comment.id,
    })
    replyContent.value = ''
    replyOpen.value = false
    ElMessage.success('回复成功')
    emit('reload')
  } catch (e) {
    ElMessage.error(e.message || '回复失败')
  } finally {
    saving.value = false
  }
}

// 把子级评论的 reload 事件一层层传给父级
function forwardReload() {
  emit('reload')
}
</script>

<template>
  <div class="comment">
    <el-avatar :size="36" :src="comment.user?.avatarUrl || undefined" class="comment__avatar">
      {{ comment.user?.nickname?.[0] || '?' }}
    </el-avatar>

    <div class="comment__body">
      <div class="comment__head">
        <span class="comment__name">{{ comment.user?.nickname || '匿名用户' }}</span>
        <span class="comment__time">{{ formatTime(comment.createdAt) }}</span>
      </div>

      <!-- 查看态 or 编辑态 -->
      <div v-if="!editing" class="comment__content">{{ comment.content }}</div>
      <div v-else>
        <el-input v-model="editContent" type="textarea" :rows="2" placeholder="修改评论内容" />
        <div class="comment__actions">
          <el-button size="small" type="primary" :loading="saving" @click="saveEdit"
            >保存</el-button
          >
          <el-button size="small" @click="cancelEdit">取消</el-button>
        </div>
      </div>

      <div class="comment__footer">
        <InteractionButtons
          show-comment-like
          :show-post-like="false"
          :show-favorite="false"
          :comment-id="comment.id"
          :liked="comment.isLiked"
          :like-count="comment.likeCount"
          size="small"
        />
        <el-button v-if="myUserId" link size="small" @click="toggleReply">
          {{ replyOpen ? '收起回复' : '回复' }}
        </el-button>
        <template v-if="isMine">
          <el-button link size="small" @click="startEdit">编辑</el-button>
          <el-popconfirm title="确认删除这条评论？" @confirm="removeComment">
            <template #reference>
              <el-button link size="small" type="danger">删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </div>

      <!-- 回复输入框 -->
      <div v-if="replyOpen" class="comment__reply-box">
        <el-input v-model="replyContent" type="textarea" :rows="2" placeholder="写下你的回复..." />
        <div class="comment__actions">
          <el-button size="small" type="primary" :loading="saving" @click="submitReply"
            >回复</el-button
          >
          <el-button size="small" @click="replyOpen = false">取消</el-button>
        </div>
      </div>

      <!-- 楼中楼：递归渲染子回复 -->
      <div v-if="comment.replies && comment.replies.length" class="comment__replies">
        <CommentItem
          v-for="reply in comment.replies"
          :key="reply.id"
          :comment="reply"
          :post-id="postId"
          :my-user-id="myUserId"
          @reload="forwardReload"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.comment {
  display: flex;
  gap: var(--space-sm);
}

.comment__avatar {
  flex-shrink: 0;
  background: var(--brand-primary);
  color: var(--bg-white);
}

.comment__body {
  flex: 1;
  min-width: 0;
}

.comment__head {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
}

.comment__name {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 14px;
}

.comment__time {
  font-size: 12px;
  color: var(--text-placeholder);
}

.comment__content {
  color: var(--text-regular);
  white-space: pre-wrap;
  word-break: break-word;
  margin-top: var(--space-xs);
}

.comment__footer {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-top: var(--space-xs);
  flex-wrap: wrap;
}

.comment__actions {
  display: flex;
  gap: var(--space-sm);
  margin-top: var(--space-xs);
}

.comment__reply-box {
  margin-top: var(--space-sm);
  padding-top: var(--space-sm);
  border-top: 1px solid var(--border-color-light);
}

.comment__replies {
  margin-top: var(--space-sm);
  padding-left: var(--space-md);
  border-left: 2px solid var(--border-color-light);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}
</style>
