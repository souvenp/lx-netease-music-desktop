<template>
  <div :class="$style.songList">
    <!-- <transition enter-active-class="animated-fast fadeIn" leave-active-class="animated-fast fadeOut"> -->
    <div :class="$style.list">
      <div class="thead">
        <table>
          <thead>
            <tr v-if="actionButtonsVisible">
              <th class="num" style="width: 5%;">#</th>
              <th class="nobreak">{{ $t('music_name') }}</th>
              <th class="nobreak" style="width: 20%;">{{ $t('music_singer') }}</th>
              <th class="nobreak" style="width: 20%;">{{ $t('music_album') }}</th>
              <th class="nobreak" style="width: 8%;">{{ $t('music_time') }}</th>
              <th class="nobreak" style="width: 18%;">{{ $t('action') }}</th>
            </tr>
            <tr v-else>
              <th class="num" style="width: 5%;">#</th>
              <th class="nobreak">{{ $t('music_name') }}</th>
              <th class="nobreak" style="width: 24%;">{{ $t('music_singer') }}</th>
              <th class="nobreak" style="width: 27%;">{{ $t('music_album') }}</th>
              <th class="nobreak" style="width: 10%;">{{ $t('music_time') }}</th>
            </tr>
          </thead>
        </table>
      </div>
      <div :class="$style.content">
        <div v-show="!noItem" ref="dom_listContent" :class="$style.content">
          <base-virtualized-list v-if="actionButtonsVisible" ref="listRef" :list="list" key-name="id" :item-height="listItemHeight" container-class="scroll" content-class="list" @contextmenu.capture="handleListRightClick">
            <template #default="{ item, index }">
              <div
                class="list-item" :class="[{ selected: rightClickSelectedIndex == index }, { active: selectedList.includes(item) }, { [$style.playing]: playerInfo.isPlayList && playerInfo.playIndex == index }]"
                @click="handleListItemClick($event, index)" @contextmenu="handleListItemRightClick($event, index)"
              >
                <div class="list-item-cell no-select num" style="flex: 0 0 5%;" @click.stop>{{ index + 1 }}</div>
                <div class="list-item-cell auto name">
                  <div v-if="item.meta.picUrl" :class="$style.cover"><img :src="item.meta.picUrl" loading="lazy" decoding="async"></div>
                  <span class="select name" :class="$style.titleText" :aria-label="item.alias ? `${item.name} (${item.alias})` : item.name">
                    {{ item.name }}<span v-if="item.alias" :class="$style.alias">({{ item.alias }})</span>
                  </span>
                  <span v-if="item.meta._qualitys.flac24bit" class="no-select badge badge-quality-hires">{{ $t('tag__lossless_24bit') }}</span>
                  <span v-else-if="item.meta._qualitys.ape || item.meta._qualitys.flac || item.meta._qualitys.wav" class="no-select badge badge-quality-sq">{{ $t('tag__lossless') }}</span>
                  <span v-else-if="item.meta._qualitys['320k']" class="no-select badge badge-quality-hq">{{ $t('tag__high_quality') }}</span>
                  <span v-if="item.meta.fee === 1 || item.meta.fee === 4" class="no-select badge badge-vip">VIP</span>
                  <span v-if="item.source === 'wy' && item.meta.originCoverType === 2" class="no-select badge badge-cover">cover</span>
                  <span v-if="sourceTag" class="no-select badge badge-theme-tertiary">{{ item.source }}</span>
                </div>
                <div class="list-item-cell" style="flex: 0 0 20%;">
                  <template v-if="getWyArtists(item).length">
                    <template v-for="(artist, artistIndex) in getWyArtists(item)" :key="artist.id || artist.name"><span v-if="artistIndex" :class="$style.linkSep">、</span><button type="button" :class="$style.linkText" @click.stop="openWyArtist(artist)">{{ artist.name }}</button></template>
                  </template>
                  <span v-else class="select" :aria-label="item.singer">{{ item.singer }}</span>
                </div>
                <div class="list-item-cell" style="flex: 0 0 20%;">
                  <button v-if="item.source === 'wy' && item.meta.albumId" type="button" :class="$style.linkText" @click.stop="openWyAlbum(item)">{{ item.meta.albumName }}</button>
                  <span v-else class="select" :aria-label="item.meta.albumName">{{ item.meta.albumName }}</span>
                </div>
                <div class="list-item-cell" style="flex: 0 0 8%;"><span class="no-select">{{ item.interval || '--/--' }}</span></div>
                <div class="list-item-cell" style="flex: 0 0 18%; padding-left: 0; padding-right: 0;">
                  <material-list-buttons
                    :index="index"
                    :remove-btn="false"
                    :download-btn="assertApiSupport(item.source)"
                    :play-btn="checkApiSource ? assertApiSupport(item.source) : true"
                    :like-btn="item.source === 'wy'"
                    :liked="wyLikedSongIds.has(String(item.meta.songId))"
                    @btn-click="handleListBtnClick"
                  />
                </div>
              </div>
            </template>
            <template #footer>
              <div :class="$style.pagination">
                <material-pagination :count="total" :limit="limit" :page="page" @btn-click="$emit('togglePage', $event)" />
              </div>
            </template>
          </base-virtualized-list>
          <base-virtualized-list v-else ref="listRef" :list="list" key-name="id" :item-height="listItemHeight" container-class="scroll" content-class="list" @contextmenu.capture="handleListRightClick">
            <template #default="{ item, index }">
              <div
                class="list-item" :class="[{ selected: rightClickSelectedIndex == index }, { active: selectedList.includes(item) }, { [$style.playing]: playerInfo.isPlayList && playerInfo.playIndex == index }]"
                @click="handleListItemClick($event, index)" @contextmenu="handleListItemRightClick($event, index)"
              >
                <div class="list-item-cell no-select num" style="flex: 0 0 5%;" @click.stop>{{ index + 1 }}</div>
                <div class="list-item-cell auto name">
                  <div v-if="item.meta.picUrl" :class="$style.cover"><img :src="item.meta.picUrl" loading="lazy" decoding="async"></div>
                  <span class="select name" :class="$style.titleText" :aria-label="item.alias ? `${item.name} (${item.alias})` : item.name">
                    {{ item.name }}<span v-if="item.alias" :class="$style.alias">({{ item.alias }})</span>
                  </span>
                  <span v-if="item.meta._qualitys.flac24bit" class="no-select badge badge-quality-hires">{{ $t('tag__lossless_24bit') }}</span>
                  <span v-else-if="item.meta._qualitys.ape || item.meta._qualitys.flac || item.meta._qualitys.wav" class="no-select badge badge-quality-sq">{{ $t('tag__lossless') }}</span>
                  <span v-else-if="item.meta._qualitys['320k']" class="no-select badge badge-quality-hq">{{ $t('tag__high_quality') }}</span>
                  <span v-if="item.meta.fee === 1 || item.meta.fee === 4" class="no-select badge badge-vip">VIP</span>
                  <span v-if="item.source === 'wy' && item.meta.originCoverType === 2" class="no-select badge badge-cover">cover</span>
                  <span v-if="sourceTag" class="no-select badge badge-theme-tertiary">{{ item.source }}</span>
                </div>
                <div class="list-item-cell" style="flex: 0 0 24%;">
                  <template v-if="getWyArtists(item).length">
                    <template v-for="(artist, artistIndex) in getWyArtists(item)" :key="artist.id || artist.name"><span v-if="artistIndex" :class="$style.linkSep">、</span><button type="button" :class="$style.linkText" @click.stop="openWyArtist(artist)">{{ artist.name }}</button></template>
                  </template>
                  <span v-else class="select" :aria-label="item.singer">{{ item.singer }}</span>
                </div>
                <div class="list-item-cell" style="flex: 0 0 27%;">
                  <button v-if="item.source === 'wy' && item.meta.albumId" type="button" :class="$style.linkText" @click.stop="openWyAlbum(item)">{{ item.meta.albumName }}</button>
                  <span v-else class="select" :aria-label="item.meta.albumName">{{ item.meta.albumName }}</span>
                </div>
                <div class="list-item-cell" style="flex: 0 0 10%;"><span class="no-select">{{ item.interval || '--/--' }}</span></div>
              </div>
            </template>
            <template #footer>
              <div :class="$style.pagination">
                <material-pagination :count="total" :limit="limit" :page="page" @btn-click="$emit('togglePage', $event)" />
              </div>
            </template>
          </base-virtualized-list>
        </div>
        <transition enter-active-class="animated fadeIn" leave-active-class="animated fadeOut">
          <div v-show="noItem" :class="$style.noitem">
            <p v-text="noItem" />
          </div>
        </transition>
      </div>
    </div>
    <!-- </transition> -->
    <!-- <material-flow-btn :show="isShowEditBtn && assertApiSupport(source)" :remove-btn="false" @btn-click="handleFlowBtnClick" /> -->
    <!-- <common-download-modal v-model:show="isShowDownload" :music-info="selectedDownloadMusicInfo" teleport="#view" />
    <common-download-multiple-modal v-model:show="isShowDownloadMultiple" :list="selectedList" teleport="#view" @confirm="removeAllSelect" /> -->
    <common-list-add-modal v-model:show="isShowListAdd" :music-info="selectedAddMusicInfo" teleport="#view" />
    <common-list-add-multiple-modal v-model:show="isShowListAddMultiple" :music-list="selectedList" teleport="#view" @confirm="removeAllSelect" />
    <common-download-modal v-model:show="isShowDownload" :music-info="selectedDownloadMusicInfo" teleport="#view" />
    <common-download-multiple-modal v-model:show="isShowDownloadMultiple" :list="selectedList" teleport="#view" @confirm="removeAllSelect" />
    <base-menu v-model="isShowItemMenu" :menus="menus" :xy="menuLocation" item-name="name" @menu-click="handleMenuClick" />
  </div>
