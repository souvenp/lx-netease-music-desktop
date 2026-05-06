<template>
  <div :class="$style.container">
    <section :class="$style.hero">
      <button
        v-if="artist?.id"
        type="button"
        :class="[$style.follow, { [$style.liked]: isFollowed }]"
        :aria-label="isFollowed ? '取消关注' : '关注歌手'"
        @click="handleFollowArtist"
      >
        <span>{{ isFollowed ? '♥' : '♡' }}</span>
      </button>
      <img v-if="artistBg" :class="$style.bg" :src="artistBg" decoding="async">
      <button type="button" :class="$style.back" @click="router.back()">返回</button>
      <div :class="$style.profile">
        <img v-if="artistAvatar" :class="$style.avatar" :src="artistAvatar" decoding="async">
        <div :class="$style.info">
          <h2>
            {{ displayName }}
            <span v-if="artistAlias">{{ artistAlias }}</span>
          </h2>
          <p class="scroll">{{ artistDesc || '暂无简介' }}</p>
          <div :class="$style.stats">
            <span>{{ songTotal }} 首歌</span>
            <span>{{ albumTotal }} 张专辑</span>
          </div>
        </div>
      </div>
    </section>

    <div :class="$style.tabs">
      <div :class="$style.mainTabs">
        <button type="button" :class="{[$style.active]: tab == 'songs'}" @click="tab = 'songs'">歌曲</button>
        <button type="button" :class="{[$style.active]: tab == 'albums'}" @click="tab = 'albums'">专辑</button>
      </div>
      <div v-show="tab == 'songs'" :class="$style.songSortTabs">
        <button type="button" :class="{[$style.active]: songSort == 'hot'}" @click="handleSongSortChange('hot')">热门</button>
        <button type="button" :class="{[$style.active]: songSort == 'time'}" @click="handleSongSortChange('time')">最新</button>
      </div>
    </div>

    <div v-show="tab == 'songs'" :class="$style.panel">
      <div :class="$style.songListWrap">
        <material-online-list
          ref="onlineListRef"
          :list-id="artistSongListId"
          force-play-list
          :page="1"
          :limit="Math.max(songs.length, 1)"
          :total="songs.length"
          :list="songs"
          :no-item="songMessage"
          @play-list="handlePlayList"
        />
      </div>
    </div>

    <div v-show="tab == 'albums'" class="scroll" :class="$style.albumPanel">
      <div v-if="albumMessage" :class="$style.message">{{ albumMessage }}</div>
      <div v-else :class="$style.grid">
        <button v-for="album in albums" :key="album.id" type="button" :class="$style.card" @click="openAlbum(album)">
          <img :src="album.info.img" decoding="async" loading="lazy">
          <strong>{{ album.info.name }}</strong>
          <span>{{ album.info.author }}</span>
          <em>{{ album.count }} 首</em>
        </button>
      </div>
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
import { toggleWyFollowArtist } from '@renderer/store/user/action'
import { wyFollowedArtists } from '@renderer/store/user/state'

const route = useRoute()
const router = useRouter()
const tab = ref<'songs' | 'albums'>('songs')
const getRouteSongSort = () => route.query.sort == 'time' ? 'time' : 'hot'
const songSort = ref<'hot' | 'time'>(getRouteSongSort())
const artist = ref<any>(null)
const songs = ref<LX.Music.MusicInfoOnline[]>([])
const albums = ref<any[]>([])
const songMessage = ref('加载中...')
const albumMessage = ref('加载中...')
const onlineListRef = ref<any>(null)

const artistId = computed(() => String(route.query.id ?? ''))
const displayName = computed(() => artist.value?.info?.name ?? route.query.name ?? '网易云歌手')
const artistAvatar = computed(() => artist.value?.info?.avatar ?? artist.value?.info?.cover ?? '')
const artistBg = computed(() => artist.value?.info?.cover ?? artistAvatar.value)
const artistAlias = computed(() => artist.value?.info?.alias?.length ? artist.value.info.alias[0] : '')
const artistDesc = computed(() => artist.value?.info?.desc ?? '')
const songTotal = computed(() => artist.value?.count?.music ?? songs.value.length)
const albumTotal = computed(() => artist.value?.count?.album ?? albums.value.length)
const isFollowed = computed(() => wyFollowedArtists.some(item => String(item.id) == artistId.value))
const artistSongListId = computed(() => `wy_artist_${artistId.value}_${songSort.value}`)

const restoreScroll = () => {
  const index = route.query.scrollIndex
  if (index == null) return
  tab.value = 'songs'
  void nextTick(() => {
    onlineListRef.value?.scrollToIndex(Number(index))
  })
}

