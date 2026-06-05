import { CameraLayer } from './components/CameraLayer';
import { ElementScene } from './components/ElementScene';
import { StageHud } from './components/StageHud';
import { StartOverlay } from './components/StartOverlay';
import { TopLinks } from './components/TopLinks';

export default function App() {
  return (
    <>
      <CameraLayer />
      <ElementScene />
      <StageHud />
      <StartOverlay />
      <TopLinks />
    </>
  );
}
