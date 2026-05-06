<template>
  <div :class="$style.container">
    <div :class="$style.header">
      <h2>我收藏的专辑</h2>
      <base-btn min outline @click="handleRefresh">刷新</base-btn>
    </div>
    <div v-if="message" :class="$style.message">{{ message }}</div>
    <div v-else class="scroll" :class="$style.grid">
      <button v-for="album in wySubscribedAlbums" :key="album.id" type="button" :class="$style.card" @click="openAlbum(album)">
        <img :src="album.picUrl" loading="lazy" decoding="async">
        <strong>{{ album.name }}</strong>
        <span>{{ getArtistName(album) }}</span>
        <em>{{ album.size || 0 }} 首</em>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from '@common/utils/vueTools'
import { useRouter } from '@common/utils/vueRouter'
import { appSetting } from '@renderer/store/setting'
import { initWyUser } from '@renderer/store/user/action'
import { wySubscribedAlbums, wyUserError, wyUserLoading, type WyAlbumInfo } from '@renderer/store/user/state'

const router = useRouter()
const message = computed(() => {
  if (wyUserLoading.value) return '网易云数据加载中...'
  if (!appSetting['common.wy_cookie']) return '请先在设置里填写网易云 Cookie'
  if (wyUserError.value) return wyUserError.value
  if (!wySubscribedAlbums.length) return '暂无收藏专辑'
  return ''
})

const getArtistName = (album: WyAlbumInfo) => {
  if (album.artists?.length) return album.artists.map(artist => artist.name).join(' / ')
  return album.artistName ?? ''
}

const handleRefresh = () => {
  void initWyUser(true)
}

const openAlbum = (album: WyAlbumInfo) => {
  void router.push({
    path: '/netease/album',
    query: {
      id: String(album.id),
      name: album.name,
    },
  })
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
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 18px;

  h2 {
    font-size: 16px;
    font-weight: 600;
  }
}

.grid {
  flex: auto;
  min-height: 0;
  padding: 20px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 20px;
}

.card {
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
    .mixin-ellipsis-1();
  }
}

.message {
  flex: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-font-label);
}
</style>
