import { useState } from 'react';
import ElderScreen from './components/ElderScreen';
import SplashScreen from './components/SplashScreen';
import './index.css';

/**
 * App shell — single-screen elder tablet PWA with 3D medical splash animation.
 */
function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      <ElderScreen />
    </>
  );
}

export default App;
