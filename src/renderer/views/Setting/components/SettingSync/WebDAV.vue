<template lang="pug">
dd
  h3 {{ $t('setting__sync_webdav') }}
  div
    .p
      base-checkbox(id="setting_sync_webdav_enable" :model-value="appSetting['sync.webdav.enable']" :label="$t('setting__sync_webdav_enable')" @update:model-value="updateSetting({ 'sync.webdav.enable': $event })")
    .p
      base-checkbox.gap-left(id="setting_sync_webdav_sync_lists" :disabled="!appSetting['sync.webdav.enable']" :model-value="appSetting['sync.webdav.syncLists']" :label="$t('setting__sync_webdav_sync_lists')" @update:model-value="updateSetting({ 'sync.webdav.syncLists': $event })")

    .p.gap-top(:class="{ [$style.disabled]: !appSetting['sync.webdav.enable'] }")
      .p.small {{ $t('setting__sync_webdav_url') }}
      div
        base-input.gap-left(:class="$style.input" :disabled="!appSetting['sync.webdav.enable']" :model-value="appSetting['sync.webdav.url']" placeholder="https://example.com/webdav" @update:model-value="setWebDAVSetting('sync.webdav.url', $event)")

    .p(:class="{ [$style.disabled]: !appSetting['sync.webdav.enable'] }")
      .p.small {{ $t('setting__sync_webdav_username') }}
      div
        base-input.gap-left(:class="$style.input" :disabled="!appSetting['sync.webdav.enable']" :model-value="appSetting['sync.webdav.username']" :placeholder="$t('setting__sync_webdav_username_tip')" @update:model-value="setWebDAVSetting('sync.webdav.username', $event)")

    .p(:class="{ [$style.disabled]: !appSetting['sync.webdav.enable'] }")
      .p.small {{ $t('setting__sync_webdav_password') }}
      div
        base-input.gap-left(:class="$style.input" :disabled="!appSetting['sync.webdav.enable']" type="password" :model-value="appSetting['sync.webdav.password']" :placeholder="$t('setting__sync_webdav_password_tip')" @update:model-value="setWebDAVSetting('sync.webdav.password', $event)")

    .p(:class="{ [$style.disabled]: !appSetting['sync.webdav.enable'] }")
      .p.small {{ $t('setting__sync_webdav_path') }}
      div
        base-input.gap-left(:class="$style.input" :disabled="!appSetting['sync.webdav.enable']" :model-value="appSetting['sync.webdav.path']" placeholder="/LX_Music/" @update:model-value="setWebDAVSetting('sync.webdav.path', $event)")

    .p.gap-top
      base-btn.btn(min :disabled="!appSetting['sync.webdav.enable'] || isTesting" @click="handleTestConnection") {{ isTesting ? $t('setting__sync_webdav_testing') : $t('setting__sync_webdav_test') }}
      base-btn.btn(min :disabled="!appSetting['sync.webdav.enable'] || isSyncing" @click="handleSyncLists") {{ isSyncing ? $t('setting__sync_webdav_syncing') : $t('setting__sync_webdav_sync_now') }}

    .p
      base-btn.btn(min :disabled="!appSetting['sync.webdav.enable'] || isUploadingLists" @click="handleUploadLists") {{ isUploadingLists ? $t('setting__sync_webdav_uploading') : $t('setting__sync_webdav_upload_lists') }}
      base-btn.btn(min :disabled="!appSetting['sync.webdav.enable'] || isDownloadingLists" @click="handleDownloadLists") {{ isDownloadingLists ? $t('setting__sync_webdav_downloading') : $t('setting__sync_webdav_download_lists') }}

    .p
      base-btn.btn(min :disabled="!appSetting['sync.webdav.enable'] || isUploadingSettings" @click="handleUploadSettings") {{ isUploadingSettings ? $t('setting__sync_webdav_uploading') : $t('setting__sync_webdav_upload_settings') }}
      base-btn.btn(min :disabled="!appSetting['sync.webdav.enable'] || isDownloadingSettings" @click="handleDownloadSettings") {{ isDownloadingSettings ? $t('setting__sync_webdav_downloading') : $t('setting__sync_webdav_download_settings') }}

    .p.small {{ $t('setting__sync_webdav_last_sync', { time: lastSyncTimeListsStr }) }}
