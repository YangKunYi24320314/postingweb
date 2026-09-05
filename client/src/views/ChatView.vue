<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Back, Promotion, Search } from '@element-plus/icons-vue'
import { getFriends } from '../api/friends'
import { getConversation, sendMessage } from '../api/messages'

const route = useRoute()
const router = useRouter()

const friend = ref(null)
const friends = ref([])
const keyword = ref('')
const messages = ref([])
const content = ref('')
const loading = ref(false)
const sidebarLoading = ref(false)
const sending = ref(false)
const listRef = ref(null)
let timer = null

const filteredFriends = computed(() => {
  const text = keyword.value.trim().toLowerCase()
  if (!text) return friends.value
  return friends.value.filter((item) =>
    `${item.nickname || ''} ${item.username || ''} ${item.lastMessage || ''}`.toLowerCase().includes(text)
  )
})

function formatListTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, '0')}`
}

function friendId() {
  return Number(route.params.friendId)
}

function openFriendProfile() {
  if (friend.value?.id) {
    router.push(`/user/${friend.value.id}`)
  }
}

function openProfile(user) {
  router.push(`/user/${user.id}`)
}

function openChat(item) {
  router.push(`/messages/chat/${item.id}`)
}

async function scrollToBottom() {
  await nextTick()
  if (listRef.value) {
    listRef.value.scrollTop = listRef.value.scrollHeight
  }
}

async function loadFriends() {
  sidebarLoading.value = true
  try {
    friends.value = await getFriends()
  } catch (error) {
    ElMessage.error(error.message || '好友列表加载失败')
  } finally {
    sidebarLoading.value = false
  }
}

async function loadConversation(quiet = false) {
  if (!quiet) loading.value = true
  try {
    const data = await getConversation(friendId())
    friend.value = data.friend
    messages.value = data.list
    await scrollToBottom()
  } catch (error) {
    ElMessage.error(error.message || '聊天记录加载失败')
  } finally {
    loading.value = false
  }
}

async function handleSend() {
  const text = content.value.trim()
  if (!text) {
    ElMessage.warning('请输入消息内容')
    return
  }

  sending.value = true
  try {
    const message = await sendMessage(friendId(), text)
    messages.value.push(message)
    content.value = ''
    await scrollToBottom()
    loadFriends()
  } catch (error) {
    ElMessage.error(error.message || '发送失败')
  } finally {
    sending.value = false
  }
}

onMounted(() => {
  loadFriends()
  loadConversation()
  timer = window.setInterval(() => {
    loadConversation(true)
    loadFriends()
  }, 5000)
})

onBeforeUnmount(() => {
  if (timer) window.clearInterval(timer)
})
</script>

<template>
  <div class="chat-app">
    <aside v-loading="sidebarLoading" class="chat-sidebar">
      <div class="chat-search">
        <el-input v-model="keyword" clearable :prefix-icon="Search" placeholder="搜索好友" />
      </div>

      <div class="friend-list">
        <article
          v-for="item in filteredFriends"
          :key="item.id"
          class="friend-item"
          :class="{ 'friend-item--active': item.id === friendId() }"
          @click="openChat(item)"
        >
          <el-avatar :size="46" :src="item.avatarUrl" @click.stop="openProfile(item)">
            {{ item.nickname?.charAt(0) || item.username?.charAt(0) || 'U' }}
          </el-avatar>
          <div class="friend-item__main">
            <div class="friend-item__top">
              <h2>{{ item.nickname || item.username }}</h2>
              <span>{{ formatListTime(item.lastMessageAt || item.friendsAt) }}</span>
            </div>
            <p>{{ item.lastMessage || item.bio || '可以开始聊天' }}</p>
          </div>
        </article>

        <el-empty v-if="!sidebarLoading && filteredFriends.length === 0" description="暂无好友" />
      </div>
    </aside>

    <main class="chat-main">
      <header class="chat-header">
        <el-button circle text :icon="Back" @click="router.push('/messages')" />
        <button class="chat-header__profile" type="button" @click="openFriendProfile">
          <el-avatar :size="42" :src="friend?.avatarUrl">
            {{ friend?.nickname?.charAt(0) || friend?.username?.charAt(0) || 'U' }}
          </el-avatar>
          <span class="chat-header__online"></span>
        </button>
        <div class="chat-header__main">
          <h1>{{ friend?.nickname || friend?.username || '聊天' }}</h1>
          <p>@{{ friend?.username || 'loading' }}</p>
        </div>
      </header>

      <section ref="listRef" v-loading="loading" class="message-canvas">
        <el-empty v-if="!loading && messages.length === 0" description="还没有聊天记录" />
        <article
          v-for="message in messages"
          :key="message.id"
          class="chat-message"
          :class="{ 'chat-message--mine': message.mine }"
        >
          <el-avatar
            v-if="!message.mine"
            class="chat-message__avatar"
            :size="34"
            :src="friend?.avatarUrl"
            @click="openFriendProfile"
          >
            {{ friend?.nickname?.charAt(0) || friend?.username?.charAt(0) || 'U' }}
          </el-avatar>
          <div class="chat-message__bubble">
            <p>{{ message.content }}</p>
          </div>
        </article>
      </section>

      <footer class="message-input">
        <el-input
          v-model="content"
          maxlength="500"
          placeholder="发送消息"
          @keyup.enter.exact.prevent="handleSend"
        />
        <el-button circle type="primary" :icon="Promotion" :loading="sending" @click="handleSend" />
      </footer>
    </main>
  </div>
</template>

<style scoped>
.chat-app {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  height: 100%;
  width: 100%;
  background: var(--bg-white);
}

.chat-sidebar {
  min-width: 0;
  min-height: 0;
  background: #f7f8fb;
  border-right: 1px solid var(--border-color);
}

.chat-search {
  padding: var(--space-md);
  border-bottom: 1px solid var(--border-color);
}

.chat-search :deep(.el-input__wrapper) {
  border-radius: var(--radius-md);
  box-shadow: none;
}

.friend-list {
  height: calc(100% - 65px);
  overflow-y: auto;
  scrollbar-color: rgba(148, 163, 184, 0.28) transparent;
  scrollbar-width: thin;
}

.friend-list::-webkit-scrollbar,
.message-canvas::-webkit-scrollbar {
  width: 6px;
}

.friend-list::-webkit-scrollbar-track,
.message-canvas::-webkit-scrollbar-track {
  background: transparent;
}

.friend-list::-webkit-scrollbar-thumb,
.message-canvas::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.26);
  border-radius: var(--radius-full);
}

.friend-list::-webkit-scrollbar-thumb:hover,
.message-canvas::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.44);
}

.friend-item {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 76px;
  padding: 12px var(--space-md);
  border-bottom: 1px solid rgba(229, 231, 235, 0.7);
  cursor: pointer;
}

.friend-item:hover,
.friend-item--active {
  background: var(--bg-white);
}

.friend-item :deep(.el-avatar) {
  flex-shrink: 0;
}

.friend-item__main {
  flex: 1;
  min-width: 0;
}

.friend-item__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
}

.friend-item h2 {
  margin: 0;
  overflow: hidden;
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.friend-item span,
.friend-item p {
  color: var(--text-secondary);
  font-size: 12px;
}

.friend-item p {
  margin: 6px 0 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-main {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  background: #f2f4f8;
}

.chat-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  height: 68px;
  padding: 0 var(--space-lg);
  background: var(--bg-white);
  border-bottom: 1px solid var(--border-color);
}

.chat-header__profile {
  position: relative;
  display: inline-flex;
  padding: 0;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.chat-header__profile:hover :deep(.el-avatar),
.chat-message__avatar:hover {
  box-shadow: 0 0 0 3px var(--brand-primary-light);
}

.chat-header__online {
  position: absolute;
  right: 0;
  bottom: 1px;
  width: 10px;
  height: 10px;
  background: var(--color-success);
  border: 2px solid var(--bg-white);
  border-radius: var(--radius-full);
}

.chat-header__main {
  min-width: 0;
}

.chat-header h1 {
  margin: 0;
  color: var(--text-primary);
  font-size: 17px;
}

.chat-header p {
  margin: 2px 0 0;
  color: var(--text-secondary);
  font-size: 12px;
}

.message-canvas {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: var(--space-xl) 30px;
  scrollbar-color: rgba(148, 163, 184, 0.24) transparent;
  scrollbar-width: thin;
}

.chat-message {
  display: flex;
  align-items: flex-end;
  gap: var(--space-sm);
  margin-bottom: 14px;
}

.chat-message--mine {
  justify-content: flex-end;
}

.chat-message__avatar {
  flex-shrink: 0;
  cursor: pointer;
}

.chat-message__bubble {
  max-width: min(42%, 420px);
  padding: 9px 12px;
  background: var(--bg-white);
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
}

.chat-message--mine .chat-message__bubble {
  background: var(--brand-primary);
  color: var(--bg-white);
}

.chat-message__bubble p {
  margin: 0;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}

.chat-message__bubble span {
  display: block;
  margin-top: 4px;
  color: var(--text-placeholder);
  font-size: 12px;
  text-align: right;
}

.chat-message--mine .chat-message__bubble span {
  color: rgba(255, 255, 255, 0.72);
}

.message-input {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 12px 28px 20px;
  background: #f2f4f8;
}

.message-input :deep(.el-input__wrapper) {
  min-height: 46px;
  padding: 0 18px;
  background: var(--bg-white);
  border: 1px solid rgba(229, 231, 235, 0.9);
  border-radius: var(--radius-full);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
}

.message-input :deep(.el-input__inner) {
  height: 46px;
}

.message-input :deep(.el-button) {
  width: 46px;
  height: 46px;
  border-radius: var(--radius-full);
  box-shadow: 0 8px 18px rgba(58, 109, 240, 0.28);
}

.message-input :deep(.el-button .el-icon) {
  font-size: 17px;
}

@media (max-width: 760px) {
  .chat-app {
    grid-template-columns: 1fr;
  }

  .chat-sidebar {
    display: none;
  }

  .chat-message__bubble {
    max-width: 82%;
  }
}
</style>
