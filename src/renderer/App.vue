<template>
  <div id="container" class="view-container">
    <div v-if="appBackgroundStyle" class="app-background" :style="appBackgroundStyle" />
    <layout-aside id="left" />
    <div id="right">
      <layout-toolbar id="toolbar" />
      <layout-view id="view" />
      <layout-play-bar id="player" />
    </div>
    <layout-icons />
    <layout-change-log-modal />
    <layout-update-modal />
    <layout-pact-modal />
    <layout-sync-mode-modal />
    <layout-sync-auth-code-modal />
    <layout-play-detail />
  </div>
</template>

<script setup>
import { computed, onMounted } from '@common/utils/vueTools'
// import BubbleCursor from '@common/utils/effects/cursor-effects/bubbleCursor'
// import '@common/utils/effects/snow.min'
import useApp from '@renderer/core/useApp'
import { appSetting } from '@renderer/store/setting'
import { musicInfo } from '@renderer/store/player/state'

useApp()

const appBackgroundStyle = computed(() => {
  const isDynamicBackground = appSetting['theme.background.dynamic'] && !!musicInfo.pic
  const url = isDynamicBackground
    ? musicInfo.pic
    : appSetting['theme.background.enable']
      ? appSetting['theme.background.image']
      : ''
  if (!url) return null

  return {
    backgroundImage: `url("${String(url).replaceAll('"', '\\"')}")`,
    filter: `blur(${appSetting['theme.background.blur']}px)`,
    opacity: isDynamicBackground
      ? Math.min(appSetting['theme.background.opacity'] / 100, 0.3)
      : appSetting['theme.background.opacity'] / 100,
  }
})

onMounted(() => {
  document.getElementById('root').style.display = 'block'

  // const styles = getComputedStyle(document.documentElement)
  // window.lxData.bubbleCursor = new BubbleCursor({
  //   fillStyle: styles.getPropertyValue('--color-primary-alpha-900'),
  //   strokeStyle: styles.getPropertyValue('--color-primary-alpha-700'),
  // })
})

// onBeforeUnmount(() => {
//   window.lxData.bubbleCursor?.destroy()
// })

</script>


<style lang="less">
@import './assets/styles/index.less';
@import './assets/styles/layout.less';

html {
  height: 100vh;
}
html, body {
  // overflow: hidden;
  box-sizing: border-box;
}

body {
  user-select: none;
  height: 100%;
}
#root {
  height: 100%;
  position: relative;
  overflow: hidden;
  color: var(--color-font);
  background: var(--background-image) var(--background-image-position) no-repeat;
  background-size: var(--background-image-size);
  transition: background-color @transition-normal;
  background-color: var(--color-content-background);
  box-sizing: border-box;
}

.disableAnimation * {
  transition: none !important;
  animation: none !important;
}

.transparent {
  background: transparent;
  padding: @shadow-app;
  // #waiting-mask {
  //   border-radius: @radius-border;
  //   left: @shadow-app;
  //   right: @shadow-app;
  //   top: @shadow-app;
  //   bottom: @shadow-app;
  // }
  #body {
    border-radius: @radius-border;
  }
  #root {
    box-shadow: 0 0 @shadow-app rgba(0, 0, 0, 0.5);
    border-radius: @radius-border;
  }
  // #container {
    // border-radius: @radius-border;
    // background-color: transparent;
  // }
}
.disableTransparent {
  background-color: var(--color-content-background);

  #body {
    border: 1Px solid var(--color-primary-light-500);
  }

  #right {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
  }

  // #view { // 偏移5px距离解决非透明模式下右侧滚动条无法拖动的问题
  //   margin-right: 5Px;
  // }
}
.fullscreen {
  background-color: var(--color-content-background);

  #right {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
  }
}

#container {
  position: relative;
  display: flex;
  height: 100%;
  background-color: var(--color-app-background);
  overflow: hidden;
}

.app-background {
  position: absolute;
  left: -6%;
  top: -6%;
  width: 112%;
  height: 112%;
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
  pointer-events: none;
  z-index: 2;
  transition: opacity @transition-normal, filter @transition-normal, background-image @transition-normal;
}

#left {
  position: relative;
  z-index: 1;
  flex: none;
  width: @width-app-left;
}
#right {
  position: relative;
  z-index: 1;
  flex: auto;
  display: flex;
  flex-flow: column nowrap;
  transition: background-color @transition-normal;
  background-color: var(--color-main-background);

  border-top-left-radius: @radius-border;
  border-bottom-left-radius: @radius-border;
  overflow: hidden;
  box-shadow: 0px 0px 4px rgba(0, 0, 0, 0.1);
}
#toolbar, #player {
  flex: none;
}
#view {
  position: relative;
  flex: auto;
  // display: flex;
  min-height: 0;
}

.view-container {
  transition: opacity @transition-normal;
}
#root.show-modal > .view-container {
  opacity: .9;
}
#view.show-modal > .view-container {
  opacity: .2;
}

</style>