</template>

<script>
import { computed, ref } from '@common/utils/vueTools'
import { dateFormat } from '@common/utils/common'
import { appSetting, updateSetting } from '@renderer/store/setting'
import { getUserApiList, sendSyncAction } from '@renderer/utils/ipc'
import { showToast } from '@renderer/utils/showToast'
import { dialog } from '@renderer/plugins/Dialog'
import { userApi } from '@renderer/store'

export default {
  name: 'SettingSyncWebDAV',
  setup() {
    const isTesting = ref(false)
    const isSyncing = ref(false)
    const isUploadingLists = ref(false)
    const isDownloadingLists = ref(false)
    const isUploadingSettings = ref(false)
    const isDownloadingSettings = ref(false)

    const lastSyncTimeListsStr = computed(() => {
      return appSetting['sync.webdav.lastSyncTimeLists']
        ? dateFormat(appSetting['sync.webdav.lastSyncTimeLists'])
        : window.i18n.t('setting__sync_webdav_never')
    })

    const setWebDAVSetting = (key, value) => {
      updateSetting({ [key]: value.trim() })
    }

    const runAction = async(action, loadingRef, successText) => {
      if (loadingRef.value) return
      loadingRef.value = true
      try {
        await sendSyncAction({ action })
        if (action == 'webdav_download_settings_apis') userApi.list = await getUserApiList()
        showToast(successText)
      } catch (err) {
        showToast(`${window.i18n.t('setting__sync_webdav_failed')}: ${err?.message || err}`, 4000)
      } finally {
        loadingRef.value = false
      }
    }

    const confirmAction = async(message, action, loadingRef, successText) => {
      const confirm = await dialog.confirm({
        message,
        confirmButtonText: window.i18n.t('confirm_button_text'),
      })
      if (!confirm) return
      await runAction(action, loadingRef, successText)
    }

    return {
      appSetting,
      updateSetting,
      isTesting,
      isSyncing,
      isUploadingLists,
      isDownloadingLists,
      isUploadingSettings,
      isDownloadingSettings,
      lastSyncTimeListsStr,
      setWebDAVSetting,
      handleTestConnection() {
        void runAction('webdav_test_connection', isTesting, window.i18n.t('setting__sync_webdav_test_success'))
      },
      handleSyncLists() {
        void runAction('webdav_sync_lists', isSyncing, window.i18n.t('setting__sync_webdav_sync_success'))
      },
      handleUploadLists() {
        void confirmAction(window.i18n.t('setting__sync_webdav_upload_lists_confirm'), 'webdav_upload_lists', isUploadingLists, window.i18n.t('setting__sync_webdav_upload_success'))
      },
      handleDownloadLists() {
        void confirmAction(window.i18n.t('setting__sync_webdav_download_lists_confirm'), 'webdav_download_lists', isDownloadingLists, window.i18n.t('setting__sync_webdav_download_success'))
      },
      handleUploadSettings() {
        void confirmAction(window.i18n.t('setting__sync_webdav_upload_settings_confirm'), 'webdav_upload_settings_apis', isUploadingSettings, window.i18n.t('setting__sync_webdav_upload_success'))
      },
      handleDownloadSettings() {
        void confirmAction(window.i18n.t('setting__sync_webdav_download_settings_confirm'), 'webdav_download_settings_apis', isDownloadingSettings, window.i18n.t('setting__sync_webdav_download_success'))
      },
    }
  },
}
</script>

<style lang="less" module>
.input {
  min-width: 380px;
}

.disabled {
  opacity: .65;
}
</style>
