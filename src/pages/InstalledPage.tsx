// src/pages/InstalledPage.tsx
import React from 'react';
import { Trash2 } from 'lucide-react';

export default function InstalledPage({ installedSkills, allSkills, setInstalledSkills }) {
  const installedList = allSkills.filter(s => installedSkills.has(s.id));

  const handleDelete = async (skillId) => {
    if (!window.confirm('Are you sure you want to delete this skill?')) return;

    try {
      const result = await window.ipcRenderer.uninstallSkill(skillId);
      if (result.success) {
        const newInstalled = new Set(installedSkills);
        newInstalled.delete(skillId);
        setInstalledSkills(newInstalled);
        alert('✅ Skill deleted');
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ fontSize: '16px', margin: '0 0 16px 0', color: '#FF7F50' }}>
        {installedList.length} skill(s) installed
      </h2>

      {installedList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          <p>No skills installed yet</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {installedList.map(skill => (
            <div
              key={skill.id}
              style={{
                backgroundColor: '#1f1f1f',
                border: '1px solid #333',
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600' }}>
                  {skill.name}
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
                  {skill.description.substring(0, 60)}...
                </p>
              </div>
              <button
                onClick={() => handleDelete(skill.id)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: 'transparent',
                  border: '1px solid #d32f2f',
                  color: '#d32f2f',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}