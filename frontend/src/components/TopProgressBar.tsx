import React, { useEffect, useState } from 'react';
import axios from 'axios';

const TopProgressBar: React.FC = () => {
  const [active, setActive]     = useState(false);
  const [progress, setProgress] = useState(0);
  const [offline, setOffline]   = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const reqInterceptor = axios.interceptors.request.use(config => {
      setActive(true);
      setProgress(10);
      interval = setInterval(() => {
        setProgress(p => p < 85 ? p + Math.random() * 8 : p);
      }, 200);
      return config;
    });

    const resInterceptor = axios.interceptors.response.use(
      response => {
        clearInterval(interval);
        setOffline(false);
        setProgress(100);
        setTimeout(() => { setActive(false); setProgress(0); }, 400);
        return response;
      },
      error => {
        clearInterval(interval);
        setProgress(100);
        if (!error.response) setOffline(true);
        setTimeout(() => { setActive(false); setProgress(0); }, 400);
        return Promise.reject(error);
      }
    );

    return () => {
      clearInterval(interval);
      axios.interceptors.request.eject(reqInterceptor);
      axios.interceptors.response.eject(resInterceptor);
    };
  }, []);

  return (
    <>
      {/* Progress bar */}
      {active && (
        <div style={{ position:'fixed', top:0, left:0, right:0, height:3, zIndex:9999, background:'transparent' }}>
          <div style={{
            height:'100%',
            width:`${progress}%`,
            background:'linear-gradient(90deg,#3b82f6,#60a5fa)',
            transition: progress === 100 ? 'width 0.2s ease' : 'width 0.4s ease',
            borderRadius:'0 2px 2px 0',
            boxShadow:'0 0 8px rgba(59,130,246,0.7)',
          }}/>
        </div>
      )}

      {/* Offline banner */}
      {offline && (
        <div style={{
          position:'fixed', top:0, left:0, right:0, zIndex:9998,
          background:'#EF4444', color:'#fff',
          padding:'8px 20px', textAlign:'center',
          fontSize:13, fontWeight:600,
          boxShadow:'0 2px 8px rgba(0,0,0,0.2)',
        }}>
          ⚠ Backend non disponible — Vérifiez que le serveur tourne sur le port 8000
          <button onClick={() => setOffline(false)} style={{ marginLeft:16, background:'rgba(255,255,255,0.2)', border:'none', borderRadius:4, color:'#fff', padding:'2px 10px', cursor:'pointer', fontWeight:700 }}>×</button>
        </div>
      )}
    </>
  );
};

export default TopProgressBar;
