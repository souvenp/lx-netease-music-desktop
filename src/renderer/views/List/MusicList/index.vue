<template>
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
            <th class="nobreak" style="width: 23%;">{{ $t('music_singer') }}</th>
            <th class="nobreak" style="width: 26%;">{{ $t('music_album') }}</th>
            <th class="nobreak" style="width: 10%;">{{ $t('music_time') }}</th>
          </tr>
        </thead>
      </table>
    </div>
    <div v-show="list.length" ref="dom_listContent" :class="$style.content">
      <base-virtualized-list
        v-if="actionButtonsVisible" ref="listRef" v-slot="{ item, index }" :list="list" key-name="id"
        :item-height="listItemHeight" container-class="scroll" content-class="list"
        @scroll="saveListPosition" @contextmenu.capture="handleListRightClick"
      >
        <div
          class="list-item" :class="[{ [$style.active]: playerInfo.isPlayList && playerInfo.playIndex === index }, { selected: selectedIndex == index || rightClickSelectedIndex == index }, { active: selectedList.includes(item) }, { disabled: !assertApiSupport(item.source) }]"
          @click="handleListItemClick($event, index)" @contextmenu="handleListItemRightClick($event, index)"
        >
          <div class="list-item-cell no-select" :class="$style.num" style="flex: 0 0 5%;">
            <transition name="play-active">
              <div v-if="playerInfo.isPlayList && playerInfo.playIndex === index" :class="$style.playIcon">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" height="50%" viewBox="0 0 512 512" space="preserve">
                  <use xlink:href="#icon-play-outline" />
                </svg>
              </div>
              <div v-else class="num">{{ index + 1 }}</div>
            </transition>
          </div>
          <div class="list-item-cell auto name" :aria-label="item.name">
            <span class="select name" :class="$style.titleText" :aria-label="item.alias ? `${item.name} (${item.alias})` : item.name">
              {{ item.name }}<span v-if="item.alias" :class="$style.alias">({{ item.alias }})</span>
            </span>
            <span v-if="item.source != 'local' && item.meta._qualitys.flac24bit" class="no-select badge badge-quality-hires">{{ $t('tag__lossless_24bit') }}</span>
            <span v-else-if="item.source != 'local' && (item.meta._qualitys.ape || item.meta._qualitys.flac || item.meta._qualitys.wav)" class="no-select badge badge-quality-sq">{{ $t('tag__lossless') }}</span>
            <span v-else-if="item.source != 'local' && item.meta._qualitys['320k']" class="no-select badge badge-quality-hq">{{ $t('tag__high_quality') }}</span>
            <span v-if="item.source == 'wy' && (item.meta.fee === 1 || item.meta.fee === 4)" class="no-select badge badge-vip">VIP</span>
            <span v-if="item.source == 'wy' && item.meta.originCoverType === 2" class="no-select badge badge-cover">cover</span>
            <span v-if="isShowSource" class="no-select label-source">{{ item.source }}</span>
          </div>
          <div class="list-item-cell" style="flex: 0 0 20%;">
            <template v-if="getWyArtists(item).length">
              <template v-for="(artist, artistIndex) in getWyArtists(item)" :key="artist.id || artist.name"><span v-if="artistIndex" :class="$style.linkSep">、</span><button type="button" :class="$style.linkText" @click.stop="openWyArtist(artist)">{{ artist.name }}</button></template>
            </template>
            <span v-else class="select" :aria-label="item.singer">{{ item.singer }}</span>
          </div>
          <div class="list-item-cell" style="flex: 0 0 20%;"><span class="select" :aria-label="item.meta.albumName">{{ item.meta.albumName }}</span></div>
          <div class="list-item-cell" style="flex: 0 0 8%;"><span class="no-select">{{ item.interval || '--/--' }}</span></div>
          <div class="list-item-cell" style="flex: 0 0 18%; padding-left: 0; padding-right: 0;">
            <material-list-buttons :index="index" :download-btn="assertApiSupport(item.source) && item.source != 'local'" @btn-click="handleListBtnClick" />
          </div>
        </div>
      </base-virtualized-list>
      <base-virtualized-list
        v-else ref="listRef" v-slot="{ item, index }" :list="list" key-name="id"
        :item-height="listItemHeight" container-class="scroll" content-class="list"
        @scroll="saveListPosition" @contextmenu.capture="handleListRightClick"
      >
        <div
          class="list-item"
          :class="[{ [$style.active]: playerInfo.isPlayList && playerInfo.playIndex === index }, { selected: selectedIndex == index || rightClickSelectedIndex == index }, { active: selectedList.includes(item) }, { disabled: !assertApiSupport(item.source) }]"
          @click="handleListItemClick($event, index)" @contextmenu="handleListItemRightClick($event, index)"
        >
          <div class="list-item-cell no-select" :class="$style.num" style="flex: 0 0 5%;">
            <transition name="play-active">
              <div v-if="playerInfo.isPlayList && playerInfo.playIndex === index" :class="$style.playIcon">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" height="50%" viewBox="0 0 512 512" space="preserve">
                  <use xlink:href="#icon-play-outline" />
                </svg>
              </div>
              <div v-else class="num">{{ index + 1 }}</div>
            </transition>
          </div>
          <div class="list-item-cell auto name">
            <span class="select name" :class="$style.titleText" :aria-label="item.alias ? `${item.name} (${item.alias})` : item.name">
              {{ item.name }}<span v-if="item.alias" :class="$style.alias">({{ item.alias }})</span>
            </span>
            <span v-if="item.source != 'local' && item.meta._qualitys.flac24bit" class="no-select badge badge-quality-hires">{{ $t('tag__lossless_24bit') }}</span>
            <span v-else-if="item.source != 'local' && (item.meta._qualitys.ape || item.meta._qualitys.flac || item.meta._qualitys.wav)" class="no-select badge badge-quality-sq">{{ $t('tag__lossless') }}</span>
            <span v-else-if="item.source != 'local' && item.meta._qualitys['320k']" class="no-select badge badge-quality-hq">{{ $t('tag__high_quality') }}</span>
            <span v-if="item.source == 'wy' && (item.meta.fee === 1 || item.meta.fee === 4)" class="no-select badge badge-vip">VIP</span>
            <span v-if="item.source == 'wy' && item.meta.originCoverType === 2" class="no-select badge badge-cover">cover</span>
            <span v-if="isShowSource" class="no-select label-source">{{ item.source }}</span>
          </div>
          <div class="list-item-cell" style="flex: 0 0 23%;">
            <template v-if="getWyArtists(item).length">
              <template v-for="(artist, artistIndex) in getWyArtists(item)" :key="artist.id || artist.name"><span v-if="artistIndex" :class="$style.linkSep">、</span><button type="button" :class="$style.linkText" @click.stop="openWyArtist(artist)">{{ artist.name }}</button></template>
            </template>
            <span v-else class="select" :aria-label="item.singer">{{ item.singer }}</span>
          </div>
          <div class="list-item-cell" style="flex: 0 0 26%;"><span class="select" :aria-label="item.meta.albumName">{{ item.meta.albumName }}</span></div>
          <div class="list-item-cell" style="flex: 0 0 10%;"><span class="no-select">{{ item.interval || '--/--' }}</span></div>
        </div>
      </base-virtualized-list>
    </div>
    <div v-show="!list.length" :class="$style.noItem">
      <p v-text="$t('no_item')" />
    </div>
    <common-list-add-modal
      v-model:show="isShowListAdd" :is-move="isMove" :from-list-id="listId"
      :music-info="selectedAddMusicInfo" :exclude-list-id="excludeListIds" teleport="#view"
    />
    <common-list-add-multiple-modal
      v-model:show="isShowListAddMultiple" :from-list-id="listId"
      :is-move="isMoveMultiple" :music-list="selectedList" :exclude-list-id="excludeListIds" teleport="#view" @confirm="removeAllSelect"
    />
    <common-download-modal v-model:show="isShowDownload" :music-info="selectedDownloadMusicInfo" teleport="#view" :list-id="listId" />
    <common-download-multiple-modal v-model:show="isShowDownloadMultiple" :list="selectedList" teleport="#view" :list-id="listId" @confirm="removeAllSelect" />
    <search-list :list="list" :visible="isShowSearchBar" @action="handleMusicSearchAction" />
    <music-sort-modal v-model:show="isShowMusicSortModal" :music-info="selectedSortMusicInfo" :selected-num="selectedNum" @confirm="sortMusic" />
    <music-toggle-modal v-model:show="isShowMusicToggleModal" :music-info="selectedToggleMusicInfo" @toggle="toggleSource" />
    <base-menu v-model="isShowItemMenu" :menus="menus" :xy="menuLocation" item-name="name" @menu-click="handleMenuClick" />
  </div>
