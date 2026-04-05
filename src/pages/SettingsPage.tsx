// src/pages/SettingsPage.tsx
export default function SettingsPage({ allSkills, customSources }) {
  return (
    <div style={{ padding: '20px', maxWidth: '500px' }}>
      <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
        Settings
      </h2>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
          Claude Code Path
        </label>
        <input
          type="text"
          defaultValue="~/.claude/"
          style={{
            width: '100%',
            padding: '8px 12px',
            backgroundColor: '#2a2a2a',
            border: '1px solid #333',
            borderRadius: '6px',
            color: '#e0e0e0',
            fontSize: '14px'
          }}
        />
      </div>

      <h3 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 12px 0' }}>
        Your Sources
      </h3>

      <div style={{ display: 'grid', gap: '8px' }}>
        {customSources.map((source, idx) => (
          <div
            key={idx}
            style={{
              backgroundColor: '#1f1f1f',
              border: '1px solid #333',
              borderRadius: '6px',
              padding: '10px 12px'
            }}
          >
            <p style={{ margin: '0 0 2px 0', fontSize: '13px', fontWeight: '600' }}>
              {source.name}
              {source.isDefault && <span style={{ fontSize: '11px', color: '#4CAF50', marginLeft: '6px' }}>(default)</span>}
            </p>
            <p style={{ margin: 0, fontSize: '11px', color: '#666' }}>
              {allSkills.filter(s => s.source === source.name).length} skills
            </p>
          </div>
        ))}
      </div>

      <div style={{
        backgroundColor: '#1f1f1f',
        border: '1px solid #333',
        borderRadius: '6px',
        padding: '12px',
        fontSize: '12px',
        color: '#666',
        marginTop: '20px'
      }}>
        <p style={{ margin: '0 0 8px 0' }}>ℹ️ Version: 1.0.0 (Beta)</p>
        <p style={{ margin: '0 0 8px 0' }}>Total skills: {allSkills.length}</p>
        <p style={{ margin: '0' }}>Total sources: {customSources.length}</p>
      </div>
    </div>
  );
}