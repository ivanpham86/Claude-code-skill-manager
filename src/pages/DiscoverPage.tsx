import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Plus, AlertCircle, Loader, X, Filter } from 'lucide-react';

// Shimmer placeholder for loading descriptions
function DescriptionShimmer() {
  return (
    <span style={{
      display: 'inline-block',
      width: '60%',
      height: '14px',
      background: 'linear-gradient(90deg, #333 25%, #444 50%, #333 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
      borderRadius: '4px',
      verticalAlign: 'middle'
    }} />
  );
}

// Individual skill card with lazy description loading
function SkillCard({ skill, installedSkills, onInstall }) {
  const cardRef = useRef(null);
  const [desc, setDesc] = useState(skill.description || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (skill._descriptionLoaded || skill.description) return;

    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect();
          setLoading(true);
          try {
            const [owner, repo] = skill.source.split('/');
            const result = await window.ipcRenderer.loadSkillDescription({
              owner,
              repo,
              skill: {
                name: skill.name,
                _filePath: skill._filePath,
                _fileType: skill._fileType
              }
            });
            setDesc(result);
            skill.description = result;
            skill._descriptionLoaded = true;
          } catch {
            setDesc('No description');
          } finally {
            setLoading(false);
          }
        }
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={cardRef}
      style={{
        backgroundColor: '#1f1f1f',
        border: '1px solid #333',
        borderRadius: '8px',
        padding: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '16px'
      }}
    >
      <div style={{ flex: 1 }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>
          {skill.name}
        </h3>
        <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#999', lineHeight: '1.5' }}>
          {loading ? <DescriptionShimmer /> : (desc || 'No description')}
        </p>
        <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#666', flexWrap: 'wrap', alignItems: 'center' }}>
          <span>By {skill.author}</span>
          <span>⭐ {skill.rating}</span>
          <span>📥 {skill.downloads}</span>
          {skill.category && skill.category !== 'Other' && (
            <span style={{
              backgroundColor: '#2a2a2a',
              border: '1px solid #444',
              borderRadius: '10px',
              padding: '1px 8px',
              fontSize: '11px',
              color: '#aaa'
            }}>
              {skill.category}
            </span>
          )}
          {installedSkills.has(skill.id) && (
            <span style={{ color: '#4CAF50', fontWeight: '600' }}>✓ Installed</span>
          )}
        </div>
      </div>
      <button
        onClick={() => onInstall(skill)}
        disabled={installedSkills.has(skill.id)}
        style={{
          padding: '8px 16px',
          backgroundColor: installedSkills.has(skill.id) ? '#333' : '#FF7F50',
          color: installedSkills.has(skill.id) ? '#666' : '#fff',
          border: 'none',
          borderRadius: '6px',
          cursor: installedSkills.has(skill.id) ? 'default' : 'pointer',
          fontSize: '14px',
          fontWeight: '600',
          whiteSpace: 'nowrap'
        }}
      >
        {installedSkills.has(skill.id) ? '✓ Installed' : 'Install'}
      </button>
    </div>
  );
}

