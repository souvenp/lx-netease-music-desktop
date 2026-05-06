<template>
  <div :class="$style.container">
    <section :class="$style.header">
      <button
        v-if="album?.id"
        type="button"
        :class="[$style.subBtn, { [$style.liked]: isSubscribed }]"
        :aria-label="isSubscribed ? '取消收藏' : '收藏专辑'"
        @click="handleSubAlbum"
      >
        <span>{{ isSubscribed ? '♥' : '♡' }}</span>
      </button>
      <img v-if="cover" :class="$style.bg" :src="cover" decoding="async">
      <button type="button" :class="$style.back" @click="router.back()">返回</button>
      <div :class="$style.inner">
        <img v-if="cover" :class="$style.cover" :src="cover" decoding="async">
        <div :class="$style.meta">
          <h2>{{ album?.name || route.query.name || '网易云专辑' }}</h2>
          <p>
            <button
              v-for="artist in artists"
              :key="artist.id"
              type="button"
              @click="openArtist(artist)"
            >
              {{ artist.name }}
            </button>
          </p>
          <span>{{ publishDate }} · {{ list.length }} 首</span>
          <em v-if="albumDesc" class="scroll">{{ albumDesc }}</em>
        </div>
      </div>
    </section>
    <div :class="$style.list">
      <material-online-list
        ref="onlineListRef"
        :list-id="`wy_album_${albumId}`"
        force-play-list
        :page="1"
        :limit="Math.max(list.length, 1)"
        :total="list.length"
        :list="list"
        :no-item="message"
        @play-list="handlePlayList"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from '@common/utils/vueTools'
import { useRoute, useRouter } from '@common/utils/vueRouter'
import musicSdk from '@renderer/utils/musicSdk'
import { deduplicationList, toNewMusicInfo } from '@renderer/utils'
import { setTempList } from '@renderer/store/list/action'
import { playList } from '@renderer/core/player'
import { LIST_IDS } from '@common/constants'
import { toggleWySubAlbum } from '@renderer/store/user/action'
import { wySubscribedAlbums } from '@renderer/store/user/state'

const route = useRoute()
const router = useRouter()
const album = ref<any>(null)
const list = ref<LX.Music.MusicInfoOnline[]>([])
const message = ref('加载中...')
const onlineListRef = ref<any>(null)
const albumId = computed(() => String(route.query.id ?? ''))
const cover = computed(() => album.value?.picUrl ?? album.value?.blurPicUrl ?? '')
const artists = computed(() => album.value?.artists ?? [])
const albumDesc = computed(() => album.value?.description || album.value?.briefDesc || '')
const isSubscribed = computed(() => wySubscribedAlbums.some(item => String(item.id) == albumId.value))
const publishDate = computed(() => {
  const time = album.value?.publishTime
  return time ? new Date(time).toLocaleDateString() : '未知日期'
})

const restoreScroll = () => {
  const index = route.query.scrollIndex
  if (index == null) return
  void nextTick(() => {
    onlineListRef.value?.scrollToIndex(Number(index))
  })
}

const load = async() => {
  if (!albumId.value) {
    message.value = '缺少专辑 ID'
    return
  }
  try {
    const res = await musicSdk.wy.album.getAlbum(albumId.value)
    album.value = res.info
    list.value = deduplicationList(res.list.map((m: any) => toNewMusicInfo(m)) as LX.Music.MusicInfoOnline[])
    restoreScroll()
    message.value = list.value.length ? '' : '暂无歌曲'
  } catch (err: any) {
    message.value = err?.message || '专辑详情加载失败'
    console.log(err)
  }
}

const openArtist = (artist: { id: string | number, name: string }) => {
  void router.push({
    path: '/netease/artist',
    query: {
      id: String(artist.id),
      name: artist.name,
    },
  })
}

const handlePlayList = async(index: number) => {
  await setTempList(`wy_album_${albumId.value}`, [...list.value])
  playList(LIST_IDS.TEMP, index)
}

const handleSubAlbum = async() => {
  if (!album.value?.id) return
  await toggleWySubAlbum({
    id: album.value.id,
    name: album.value.name,
    picUrl: cover.value,
    artists: artists.value,
  })
}

onMounted(() => {
  void load()
})

watch(() => [route.query.scrollIndex, route.query.locationId], () => {
  restoreScroll()
})

watch(() => route.query.id, () => {
  void load()
})
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.container {
  height: 100%;
  display: flex;
  flex-flow: column nowrap;
  overflow: hidden;
}

.header {
  position: relative;
  flex: none;
  height: 206px;
  overflow: hidden;
  background: #222;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, rgba(0, 0, 0, .62), rgba(0, 0, 0, .32));
  }
}

.bg {
  position: absolute;
  inset: -30px;
  width: calc(100% + 60px);
  height: calc(100% + 60px);
  object-fit: cover;
  filter: blur(18px) brightness(.68);
}

.back {
  position: absolute;
  left: 16px;
  top: 14px;
  z-index: 2;
  border: 0;
  border-radius: 4px;
  padding: 7px 12px;
  background: rgba(0, 0, 0, .35);
  color: #fff;
  cursor: pointer;
}

.subBtn {
  position: absolute;
  right: 16px;
  top: 14px;
  z-index: 2;
  border: 0;
  border-radius: 4px;
  width: 42px;
  height: 34px;
  padding: 0;
  background: rgba(255, 255, 255, .18);
  color: #fff;
  cursor: pointer;

  span {
    display: block;
    margin-top: -1px;
    font-size: 22px;
    line-height: 34px;
  }

  &.liked {
    color: #e94b5f;
  }
}

.inner {
  position: relative;
  z-index: 1;
  height: 100%;
  display: flex;
  align-items: flex-start;
  gap: 20px;
  padding: 58px 28px 18px;
  color: #fff;
}

.cover {
  flex: none;
  width: 132px;
  height: 132px;
  border-radius: 8px;
  object-fit: cover;
  object-position: center;
  box-shadow: 0 8px 30px rgba(0, 0, 0, .35);
}

.meta {
  min-width: 0;

  h2 {
    margin-bottom: 10px;
    font-size: 26px;
    font-weight: 700;
    .mixin-ellipsis-1();
  }

  p {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 10px;
  }

  button {
    border: 0;
    padding: 0;
    background: transparent;
    color: rgba(255, 255, 255, .9);
    cursor: pointer;
  }

  span {
    display: block;
    color: rgba(255, 255, 255, .76);
  }

  em {
    display: block;
    max-width: 780px;
    max-height: 40px;
    margin-top: 6px;
    padding-right: 8px;
    overflow: auto;
    color: rgba(255, 255, 255, .72);
    font-size: 12px;
    line-height: 20px;
    font-style: normal;
  }
}

.list {
  position: relative;
  flex: auto;
  min-height: 0;
}
</style>
