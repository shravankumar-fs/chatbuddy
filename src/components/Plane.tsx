import React from 'react';
import { extend } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import { glsl } from '../shaderTransformer';

const vertexShader = `
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  void main() {
    gl_FragColor = vec4(0.5, 0.5, 0.5, 1.0);
  }
`;
console.log(
  glsl({
    uniforms: { u_time: 'float', u_resolution: 'vec2' },
    main: ({ gl_FragCoord, uniform }) => {
      const uv = gl_FragCoord.xy.div(uniform('u_resolution'));
      const result = uv.x;
      return result;
    },
  })
);
const Plane = () => {
  return (
    <mesh position={[0, 0, 0]}>
      <planeGeometry args={[3, 3]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={glsl({
          uniforms: { u_time: 'float', u_resolution: 'vec2' },
          main: ({ gl_FragCoord, uniform }) => {
            const uv = gl_FragCoord.xy.div(uniform('u_resolution'));
            const result = uv.x;
            return result;
          },
        })}
      />
    </mesh>
  );
};

export default Plane;
