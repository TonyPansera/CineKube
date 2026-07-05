'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function Dashboard() {
  const [dates, setDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

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
  }, []);

  useEffect(() => {
    if (selectedDate) {
      setImages([]);
      fetch(`/api/images-list?date=${selectedDate}`)
        .then(res => res.json())
        .then(data => setImages(data.images || []));
    }
  }, [selectedDate]);

  return (
    <div className="container">
      <header className="header">
        <h1 className="title">CineKube Visuals</h1>
        <p className="subtitle">Explore your generated cinema posters</p>
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
              <a href={`/api/zip?date=${selectedDate}`} className="zip-btn" download>
                📥 Télécharger tout ({selectedDate}) en .zip
              </a>
            </div>
            <div className="grid">
              {images.map(img => (
                <div className="card" key={img}>
                  <div className="card-img-container">
                    <Image 
                      src={`/api/image?path=${selectedDate}/${img}`} 
                      alt={img} 
                      width={180}
                      height={225}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      unoptimized={false}
                    />
                  </div>
                  <div className="card-content">
                    <div className="card-title">{img.replace('.png', '').replace(/_/g, ' ')}</div>
                    <a 
                      href={`/api/image?path=${selectedDate}/${img}`} 
                      download={img}
                      className="download-btn"
                    >
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
