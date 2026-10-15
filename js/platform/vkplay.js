// VK Play (ветка VK, октябрь 2026): заготовка адаптера браузерной игры для каталога VK Play.
// SDK VK Play ещё не подключён (нужна документация из кабинета разработчика): пока без рекламы и покупок,
// сохранения только на устройстве. Главное — на VK Play не включается демо-режим с ненастоящими покупками и рекламой.
// Включается сборкой под VK Play (PLATFORM=vkplay tools/build_zip.sh), с ?platform=vkplay или на домене VK Play.

export function onVKPlay() {
  return /(^|\.)vkplay\.(ru|com)$|(^|\.)play\.vk\.(ru|com)$/.test(location.hostname) || new URLSearchParams(location.search).has('vkplay');
}

export class VKPlayProvider {
  constructor() { this.name = 'vkplay'; }
  async init() { return true; }
  ready() { } gameplayStart() { } gameplayStop() { }
  lang() { return (navigator.language || 'ru').slice(0, 2); }
  async showRewarded() { return false; }
  async showInterstitial() { return false; }
  async purchase() { return { ok: false }; }
  async consume() { return true; }
  async getPurchases() { return []; }
  catalogPrice() { return null; }
  hasProduct() { return false; }
  async requestReview() { return false; }
  async setLeaderboardScore() { return false; } async getLeaderboard() { return null; }
  async flags() { return {}; } async canShortcut() { return false; } async shortcut() { return false; }
  async cloudLoad() { return null; } async cloudSave() { return false; }
}
