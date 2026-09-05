<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Check, ChatDotRound, Search } from '@element-plus/icons-vue'
import { acceptFriendRequest, getFriendRequests, getFriends } from '../api/friends'

const router = useRouter()

const loading = ref(false)
const requests = ref([])
const friends = ref([])
const keyword = ref('')
const acceptingId = ref(null)

const filteredFriends = computed(() => {
  const text = keyword.value.trim().toLowerCase()
  if (!text) return friends.value
  return friends.value.filter((friend) =>
    `${friend.nickname || ''} ${friend.username || ''} ${friend.lastMessage || ''}`
      .toLowerCase()
      .includes(text)
  )
})

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}-${pad(d.getDate())}`
}

async function loadMessages() {
  loading.value = true
  try {
    const [requestList, friendList] = await Promise.all([getFriendRequests(), getFriends()])
    requests.value = requestList
    friends.value = friendList
  } catch (error) {
    ElMessage.error(error.message || '消息加载失败')
  } finally {
    loading.value = false
  }
}

async function handleAccept(item) {
  acceptingId.value = item.id
  try {
    await acceptFriendRequest(item.id)
    ElMessage.success('已添加好友')
    await loadMessages()
  } catch (error) {
    ElMessage.error(error.message || '处理失败')
  } finally {
    acceptingId.value = null
  }
}

function openChat(friend) {
  router.push(`/messages/chat/${friend.id}`)
}

function openProfile(user) {
  router.push(`/user/${user.id}`)
}

onMounted(loadMessages)
</script>

<template>
  <div class="messenger-page">
    <section v-loading="loading" class="messenger-shell">
      <aside class="conversation-sidebar">
        <div class="conversation-search">
          <el-input
            v-model="keyword"
            clearable
            :prefix-icon="Search"
            placeholder="搜索好友"
          />
        </div>

        <div class="conversation-list">
          <article v-for="item in requests" :key="item.id" class="conversation-item request-item">
            <el-avatar
              :size="46"
              :src="item.requester.avatarUrl"
              @click="openProfile(item.requester)"
            >
              {{ item.requester.nickname?.charAt(0) || item.requester.username?.charAt(0) || 'U' }}
            </el-avatar>
            <div class="conversation-main">
              <div class="conversation-title">
                <h2>{{ item.requester.nickname || item.requester.username }}</h2>
                <span>{{ formatTime(item.createdAt) }}</span>
              </div>
              <p>请求添加你为好友</p>
            </div>
            <el-button
              circle
              type="primary"
              :icon="Check"
              :loading="acceptingId === item.id"
              @click="handleAccept(item)"
            />
          </article>

          <article
            v-for="friend in filteredFriends"
            :key="friend.id"
            class="conversation-item"
            @click="openChat(friend)"
          >
            <el-avatar :size="46" :src="friend.avatarUrl" @click.stop="openProfile(friend)">
              {{ friend.nickname?.charAt(0) || friend.username?.charAt(0) || 'U' }}
            </el-avatar>
            <div class="conversation-main">
              <div class="conversation-title">
                <h2>{{ friend.nickname || friend.username }}</h2>
                <span>{{ formatTime(friend.lastMessageAt || friend.friendsAt) }}</span>
              </div>
              <p>{{ friend.lastMessage || friend.bio || '可以开始聊天' }}</p>
            </div>
          </article>

          <el-empty
            v-if="!loading && requests.length === 0 && filteredFriends.length === 0"
            description="暂无好友"
          />
        </div>
      </aside>

      <main class="conversation-empty">
        <el-icon><ChatDotRound /></el-icon>
        <h1>选择一个好友开始聊天</h1>
        <p>好友申请会显示在左侧，同意后就会出现在好友列表里。</p>
      </main>
    </section>
  </div>
</template>

<style scoped>
.messenger-page {
  height: 100%;
  background: var(--bg-page);
}

.messenger-shell {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  height: 100%;
  width: 100%;
  background: var(--bg-white);
}

.conversation-sidebar {
  min-width: 0;
  background: #f7f8fb;
  border-right: 1px solid var(--border-color);
}

.conversation-search {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--space-sm);
  padding: var(--space-md);
  border-bottom: 1px solid var(--border-color);
}

.conversation-search :deep(.el-input__wrapper) {
  border-radius: var(--radius-md);
  box-shadow: none;
}

.conversation-list {
  height: calc(100% - 65px);
  overflow-y: auto;
  scrollbar-color: rgba(148, 163, 184, 0.28) transparent;
  scrollbar-width: thin;
}

.conversation-list::-webkit-scrollbar {
  width: 6px;
}

.conversation-list::-webkit-scrollbar-track {
  background: transparent;
}

.conversation-list::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.26);
  border-radius: var(--radius-full);
}

.conversation-list::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.44);
}

.conversation-item {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 76px;
  padding: 12px var(--space-md);
  border-bottom: 1px solid rgba(229, 231, 235, 0.7);
  cursor: pointer;
}

.conversation-item:hover {
  background: var(--bg-white);
}

.request-item {
  background: #fff8ed;
}

.conversation-item :deep(.el-avatar) {
  flex-shrink: 0;
}

.conversation-main {
  flex: 1;
  min-width: 0;
}

.conversation-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
}

.conversation-title h2 {
  margin: 0;
  overflow: hidden;
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-title span,
.conversation-main p {
  color: var(--text-secondary);
  font-size: 12px;
}

.conversation-main p {
  margin: 6px 0 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-empty {
  display: grid;
  place-content: center;
  justify-items: center;
  min-width: 0;
  color: var(--text-secondary);
  text-align: center;
}

.conversation-empty .el-icon {
  margin-bottom: var(--space-md);
  color: var(--brand-primary);
  font-size: 46px;
}

.conversation-empty h1 {
  margin: 0 0 var(--space-sm);
  color: var(--text-primary);
  font-size: 22px;
}

.conversation-empty p {
  margin: 0;
  font-size: 14px;
}

@media (max-width: 760px) {
  .messenger-shell {
    grid-template-columns: 1fr;
  }

  .conversation-empty {
    display: none;
  }
}
</style>
