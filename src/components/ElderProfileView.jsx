import { useState, useEffect } from 'react';

const STORAGE_KEY = 'shastra_elder_profile_data';

const DEFAULT_PROFILE = {
  name: 'Kamala Devi',
  age: 72,
  gender: 'Female',
  photo: '',
  diabetes: {
    hasDiabetes: true,
    type: 'Type 2',
    sugarLevel: '130 mg/dL',
    lastChecked: 'Today (Fasting)',
    notes: 'Managed with Metformin and low glycemic diet',
  },
  medicalConditions: [
    'Diabetes Type 2',
    'Hypertension',
    'Mild Arthritis',
  ],
  medicationHistory: [
    {
      id: 'med-hist-1',
      name: 'Metformin 500mg',
      dosage: '500mg',
      frequency: 'Twice daily after meals',
      purpose: 'Blood Sugar Regulation',
      status: 'Active',
      startDate: 'Jan 2024',
    },
    {
      id: 'med-hist-2',
      name: 'Amlodipine 5mg',
      dosage: '5mg',
      frequency: 'Once daily (Morning)',
      purpose: 'Blood Pressure Control',
      status: 'Active',
      startDate: 'Mar 2024',
    },
    {
      id: 'med-hist-3',
      name: 'Aspirin 75mg',
      dosage: '75mg',
      frequency: 'Once daily after breakfast',
      purpose: 'Heart Health & Circulation',
      status: 'Active',
      startDate: 'Feb 2024',
    },
    {
      id: 'med-hist-4',
      name: 'Vitamin D3 60,000 IU',
      dosage: '60K IU',
      frequency: 'Once weekly (Sundays)',
      purpose: 'Bone & Joint Strength',
      status: 'Ongoing',
      startDate: 'May 2024',
    },
  ],
  lastSyncedAt: new Date().toISOString(),
};

