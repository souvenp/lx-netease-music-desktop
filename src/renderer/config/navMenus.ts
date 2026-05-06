import type { Message } from '@root/lang'

export interface NavMenuItem {
  id: LX.NavMenuId
  to: string
  name: string
  label: string
  icon: string
  iconSize: string
  i18nKey?: keyof Message
  alwaysVisible?: boolean
  enableKey?: keyof LX.AppSetting
}

export const NAV_MENUS: NavMenuItem[] = [
  {
    id: 'nav_search',
    to: '/search',
    name: 'Search',
    label: 'Search',
    i18nKey: 'search',
    icon: '#icon-search-2',
    iconSize: '0 0 425.2 425.2',
    alwaysVisible: true,
  },
  {
    id: 'nav_songlist',
    to: '/songList/list',
    name: 'SongList',
    label: 'Song List',
    i18nKey: 'song_list',
    icon: '#icon-album',
    iconSize: '0 0 425.2 425.2',
  },
  {
    id: 'nav_top',
    to: '/leaderboard',
    name: 'Leaderboard',
    label: 'Leaderboard',
    i18nKey: 'leaderboard',
    icon: '#icon-leaderboard',
    iconSize: '0 0 425.22 425.2',
  },
  {
    id: 'nav_love',
    to: '/list',
    name: 'List',
    label: 'My List',
    i18nKey: 'my_list',
    icon: '#icon-love',
    iconSize: '0 0 444.87 391.18',
  },
  {
    id: 'nav_daily_rec',
    to: '/netease/daily',
    name: 'NeteaseDaily',
    label: 'Daily Recs',
    i18nKey: 'nav_daily_rec',
    icon: '#icon-calendar',
    iconSize: '0 0 24 24',
  },
  {
    id: 'nav_followed_artists',
    to: '/netease/followed-artists',
    name: 'NeteaseFollowedArtists',
    label: 'Followed Artists',
    i18nKey: 'nav_followed_artists',
    icon: '#icon-artist',
    iconSize: '0 0 24 24',
  },
  {
    id: 'nav_subscribed_albums',
    to: '/netease/subscribed-albums',
    name: 'NeteaseSubscribedAlbums',
    label: 'Subscribed Albums',
    i18nKey: 'nav_subscribed_albums',
    icon: '#icon-album-disc',
    iconSize: '0 0 24 24',
  },
  {
    id: 'nav_my_playlist',
    to: '/netease/playlists',
    name: 'NeteasePlaylists',
    label: 'My Netease Playlists',
    i18nKey: 'nav_my_playlist',
    icon: '#icon-album',
    iconSize: '0 0 425.2 425.2',
  },
  {
    id: 'nav_download',
    to: '/download',
    name: 'Download',
    label: 'Download',
    i18nKey: 'download',
    icon: '#icon-download-2',
    iconSize: '0 0 425.2 425.2',
  },
  {
    id: 'nav_setting',
    to: '/setting',
    name: 'Setting',
    label: 'Setting',
    i18nKey: 'setting',
    icon: '#icon-setting',
    iconSize: '0 0 493.23 436.47',
    alwaysVisible: true,
  },
]
