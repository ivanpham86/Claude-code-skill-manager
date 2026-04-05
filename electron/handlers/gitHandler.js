const { Octokit } = require('@octokit/rest');
const axios = require('axios');

/**
 * Parse GitHub repo - extract skill list from README, JSON, or directory scan
 */
async function parseGitHubRepo({ repoUrl }) {
  try {
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)\/?$/);
    if (!match) {
      throw new Error('Invalid GitHub URL format');
    }

    const [, owner, repo] = match;
    const octokit = new Octokit();

    // Phase 1: Try README parsing (awesome-list format)
    let skills = await parseMarkdownReadme(octokit, owner, repo);

    // Phase 2: Try JSON format
    if (skills.length === 0) {
      skills = await parseJsonSkills(octokit, owner, repo);
    }

    // Phase 3: Fallback - scan repo directories (monorepo format)
    if (skills.length < 20) {
      const dirSkills = await scanRepoDirectories(octokit, owner, repo);
      if (dirSkills.length > skills.length) {
        skills = dirSkills;
      }
    }

    return {
      success: true,
      skills,
      count: skills.length,
      source: `${owner}/${repo}`
    };
  } catch (error) {
    console.error('Parse error:', error);
    return {
      success: false,
      error: error.message,
      skills: []
    };
  }
}

/**
 * Parse README.md for skill links
 * Supports: absolute GitHub URLs, relative URLs (.md files and folders),
 * ## and ### category headers, * and - list items
 */
async function parseMarkdownReadme(octokit, owner, repo) {
  try {
    // Fetch raw README directly (bypasses Octokit content size limits)
    const branches = ['main', 'master'];
    let markdown = '';
    let branch = 'main';
    for (const b of branches) {
      try {
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${b}/README.md`;
        const response = await axios.get(rawUrl, { timeout: 15000 });
        markdown = response.data;
        branch = b;
        break;
      } catch { continue; }
    }
    if (!markdown) return [];

    const skills = [];
    const lines = markdown.replace(/\r\n/g, '\n').split('\n');
    let currentCategory = 'Other';

    const skipNames = [
      'open an issue', 'contributing', 'table of contents',
      'contributing.md', 'see how', 'get started', 'view all',
      'skills api', 'claude community', 'skills marketplace',
      'composio', 'agentskb', 'join our discord', 'follow on'
    ];

    const skipExactNames = ['license', 'mit license', 'apache license'];

    const skipUrlPatterns = [
      /awesome\.re/, /shields\.io/, /img\.shields/, /twitter\.com\/composio/,
      /discord\.com/, /linkedin\.com\/company/, /mailto:/, /support\.claude/,
      /docs\.claude/, /anthropic\.com\/news/, /anthropic\.com\/engineering/,
      /community\.anthropic/, /lennysnewsletter/, /notion\.so\/notiondevs/,
      /composio\.dev(?!.*automation)/, /platform\.composio/,
      /makeapullrequest/, /apache\.org\/licenses/
    ];

    for (const line of lines) {
      // Match category headers (## or ###)
      const headerMatch = line.match(/^#{2,3}\s+(?:\[([^\]]+)\]\([^\)]+\)|(.+))/);
      if (headerMatch) {
        const raw = (headerMatch[1] || headerMatch[2] || '').trim();
        if (raw && !raw.match(/^(what|core|getting|tool|smart|skill|basic|quick|using|resources|official|community|inspiration|join|license|about|contents|installation|option|step|understanding|subagent structure|contributing|contributor)/i)) {
          currentCategory = raw
            .replace(/^\d+\.\s*/, '')
            .replace(/[📚🤖🧰🤝📖📄🤟💡🔧⚡️🎯🔒]/g, '')
            .trim();
        }
        continue;
      }

      // Step 1: Is this a list item line?
      if (!/^\s*[\*\-\+]\s/.test(line)) continue;

      // Step 2: Find [name](url) pattern in the line
      const linkMatch = line.match(/\[([^\]]+)\]\(([^\)]+)\)/);
      if (!linkMatch) continue;

      const [fullMatch, rawName, url] = linkMatch;
      const name = rawName.replace(/\*\*/g, '').trim();

      // Step 3: Extract description after the link
      const linkEnd = line.indexOf(fullMatch) + fullMatch.length;
      const afterLink = line.substring(linkEnd);
      const descMatch = afterLink.match(/^\s*[\-–—:]\s*(.+)/);
      let description = descMatch ? descMatch[1].trim() : null;

      // Skip anchors, non-links, and images
      if (url.startsWith('#')) continue;
      if (url.startsWith('mailto:')) continue;
      if (/\.(png|jpg|jpeg|gif|svg|ico|webp)(\?|$)/i.test(url)) continue;

      // Skip non-skill entries
      if (!name || name.length < 2) continue;
      if (skipNames.some(p => name.toLowerCase().includes(p))) continue;
      if (skipExactNames.includes(name.toLowerCase())) continue;
      if (skipUrlPatterns.some(p => p.test(url))) continue;

      // Build full URL
      let fullUrl;
      if (url.startsWith('http')) {
        fullUrl = url;
      } else if (url.startsWith('/')) {
        fullUrl = `https://github.com${url}`;
      } else {
        // Relative path (e.g. "slack-automation" or "changelog-generator")
        fullUrl = `https://github.com/${owner}/${repo}/tree/${branch || 'main'}/${url}`;
      }

      // Must be a GitHub link
      if (!fullUrl.includes('github.com')) continue;

      // Extract author from URL
      let author;
      try {
        const urlParts = new URL(fullUrl).pathname.split('/').filter(Boolean);
        author = urlParts[0] || owner;
      } catch {
        author = owner;
      }

      // Extract "By @author" from description if present
      let cleanDesc = description || 'No description';
      const byMatch = cleanDesc.match(/\*By \[@?([^\]]+)\]/);
      if (byMatch) {
        author = byMatch[1];
        cleanDesc = cleanDesc.replace(/\s*\*By \[.*$/, '').trim();
      }
      if (!cleanDesc) cleanDesc = 'No description';

      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      // Skip duplicates
      if (skills.some(s => s.id === id)) continue;

      skills.push({
        id,
        name,
        description: cleanDesc,
        repo_url: fullUrl,
        category: currentCategory,
        source: `${owner}/${repo}`,
        author,
        rating: 4.5,
        downloads: 0,
        tags: [currentCategory.toLowerCase()]
      });
    }

    console.log(`[PARSE] ${skills.length} skills from ${owner}/${repo}`);
    return skills;
  } catch (error) {
    console.error('Error parsing README:', error);
    return [];
  }
}

