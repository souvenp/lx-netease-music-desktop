<template>
  <div ref="dom_menu" :class="$style.menu">
    <ul :class="$style.list" role="toolbar">
      <li v-for="item in menus" :key="item.to" :class="$style.navItem" role="presentation">
        <router-link :class="[$style.link, {[$style.active]: $route.meta.name == item.name}]" role="tab" :aria-selected="$route.meta.name == item.name" :to="item.to" :aria-label="item.tips">
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" :viewBox="item.iconSize" :height="item.size" :width="item.size" space="preserve">
            <use :xlink:href="item.icon" />
          </svg>
          <span v-if="item.badge" :class="$style.badge">{{ item.badge }}</span>
        </router-link>
      </li>
    </ul>
  </div>
</template>

<script lang="ts">
import { appSetting } from '@renderer/store/setting'
import { useI18n } from '@root/lang'
import { ref, computed } from '@common/utils/vueTools'
import { useIconSize } from '@renderer/utils/compositions/useIconSize'
import { NAV_MENUS } from '@renderer/config/navMenus'
import { downloadList } from '@renderer/store/download/state'
import { getDownloadList } from '@renderer/store/download/action'
import { DOWNLOAD_STATUS } from '@common/constants'

export default {
  name: 'NavBar',
  setup() {
    const t = useI18n()
    const dom_menu = ref<HTMLElement>()
    const iconSize = useIconSize(dom_menu, 0.32)
    void getDownloadList()
    const activeDownloadTaskCount = computed(() => {
      return downloadList.filter(item => {
        switch (item.status) {
          case DOWNLOAD_STATUS.RUN:
          case DOWNLOAD_STATUS.WAITING:
          case DOWNLOAD_STATUS.PAUSE:
            return !item.isComplate
          default:
            return false
        }
      }).length
    })

    const menus = computed(() => {
      const size = iconSize.value
      const navStatus = appSetting['common.navStatus'] ?? {}

      return NAV_MENUS.map(menu => ({
        ...menu,
        tips: menu.i18nKey ? t(menu.i18nKey) : menu.label,
        size,
        badge: menu.id == 'nav_download' && activeDownloadTaskCount.value
          ? String(Math.min(activeDownloadTaskCount.value, 99))
          : '',
        enable: ((menu.alwaysVisible ?? false) || (navStatus[menu.id] ?? true)) &&
          (menu.enableKey == null ? true : Boolean(appSetting[menu.enableKey])),
      })).filter(menu => menu.enable)
    })

    return {
      appSetting,
      menus,
      dom_menu,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.menu {
  flex: auto;
}

.list {
  -webkit-app-region: no-drag;

  &:last-child {
    margin-bottom: 0;
  }
}

.navItem {
  position: relative;

  &:before {
    content: '';
    display: block;
    width: 100%;
    padding-bottom: 84%;
  }
}

.link {
  position: absolute;
  left: 0%;
  top: 0%;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  transition: @transition-fast;
  transition-property: background-color, opacity;
  color: var(--color-nav-font);
  cursor: pointer;
  text-align: center;
  outline: none;
  display: flex;
  align-items: center;
  justify-content: center;
  .mixin-ellipsis-1();

  &:before {
    .mixin-after();
    left: 0;
    top: 0;
    width: 3px;
    height: 100%;
    background-color: var(--color-primary-dark-200-alpha-700);
    border-radius: 4px;
    transform: translateX(-100%);
    transition: transform @transition-fast;
  }

  &.active {
    background-color: var(--color-primary-light-300-alpha-700);

    &:before {
      transform: translateX(0);
    }

    &:hover {
      background-color: var(--color-primary-light-300-alpha-800);
    }
  }

  &:hover {
    color: var(--color-nav-font);

    &:not(.active) {
      opacity: .8;
      background-color: var(--color-primary-light-400-alpha-700);
    }
  }

  &:active:not(.active) {
    opacity: .6;
    background-color: var(--color-primary-light-300-alpha-600);
  }
}

.badge {
  position: absolute;
  top: 16%;
  right: 16%;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  box-sizing: border-box;
  border-radius: 8px;
  background-color: #e94b5f;
  color: #fff;
  font-size: 10px;
  line-height: 16px;
  font-weight: 700;
  text-align: center;
  box-shadow: 0 0 0 2px var(--color-main-background);
}
</style>
