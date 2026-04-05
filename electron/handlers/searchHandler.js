const Fuse = require('fuse.js');

/**
 * Search and filter skills
 */
function searchSkills(event, { skills, query, filters }) {
  try {
    let results = skills;

    // Full-text search
    if (query && query.trim()) {
      const fuse = new Fuse(skills, {
        keys: ['name', 'description', 'tags', 'category'],
        threshold: 0.3,
        includeScore: true
      });

      results = fuse.search(query).map(result => result.item);
    }

    // Filter by category
    if (filters?.category && filters.category !== 'All') {
      results = results.filter(s => s.category === filters.category);
    }

    // Filter by tags
    if (filters?.tags && filters.tags.length > 0) {
      results = results.filter(s =>
        filters.tags.some(tag => s.tags?.includes(tag))
      );
    }

    // Filter by source
    if (filters?.source && filters.source !== 'all') {
      results = results.filter(s => s.source === filters.source);
    }

    // Sort
    results = sortSkills(results, filters?.sortBy || 'relevant', query);

    return {
      success: true,
      results,
      count: results.length
    };
  } catch (error) {
    console.error('Search error:', error);
    return {
      success: false,
      error: error.message,
      results: []
    };
  }
}

/**
 * Sort skills based on criteria
 */
function sortSkills(skills, sortBy, query) {
  const sorted = [...skills];

  if (sortBy === 'rating') {
    sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else if (sortBy === 'downloads') {
    sorted.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
  } else if (sortBy === 'relevant' && query) {
    // Prioritize name matches over description matches
    sorted.sort((a, b) => {
      const aNameMatch = a.name.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
      const bNameMatch = b.name.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
      if (aNameMatch !== bNameMatch) {
        return bNameMatch - aNameMatch;
      }
      return (b.rating || 0) - (a.rating || 0);
    });
  } else {
    // Default: sort by rating
    sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }

  return sorted;
}

/**
 * Get unique categories from skills
 */
function getCategories(skills) {
  const categories = new Set(skills.map(s => s.category || 'Other'));
  return ['All', ...Array.from(categories).sort()];
}

/**
 * Get unique tags from skills
 */
function getTags(skills) {
  const tags = new Set();
  skills.forEach(s => {
    if (s.tags && Array.isArray(s.tags)) {
      s.tags.forEach(tag => tags.add(tag));
    }
  });
  return Array.from(tags).sort();
}

/**
 * Get unique sources from skills
 */
function getSources(skills) {
  const sources = new Set(skills.map(s => s.source));
  return ['all', ...Array.from(sources).sort()];
}

module.exports = {
  searchSkills,
  getCategories,
  getTags,
  getSources
};