</template>

<script>
import { clipboardWriteText } from '@common/utils/electron'
import { assertApiSupport } from '@renderer/store/utils'
import SearchList from './components/SearchList.vue'
import MusicSortModal from './components/MusicSortModal.vue'
import MusicToggleModal from './components/MusicToggleModal.vue'
import useListInfo from './useListInfo'
import useList from './useList'
import useMenu from './useMenu'
import usePlay from './usePlay'
import useMusicDownload from './useMusicDownload'
import useMusicAdd from './useMusicAdd'
import useSort from './useSort'
import useMusicActions from './useMusicActions'
import useSearch from './useSearch'
import useListScroll from './useListScroll'
import useMusicToggle from './useMusicToggle'
import { useRouter } from '@common/utils/vueRouter'
export default {
  name: 'MusicList',
  components: {
    SearchList,
    MusicSortModal,
    MusicToggleModal,
  },
  props: {
    listId: {
      type: String,
      required: true,
    },
  },
  emits: ['show-menu'],
  setup(props, { emit }) {
    const router = useRouter()
    const actionButtonsVisible = true

    let scrollIndex = null
    let isAnimation = false
    const handleRestoreScroll = (_scrollIndex, _isAnimation) => {
      scrollIndex = _scrollIndex
      isAnimation = _isAnimation
      if (isAnimation) void restoreScroll(scrollIndex, isAnimation)
      // console.log('handleRestoreScroll', scrollIndex, isAnimation)
    }
    const onLoadedList = () => {
      // console.log('restoreScroll', scrollIndex, isAnimation)
      void restoreScroll(scrollIndex, isAnimation)
    }

    const {
      rightClickSelectedIndex,
      selectedIndex,
      dom_listContent,
      listRef,
      list,
      playerInfo,
      setSelectedIndex,
      isShowSource,
      excludeListIds,
    } = useListInfo({ props, onLoadedList })

    const {
      selectedList,
      listItemHeight,
      handleSelectData,
      removeAllSelect,
    } = useList({ listRef, list })

    const {
      handlePlayMusic,
      handlePlayMusicLater,
      doubleClickPlay,
    } = usePlay({ props, selectedList, list, removeAllSelect })

    const {
      isShowListAdd,
      isMove,
      isShowListAddMultiple,
      isMoveMultiple,
      selectedAddMusicInfo,
      handleShowMusicAddModal,
      handleShowMusicMoveModal,
    } = useMusicAdd({ selectedList, list })

    const {
      isShowDownload,
      isShowDownloadMultiple,
      selectedDownloadMusicInfo,
      handleShowDownloadModal,
    } = useMusicDownload({ selectedList, list })

    const {
      isShowMusicSortModal,
      selectedNum,
      selectedSortMusicInfo,
      handleShowSortModal,
      sortMusic,
    } = useSort({ props, list, selectedList, removeAllSelect })

    const {
      handleShowMusicToggleModal,
      isShowMusicToggleModal,
      selectedToggleMusicInfo,
      toggleSource,
    } = useMusicToggle(props, list)

    const {
      handleSearch,
      handleOpenMusicDetail,
      handleCopyName,
      handleDislikeMusic,
      handleRemoveMusic,
    } = useMusicActions({ props, list, removeAllSelect, selectedList })

    const {
      menus,
      menuLocation,
      isShowItemMenu,
      showMenu,
      menuClick,
    } = useMenu({
      assertApiSupport,
      emit,

      handleShowDownloadModal,
      handlePlayMusic,
      handlePlayMusicLater,
      handleShowMusicToggleModal,
      handleSearch,
      handleShowMusicAddModal,
      handleShowMusicMoveModal,
      handleShowSortModal,
      handleOpenMusicDetail,
      handleCopyName,
      handleDislikeMusic,
      handleRemoveMusic,
    })

    const {
      isShowSearchBar,
      searchList,
      handleMusicSearchAction,
    } = useSearch({
      setSelectedIndex,
      handlePlayMusic,
      listRef,
    })

    const { saveListPosition, restoreScroll } = useListScroll({ props, listRef, list, handleRestoreScroll })


    const handleListItemClick = (event, index) => {
      if (rightClickSelectedIndex.value > -1) return
      handleSelectData(index)
      doubleClickPlay(index)
    }
    const handleListItemRightClick = (event, index) => {
      rightClickSelectedIndex.value = index
      showMenu(event, list.value[index], index)
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
          handlePlayMusic(index, true)
          break
        case 'search':
          handleSearch(index)
          break
        case 'listAdd':
          handleShowMusicAddModal(index, true)
          break
      }
    }
    const scrollToTop = () => {
      listRef.value.scrollTo(0, true)
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

    return {
      listItemHeight,
      handleListItemClick,
      selectedList,
      handleListItemRightClick,
      removeAllSelect,
      handleListBtnClick,
      rightClickSelectedIndex,
      selectedIndex,
      dom_listContent,
      listRef,
      excludeListIds,

      menus,
      isShowItemMenu,
      menuLocation,
      handleMenuClick,

      handleListRightClick,
      assertApiSupport,

      isShowListAdd,
      isMove,
      isShowListAddMultiple,
      isMoveMultiple,
      selectedAddMusicInfo,

      isShowMusicSortModal,
      selectedNum,
      selectedSortMusicInfo,
      sortMusic,

      isShowDownload,
      isShowDownloadMultiple,
      selectedDownloadMusicInfo,

      scrollToTop,
      getWyArtists,
      openWyArtist,

      isShowSearchBar,
      searchList,
      handleMusicSearchAction,

      list,
      playerInfo,

      saveListPosition,
      isShowSource,
      handleRestoreScroll,

      actionButtonsVisible,

      isShowMusicToggleModal,
      selectedToggleMusicInfo,
      toggleSource,
    }
  },
}
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.list {
  overflow: hidden;
  height: 100%;
  flex: auto;
  display: flex;
  flex-flow: column nowrap;

  :global(.list-item) {
    &.active {
      color: var(--color-button-font);
    }
  }
  :global {
    .label-source {
      color: var(--color-primary);
      padding: 5px;
      font-size: .8em;
      line-height: 1.2;
      opacity: .75;
      display: inline-block;
    }
  }
}
.num {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.titleText {
  min-width: 0;
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
  font-size: inherit;
  .mixin-ellipsis-1();

  &:hover {
    color: var(--color-primary-font-active);
  }
}

.linkSep {
  margin: 0;
  color: var(--color-font-label);
}
.alias {
  color: var(--color-font-label);
  margin-left: .35em;
}
.playIcon {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  color: var(--color-button-font);
  opacity: .7;
}
.content {
  min-height: 0;
  font-size: 14px;
  display: flex;
  flex-flow: column nowrap;
  flex: auto;
}

.noItem {
  position: relative;
  height: 100%;
  display: flex;
  flex-flow: column nowrap;
  justify-content: center;
  align-items: center;

  p {
    font-size: 24px;
    color: var(--color-font-label);
  }
}

</style>
