<template>
  <div :class="$style.container">
    <div v-show="!noItemLabel" class="scroll" :class="$style.content">
      <div :class="$style.grid">
        <button
          v-for="item in list"
          :key="item.id"
          type="button"
          :class="$style.card"
          @click="openDetail(item)"
        >
          <img :class="{ [$style.artistPic]: type == 'singer' }" :src="item.picUrl" loading="lazy" decoding="async">
          <strong>{{ item.name }}</strong>
          <span v-if="type == 'singer' && item.alias?.length">{{ item.alias.join(' / ') }}</span>
          <span v-else-if="type == 'singer'">{{ formatSingerStats(item) }}</span>
          <span v-else>{{ item.artistName }}</span>
          <em v-if="type == 'album'">{{ formatAlbumInfo(item) }}</em>
        </button>
      </div>
      <div :class="$style.pagination">
        <material-pagination :count="total" :limit="limit" :page="pageInfo" @btn-click="togglePage" />
      </div>
    </div>
    <transition enter-active-class="animated fadeIn" leave-active-class="animated fadeOut">
      <div v-show="noItemLabel" :class="$style.noitem">
        <p v-text="noItemLabel" />
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from '@common/utils/vueTools'
import { searchText } from '@renderer/store/search/state'
import { useRoute, useRouter } from '@common/utils/vueRouter'
import musicSdk from '@renderer/utils/musicSdk'

type ResultType = 'singer' | 'album'

const props = defineProps<{
  type: ResultType
  page: number
}>()

const router = useRouter()
const route = useRoute()
const list = ref<any[]>([])
const total = ref(0)
const limit = ref(20)
const pageInfo = ref(1)
const noItemLabel = ref('')
const key = ref('')

const load = async(text: string, type: ResultType, page: number) => {
  if (!text) {
    list.value = []
    total.value = 0
    pageInfo.value = 1
    noItemLabel.value = ''
    key.value = ''
    return
  }
  const nextKey = `${type}__${page}__${text}`
  if (key.value == nextKey && list.value.length) return
  key.value = nextKey
  noItemLabel.value = window.i18n.t('list__loading')
  try {
    const result = type == 'singer'
      ? await musicSdk.wy.musicSearch.searchSinger(text, page)
      : await musicSdk.wy.musicSearch.searchAlbum(text, page)
    if (key.value != nextKey) return
    list.value = result.list
    total.value = result.total
    limit.value = result.limit
    pageInfo.value = page
    noItemLabel.value = text && !result.list.length && page == 1 ? window.i18n.t('no_item') : ''
  } catch (err) {
    if (key.value != nextKey) return
    list.value = []
    total.value = 0
    noItemLabel.value = window.i18n.t('list__load_failed')
    console.log(err)
  }
}

watch(() => [props.type, props.page, searchText.value], ([type, page, text]) => {
  setTimeout(() => {
    void load(String(text), type as ResultType, Number(page) || 1)
  })
}, {
  immediate: true,
})

const togglePage = (page: number) => {
  void router.replace({
    path: route.path,
    query: {
      ...route.query,
      page,
    },
  })
}

const openDetail = (item: any) => {
  if (props.type == 'singer') {
    void router.push({
      path: '/netease/artist',
      query: {
        id: String(item.id),
        name: item.name,
      },
    })
    return
  }
  void router.push({
    path: '/netease/album',
    query: {
      id: String(item.id),
      name: item.name,
    },
  })
}

const formatSingerStats = (item: any) => {
  const parts = []
  if (item.musicSize != null) parts.push(`${item.musicSize} 首歌`)
  if (item.albumSize != null) parts.push(`${item.albumSize} 张专辑`)
  return parts.join(' / ') || '网易云歌手'
}

const formatAlbumInfo = (item: any) => {
  const parts = []
  if (item.size != null) parts.push(`${item.size} 首`)
  if (item.publishTime) parts.push(new Date(item.publishTime).toLocaleDateString())
  return parts.join(' / ')
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.container {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.content {
  height: 100%;
  padding: 15px 18px 0;
  box-sizing: border-box;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 20px;
}

.card {
  min-width: 0;
  border: 0;
  padding: 12px;
  background: transparent;
  border-radius: 8px;
  color: var(--color-font);
  text-align: left;
  cursor: pointer;
  transition: background @transition-normal, transform @transition-normal;

  &:hover {
    background: rgba(128, 128, 128, .08);
    transform: translateY(-2px);
  }

  img {
    width: 100%;
    aspect-ratio: 1 / 1;
    border-radius: 8px;
    object-fit: cover;
    background: var(--color-primary-alpha-900);
  }

  .artistPic {
    border-radius: 50%;
  }

  strong,
  span,
  em {
    display: block;
    min-width: 0;
    font-style: normal;
    .mixin-ellipsis-1();
  }

  strong {
    margin-top: 10px;
    font-size: 13px;
    font-weight: 600;
  }

  span,
  em {
    margin-top: 5px;
    color: var(--color-font-label);
    font-size: 12px;
  }
}

.pagination {
  text-align: center;
  padding: 15px 0;
}

.noitem {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;

  p {
    font-size: 24px;
    color: var(--color-font-label);
  }
}
</style>
