"use client";

import { Canvas, type ThreeEvent, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { ROOM_SEATS, type RoomSeat } from "../lib/room-layout";
import {
  canSelectSeat,
  getCameraPose,
  type CameraCommand,
} from "../lib/camera-controls";

type RoomSceneProps = {
  selectedSeat: string | null;
  occupants: Record<string, string>;
  showNames: boolean;
  navigationEnabled: boolean;
  cameraCommand: CameraCommand;
  onSelectSeat: (seat: string) => void;
  onFailure: () => void;
};

type Point = [number, number, number];
function Block({
  position,
  size,
  color,
  ...props
}: {
  position: Point;
  size: Point;
  color: string;
  castShadow?: boolean;
  receiveShadow?: boolean;
}) {
  return (
    <mesh position={position} castShadow receiveShadow {...props}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.78} />
    </mesh>
  );
}

function Workstation({
  seat,
  selected,
  occupant,
  showNames,
  navigationEnabled,
  onSelect,
}: {
  seat: RoomSeat;
  selected: boolean;
  occupant?: string;
  showNames: boolean;
  navigationEnabled: boolean;
  onSelect: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const select = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (canSelectSeat(navigationEnabled, event.delta)) onSelect(seat.id);
  };
  const active = selected || hovered;
  return (
    <group
      position={seat.position}
      onClick={select}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      {/* Desktops and privacy panels follow the instructor-facing edge. */}
      <Block
        position={[0, 0.87, 0]}
        size={[1.38, 0.1, 0.82]}
        color={active ? "#98b8f2" : "#cbb98e"}
      />
      <Block
        position={[0, 0.67, -0.37]}
        size={[1.38, 0.68, 0.065]}
        color={active ? "#749ce2" : "#b7a77f"}
      />
      <Block
        position={[-0.59, 0.41, 0.1]}
        size={[0.055, 0.82, 0.57]}
        color="#52544f"
      />
      <Block
        position={[0.59, 0.41, 0.1]}
        size={[0.055, 0.82, 0.57]}
        color="#52544f"
      />
      <Block
        position={[-0.16, 1.22, -0.13]}
        size={[0.63, 0.42, 0.065]}
        color="#252b2b"
      />
      <Block
        position={[-0.16, 1.23, -0.088]}
        size={[0.55, 0.33, 0.013]}
        color="#425451"
      />
      <Block
        position={[-0.16, 1, -0.13]}
        size={[0.055, 0.2, 0.055]}
        color="#343a38"
      />
      <Block
        position={[-0.16, 0.935, -0.08]}
        size={[0.27, 0.025, 0.17]}
        color="#343a38"
      />
      <Block
        position={[0.47, 1.095, -0.09]}
        size={[0.2, 0.36, 0.34]}
        color="#303432"
      />
      <Block
        position={[-0.17, 0.935, 0.25]}
        size={[0.45, 0.022, 0.15]}
        color="#414541"
      />
      <Block
        position={[0.19, 0.935, 0.24]}
        size={[0.07, 0.025, 0.1]}
        color="#343934"
      />
      {/* The student sits behind the desk, facing negative Z. */}
      <Block
        position={[0, 0.51, 0.68]}
        size={[0.52, 0.11, 0.5]}
        color="#363c39"
      />
      <Block
        position={[0, 0.86, 0.94]}
        size={[0.5, 0.62, 0.085]}
        color="#303733"
      />
      <Block
        position={[0, 0.25, 0.67]}
        size={[0.07, 0.5, 0.07]}
        color="#4d534f"
      />
      <Block
        position={[0, 0.08, 0.67]}
        size={[0.57, 0.05, 0.06]}
        color="#363c39"
      />
      <Block
        position={[0, 0.08, 0.67]}
        size={[0.06, 0.05, 0.52]}
        color="#363c39"
      />
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0.3]}>
          <ringGeometry args={[0.67, 0.73, 40]} />
          <meshBasicMaterial color="#245adb" />
        </mesh>
      )}
      <Html
        center
        position={[0, 1.63, -0.05]}
        zIndexRange={[20, 0]}
        style={{ pointerEvents: "none" }}
      >
        <div
          className={`seat-marker${selected ? " is-selected" : ""}${occupant ? " is-occupied" : ""}`}
          style={{
            background: selected ? "#245adb" : "rgba(250,248,240,.94)",
            color: selected ? "#fff" : "#555d50",
            padding: "3px 5px",
            borderRadius: 4,
            fontSize: 9,
            fontWeight: 600,
            whiteSpace: "nowrap",
            border: "1px solid rgba(92,98,83,.18)",
            boxShadow: "0 1px 3px #0000000d",
          }}
        >
          {seat.id}
          {occupant && (
            <span
              aria-hidden="true"
              style={{ color: selected ? "#fff" : "#718773", marginLeft: 4 }}
            >
              ●
            </span>
          )}
          {occupant && (showNames || active) && (
            <div
              style={{
                fontSize: 10,
                marginTop: 3,
                maxWidth: 150,
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {occupant}
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}

function RoomShell() {
  const wall = "#e4e1d3";
  const frame = "#454b44";
  return (
    <group scale={[-1, 1, 1]}>
      <Block position={[0.7, -0.16, 0]} size={[13, 0.3, 15]} color="#b4b6ac" />
      {/* Thin grout lines keep the tile grid legible without image textures. */}
      {Array.from({ length: 14 }, (_, index) => (
        <Block
          key={`x${index}`}
          position={[-5.8 + index, 0.002, 0]}
          size={[0.012, 0.008, 15]}
          color="#989d95"
          castShadow={false}
        />
      ))}
      {Array.from({ length: 16 }, (_, index) => (
        <Block
          key={`z${index}`}
          position={[0.7, 0.003, -7.5 + index]}
          size={[13, 0.008, 0.012]}
          color="#989d95"
          castShadow={false}
        />
      ))}
      <Block position={[0.7, 1.6, 7.5]} size={[13, 3.2, 0.16]} color={wall} />
      <Block position={[-5.8, 0.52, 0]} size={[0.15, 1.04, 15]} color={wall} />
      <Block position={[7.2, 0.85, 0]} size={[0.15, 1.7, 15]} color={wall} />
      <Block position={[-5.8, 3.05, 0]} size={[0.16, 0.3, 15]} color={wall} />
      <Block position={[7.2, 3.05, 0]} size={[0.16, 0.3, 15]} color={wall} />
      {[-6.4, -3.8, -1.2, 1.4, 4, 6.6].map((z) => (
        <group key={z}>
          <Block
            position={[-5.8, 1.99, z]}
            size={[0.08, 1.83, 2.22]}
            color="#c0d0c3"
          />
          <Block
            position={[-5.69, 2.02, z - 1.11]}
            size={[0.12, 1.94, 0.065]}
            color={frame}
          />
          <Block
            position={[-5.69, 2.02, z + 1.11]}
            size={[0.12, 1.94, 0.065]}
            color={frame}
          />
          <Block
            position={[-5.69, 2.02, z]}
            size={[0.1, 1.94, 0.035]}
            color={frame}
          />
          <Block
            position={[-5.69, 1.08, z]}
            size={[0.13, 0.07, 2.28]}
            color={frame}
          />
          <Block
            position={[-5.69, 2.96, z]}
            size={[0.13, 0.07, 2.28]}
            color={frame}
          />
          <Block
            position={[7.12, 2.34, z]}
            size={[0.08, 1.08, 2.24]}
            color="#bcc4bb"
          />
          <Block
            position={[7.05, 1.79, z]}
            size={[0.12, 0.065, 2.33]}
            color={frame}
          />
          <Block
            position={[7.05, 2.88, z]}
            size={[0.12, 0.065, 2.33]}
            color={frame}
          />
          <Block
            position={[7.05, 2.34, z - 1.15]}
            size={[0.12, 1.1, 0.065]}
            color={frame}
          />
          <Block
            position={[7.05, 2.34, z + 1.15]}
            size={[0.12, 1.1, 0.065]}
            color={frame}
          />
        </group>
      ))}
      <Block
        position={[5.9, 1.2, 7.39]}
        size={[1.14, 2.4, 0.07]}
        color="#a7997c"
      />
      <Block
        position={[5.9, 1.73, 7.33]}
        size={[0.76, 0.79, 0.06]}
        color="#9aa69e"
      />
      <Block
        position={[5.48, 1.08, 7.28]}
        size={[0.07, 0.13, 0.05]}
        color="#42463e"
      />
      <Block
        position={[1.0, 2.2, 7.36]}
        size={[3.9, 1.45, 0.08]}
        color="#d0d3c4"
      />
      <Block
        position={[1.0, 2.2, 7.3]}
        size={[3.72, 1.27, 0.04]}
        color="#eff0e7"
      />
      <Block
        position={[-0.8, 0.88, -6.2]}
        size={[2.7, 0.12, 1.05]}
        color="#bba77d"
      />
      <Block
        position={[-0.8, 0.43, -6.56]}
        size={[2.7, 0.8, 0.09]}
        color="#a18f69"
      />
      <Block
        position={[-1.9, 0.43, -6.2]}
        size={[0.07, 0.86, 0.9]}
        color="#505749"
      />
      <Block
        position={[0.3, 0.43, -6.2]}
        size={[0.07, 0.86, 0.9]}
        color="#505749"
      />
      <Block
        position={[-0.8, 1.2, -6.14]}
        size={[0.71, 0.43, 0.055]}
        color="#353d36"
      />
      <Block
        position={[-0.8, 1.0, -6.14]}
        size={[0.075, 0.2, 0.075]}
        color="#353d36"
      />
    </group>
  );
}

function CameraRig({
  navigationEnabled,
  command,
  onFailure,
}: {
  navigationEnabled: boolean;
  command: CameraCommand;
  onFailure: () => void;
}) {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera, gl, invalidate } = useThree();
  useEffect(() => {
    const pose = getCameraPose(command);
    camera.position.set(...pose.position);
    camera.lookAt(...pose.target);
    controls.current?.target.set(...pose.target);
    controls.current?.update();
    invalidate();
  }, [camera, command, invalidate]);
  useEffect(() => {
    const canvas = gl.domElement;
    const handleLoss = (event: Event) => {
      event.preventDefault();
      onFailure();
    };
    canvas.addEventListener("webglcontextlost", handleLoss);
    return () => canvas.removeEventListener("webglcontextlost", handleLoss);
  }, [gl, onFailure]);
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enabled={navigationEnabled}
      enableRotate={navigationEnabled}
      enablePan={navigationEnabled}
      enableZoom={navigationEnabled}
      enableDamping={false}
      minDistance={3}
      maxDistance={38}
      maxPolarAngle={Math.PI / 2 - 0.035}
      minPolarAngle={0.01}
    />
  );
}

export default function RoomScene(props: RoomSceneProps) {
  const {onFailure}=props;
  const [supported] = useState(() => {
    try {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("webgl2");
      if (!context) return false;
      context.getExtension("WEBGL_lose_context")?.loseContext();
      return true;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (!supported) onFailure();
  }, [supported, onFailure]);
  const initial = getCameraPose({ preset: "reset" });
  if (!supported) return <p role="status">Opening the 2D seating map…</p>;
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      frameloop="demand"
      camera={{ position: initial.position, fov: 43, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: true }}
      style={{ touchAction: props.navigationEnabled ? "none" : "auto" }}
      fallback={<p>3D is unavailable. Switch to the 2D map.</p>}
    >
      <ambientLight intensity={1.3} />
      <hemisphereLight args={["#f7f4e8", "#959d83", 1.6]} />
      <directionalLight
        position={[-8, 14, -5]}
        intensity={2.3}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-normalBias={0.04}
        shadow-bias={-0.0002}
      />
      <RoomShell />
      {ROOM_SEATS.map((seat) => (
        <Workstation
          key={seat.id}
          seat={seat}
          selected={props.selectedSeat === seat.id}
          occupant={props.occupants[seat.id]}
          showNames={props.showNames}
          navigationEnabled={props.navigationEnabled}
          onSelect={props.onSelectSeat}
        />
      ))}
      <CameraRig
        navigationEnabled={props.navigationEnabled}
        command={props.cameraCommand}
        onFailure={props.onFailure}
      />
    </Canvas>
  );
}
