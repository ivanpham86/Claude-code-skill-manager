const { contextBridge, ipcRenderer } = require('electron');

// Expose safe IPC methods to renderer process
contextBridge.exposeInMainWorld('ipcRenderer', {
  // Config
  getConfig: (key) => ipcRenderer.invoke('get-config', key),
  setConfig: (data) => ipcRenderer.invoke('set-config', data),

  // Skills
  listInstalledSkills: () => ipcRenderer.invoke('list-installed-skills'),
  installSkill: (data) => ipcRenderer.invoke('install-skill', data),
  uninstallSkill: (skillId) => ipcRenderer.invoke('uninstall-skill', skillId),

  // Search
  searchSkills: (data) => ipcRenderer.invoke('search-skills', data),

  // GitHub
  parseGitHubRepo: (data) => ipcRenderer.invoke('parse-github-repo', data),
  loadSkillDescription: (data) => ipcRenderer.invoke('load-skill-description', data),

  // Listeners
  on: (channel, listener) => {
    ipcRenderer.on(channel, listener);
  },
  once: (channel, listener) => {
    ipcRenderer.once(channel, listener);
  },
  off: (channel, listener) => {
    ipcRenderer.off(channel, listener);
  }
});