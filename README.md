<!-- Language: English | Tiếng Việt bên dưới -->

<div align="center">

# Claude Code Skill Manager

**Browse, discover, and install skills into Claude Code — with one click.**

**Duyệt, khám phá và cài đặt skills cho Claude Code — chỉ với một cú nhấp.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey)]()
[![Electron](https://img.shields.io/badge/Electron-41-47848F?logo=electron&logoColor=white)]()
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)]()
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)]()
[![Skills Parsed](https://img.shields.io/badge/skills_parsed-300%2B-FF7F50)]()

[Quick Start](#-quick-start) · [Features](#-features) · [Screenshots](#-screenshots) · [Build](#-build-from-source) · [Contributing](#-contributing)

</div>

---

## What is this? / Đây là gì?

**EN:** A desktop GUI app that lets you add GitHub repositories as skill sources, browse hundreds of skills with category filters, and install them directly into `~/.claude/skills/` — where Claude Code picks them up automatically.

**VI:** Một ứng dụng desktop cho phép bạn thêm các GitHub repository làm nguồn skill, duyệt hàng trăm skills với bộ lọc theo danh mục, và cài đặt trực tiếp vào `~/.claude/skills/` — nơi Claude Code tự động nhận diện.

---

## ✨ Features

| Feature | Description |
|---|---|
| **Add GitHub sources** | Paste any awesome-list or skill repo URL / Dán bất kỳ URL repo chứa skills |
| **Smart parsing** | Auto-extracts skills from README, JSON, or directories / Tự động trích xuất skills từ README, JSON hoặc thư mục |
| **Category filtering** | Filter by category, source, or keyword search / Lọc theo danh mục, nguồn hoặc tìm kiếm |
| **One-click install** | Downloads skill files into `~/.claude/skills/` / Tải files skill vào `~/.claude/skills/` |
| **SKILL.md compatible** | Auto-renames files to `SKILL.md` format / Tự động đổi tên file sang định dạng `SKILL.md` |
| **Lazy loading** | Descriptions load on-demand / Mô tả được tải theo yêu cầu |
| **Cross-platform** | macOS, Windows, Linux / Hỗ trợ đa nền tảng |

---

## 🧪 Tested Sources / Nguồn đã kiểm tra

| Repository | Skills | Status |
|---|---|---|
| [VoltAgent/awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents) | 143 | ✅ |
| [ComposioHQ/awesome-claude-skills](https://github.com/ComposioHQ/awesome-claude-skills) | 148 | ✅ |
| [affaan-m/everything-claude-code](https://github.com/affaan-m/everything-claude-code) | 50+ | ✅ |

---

## 📸 Screenshots


![beautyshot_20260405_090808](https://github.com/user-attachments/assets/6fb28546-b0a6-4b87-a5af-cc6f76f93675)



![beautyshot_20260405_090924](https://github.com/user-attachments/assets/ed61d86e-1127-446f-90cf-bd0d1f6a7be3)

---

## 🚀 Quick Start

### Download Release / Tải bản phát hành

Download the latest `.dmg` (macOS), `.exe` (Windows), or `.AppImage` (Linux) from [Releases](../../releases).

Tải bản mới nhất từ trang [Releases](../../releases).

### Build from Source / Build từ mã nguồn

```bash
git clone https://github.com/ivanpham86/Claude-code-skill-manager.git
cd Claude-code-skill-manager
npm install
npm run dev
```

---

## 🏗 Build from Source

### Development / Phát triển

```bash
npm run dev          # Start dev server + Electron
```

### Production / Đóng gói

```bash
npm run dist:mac     # macOS (.dmg)
npm run dist:win     # Windows (.exe)
npm run dist:linux   # Linux (.AppImage, .deb)
```

Build output is in `release/` directory.

---

## 📁 Project Structure / Cấu trúc dự án

```
claude-skill-manager/
├── electron/                    # Electron main process
│   ├── main.js                  # App entry point
│   ├── preload.js               # IPC security bridge
│   └── handlers/
│       ├── initHandler.js       # App initialization (~/.claude/skills/)
│       ├── gitHandler.js        # GitHub parsing (README, JSON, directory scan)
│       ├── skillHandler.js      # Install/uninstall to ~/.claude/skills/
│       └── searchHandler.js     # Search and filter logic
├── src/                         # React frontend
│   ├── App.tsx                  # Main app component
│   └── pages/
│       ├── DiscoverPage.tsx     # Browse, filter, install skills
│       ├── InstalledPage.tsx    # Manage installed skills
│       └── SettingsPage.tsx     # App settings
├── public/
│   └── icon.png
├── .github/
│   └── workflows/
│       └── release.yml          # CI/CD: auto-build all platforms
├── package.json
├── vite.config.ts
└── index.html
```

---

## ⚙️ How It Works / Cách hoạt động

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  Add Source      │────▶│  Parse README     │────▶│  Show Skills List   │
│  (GitHub URL)    │     │  or scan dirs     │     │  with categories    │
└─────────────────┘     └──────────────────┘     └─────────┬───────────┘
                                                           │
                                                    Click Install
                                                           │
                                                           ▼
                                                ┌─────────────────────┐
                                                │  Download to        │
                                                │  ~/.claude/skills/  │
                                                │  + rename SKILL.md  │
                                                └─────────┬───────────┘
                                                           │
                                                           ▼
                                                ┌─────────────────────┐
                                                │  Claude Code loads  │
                                                │  skill via /skills  │
                                                └─────────────────────┘
```

**EN:** The parser supports 3 formats: markdown awesome-lists (with absolute, relative, and bare URLs), JSON skill manifests, and directory scanning for monorepos. Large READMEs are fetched via raw.githubusercontent.com to bypass GitHub API size limits.

**VI:** Parser hỗ trợ 3 định dạng: awesome-list markdown (URL tuyệt đối, tương đối, và rút gọn), JSON manifest, và quét thư mục cho monorepo. README lớn được tải qua raw.githubusercontent.com để vượt giới hạn kích thước API GitHub.

---

## 🛠 Tech Stack / Công nghệ

| Layer | Technology |
|---|---|
| Desktop | Electron 41 |
| Frontend | React 18, Vite 8 |
| GitHub API | Octokit, Axios |
| Search | Fuse.js |
| Build | electron-builder |
| CI/CD | GitHub Actions |

---

## 🤝 Contributing / Đóng góp

Contributions are welcome! / Chào đón mọi đóng góp!

1. Fork the repo / Fork dự án
2. Create a branch / Tạo branch (`git checkout -b feature/amazing`)
3. Commit changes / Commit (`git commit -m 'Add amazing feature'`)
4. Push (`git push origin feature/amazing`)
5. Open a Pull Request / Tạo Pull Request

### Ideas for contributions / Ý tưởng đóng góp

- [ ] Persist sources across sessions / Lưu sources giữa các phiên
- [ ] GitHub token support for private repos / Hỗ trợ token cho repo riêng tư
- [ ] Skill preview before install / Xem trước skill trước khi cài
- [ ] Bulk install / Cài đặt hàng loạt
- [ ] Auto-update installed skills / Tự động cập nhật skills đã cài
- [ ] Skill rating and reviews / Đánh giá và nhận xét skill

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with ❤️ by [Ivan Pham](https://github.com/ivanpham86)**

**If this tool saves you time, give it a ⭐**

</div>