</template>

<script>
import { clipboardWriteText } from '@common/utils/electron'
import { assertApiSupport } from '@renderer/store/utils'
import { computed, ref } from '@common/utils/vueTools'
import { useRouter } from '@common/utils/vueRouter'
import { LIST_IDS } from '@common/constants'
import useList from './useList'
import useMenu from './useMenu'
import usePlay from './usePlay'
import useMusicDownload from './useMusicDownload'
import useMusicAdd from './useMusicAdd'
import useMusicActions from './useMusicActions'
import { tempListMeta } from '@renderer/store/list/state'
import { playInfo, playMusicInfo } from '@renderer/store/player/state'
import { wyLikedSongIds } from '@renderer/store/user/state'
import { toggleWyLike } from '@renderer/store/user/action'
import { showToast } from '@renderer/utils/showToast'
export default {
  name: 'MaterialOnlineList',
  props: {
    list: {
      type: Array,
      default() {
        return []
      },
    },
    page: {
      type: Number,
      required: true,
    },
    limit: {
      type: Number,
      required: true,
    },
    total: {
      type: Number,
      required: true,
    },
    sourceTag: {
      type: Boolean,
      default: false,
    },
    noItem: {
      type: String,
      default: '',
    },
    checkApiSource: {
      type: Boolean,
      default: false,
    },
    listId: {
      type: String,
      default: '',
    },
    forcePlayList: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['show-menu', 'play-list', 'togglePage', 'replace-list-music'],
  setup(props, { emit }) {
    const actionButtonsVisible = true
    const router = useRouter()
    const rightClickSelectedIndex = ref(-1)
    const dom_listContent = ref(null)
    const listRef = ref(null)
    const playerInfo = computed(() => ({
      isPlayList: !!props.listId && (
        playMusicInfo.listId == props.listId ||
        (playMusicInfo.listId == LIST_IDS.TEMP && tempListMeta.id == props.listId)
      ),
      playIndex: playInfo.playIndex,
    }))

    const {
      selectedList,
      listItemHeight,
      handleSelectData,
      removeAllSelect,
    } = useList({ props, listRef })

    const {
      handlePlayMusic,
      handlePlayMusicLater,
      doubleClickPlay,
    } = usePlay({ selectedList, props, removeAllSelect, emit })

    const {
      isShowListAdd,
      isShowListAddMultiple,
      selectedAddMusicInfo,
      handleShowMusicAddModal,
    } = useMusicAdd({ selectedList, props })

    const {
      isShowDownload,
      isShowDownloadMultiple,
      selectedDownloadMusicInfo,
      handleShowDownloadModal,
    } = useMusicDownload({ selectedList, props })

    const {
      handleSearch,
      handleOpenMusicDetail,
      handleDislikeMusic,
    } = useMusicActions({ props, emit })

    const {
      menus,
      menuLocation,
      isShowItemMenu,
      showMenu,
      menuClick,
    } = useMenu({
      props,
      assertApiSupport,
      emit,

      handleShowDownloadModal,
      handlePlayMusic,
      handlePlayMusicLater,
      handleSearch,
      handleShowMusicAddModal,
      handleOpenMusicDetail,
      handleDislikeMusic,
      handleToggleWyLike: (index) => {
        void handleWyLikeClick(props.list[index])
      },
    })

    const handleWyLikeClick = async(musicInfo) => {
      const liked = wyLikedSongIds.value.has(String(musicInfo.meta.songId || String(musicInfo.id).replace(/^wy_/, '')))
      await toggleWyLike(musicInfo).then(() => {
        showToast(liked ? '已取消喜欢' : '已添加到我喜欢的音乐')
      }).catch(err => {
        console.log(err)
        showToast(`喜欢歌曲失败：${err?.message || '未知错误'}`)
      })
    }
    const getWyArtists = musicInfo => {
      if (musicInfo.source !== 'wy') return []
      return musicInfo.meta.artists || []
    }
    const openWyArtist = artist => {
      if (!artist) return
      void router.push({
        path: '/netease/artist',
        query: {
          id: String(artist.id),
          name: artist.name,
        },
      })
    }
    const openWyAlbum = musicInfo => {
      if (musicInfo.source !== 'wy' || !musicInfo.meta.albumId) return
      void router.push({
        path: '/netease/album',
        query: {
          id: String(musicInfo.meta.albumId),
          name: musicInfo.meta.albumName,
        },
      })
    }

    const handleListItemClick = (event, index) => {
      if (rightClickSelectedIndex.value > -1) return
      handleSelectData(index)
      doubleClickPlay(index)
    }
    const handleListItemRightClick = (event, index) => {
      rightClickSelectedIndex.value = index
      showMenu(event, props.list[index], index)
    }
    const handleMenuClick = (action) => {
      let index = rightClickSelectedIndex.value
      rightClickSelectedIndex.value = -1
      menuClick(action, index)
    }
    const handleListRightClick = (event) => {
      if (!event.target.classList.contains('select')) return
      event.stopImmediatePropagation()
      let classList = dom_listContent.value.classList
      classList.add('copying')
      window.requestAnimationFrame(() => {
        let str = window.getSelection().toString()
        classList.remove('copying')
        str = str.split(/\n\n/).map(s => s.replace(/\n/g, '  ')).join('\n').trim()
        if (!str.length) return
        clipboardWriteText(str)
      })
    }
    const handleListBtnClick = ({ action, index }) => {
      switch (action) {
        case 'download':
          handleShowDownloadModal(index, true)
          break
        case 'play':
          void handlePlayMusic(index, true)
          break
        case 'search':
          handleSearch(index)
          break
        case 'listAdd':
          handleShowMusicAddModal(index, true)
          break
        case 'like':
          void handleWyLikeClick(props.list[index])
          break
      }
    }
    const scrollToTop = () => {
      listRef.value.scrollTo(0, true)
    }
    const scrollToIndex = (index) => {
      listRef.value?.scrollToIndex(Number(index), -150, true)
    }

    return {
      listItemHeight,
      handleListItemClick,
      selectedList,
      handleListItemRightClick,
      removeAllSelect,
      handleListBtnClick,
      rightClickSelectedIndex,
      dom_listContent,
      listRef,

      menus,
      isShowItemMenu,
      menuLocation,
      handleMenuClick,

      handleListRightClick,
      assertApiSupport,

      isShowListAdd,
      isShowListAddMultiple,
      selectedAddMusicInfo,

      isShowDownload,
      isShowDownloadMultiple,
      selectedDownloadMusicInfo,

      scrollToTop,
      scrollToIndex,
      actionButtonsVisible,
      playerInfo,
      wyLikedSongIds,
      handleWyLikeClick,
      getWyArtists,
      openWyArtist,
      openWyAlbum,
    }
  },
}
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';
.songList {
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-flow: column nowrap;
  position: relative;
}

.list {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-flow: column nowrap;
  font-size: 14px;
}

.content {
  flex: auto;
  min-height: 0;
  position: relative;
  height: 100%;
}

.pagination {
  text-align: center;
  padding: 15px 0;
  // left: 50%;
  // transform: translateX(-50%);
}
.noitem {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  display: flex;
  flex-flow: column nowrap;
  justify-content: center;
  align-items: center;
  // background-color: var(--color-000);

  p {
    font-size: 24px;
    color: var(--color-font-label);
  }
}

.cover {
  flex: none;
  width: 4.35em;
  height: 4.35em;
  margin-right: .58em;
  border-radius: 5px;
  overflow: hidden;
  background-position: center;
  background-size: cover;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.titleText {
  min-width: 0;
}

.alias {
  color: var(--color-font-label);
  margin-left: .35em;
}

.linkText {
  display: inline;
  max-width: calc(100% - 12px);
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--color-font);
  text-align: left;
  cursor: pointer;
  .mixin-ellipsis-1();

  &:hover {
    color: var(--color-primary-font-active);
  }
}

.linkSep {
  margin: 0;
  color: var(--color-font-label);
}

.playing {
  color: var(--color-primary-font-active);
  background-color: var(--color-primary-alpha-900);

  .linkText,
  .alias {
    color: var(--color-primary-font-active);
  }
}

</style>
