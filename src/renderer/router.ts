/* eslint-disable @typescript-eslint/no-var-requires */
// import Vue from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'


const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/search',
      name: 'Search',
      component: require('./views/Search/index.vue').default,
      meta: {
        name: 'Search',
      },
    },
    {
      path: '/songList/list',
      name: 'SongList',
      component: require('./views/songList/List/index.vue').default,
      meta: {
        name: 'SongList',
      },
    },
    {
      path: '/songList/detail',
      name: 'SongListDetail',
      component: require('./views/songList/Detail/index.vue').default,
      meta: {
        name: 'SongList',
      },
    },
    {
      path: '/leaderboard',
      name: 'Leaderboard',
      component: require('./views/Leaderboard/index.vue').default,
      meta: {
        name: 'Leaderboard',
      },
    },
    {
      path: '/netease/playlists',
      name: 'NeteasePlaylists',
      component: require('./views/Netease/MyPlaylists.vue').default,
      meta: {
        name: 'NeteasePlaylists',
      },
    },
    {
      path: '/netease/daily',
      name: 'NeteaseDaily',
      component: require('./views/Netease/Daily.vue').default,
      meta: {
        name: 'NeteaseDaily',
      },
    },
    {
      path: '/netease/followed-artists',
      name: 'NeteaseFollowedArtists',
      component: require('./views/Netease/FollowedArtists.vue').default,
      meta: {
        name: 'NeteaseFollowedArtists',
      },
    },
    {
      path: '/netease/subscribed-albums',
      name: 'NeteaseSubscribedAlbums',
      component: require('./views/Netease/SubscribedAlbums.vue').default,
      meta: {
        name: 'NeteaseSubscribedAlbums',
      },
    },
    {
      path: '/netease/artist',
      name: 'NeteaseArtistDetail',
      component: require('./views/Netease/ArtistDetail.vue').default,
      meta: {
        name: 'NeteaseArtistDetail',
      },
    },
    {
      path: '/netease/album',
      name: 'NeteaseAlbumDetail',
      component: require('./views/Netease/AlbumDetail.vue').default,
      meta: {
        name: 'NeteaseAlbumDetail',
      },
    },
    {
      path: '/list',
      name: 'List',
      component: require('./views/List/index.vue').default,
      meta: {
        name: 'List',
      },
    },
    {
      path: '/download',
      name: 'Download',
      component: require('./views/Download/index.vue').default,
      meta: {
        name: 'Download',
      },
    },
    {
      path: '/setting',
      name: 'Setting',
      component: require('./views/Setting/index.vue').default,
      meta: {
        name: 'Setting',
      },
    },
    { path: '/:pathMatch(.*)*', redirect: '/search' },
  ],
  linkActiveClass: 'active-link',
  linkExactActiveClass: 'exact-active-link',
})


export default router