export default function DiscoverPage({
  allSkills,
  setAllSkills,
  installedSkills,
  setInstalledSkills,
  customSources,
  setCustomSources
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSource, setSelectedSource] = useState('All');
  const [showAddSourceModal, setShowAddSourceModal] = useState(false);
  const [customSourceUrl, setCustomSourceUrl] = useState('');
  const [parsingSource, setParsingSource] = useState(false);
  const [parseError, setParseError] = useState(null);

  // Extract unique categories from skills
  const categories = useMemo(() => {
    const cats = new Set(allSkills.map(s => s.category).filter(Boolean));
    return ['All', ...Array.from(cats).sort()];
  }, [allSkills]);

  // Extract unique sources
  const sources = useMemo(() => {
    const srcs = new Set(allSkills.map(s => s.source).filter(Boolean));
    return ['All', ...Array.from(srcs)];
  }, [allSkills]);

  const handleParseRepo = async () => {
    setParsingSource(true);
    setParseError(null);

    try {
      const result = await window.ipcRenderer.parseGitHubRepo({
        repoUrl: customSourceUrl
      });

      if (result.success) {
        setAllSkills([...allSkills, ...result.skills]);

        const sourceName = customSourceUrl.split('/').pop();
        setCustomSources([...customSources, {
          name: sourceName,
          url: customSourceUrl,
          isDefault: false
        }]);

        setShowAddSourceModal(false);
        setCustomSourceUrl('');
      } else {
        setParseError(result.error);
      }
    } catch (error) {
      setParseError(error.message);
    } finally {
      setParsingSource(false);
    }
  };

  const handleInstall = async (skill) => {
    try {
      const result = await window.ipcRenderer.installSkill({
        skillId: skill.id,
        repoUrl: skill.repo_url
      });

      if (result.success) {
        setInstalledSkills(new Set([...installedSkills, skill.id]));
        alert(`✅ ${skill.name} installed successfully!`);
      } else {
        alert(`❌ ${result.error}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  // Clear all skills from a source
  const handleClearSource = (source) => {
    if (!window.confirm(`Remove all skills from "${source}"?`)) return;
    setAllSkills(allSkills.filter(s => s.source !== source));
    setCustomSources(customSources.filter(s => {
      const srcName = s.url?.split('/').slice(-2).join('/');
      return srcName !== source && s.name !== source;
    }));
    if (selectedSource === source) setSelectedSource('All');
  };

  // Filter skills
  const filteredSkills = allSkills.filter(skill => {
    const matchSearch = !searchTerm ||
      skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (skill.description && skill.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchCategory = selectedCategory === 'All' || skill.category === selectedCategory;
    const matchSource = selectedSource === 'All' || skill.source === selectedSource;
    return matchSearch && matchCategory && matchSource;
  });

  const hasActiveFilters = selectedCategory !== 'All' || selectedSource !== 'All' || searchTerm;

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* Search + Add Source */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: '#666' }} />
          <input
            type="text"
            placeholder="Search skills..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              backgroundColor: '#2a2a2a',
              border: '1px solid #333',
              borderRadius: '6px',
              color: '#e0e0e0',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = '#FF7F50'}
            onBlur={(e) => e.currentTarget.style.borderColor = '#333'}
          />
        </div>
        <button
          onClick={() => setShowAddSourceModal(true)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#FF7F50',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}
        >
          <Plus size={16} /> Add Source
        </button>
      </div>

      {/* Source Chips with Clear buttons */}
      {sources.length > 1 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <Filter size={14} style={{ color: '#666' }} />
          {sources.map(src => (
            <div
              key={src}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                backgroundColor: selectedSource === src ? '#FF7F50' : '#2a2a2a',
                color: selectedSource === src ? '#fff' : '#aaa',
                border: `1px solid ${selectedSource === src ? '#FF7F50' : '#444'}`,
                borderRadius: '14px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              <span onClick={() => setSelectedSource(src === selectedSource ? 'All' : src)}>
                {src === 'All' ? 'All Sources' : src}
              </span>
              {src !== 'All' && (
                <X
                  size={12}
                  style={{ cursor: 'pointer', opacity: 0.6 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearSource(src);
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Category Filter */}
      {categories.length > 2 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', maxHeight: '68px', overflow: 'auto' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat === selectedCategory ? 'All' : cat)}
              style={{
                padding: '3px 10px',
                backgroundColor: selectedCategory === cat ? '#FF7F50' : 'transparent',
                color: selectedCategory === cat ? '#fff' : '#888',
                border: `1px solid ${selectedCategory === cat ? '#FF7F50' : '#333'}`,
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '11px',
                whiteSpace: 'nowrap'
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Active filters summary */}
      {hasActiveFilters && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#888' }}>
            Showing {filteredSkills.length} of {allSkills.length} skills
          </span>
          <button
            onClick={() => { setSearchTerm(''); setSelectedCategory('All'); setSelectedSource('All'); }}
            style={{
              padding: '2px 8px',
              backgroundColor: 'transparent',
              border: '1px solid #555',
              color: '#aaa',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px'
            }}
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Skills Grid */}
      <div style={{ display: 'grid', gap: '12px', flex: 1, overflow: 'auto' }}>
        {filteredSkills.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#666' }}>
            <p style={{ fontSize: '14px', margin: 0 }}>
              {hasActiveFilters ? 'No skills match your filters' : 'No skills yet. Add a source to get started!'}
            </p>
          </div>
        ) : (
          filteredSkills.map(skill => (
            <SkillCard
              key={skill.id}
              skill={skill}
              installedSkills={installedSkills}
              onInstall={handleInstall}
            />
          ))
        )}
      </div>

      {/* Add Source Modal */}
      {showAddSourceModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#1f1f1f',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            border: '1px solid #333'
          }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
              Add Skill Source
            </h2>

            <p style={{ fontSize: '13px', color: '#999', marginBottom: '16px' }}>
              Paste a GitHub repository URL containing skills
            </p>

            <input
              type="text"
              placeholder="https://github.com/user/repo"
              value={customSourceUrl}
              onChange={(e) => setCustomSourceUrl(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                backgroundColor: '#2a2a2a',
                border: '1px solid #333',
                borderRadius: '6px',
                color: '#e0e0e0',
                fontSize: '14px',
                marginBottom: '12px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              disabled={parsingSource}
            />

            {parseError && (
              <div style={{
                backgroundColor: '#2a1a1a',
                border: '1px solid #d32f2f',
                color: '#ff6b6b',
                padding: '10px 12px',
                borderRadius: '6px',
                marginBottom: '12px',
                fontSize: '13px',
                display: 'flex',
                gap: '8px'
              }}>
                <AlertCircle size={16} />
                <span>{parseError}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowAddSourceModal(false);
                  setCustomSourceUrl('');
                  setParseError(null);
                }}
                disabled={parsingSource}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  border: '1px solid #555',
                  color: '#e0e0e0',
                  borderRadius: '6px',
                  cursor: parsingSource ? 'default' : 'pointer',
                  fontSize: '14px',
                  opacity: parsingSource ? 0.5 : 1
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleParseRepo}
                disabled={!customSourceUrl || parsingSource}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#FF7F50',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: !customSourceUrl || parsingSource ? 'default' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: !customSourceUrl || parsingSource ? 0.5 : 1
                }}
              >
                {parsingSource && <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                {parsingSource ? 'Parsing...' : 'Add Source'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}