const loadSongs = async(sort = songSort.value) => {
  if (!artistId.value) return
  songMessage.value = '加载中...'
  try {
    const songRes = await musicSdk.wy.singer.getSongList(artistId.value, 1, 100, sort)
    if (sort != songSort.value) return
    songs.value = deduplicationList(songRes.list.map((m: any) => toNewMusicInfo(m)) as LX.Music.MusicInfoOnline[])
    restoreScroll()
    songMessage.value = songs.value.length ? '' : '暂无歌曲'
  } catch (err: any) {
    if (sort != songSort.value) return
    songMessage.value = err?.message || '歌手歌曲加载失败'
    songs.value = []
    console.log(err)
  }
}

const load = async() => {
  if (!artistId.value) {
    songMessage.value = '缺少歌手 ID'
    albumMessage.value = '缺少歌手 ID'
    return
  }
  try {
    const [info, albumRes] = await Promise.all([
      musicSdk.wy.singer.getInfo(artistId.value),
      musicSdk.wy.singer.getAlbumList(artistId.value, 1, 100),
    ])
    artist.value = info
    albums.value = albumRes.list
    await loadSongs()
    albumMessage.value = albums.value.length ? '' : '暂无专辑'
  } catch (err: any) {
    songMessage.value = err?.message || '歌手详情加载失败'
    albumMessage.value = err?.message || '歌手详情加载失败'
    console.log(err)
  }
}

const openAlbum = (album: any) => {
  void router.push({
    path: '/netease/album',
    query: {
      id: String(album.id),
      name: album.info.name,
    },
  })
}

const handlePlayList = async(index: number) => {
  await setTempList(artistSongListId.value, [...songs.value])
  playList(LIST_IDS.TEMP, index)
}

const handleSongSortChange = (sort: 'hot' | 'time') => {
  if (songSort.value == sort) return
  songSort.value = sort
  void loadSongs(sort)
}

const handleFollowArtist = async() => {
  if (!artist.value?.id) return
  await toggleWyFollowArtist({
    id: artist.value.id,
    name: artist.value.info?.name,
    picUrl: artistAvatar.value,
    img1v1Url: artistAvatar.value,
  })
}

onMounted(() => {
  void load()
})

watch(() => [route.query.scrollIndex, route.query.locationId, route.query.sort], () => {
  const routeSort = getRouteSongSort()
  if (routeSort != songSort.value) {
    songSort.value = routeSort
    void loadSongs(routeSort)
    return
  }
  restoreScroll()
})

watch(() => route.query.id, () => {
  songSort.value = getRouteSongSort()
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

.hero {
  position: relative;
  flex: none;
  height: 218px;
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

.follow {
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

.profile {
  position: relative;
  z-index: 1;
  height: 100%;
  display: flex;
  align-items: flex-start;
  gap: 20px;
  padding: 76px 28px 18px;
  color: #fff;
}

.avatar {
  flex: none;
  width: 112px;
  height: 112px;
  border-radius: 56px;
  object-fit: cover;
  object-position: center;
  box-shadow: 0 8px 30px rgba(0, 0, 0, .35);
}

.info {
  min-width: 0;
  max-width: 800px;

  h2 {
    margin-bottom: 10px;
    font-size: 28px;
    font-weight: 700;
    .mixin-ellipsis-1();

    span {
      margin-left: .5em;
      font-size: 16px;
      color: rgba(255, 255, 255, .78);
      font-weight: 400;
    }
  }

  p {
    max-width: 780px;
    max-height: 66px;
    padding-right: 8px;
    overflow: auto;
    font-size: 14px;
    line-height: 22px;
    color: rgba(255, 255, 255, .82);
  }
}

.stats {
  display: flex;
  gap: 18px;
  margin-top: 10px;
  font-size: 13px;
  color: rgba(255, 255, 255, .82);
}

.tabs {
  flex: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 18px;

  button {
    border: 0;
    border-bottom: 2px solid transparent;
    padding: 8px 8px 7px;
    background: transparent;
    color: var(--color-font);
    cursor: pointer;
  }
}

.mainTabs,
.songSortTabs {
  display: flex;
  gap: 10px;
}

.active {
  color: var(--color-primary-font-active) !important;
  border-bottom-color: var(--color-primary-font-active) !important;
}

.panel,
.albumPanel {
  position: relative;
  flex: auto;
  min-height: 0;
}

.panel {
  display: flex;
  flex-flow: column nowrap;
}

.songSortTabs {
  button {
    padding: 5px 8px 6px;
    font-size: 13px;
  }
}

.songListWrap {
  position: relative;
  flex: auto;
  min-height: 0;
}

.albumPanel {
  padding: 8px 18px 20px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 18px;
}

.card {
  border: 0;
  text-align: left;
  background: transparent;
  color: var(--color-font);
  cursor: pointer;

  img {
    width: 100%;
    aspect-ratio: 1 / 1;
    object-fit: cover;
    border-radius: 6px;
  }

  strong,
  span,
  em {
    display: block;
    margin-top: 7px;
    font-style: normal;
    .mixin-ellipsis-1();
  }

  span,
  em {
    color: var(--color-font-label);
    font-size: 12px;
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
