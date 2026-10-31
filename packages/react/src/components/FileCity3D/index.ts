/**
 * FileCity3D - 3D visualization component
 */

export {
  FileCity3D,
  resetCamera,
  getCameraAngle,
  getCameraPosition,
  getCameraTarget,
  getCameraTilt,
  rotateCameraTo,
  rotateCameraBy,
  tiltCameraTo,
  tiltCameraBy,
  moveCameraTo,
  setCameraFlatView,
  setCameraTarget,
  DEFAULT_FLAT_PATTERNS,
  DEFAULT_CAMERA_CONTROLS,
  CitySourceLabel,
  projectToCanvas,
} from './FileCity3D';
export type {
  FileCity3DProps,
  CitySource,
  SafeArea,
  AnimationConfig,
  HighlightLayer,
  LayerItem,
  LayerRenderStrategy,
  IsolationMode,
  HeightScaling,
  FlatPattern,
  ElevatedScopePanel,
  SelectionStyle,
  CityData,
  CityBuilding,
  CityDistrict,
  CameraControlsConfig,
  MouseDragAction,
  TouchOneAction,
  TouchTwoAction,
  WheelAction,
  OnCameraFrame,
  CanvasPoint,
} from './FileCity3D';

export { CityContent, calculateBuildingHeight } from './CityContent';
export type { CityContentProps } from './CityContent';
export { CityLights } from './CityLights';
export type { CityLightsProps } from './CityLights';
