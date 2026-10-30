import { computed, watch, ref, onBeforeUnmount, type Ref } from '@common/utils/vueTools'
import { isFullscreen } from '@renderer/store'
import { appSetting } from '@renderer/store/setting'
import { getFontSizeWithScreen } from '@renderer/utils'

const useKeyEvent = ({ handleSelectAllData, listRef }: {
  handleSelectAllData: () => void
  listRef: Ref<any>
}) => {
  const keyEvent = {
    isShiftDown: false,
    isModDown: false,
  }

  const handle_key_shift_down = () => {
    keyEvent.isShiftDown ||= true
  }
  const handle_key_shift_up = () => {
    keyEvent.isShiftDown &&= false
  }
  const handle_key_mod_down = () => {
    keyEvent.isModDown ||= true
  }
  const handle_key_mod_up = () => {
    keyEvent.isModDown &&= false
  }
  const handle_key_mod_a_down = ({ event }: LX.KeyDownEevent) => {
    if (!event || (event.target as HTMLElement).tagName == 'INPUT' || document.activeElement != listRef.value?.$el) return
    event.preventDefault()
    if (event.repeat) return
    keyEvent.isModDown = false
    handleSelectAllData()
  }

  onBeforeUnmount(() => {
    window.key_event.off('key_shift_down', handle_key_shift_down)
    window.key_event.off('key_shift_up', handle_key_shift_up)
    window.key_event.off('key_mod_down', handle_key_mod_down)
    window.key_event.off('key_mod_up', handle_key_mod_up)
    window.key_event.off('key_mod+a_down', handle_key_mod_a_down)
  })
  window.key_event.on('key_shift_down', handle_key_shift_down)
  window.key_event.on('key_shift_up', handle_key_shift_up)
  window.key_event.on('key_mod_down', handle_key_mod_down)
  window.key_event.on('key_mod_up', handle_key_mod_up)
  window.key_event.on('key_mod+a_down', handle_key_mod_a_down)

  return keyEvent
}


export default ({ props, listRef }: {
  props: {
    list: LX.Music.MusicInfoOnline[]
  }
  listRef: Ref<any>
}) => {
  const selectedList = ref<LX.Music.MusicInfoOnline[]>([])
  let lastSelectIndex = -1
  const listItemHeight = computed(() => {
    return Math.ceil((isFullscreen.value ? getFontSizeWithScreen() : appSetting['common.fontSize']) * 4.75)
  })

  const removeAllSelect = () => {
    selectedList.value = []
  }
  const handleSelectAllData = () => {
    removeAllSelect()
    selectedList.value = [...props.list]
  }
  const keyEvent = useKeyEvent({ handleSelectAllData, listRef })

  const handleSelectData = (clickIndex: number) => {
    const item = props.list[clickIndex]
    if (item == null) return

    if (keyEvent.isShiftDown) {
      // Shift + 点击：以上一次单击的歌曲为锚点做区间多选
      if (lastSelectIndex < 0 || lastSelectIndex >= props.list.length) {
        selectedList.value = [item]
        lastSelectIndex = clickIndex
        return
      }
      let startIndex = lastSelectIndex
      let endIndex = clickIndex
      let isNeedReverse = false
      if (endIndex < startIndex) {
        const temp = startIndex
        startIndex = endIndex
        endIndex = temp
        isNeedReverse = true
      }
      selectedList.value = props.list.slice(startIndex, endIndex + 1)
      if (isNeedReverse) selectedList.value.reverse()
    } else if (keyEvent.isModDown) {
      // Ctrl / Cmd + 点击：切换单曲的选中状态
      lastSelectIndex = clickIndex
      const index = selectedList.value.indexOf(item)
      if (index < 0) {
        selectedList.value.push(item)
      } else {
        selectedList.value.splice(index, 1)
      }
    } else {
      // 普通单击：选中该歌曲，并作为后续 Shift 多选的锚点
      selectedList.value = [item]
      lastSelectIndex = clickIndex
    }
  }

  watch(() => props.list, () => {
    removeAllSelect()
    lastSelectIndex = -1
  })

  return {
    selectedList,
    listItemHeight,
    removeAllSelect,
    handleSelectData,
  }
}