export default function ElderProfileView({ onProfileChange }) {
  // Initialize from localStorage or defaults
  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_PROFILE, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to load profile from localStorage', e);
    }
    return DEFAULT_PROFILE;
  });

  const [syncStatus, setSyncStatus] = useState('saved'); // 'saved' | 'syncing' | 'synced'
  const [newCondition, setNewCondition] = useState('');
  const [showAddMedModal, setShowAddMedModal] = useState(false);
  const [newMedName, setNewMedName] = useState('');
  const [newMedFrequency, setNewMedFrequency] = useState('Once daily (Morning)');
  const [newMedPurpose, setNewMedPurpose] = useState('');

  // Persist and notify parent
  const saveProfile = (updated) => {
    const enriched = {
      ...updated,
      lastSyncedAt: new Date().toISOString(),
    };
    setProfile(enriched);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(enriched));
    } catch (e) {
      console.warn('Failed to save to localStorage', e);
    }

    setSyncStatus('syncing');
    if (onProfileChange) {
      onProfileChange(enriched);
    }
    setTimeout(() => {
      setSyncStatus('synced');
      setTimeout(() => setSyncStatus('saved'), 3000);
    }, 400);
  };

  const handleNameChange = (name) => {
    saveProfile({ ...profile, name });
  };

  const handleAgeChange = (age) => {
    const num = parseInt(age, 10);
    saveProfile({ ...profile, age: isNaN(num) ? '' : num });
  };

  const handleGenderChange = (gender) => {
    saveProfile({ ...profile, gender });
  };

  const handleDiabetesToggle = (hasDiabetes) => {
    saveProfile({
      ...profile,
      diabetes: {
        ...profile.diabetes,
        hasDiabetes,
        type: hasDiabetes ? (profile.diabetes?.type || 'Type 2') : 'None',
      },
    });
  };

  const handleDiabetesTypeChange = (type) => {
    saveProfile({
      ...profile,
      diabetes: {
        ...profile.diabetes,
        type,
        hasDiabetes: type !== 'None',
      },
    });
  };

  const handleSugarReadingChange = (sugarLevel) => {
    saveProfile({
      ...profile,
      diabetes: {
        ...profile.diabetes,
        sugarLevel,
      },
    });
  };

  const handleAddCondition = () => {
    const trimmed = newCondition.trim();
    if (!trimmed) return;
    if (profile.medicalConditions.includes(trimmed)) {
      setNewCondition('');
      return;
    }
    const updated = [...profile.medicalConditions, trimmed];
    saveProfile({ ...profile, medicalConditions: updated });
    setNewCondition('');
  };

  const handleRemoveCondition = (condToRemove) => {
    const updated = profile.medicalConditions.filter((c) => c !== condToRemove);
    saveProfile({ ...profile, medicalConditions: updated });
  };

  const handleAddMedication = () => {
    if (!newMedName.trim()) return;
    const newEntry = {
      id: `med-hist-${Date.now()}`,
      name: newMedName.trim(),
      frequency: newMedFrequency || 'As prescribed',
      purpose: newMedPurpose.trim() || 'Health maintenance',
      status: 'Active',
      startDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    };

    const updatedMeds = [newEntry, ...(profile.medicationHistory || [])];
    saveProfile({ ...profile, medicationHistory: updatedMeds });
    setNewMedName('');
    setNewMedPurpose('');
    setShowAddMedModal(false);
  };

  const handleRemoveMedication = (id) => {
    const updatedMeds = (profile.medicationHistory || []).filter((m) => m.id !== id);
    saveProfile({ ...profile, medicationHistory: updatedMeds });
  };

  return (
    <div className="elder-profile-view">
      {/* Top Banner with live sync confirmation */}
      <div className="profile-sync-banner">
        <div className="sync-banner-left">
          <span className="sync-icon">
            {syncStatus === 'syncing' ? '🔄' : '✨'}
          </span>
          <div>
            <h2 className="sync-banner-title">Elder Health &amp; Care Profile</h2>
            <p className="sync-banner-subtitle">
              Changes sync directly to the Family Dashboard in real time
            </p>
          </div>
        </div>
        <div className="sync-status-badge">
          <span className={`sync-dot ${syncStatus === 'syncing' ? 'sync-dot-pulsing' : ''}`}></span>
          <span className="sync-status-text">
            {syncStatus === 'syncing'
              ? 'Syncing with Family...'
              : syncStatus === 'synced'
              ? '✓ Live Synced with Family'
              : 'Live Synced'}
          </span>
        </div>
      </div>

      <div className="profile-grid">
        {/* ============================================================
            SECTION 1: PERSONAL IDENTITY CARD
            ============================================================ */}
        <section className="profile-card profile-identity-card">
          <div className="profile-card-header">
            <div className="profile-card-icon-badge identity-badge">👤</div>
            <div>
              <h3 className="profile-card-title">Personal Information</h3>
              <p className="profile-card-sub">Elder's name, age, and identity details</p>
            </div>
          </div>

          <div className="profile-avatar-row">
            <div className="profile-avatar-large">
              <span className="profile-avatar-emoji">
                {profile.gender === 'Female' ? '👵' : profile.gender === 'Male' ? '👴' : '🧓'}
              </span>
              <span className="profile-avatar-badge">Active</span>
            </div>
            <div className="profile-avatar-meta">
              <span className="profile-name-preview">{profile.name || 'Kamala Devi'}</span>
              <span className="profile-meta-tags">
                <span className="profile-tag-pill">ID: elder_kamala_001</span>
                <span className="profile-tag-pill">{profile.gender}</span>
                <span className="profile-tag-pill">{profile.age} yrs</span>
              </span>
            </div>
          </div>

          <div className="profile-form-grid">
            <div className="profile-input-group">
              <label className="profile-label">
                Elder's Full Name
                <span className="profile-label-hint">(as shown to family &amp; 112)</span>
              </label>
              <input
                type="text"
                className="profile-text-input"
                value={profile.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Enter elder's name"
                maxLength={50}
              />
            </div>

            <div className="profile-input-group">
              <label className="profile-label">Age (Years)</label>
              <input
                type="number"
                className="profile-text-input"
                value={profile.age}
                onChange={(e) => handleAgeChange(e.target.value)}
                placeholder="e.g. 72"
                min="50"
                max="125"
              />
            </div>
          </div>

          <div className="profile-input-group mt-3">
            <label className="profile-label">Gender</label>
            <div className="gender-pill-selector">
              {['Female', 'Male', 'Other'].map((g) => (
                <button
                  key={g}
                  type="button"
                  className={`gender-btn ${profile.gender === g ? 'gender-btn-active' : ''}`}
                  onClick={() => handleGenderChange(g)}
                >
                  <span className="gender-btn-icon">
                    {g === 'Female' ? '👩' : g === 'Male' ? '👨' : '🧑'}
                  </span>
                  <span>{g}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================
            SECTION 2: DIABETES & SUGAR HEALTH TRACKER
            ============================================================ */}
        <section className="profile-card profile-sugar-card">
          <div className="profile-card-header">
            <div className="profile-card-icon-badge sugar-badge">🩸</div>
            <div>
              <h3 className="profile-card-title">Diabetes &amp; Sugar Health</h3>
              <p className="profile-card-sub">Blood sugar condition &amp; glucose monitoring</p>
            </div>
          </div>

          <div className="sugar-status-switch-row">
            <div className="sugar-switch-label">
              <span className="sugar-switch-main">Diagnosed with Diabetes?</span>
              <span className="sugar-switch-sub">
                {profile.diabetes?.hasDiabetes ? 'Yes, requires monitoring & diet' : 'No diagnosed diabetes'}
              </span>
            </div>
            <div className="segmented-toggle">
              <button
                type="button"
                className={`toggle-btn ${profile.diabetes?.hasDiabetes ? 'toggle-active-yes' : ''}`}
                onClick={() => handleDiabetesToggle(true)}
              >
                ✓ Yes
              </button>
              <button
                type="button"
                className={`toggle-btn ${!profile.diabetes?.hasDiabetes ? 'toggle-active-no' : ''}`}
                onClick={() => handleDiabetesToggle(false)}
              >
                ✕ No
              </button>
            </div>
          </div>

          {profile.diabetes?.hasDiabetes && (
            <div className="diabetes-details-box">
              <div className="profile-input-group">
                <label className="profile-label">Diabetes Classification</label>
                <div className="diabetes-types-row">
                  {['Type 2', 'Type 1', 'Pre-diabetic', 'Gestational'].map((dtype) => (
                    <button
                      key={dtype}
                      type="button"
                      className={`dtype-btn ${profile.diabetes?.type === dtype ? 'dtype-btn-active' : ''}`}
                      onClick={() => handleDiabetesTypeChange(dtype)}
                    >
                      {dtype}
                    </button>
                  ))}
                </div>
              </div>

              <div className="profile-form-grid mt-3">
                <div className="profile-input-group">
                  <label className="profile-label">
                    Recent Sugar Reading
                    <span className="profile-label-hint">(mg/dL)</span>
                  </label>
                  <div className="sugar-input-wrapper">
                    <input
                      type="text"
                      className="profile-text-input sugar-reading-input"
                      value={profile.diabetes?.sugarLevel || ''}
                      onChange={(e) => handleSugarReadingChange(e.target.value)}
                      placeholder="e.g. 130 mg/dL"
                    />
                    <span className="sugar-pill-tag">
                      {parseInt(profile.diabetes?.sugarLevel, 10) > 180
                        ? '⚠️ High'
                        : parseInt(profile.diabetes?.sugarLevel, 10) > 140
                        ? '🟡 Elevated'
                        : '🟢 In Range'}
                    </span>
                  </div>
                </div>

                <div className="profile-input-group">
                  <label className="profile-label">Reading Context</label>
                  <input
                    type="text"
                    className="profile-text-input"
                    value={profile.diabetes?.lastChecked || 'Today (Fasting)'}
                    onChange={(e) =>
                      saveProfile({
                        ...profile,
                        diabetes: { ...profile.diabetes, lastChecked: e.target.value },
                      })
                    }
                    placeholder="e.g. Fasting / 2h Post-Meal"
                  />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ============================================================
            SECTION 3: MEDICAL CONDITIONS
            ============================================================ */}
        <section className="profile-card profile-conditions-card">
          <div className="profile-card-header">
            <div className="profile-card-icon-badge conditions-badge">🩺</div>
            <div>
              <h3 className="profile-card-title">Medical Conditions</h3>
              <p className="profile-card-sub">Active conditions monitored by AI and care team</p>
            </div>
          </div>

          <div className="conditions-tags-wrap">
            {profile.medicalConditions.map((cond) => (
              <span key={cond} className="condition-chip">
                <span className="condition-dot"></span>
                <span className="condition-name">{cond}</span>
                <button
                  type="button"
                  className="condition-remove-btn"
                  onClick={() => handleRemoveCondition(cond)}
                  title={`Remove ${cond}`}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>

          <div className="add-condition-row">
            <input
              type="text"
              className="profile-text-input add-condition-input"
              value={newCondition}
              onChange={(e) => setNewCondition(e.target.value)}
              placeholder="Add health condition (e.g. Asthma, Osteoporosis)..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddCondition();
              }}
            />
            <button
              type="button"
              className="btn-add-condition"
              onClick={handleAddCondition}
              disabled={!newCondition.trim()}
            >
              + Add
            </button>
          </div>
        </section>

        {/* ============================================================
            SECTION 4: HISTORY OF MEDICATIONS (ELDER-MANAGED)
            ============================================================ */}
        <section className="profile-card profile-medhistory-card">
          <div className="profile-card-header">
            <div className="profile-card-icon-badge meds-badge">💊</div>
            <div>
              <h3 className="profile-card-title">History of Medications</h3>
              <p className="profile-card-sub">
                Managed by elder &amp; caregiver • Add or remove medications as prescriptions change
              </p>
            </div>
            <button
              type="button"
              className="btn-open-add-med"
              onClick={() => setShowAddMedModal(true)}
            >
              + Add Medicine
            </button>
          </div>

          {/* Add Medication Modal / Form */}
          {showAddMedModal && (
            <div className="add-med-panel">
              <div className="add-med-panel-header">
                <h4 className="add-med-title">➕ Add Medicine to History</h4>
                <button
                  type="button"
                  className="add-med-close"
                  onClick={() => setShowAddMedModal(false)}
                >
                  ✕
                </button>
              </div>
              <div className="add-med-fields">
                <div className="profile-input-group">
                  <label className="profile-label">Medicine Name &amp; Strength</label>
                  <input
                    type="text"
                    className="profile-text-input"
                    value={newMedName}
                    onChange={(e) => setNewMedName(e.target.value)}
                    placeholder="e.g. Telmisartan 40mg"
                  />
                </div>
                <div className="profile-input-group">
                  <label className="profile-label">Dosage &amp; Frequency</label>
                  <select
                    className="profile-text-input profile-select"
                    value={newMedFrequency}
                    onChange={(e) => setNewMedFrequency(e.target.value)}
                  >
                    <option value="Once daily (Morning)">Once daily (Morning)</option>
                    <option value="Once daily (Night)">Once daily (Night)</option>
                    <option value="Twice daily after meals">Twice daily after meals</option>
                    <option value="Three times daily">Three times daily</option>
                    <option value="Once weekly">Once weekly</option>
                    <option value="As needed (SOS)">As needed (SOS)</option>
                  </select>
                </div>
                <div className="profile-input-group">
                  <label className="profile-label">Purpose / Doctor Note (Optional)</label>
                  <input
                    type="text"
                    className="profile-text-input"
                    value={newMedPurpose}
                    onChange={(e) => setNewMedPurpose(e.target.value)}
                    placeholder="e.g. For blood pressure control"
                  />
                </div>
                <div className="add-med-actions">
                  <button
                    type="button"
                    className="btn-save-med"
                    onClick={handleAddMedication}
                    disabled={!newMedName.trim()}
                  >
                    ✓ Save to Medication History
                  </button>
                  <button
                    type="button"
                    className="btn-cancel-med"
                    onClick={() => setShowAddMedModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* History List */}
          <div className="med-history-list">
            {(profile.medicationHistory || []).length === 0 ? (
              <div className="med-history-empty">
                <span className="empty-icon">💊</span>
                <span className="empty-text">No medication history recorded yet.</span>
                <span className="empty-sub">Tap "+ Add Medicine" above to record prescribed medicines.</span>
              </div>
            ) : (
              (profile.medicationHistory || []).map((med) => (
                <div key={med.id} className="med-history-item">
                  <div className="med-hist-icon">💊</div>
                  <div className="med-hist-content">
                    <div className="med-hist-top">
                      <span className="med-hist-name">{med.name}</span>
                      <span className="med-hist-status-pill">{med.status || 'Active'}</span>
                    </div>
                    <div className="med-hist-details">
                      <span className="med-hist-freq">⏱️ {med.frequency}</span>
                      {med.purpose && <span className="med-hist-purpose">• {med.purpose}</span>}
                    </div>
                    {med.startDate && (
                      <span className="med-hist-date">Started: {med.startDate}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="med-hist-delete-btn"
                    onClick={() => handleRemoveMedication(med.id)}
                    title={`Delete ${med.name} from history`}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Bottom Floating Save / Synced Bar */}
      <div className="profile-bottom-bar">
        <div className="bottom-sync-info">
          <span className="bottom-sync-icon">📡</span>
          <span>
            Profile automatically saves &amp; synchronizes across all devices &amp; Priya's Family Dashboard.
          </span>
        </div>
        <button
          type="button"
          className="btn-explicit-sync"
          onClick={() => saveProfile(profile)}
        >
          💾 Sync Now to Family Dashboard
        </button>
      </div>
    </div>
  );
}
