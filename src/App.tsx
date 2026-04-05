import React, { useState, useEffect } from 'react';
import { Loader } from 'lucide-react';
import DiscoverPage from './pages/DiscoverPage';
import InstalledPage from './pages/InstalledPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  const [activeTab, setActiveTab] = useState('discover');
  const [allSkills, setAllSkills] = useState([]);
  const [installedSkills, setInstalledSkills] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [customSources, setCustomSources] = useState([]);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setLoading(true);

      // Load installed skills
      const result = await window.ipcRenderer.listInstalledSkills();
      if (result.success) {
        const ids = new Set(result.skills.map(s => s.id));
        setInstalledSkills(ids);
      }

      // Start empty — user adds sources via Add Source button
      setAllSkills([]);
      setCustomSources([]);
    } catch (error) {
      console.error('Initialization error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        backgroundColor: '#1a1a1a',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <Loader size={40} style={{ color: '#FF7F50', animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
          <p style={{ color: '#e0e0e0' }}>Initializing Claude Code Skill Manager...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: '#1a1a1a',
      color: '#e0e0e0',
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        borderBottom: '1px solid #333',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        backgroundColor: '#121212'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '6px',
          background: 'linear-gradient(135deg, #FF7F50 0%, #FF6B35 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          fontWeight: 'bold',
          color: 'white'
        }}>
          ⚙️
        </div>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '600', flex: 1 }}>
          Claude Code Skill Manager
        </h1>
        <span style={{ fontSize: '12px', color: '#666' }}>
          {allSkills.length} skills • {customSources.length} sources
        </span>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #333',
        backgroundColor: '#0f0f0f'
      }}>
        {[
          { id: 'discover', label: '🔍 Discover & Add' },
          { id: 'installed', label: '📦 Installed' },
          { id: 'settings', label: '⚙️ Settings' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 20px',
              border: 'none',
              backgroundColor: activeTab === tab.id ? '#1f1f1f' : 'transparent',
              color: activeTab === tab.id ? '#FF7F50' : '#999',
              borderBottom: activeTab === tab.id ? '2px solid #FF7F50' : 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === tab.id ? '600' : '400'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 'discover' && (
          <DiscoverPage
            allSkills={allSkills}
            setAllSkills={setAllSkills}
            installedSkills={installedSkills}
            setInstalledSkills={setInstalledSkills}
            customSources={customSources}
            setCustomSources={setCustomSources}
          />
        )}
        {activeTab === 'installed' && (
          <InstalledPage
            installedSkills={installedSkills}
            allSkills={allSkills}
            setInstalledSkills={setInstalledSkills}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsPage
            allSkills={allSkills}
            customSources={customSources}
            setCustomSources={setCustomSources}
            setAllSkills={setAllSkills}
          />
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}