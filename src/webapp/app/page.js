'use client';
import { useState, useEffect } from 'react';

function formatBytes(bytes) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

const R2_FREE_TIER_BYTES = 10 * 1024 ** 3; // 10 GB

export default function Dashboard() {
  const [dates, setDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [storage, setStorage] = useState(null);
  const [selected, setSelected] = useState(() => new Set());
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetch('/api/dates')
      .then(res => res.json())
      .then(data => {
        if (data.dates && data.dates.length > 0) {
          setDates(data.dates);
          setSelectedDate(data.dates[0]);
        }
        setLoading(false);
      });

    fetch('/api/storage')
      .then(res => res.json())
      .then(data => {
        if (typeof data.usedBytes === 'number') setStorage(data.usedBytes);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedDate) {
      setImages([]);
      setSelected(new Set());
      fetch(`/api/images-list?date=${selectedDate}`)
        .then(res => res.json())
        .then(data => setImages(data.images || []));
    }
  }, [selectedDate]);

  const toggleSelect = name => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const allSelected = images.length > 0 && selected.size === images.length;

  const toggleSelectAll = () => {
    setSelected(allSelected ? new Set() : new Set(images.map(img => img.name)));
  };

  const downloadSelection = async () => {
    if (selected.size === 0 || downloading) return;
    setDownloading(true);
    try {
      const res = await fetch('/api/zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, names: [...selected] }),
      });
      if (!res.ok) {
        alert('Échec de la génération du zip');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cinekube-visuals-${selectedDate}-selection.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Échec de la génération du zip');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="container">
      <header className="header">
        <h1 className="title">CineKube Visuals</h1>
        <p className="subtitle">Explore your generated cinema posters</p>
        {storage !== null && (
          <div className="storage">
            <div className="storage-label">
              Stockage R2 : {formatBytes(storage)} / 10 GB
            </div>
            <div className="storage-track">
              <div
                className="storage-fill"
                style={{ width: `${Math.min(100, (storage / R2_FREE_TIER_BYTES) * 100).toFixed(1)}%` }}
              />
            </div>
          </div>
        )}
      </header>

      {loading ? (
        <div style={{textAlign: 'center', opacity: 0.5}}>Loading visuals...</div>
      ) : dates.length === 0 ? (
        <div style={{textAlign: 'center', opacity: 0.5}}>No visuals generated yet. Run the cronjob!</div>
      ) : (
        <div className="dashboard">
          <aside className="sidebar">
            {dates.map(date => (
              <button
                key={date}
                className={`date-btn ${selectedDate === date ? 'active' : ''}`}
                onClick={() => setSelectedDate(date)}
              >
                {date}
              </button>
            ))}
          </aside>

          <main className="main-content">
            <div className="action-bar">
              <div className="action-bar-group">
                {images.length > 0 && (
                  <button className="select-toggle" onClick={toggleSelectAll}>
                    {allSelected ? 'Effacer la sélection' : 'Tout sélectionner'}
                  </button>
                )}
              </div>
              <div className="action-bar-group">
                <button
                  className="zip-btn"
                  disabled={selected.size === 0 || downloading}
                  onClick={downloadSelection}
                >
                  {downloading
                    ? 'Préparation…'
                    : `📦 Télécharger la sélection (${selected.size})`}
                </button>
                <a href={`/api/zip?date=${selectedDate}`} className="zip-btn">
                  📥 Télécharger tout ({selectedDate}) en .zip
                </a>
              </div>
            </div>
            <div className="grid">
              {images.map(img => (
                <div
                  className={`card ${selected.has(img.name) ? 'selected' : ''}`}
                  key={img.name}
                >
                  <div className="card-img-container">
                    <input
                      type="checkbox"
                      className="card-checkbox"
                      checked={selected.has(img.name)}
                      onChange={() => toggleSelect(img.name)}
                      aria-label={`Sélectionner ${img.name}`}
                    />
                    <img
                      src={img.thumbUrl}
                      alt={img.name}
                      loading="lazy"
                      className="card-img"
                      onClick={() => toggleSelect(img.name)}
                    />
                  </div>
                  <div className="card-content">
                    <div className="card-title">{img.name.replace(/_/g, ' ')}</div>
                    <a href={img.fullUrl} className="download-btn">
                      Save
                    </a>
                  </div>
                </div>
              ))}
            </div>
            {images.length === 0 && (
              <div style={{textAlign: 'center', opacity: 0.5, marginTop: '2rem'}}>No images found for this date.</div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
