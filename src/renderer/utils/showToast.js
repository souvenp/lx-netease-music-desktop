import tips from '@renderer/plugins/Tips/Tips'

let instance = null

export const showToast = (message, autoCloseTime = 1800) => {
  if (!message) return

  const position = {
    top: 52,
    left: Math.max(16, document.documentElement.clientWidth - 320),
  }

  if (instance) {
    instance.position.top = position.top
    instance.position.left = position.left
    instance.setTips(message)
    return
  }

  instance = tips({
    message,
    autoCloseTime,
    position,
  }, {
    beforeClose(closeInstance) {
      if (instance !== closeInstance) return
      instance = null
    },
  })
}
