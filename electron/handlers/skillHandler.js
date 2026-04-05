const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const { Octokit } = require('@octokit/rest');
const { RULES_PATH } = require('./initHandler');

const octokit = new Octokit();

/**
 * List all installed skills
 */
async function listInstalledSkills() {
  try {
    const entries = await fs.readdir(RULES_PATH, { withFileTypes: true });
    const skills = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const skillPath = path.join(RULES_PATH, entry.name);
      const metadataFile = path.join(skillPath, 'skill.json');

      try {
        const metadata = JSON.parse(
          await fs.readFile(metadataFile, 'utf-8')
        );
        skills.push({
          id: entry.name,
          name: entry.name,
          ...metadata,
          path: skillPath
        });
      } catch (e) {
        skills.push({
          id: entry.name,
          name: entry.name,
          path: skillPath,
          installed: new Date().toISOString()
        });
      }
    }

    return { success: true, skills };
  } catch (error) {
    console.error('Error listing skills:', error);
    return { success: false, error: error.message, skills: [] };
  }
}

/**
 * Parse GitHub URL to extract owner, repo, branch, and path
 * Supports:
 *   https://github.com/owner/repo
 *   https://github.com/owner/repo/tree/main/path/to/skill
 *   https://github.com/owner/repo/blob/main/path/to/file.md
 */
function parseGitHubUrl(url) {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)(?:\/(tree|blob)\/([^\/]+)\/(.+))?/);
  if (!match) return null;

  return {
    owner: match[1],
    repo: match[2],
    type: match[3] || null,       // 'tree' (dir) or 'blob' (file)
    branch: match[4] || 'main',
    path: match[5] || ''
  };
}

/**
 * Download a single file from GitHub raw
 */
async function downloadFile(owner, repo, branch, filePath, destPath) {
  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
  const response = await axios.get(rawUrl, { responseType: 'arraybuffer', timeout: 15000 });
  await fs.mkdir(path.dirname(destPath), { recursive: true });
  await fs.writeFile(destPath, response.data);
}

/**
 * Download a directory recursively from GitHub API
 */
async function downloadDirectory(owner, repo, branch, dirPath, destDir) {
  const { data: contents } = await octokit.repos.getContent({
    owner, repo, path: dirPath, ref: branch
  });

  if (!Array.isArray(contents)) {
    // Single file
    const destPath = path.join(destDir, path.basename(contents.name));
    await downloadFile(owner, repo, branch, contents.path, destPath);
    return;
  }

  for (const item of contents) {
    const destPath = path.join(destDir, item.name);

    if (item.type === 'dir') {
      await fs.mkdir(destPath, { recursive: true });
      await downloadDirectory(owner, repo, branch, item.path, destPath);
    } else if (item.type === 'file') {
      await downloadFile(owner, repo, branch, item.path, destPath);
    }
  }
}

/**
 * Install a skill from GitHub
 * Handles: full repos, subdirectories, and single files
 */
async function installSkill({ skillId, repoUrl }) {
  try {
    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) {
      throw new Error(`Cannot parse GitHub URL: ${repoUrl}`);
    }

    const { owner, repo, type, branch, path: repoPath } = parsed;
    const skillPath = path.join(RULES_PATH, skillId);

    console.log(`[INSTALL] ${skillId} from ${owner}/${repo}/${repoPath || '(root)'}`);

    // Create skill directory
    await fs.mkdir(skillPath, { recursive: true });

    if (!repoPath) {
      // Root repo — download key files only (CLAUDE.md, rules/, skills/, agents/)
      const keyPaths = ['CLAUDE.md', 'README.md'];
      for (const kp of keyPaths) {
        try {
          await downloadFile(owner, repo, branch, kp, path.join(skillPath, kp));
        } catch { /* skip if not found */ }
      }
    } else if (type === 'blob') {
      // Single file
      const fileName = path.basename(repoPath);
      await downloadFile(owner, repo, branch, repoPath, path.join(skillPath, fileName));
    } else {
      // Directory — download all contents
      await downloadDirectory(owner, repo, branch, repoPath, skillPath);
    }

    // Create metadata file
    const metadata = {
      id: skillId,
      name: skillId,
      installed: new Date().toISOString(),
      source: repoUrl,
      owner,
      repo,
      branch,
      path: repoPath,
      enabled: true
    };
    await fs.writeFile(
      path.join(skillPath, 'skill.json'),
      JSON.stringify(metadata, null, 2)
    );

    // Ensure SKILL.md exists (Claude Code requirement)
    const files = await fs.readdir(skillPath);
    const hasSkillMd = files.some(f => f === 'SKILL.md');

    if (!hasSkillMd) {
      // Find any .md file to rename (exclude skill.json)
      const mdFile = files.find(f => f.endsWith('.md') && f !== 'skill.json');
      if (mdFile) {
        await fs.rename(
          path.join(skillPath, mdFile),
          path.join(skillPath, 'SKILL.md')
        );
        console.log(`[INSTALL] Renamed ${mdFile} → SKILL.md`);
      } else {
        // No .md found — create minimal SKILL.md
        const skillMd = `---\nname: ${skillId}\ndescription: Installed via Claude Skill Manager\n---\n\n# ${skillId}\n`;
        await fs.writeFile(path.join(skillPath, 'SKILL.md'), skillMd);
        console.log(`[INSTALL] Created minimal SKILL.md`);
      }
    }

    // Verify install
    const finalFiles = await fs.readdir(skillPath);
    if (finalFiles.length <= 1) {
      throw new Error('No skill files were downloaded');
    }

    console.log(`[INSTALL] ✅ ${skillId} installed to ${skillPath} (${files.length} files)`);

    return {
      success: true,
      message: `${skillId} installed successfully`,
      skillPath,
      fileCount: files.length
    };
  } catch (error) {
    console.error(`[INSTALL] ❌ ${skillId}:`, error.message);
    // Cleanup on failure
    try {
      const skillPath = path.join(RULES_PATH, skillId);
      await fs.rm(skillPath, { recursive: true, force: true });
    } catch { /* ignore */ }
    return { success: false, error: error.message };
  }
}

/**
 * Uninstall a skill
 */
async function uninstallSkill(skillId) {
  try {
    const skillPath = path.join(RULES_PATH, skillId);

    // Check exists
    try {
      await fs.access(skillPath);
    } catch {
      return { success: false, error: `Skill "${skillId}" not found` };
    }

    await fs.rm(skillPath, { recursive: true, force: true });

    console.log(`[UNINSTALL] ✅ ${skillId} removed`);

    return {
      success: true,
      message: `${skillId} uninstalled successfully`
    };
  } catch (error) {
    console.error(`[UNINSTALL] ❌ ${skillId}:`, error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  listInstalledSkills,
  installSkill,
  uninstallSkill
};