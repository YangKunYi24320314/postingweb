<script setup>
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Star, StarFilled } from '@element-plus/icons-vue'
import { ThumbsUp } from 'lucide-vue-next'
import {
  favoritePost,
  likeComment,
  likePost,
  unfavoritePost,
  unlikeComment,
  unlikePost,
} from '../api/interactions'

const props = defineProps({
  postId: {
    type: [Number, String],
    default: null,
  },
  commentId: {
    type: [Number, String],
    default: null,
  },
  liked: {
    type: Boolean,
    default: false,
  },
  likeCount: {
    type: Number,
    default: 0,
  },
  favorited: {
    type: Boolean,
    default: false,
  },
  favoriteCount: {
    type: Number,
    default: 0,
  },
  showPostLike: {
    type: Boolean,
    default: true,
  },
  showFavorite: {
    type: Boolean,
    default: true,
  },
  showCommentLike: {
    type: Boolean,
    default: false,
  },
  size: {
    type: String,
    default: 'default',
  },
})

const emit = defineEmits([
  'update:liked',
  'update:likeCount',
  'update:favorited',
  'update:favoriteCount',
])

const innerLiked = ref(props.liked)
const innerLikeCount = ref(props.likeCount)
const innerFavorited = ref(props.favorited)
const innerFavoriteCount = ref(props.favoriteCount)
const loadingAction = ref('')

const normalizedPostId = computed(() => Number(props.postId))
const normalizedCommentId = computed(() => Number(props.commentId))

watch(
  () => props.liked,
  (value) => {
    innerLiked.value = value
  }
)

watch(
  () => props.likeCount,
  (value) => {
    innerLikeCount.value = value
  }
)

watch(
  () => props.favorited,
  (value) => {
    innerFavorited.value = value
  }
)

watch(
  () => props.favoriteCount,
  (value) => {
    innerFavoriteCount.value = value
  }
)

function isValidId(id) {
  return Number.isInteger(id) && id > 0
}

async function runAction(actionName, action) {
  loadingAction.value = actionName

  try {
    await action()
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    loadingAction.value = ''
  }
}

function syncLikeState(data) {
  innerLiked.value = data.liked
  innerLikeCount.value = data.likeCount
  emit('update:liked', data.liked)
  emit('update:likeCount', data.likeCount)
}

function syncFavoriteState(data) {
  innerFavorited.value = data.isFavorite
  innerFavoriteCount.value = data.favoriteCount
  emit('update:favorited', data.isFavorite)
  emit('update:favoriteCount', data.favoriteCount)
}

function togglePostLike() {
  if (!isValidId(normalizedPostId.value)) {
    ElMessage.warning('帖子 ID 不正确')
    return
  }

  runAction('postLike', async () => {
    const data = innerLiked.value
      ? await unlikePost(normalizedPostId.value)
      : await likePost(normalizedPostId.value)

    syncLikeState(data)
  })
}

function toggleFavorite() {
  if (!isValidId(normalizedPostId.value)) {
    ElMessage.warning('帖子 ID 不正确')
    return
  }

  runAction('favorite', async () => {
    const data = innerFavorited.value
      ? await unfavoritePost(normalizedPostId.value)
      : await favoritePost(normalizedPostId.value)

    syncFavoriteState(data)
  })
}

function toggleCommentLike() {
  if (!isValidId(normalizedCommentId.value)) {
    ElMessage.warning('评论 ID 不正确')
    return
  }

  runAction('commentLike', async () => {
    const data = innerLiked.value
      ? await unlikeComment(normalizedCommentId.value)
      : await likeComment(normalizedCommentId.value)

    syncLikeState(data)
  })
}
</script>

<template>
  <div class="interaction-buttons">
    <el-button
      v-if="showPostLike"
      :type="innerLiked ? 'primary' : 'default'"
      :icon="ThumbsUp"
      :size="size"
      :loading="loadingAction === 'postLike'"
      @click="togglePostLike"
    >
      {{ innerLiked ? '已点赞' : '点赞' }} {{ innerLikeCount }}
    </el-button>

    <el-button
      v-if="showFavorite"
      :type="innerFavorited ? 'warning' : 'default'"
      :icon="innerFavorited ? StarFilled : Star"
      :size="size"
      :loading="loadingAction === 'favorite'"
      @click="toggleFavorite"
    >
      {{ innerFavorited ? '已收藏' : '收藏' }} {{ innerFavoriteCount }}
    </el-button>

    <el-button
      v-if="showCommentLike"
      :type="innerLiked ? 'primary' : 'default'"
      :icon="ThumbsUp"
      :size="size"
      :loading="loadingAction === 'commentLike'"
      @click="toggleCommentLike"
    >
      {{ innerLiked ? '已点赞' : '点赞评论' }} {{ innerLikeCount }}
    </el-button>
  </div>
</template>

<style scoped>
.interaction-buttons {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}
</style>
