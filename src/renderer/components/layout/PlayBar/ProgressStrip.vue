<template>
  <div
    :class="[$style.strip, { [$style.dragging]: isDragging, [$style.disabled]: !canSeek }]"
    @mousedown="handleMouseDown"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @mousemove="handleHoverMove"
  >
    <div ref="dom_track" :class="$style.track">
      <div
        :class="[$style.played, { [$style.transition]: isActiveTransition && !isDragging }]"
        :style="{ transform: `scaleX(${displayProgress})` }"
        @transitionend="handleTransitionEnd"
      />
      <div :class="$style.thumb" :style="{ left: `${displayProgress * 100}%` }" />
      <div v-show="showTip" :class="$style.tip" :style="{ left: `${tipProgress * 100}%` }">{{ tipTimeStr }}</div>
    </div>
  </div>
</template>

<script>
import { ref, computed, toRef, onBeforeUnmount } from '@common/utils/vueTools'
import { playProgress } from '@renderer/store/player/playProgress'
import { formatPlayTime2 } from '@common/utils/common'
import usePlayProgress from '@renderer/utils/compositions/usePlayProgress'

export default {
  name: 'PlayProgressStrip',
  setup() {
    const { isActiveTransition, handleTransitionEnd } = usePlayProgress()

    const dom_track = ref(null)
    const isDragging = ref(false)
    const isHovering = ref(false)
    const hoverProgress = ref(0)
    const dragProgress = ref(0)

    const progress = toRef(playProgress, 'progress')
    const maxPlayTime = toRef(playProgress, 'maxPlayTime')

    const canSeek = computed(() => maxPlayTime.value > 0)

    const clamp = (val) => {
      if (!val || val < 0) return 0
      return val > 1 ? 1 : val
    }

    const displayProgress = computed(() => clamp(isDragging.value ? dragProgress.value : progress.value))
    const tipProgress = computed(() => clamp(isDragging.value ? dragProgress.value : hoverProgress.value))
    const tipTimeStr = computed(() => formatPlayTime2(tipProgress.value * maxPlayTime.value))
    const showTip = computed(() => (isHovering.value || isDragging.value) && canSeek.value)

    const getProgressByEvent = (event) => {
      const el = dom_track.value
      if (!el) return 0
      const rect = el.getBoundingClientRect()
      if (!rect.width) return 0
      return clamp((event.clientX - rect.left) / rect.width)
    }

    const handleHoverMove = (event) => {
      if (isDragging.value) return
      hoverProgress.value = getProgressByEvent(event)
    }

    const handleMouseEnter = () => {
      isHovering.value = true
    }

    const handleMouseLeave = () => {
      if (isDragging.value) return
      isHovering.value = false
    }

    const handleMsMove = (event) => {
      if (!isDragging.value) return
      dragProgress.value = getProgressByEvent(event)
    }

    const handleMsUp = () => {
      if (!isDragging.value) return
      isDragging.value = false
      if (maxPlayTime.value > 0) window.app_event.setProgress(dragProgress.value * maxPlayTime.value)
    }

    const handleMouseDown = (event) => {
      if (!canSeek.value || event.button !== 0) return
      event.preventDefault()
      const val = getProgressByEvent(event)
      hoverProgress.value = val
      dragProgress.value = val
      isDragging.value = true
    }

    document.addEventListener('mousemove', handleMsMove)
    document.addEventListener('mouseup', handleMsUp)
    onBeforeUnmount(() => {
      document.removeEventListener('mousemove', handleMsMove)
      document.removeEventListener('mouseup', handleMsUp)
    })

    return {
      dom_track,
      isDragging,
      isHovering,
      canSeek,
      displayProgress,
      tipProgress,
      tipTimeStr,
      showTip,
      isActiveTransition,
      handleTransitionEnd,
      handleMouseDown,
      handleMouseEnter,
      handleMouseLeave,
      handleHoverMove,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.strip {
  position: relative;
  flex: none;
  height: 12px;
  display: flex;
  align-items: center;
  padding: 0 8px;
  z-index: 3;
  cursor: pointer;
  background-color: transparent;
  transition: background-color @transition-fast;

  &:hover {
    background-color: var(--color-primary-light-100-alpha-900);

    .track {
      height: 5px;
    }

    .thumb {
      opacity: 1;
    }
  }

  &.dragging {
    .track {
      height: 5px;
    }

    .thumb {
      opacity: 1;
    }
  }

  &.disabled {
    cursor: default;

    .played {
      opacity: .5;
    }

    .thumb {
      display: none;
    }
  }
}

.track {
  position: relative;
  width: 100%;
  height: 3px;
  border-radius: 3px;
  background-color: var(--color-primary-light-100-alpha-800);
  transition: height @transition-fast;
}

.played {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  transform-origin: 0;
  background-color: var(--color-primary);
  will-change: transform;
}

.transition {
  transition: transform .2s ease-out;
}

.thumb {
  position: absolute;
  top: 50%;
  width: 10px;
  height: 10px;
  margin-left: -5px;
  border-radius: 50%;
  background-color: var(--color-primary);
  box-shadow: 0 0 3px rgba(0, 0, 0, .3);
  transform: translateY(-50%);
  opacity: 0;
  transition: opacity @transition-fast;
  pointer-events: none;
}

.tip {
  position: absolute;
  bottom: 100%;
  margin-bottom: 6px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.2;
  white-space: nowrap;
  color: var(--color-font);
  background-color: var(--color-main-background);
  box-shadow: 0 1px 4px rgba(0, 0, 0, .2);
  transform: translateX(-50%);
  pointer-events: none;
}
</style>