/**
 * Parse skills.json for JSON format
 */
async function parseJsonSkills(octokit, owner, repo) {
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: 'skills.json'
    });

    let jsonStr;
    if (data.content) {
      jsonStr = Buffer.from(data.content, 'base64').toString('utf-8');
    } else if (data.download_url) {
      const response = await axios.get(data.download_url);
      jsonStr = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    } else {
      return [];
    }
    const json = JSON.parse(jsonStr);
    const skillsArray = json.skills || json;

    return skillsArray.map(skill => ({
      id: skill.id || skill.name?.toLowerCase().replace(/\s+/g, '-'),
      name: skill.name,
      description: skill.description || 'No description',
      repo_url: skill.url || skill.repo_url,
      category: skill.category || 'Other',
      source: `${owner}/${repo}`,
      author: skill.author || owner,
      rating: skill.rating || 4.5,
      downloads: skill.downloads || 0,
      tags: skill.tags || []
    }));
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return [];
  }
}

/**
 * Phase 1 fallback: Scan repo directories for skills/agents
 * Lightweight - only reads directory listing, not file contents
 * Total: ~3 API calls (1 per directory)
 */
async function scanRepoDirectories(octokit, owner, repo) {
  const skills = [];
  const dirsToScan = ['skills', 'agents', 'commands'];

  for (const dir of dirsToScan) {
    try {
      const { data: contents } = await octokit.repos.getContent({
        owner, repo, path: dir
      });

      if (!Array.isArray(contents)) continue;

      for (const item of contents) {
        if (item.name.startsWith('.')) continue;

        let name;
        if (item.type === 'dir') {
          name = item.name;
        } else if (item.type === 'file' && item.name.endsWith('.md')) {
          name = item.name.replace('.md', '');
        } else {
          continue;
        }

        const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        if (skills.some(s => s.id === id)) continue;

        skills.push({
          id,
          name,
          description: '',
          repo_url: `https://github.com/${owner}/${repo}/tree/main/${item.path}`,
          category: dir.charAt(0).toUpperCase() + dir.slice(1),
          source: `${owner}/${repo}`,
          author: owner,
          rating: 4.5,
          downloads: 0,
          tags: [dir],
          _descriptionLoaded: false,
          _filePath: item.path,
          _fileType: item.type
        });
      }
    } catch {
      continue;
    }
  }

  return skills;
}

/**
 * Phase 2: Lazy load description for a single skill
 * Called on-demand when user views a skill card (1 API call per skill)
 */
async function loadSkillDescription({ owner, repo, skill }) {
  try {
    const octokit = new Octokit();
    let content = '';

    if (skill._fileType === 'dir') {
      const mdFiles = ['SKILL.md', 'README.md', `${skill.name}.md`];
      for (const mdFile of mdFiles) {
        try {
          const { data } = await octokit.repos.getContent({
            owner, repo, path: `${skill._filePath}/${mdFile}`
          });
          content = data.content
            ? Buffer.from(data.content, 'base64').toString('utf-8')
            : data.download_url ? (await axios.get(data.download_url)).data : '';
          if (content) break;
        } catch { continue; }
      }
    } else {
      try {
        const { data } = await octokit.repos.getContent({
          owner, repo, path: skill._filePath
        });
        content = data.content
          ? Buffer.from(data.content, 'base64').toString('utf-8')
          : data.download_url ? (await axios.get(data.download_url)).data : '';
      } catch { /* skip */ }
    }

    if (content) {
      // Try frontmatter description first
      const fmMatch = content.match(/description:\s*(.+)/i);
      if (fmMatch) return fmMatch[1].trim().slice(0, 200);

      // Try first paragraph after heading
      const paraMatch = content.match(/^#[^#\n]*\n+([^\n#]+)/m);
      if (paraMatch) return paraMatch[1].trim().slice(0, 200);
    }

    return 'No description';
  } catch {
    return 'No description';
  }
}

module.exports = {
  parseGitHubRepo,
  loadSkillDescription
};