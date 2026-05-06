<template>
  <div :class="$style.container">
    <div :class="$style.header">
      <h2>我的网易云歌单</h2>
      <base-btn min outline @click="handleRefresh">刷新</base-btn>
    </div>
    <div v-if="message" :class="$style.noitem">{{ message }}</div>
    <div v-else class="scroll" :class="$style.content">
      <ul :class="$style.grid">
        <li v-for="item in wyPlaylists" :key="item.id" :class="$style.card" @click="openPlaylist(item)">
          <div :class="$style.image">
            <img :src="item.coverImgUrl" loading="lazy" decoding="async">
          </div>
          <strong>{{ item.name }}</strong>
          <span>{{ item.creator?.nickname || '' }}</span>
          <em>{{ item.trackCount }} 首</em>
          <button v-if="isLikedPlaylist(item)" type="button" :class="$style.heartbeat" title="心动模式" @click.stop="playHeartbeat(item)">
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" viewBox="0 0 445 392" space="preserve">
              <use xlink:href="#icon-love" />
            </svg>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from '@common/utils/vueTools'
import { useRouter } from '@common/utils/vueRouter'
import { appSetting } from '@renderer/store/setting'
import { initWyUser } from '@renderer/store/user/action'
import { wyPlaylists, wyUserError, wyUserLoading, type WyPlaylistInfo } from '@renderer/store/user/state'
import musicSdk from '@renderer/utils/musicSdk'
import { deduplicationList, toNewMusicInfo } from '@renderer/utils'
import { setTempList } from '@renderer/store/list/action'
import { playList } from '@renderer/core/player'
import { LIST_IDS } from '@common/constants'

const router = useRouter()

const message = computed(() => {
  if (wyUserLoading.value) return '网易云数据加载中...'
  if (!appSetting['common.wy_cookie']) return '请先在设置里填写网易云 Cookie'
  if (wyUserError.value) return wyUserError.value
  if (!wyPlaylists.length) return '暂无歌单'
  return ''
})

const handleRefresh = () => {
  void initWyUser(true)
}

const openPlaylist = (item: WyPlaylistInfo) => {
  void router.push({
    path: '/songList/detail',
    query: {
      source: 'wy',
      id: String(item.id),
      picUrl: item.coverImgUrl,
      fromName: 'NeteasePlaylists',
    },
  })
}

const isLikedPlaylist = (item: WyPlaylistInfo) => {
  return item.specialType === 5 || /喜欢.*音乐|喜欢.*歌曲|liked songs?/i.test(item.name)
}

const playHeartbeat = async(item: WyPlaylistInfo) => {
  try {
    const cookie = appSetting['common.wy_cookie'].trim()
    if (!cookie) return
    const detail = await musicSdk.wy.songList.getListDetail(String(item.id), 1)
    const firstSong = detail.list?.[0]
    if (!firstSong) return
    const res = await musicSdk.wy.dailyRec.getHeartbeatModeList(cookie, item.id, firstSong.songmid)
    const list = deduplicationList(res.list.map((m: any) => toNewMusicInfo(m)) as LX.Music.MusicInfoOnline[])
    if (!list.length) return
    await setTempList('heartbeat', list)
    playList(LIST_IDS.TEMP, 0)
  } catch (err) {
    console.log(err)
  }
}
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

.content {
  flex: auto;
  min-height: 0;
  padding: 20px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 20px;
}

.card {
  position: relative;
  display: block;
  padding: 12px;
  border-radius: 12px;
  cursor: pointer;
  background: transparent;
  color: var(--color-font);
  text-align: left;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);

  &:hover {
    background: rgba(128, 128, 128, 0.08);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
  }
}

.image {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
  transition: box-shadow 0.3s ease;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.card:hover .image {
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
}

.card {
  strong {
    display: block;
    margin-top: 10px;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.4;
    .mixin-ellipsis-1();
  }

  span {
    display: block;
    margin-top: 4px;
    color: var(--color-font-label);
    font-size: 12px;
    .mixin-ellipsis-1();
  }

  em {
    display: block;
    margin-top: 2px;
    color: var(--color-font-label);
    font-size: 11px;
    font-style: normal;
    .mixin-ellipsis-1();
  }
}

.heartbeat {
  position: absolute;
  right: 16px;
  top: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 50%;
  padding: 0;
  background: rgba(0, 0, 0, .32);
  color: #e94b5f;
  cursor: pointer;
  line-height: 0;

  svg {
    width: 19px;
    height: 18px;
    display: block;
  }
}

.noitem {
  flex: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-font-label);
  font-size: 24px;
}
</style>
