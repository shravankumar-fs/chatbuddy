import { CustomMaterial } from './App';
declare global {
  namespace JSX {
    interface IntrinsicElements {
      customMaterial: ReactThreeFiber.Object3DNode<CustomMaterial, typeof CustomMaterial>;
    }
  }
}
