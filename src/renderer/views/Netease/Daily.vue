<template>
  <div :class="$style.container">
    <div :class="$style.header">
      <h2>每日推荐</h2>
      <base-btn min outline @click="handleRefresh">刷新</base-btn>
    </div>
    <div :class="$style.tabs">
      <button type="button" :class="{[$style.active]: tab == 'songs'}" @click="tab = 'songs'">歌曲</button>
      <button type="button" :class="{[$style.active]: tab == 'playlists'}" @click="tab = 'playlists'">歌单</button>
    </div>
    <div v-show="tab == 'songs'" :class="$style.list">
      <material-online-list
        ref="onlineListRef"
        list-id="wy_daily_rec"
        force-play-list
        :page="1"
        :limit="Math.max(list.length, 1)"
        :total="list.length"
        :list="list"
        :no-item="noItem"
        @play-list="handlePlayList"
        @replace-list-music="handleReplaceListMusic"
      />
    </div>
    <div v-show="tab == 'playlists'" class="scroll" :class="$style.playlistPanel">
      <div v-if="playlistMessage" :class="$style.message">{{ playlistMessage }}</div>
      <div v-else :class="$style.playlistGrid">
        <button v-for="playlist in recPlaylists" :key="playlist.id" type="button" :class="$style.recCard" @click="openPlaylist(playlist)">
          <img :src="playlist.picUrl || playlist.coverImgUrl" loading="lazy" decoding="async">
          <span>{{ playlist.name }}</span>
          <em v-if="playlist.copywriter">{{ playlist.copywriter }}</em>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from '@common/utils/vueTools'
import { useRoute, useRouter } from '@common/utils/vueRouter'
import { appSetting } from '@renderer/store/setting'
import { setTempList } from '@renderer/store/list/action'
import { playList } from '@renderer/core/player'
import { LIST_IDS } from '@common/constants'
import { getWyDailyRec, getWyRecPlaylists } from '@renderer/store/user/action'

const list = ref<LX.Music.MusicInfoOnline[]>([])
const recPlaylists = ref<any[]>([])
const noItem = ref('')
const playlistMessage = ref('')
const tab = ref<'songs' | 'playlists'>('songs')
const onlineListRef = ref<any>(null)
const router = useRouter()
const route = useRoute()

const restoreScroll = () => {
  const index = route.query.scrollIndex
  if (index == null) return
  tab.value = 'songs'
  void nextTick(() => {
    onlineListRef.value?.scrollToIndex(Number(index))
  })
}

const loadDaily = async(force = false) => {
  const cookie = appSetting['common.wy_cookie'].trim()
  if (!cookie) {
    noItem.value = '请先在设置里填写网易云 Cookie'
    playlistMessage.value = noItem.value
    list.value = []
    recPlaylists.value = []
    return
  }

  noItem.value = '每日推荐加载中...'
  playlistMessage.value = '推荐歌单加载中...'
  try {
    const [dailyList, playlistsResult] = await Promise.all([
      getWyDailyRec(force).catch((err: any) => {
        noItem.value = err?.message || '每日推荐加载失败'
        console.log(err)
        return []
      }),
      getWyRecPlaylists(force).then(playlists => ({
        list: playlists,
        error: '',
      })).catch((err: any) => {
        console.log(err)
        return {
          list: [],
          error: err?.message || '推荐歌单加载失败',
        }
      }),
    ])
    list.value = dailyList
    recPlaylists.value = playlistsResult.list
    restoreScroll()
    noItem.value = list.value.length ? '' : '暂无推荐'
    playlistMessage.value = recPlaylists.value.length ? '' : playlistsResult.error || '暂无推荐歌单'
  } catch (err: any) {
    noItem.value = err?.message || '每日推荐加载失败'
    playlistMessage.value = err?.message || '推荐歌单加载失败'
    list.value = []
    recPlaylists.value = []
    console.log(err)
  }
}

const handleRefresh = () => {
  void loadDaily(true)
}

const handlePlayList = async(index: number) => {
  await setTempList('wy_daily_rec', [...list.value])
  playList(LIST_IDS.TEMP, index)
}

const handleReplaceListMusic = ({ id, musicInfo }: { id: string, musicInfo: LX.Music.MusicInfoOnline | null }) => {
  const index = list.value.findIndex(item => item.id == id)
  if (index < 0) return
  if (musicInfo) list.value.splice(index, 1, musicInfo)
  else list.value.splice(index, 1)
  noItem.value = list.value.length ? '' : '暂无推荐'
}

const openPlaylist = (playlist: any) => {
  void router.push({
    path: '/songList/detail',
    query: {
      source: 'wy',
      id: String(playlist.id),
      picUrl: playlist.picUrl || playlist.coverImgUrl,
      fromName: 'NeteaseDaily',
    },
  })
}

onMounted(() => {
  void loadDaily()
})

watch(() => [route.query.scrollIndex, route.query.locationId], () => {
  restoreScroll()
})
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';
.container {
  height: 100%;
  display: flex;
  flex-flow: column nowrap;
}

.header {
  flex: none;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 15px;

  h2 {
    font-size: 16px;
    font-weight: 600;
  }
}

.list {
  position: relative;
  flex: auto;
  min-height: 0;
}

.tabs {
  flex: none;
  display: flex;
  gap: 16px;
  padding: 0 15px 12px;

  button {
    border: 0;
    border-radius: 18px;
    padding: 6px 16px;
    background: transparent;
    color: var(--color-font);
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s ease;

    &:hover {
      background: rgba(128, 128, 128, 0.08);
    }
  }
}

.active {
  background: var(--color-primary) !important;
  color: #fff !important;
}

.playlistPanel {
  flex: auto;
  min-height: 0;
  padding: 0 15px 18px;
}

.playlistGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 20px;
}

.recCard {
  border: 0;
  padding: 12px;
  background: transparent;
  border-radius: 12px;
  color: var(--color-font);
  text-align: left;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);

  &:hover {
    transform: translateY(-4px);
    background: rgba(128, 128, 128, 0.08);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.06);
  }

  img {
    width: 100%;
    aspect-ratio: 1 / 1;
    border-radius: 8px;
    object-fit: cover;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
    transition: box-shadow 0.3s ease;
  }

  &:hover img {
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
  }

  span {
    display: block;
    margin-top: 10px;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.4;
    .mixin-ellipsis-2();
  }

  em {
    display: block;
    margin-top: 4px;
    color: var(--color-font-label);
    font-size: 12px;
    font-style: normal;
    .mixin-ellipsis-1();
  }
}

.message {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-font-label);
}
</style>
