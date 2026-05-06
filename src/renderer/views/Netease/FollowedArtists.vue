<template>
  <div :class="$style.container">
    <div :class="$style.header">
      <h2>我关注的歌手</h2>
      <base-btn min outline @click="handleRefresh">刷新</base-btn>
    </div>
    <div v-if="message" :class="$style.message">{{ message }}</div>
    <div v-else class="scroll" :class="$style.grid">
      <button v-for="artist in wyFollowedArtists" :key="artist.id" type="button" :class="$style.card" @click="openArtist(artist)">
        <img :src="artist.picUrl || artist.img1v1Url" loading="lazy" decoding="async">
        <strong>{{ artist.name }}</strong>
        <span v-if="artist.alias?.length">{{ artist.alias[0] }}</span>
        <em>{{ artist.albumSize || 0 }} 张专辑</em>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from '@common/utils/vueTools'
import { useRouter } from '@common/utils/vueRouter'
import { appSetting } from '@renderer/store/setting'
import { initWyUser } from '@renderer/store/user/action'
import { wyFollowedArtists, wyUserError, wyUserLoading, type WyArtistInfo } from '@renderer/store/user/state'

const router = useRouter()
const message = computed(() => {
  if (wyUserLoading.value) return '网易云数据加载中...'
  if (!appSetting['common.wy_cookie']) return '请先在设置里填写网易云 Cookie'
  if (wyUserError.value) return wyUserError.value
  if (!wyFollowedArtists.length) return '暂无关注歌手'
  return ''
})

const handleRefresh = () => {
  void initWyUser(true)
}

const openArtist = (artist: WyArtistInfo) => {
  void router.push({
    path: '/netease/artist',
    query: {
      id: String(artist.id),
      name: artist.name,
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
  text-align: center;
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
    border-radius: 50%;
    object-fit: cover;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }

  &:hover img {
    transform: scale(1.05);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  }

  strong {
    display: block;
    margin-top: 10px;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.4;
    .mixin-ellipsis-1();
  }

  span, em {
    display: block;
    margin-top: 4px;
    color: var(--color-font-label);
    font-size: 12px;
    font-style: normal;
    .mixin-ellipsis-1();
  }

  em {
    margin-top: 2px;
    font-size: 11px;
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
