import { describe, expect, it } from 'vitest';
import { ASPECT_MANUAL, Camera, Entity, Mat4, Vec3, Vec4 } from 'playcanvas';
import {
  getFloorWorldTransform, getHighlightWorldToFloorTransform, getWorldToFloorTransform,
  getFloorFragmentHighlightMask, getFloorFragmentLocalY, getFloorHighlightProjection,
  REVERANCE_BLOCK_FLOOR_VOLUMES, REVERANCE_FLOOR_PICK_HALF_SIZE,
  REVERANCE_FLOOR_HIGHLIGHT_HEIGHT, pickFloorFromScreen, pickBlockFloorFromScreen,
} from './reveranceFloorHighlight';

const size = 1000;
function cameraAt(position, target) {
  const entity = new Entity();
  entity.setPosition(position);
  entity.lookAt(target);
  const camera = new Camera(null);
  camera.aspectRatioMode = ASPECT_MANUAL;
  camera.aspectRatio = 1;
  camera.fov = 41;
  camera.nearClip = .1;
  camera.farClip = 50;
  camera.node = entity;
  entity.camera = {
    nearClip: .1, farClip: 50,
    worldToScreen: (p,out) => camera.worldToScreen(p,size,size,out),
    screenToWorld: (x,y,z,out) => camera.screenToWorld(x,y,z,size,size,out),
  };
  return entity;
}

// Façade corners measured independently from the SOG means textures.
const corners = {
  ReveranceA: [[.361,.364],[.881,.096],[.473,-.701],[-.047,-.433]],
  ReveranceB: [[-.689,.904],[-.169,.636],[-.577,-.161],[-1.097,.107]],
};
describe('both Reverance tower footprints', () => {
  it.each(Object.keys(corners))('contains every measured façade corner of %s', block => {
    const inverse = getWorldToFloorTransform(REVERANCE_BLOCK_FLOOR_VOLUMES[block][8]);
    for (const [x,z] of corners[block]) {
      const local = inverse.transformPoint(new Vec3(x, -.19, z));
      expect(Math.abs(local.x)).toBeLessThan(REVERANCE_FLOOR_PICK_HALF_SIZE[0]);
      expect(Math.abs(local.z)).toBeLessThan(REVERANCE_FLOOR_PICK_HALF_SIZE[2]);
    }
  });
  it('uses identical boundaries for tint and picking, with no overlaps or gaps', () => {
    for (const volumes of Object.values(REVERANCE_BLOCK_FLOOR_VOLUMES)) {
      volumes.forEach((volume,i) => {
        expect(Array.from(getHighlightWorldToFloorTransform(volume).data)).toEqual(Array.from(getWorldToFloorTransform(volume).data));
        if (!i) return;
        const lower = getFloorWorldTransform(volume).transformPoint(new Vec3(0,-REVERANCE_FLOOR_HIGHLIGHT_HEIGHT/2,0));
        const upper = getFloorWorldTransform(volumes[i-1]).transformPoint(new Vec3(0,REVERANCE_FLOOR_HIGHLIGHT_HEIGHT/2,0));
        expect(lower.distance(upper)).toBeLessThan(1e-6);
      });
    }
  });
  for (const block of Object.keys(corners)) {
    it.each([0,45,90,135,180,225,270,315])('picks every storey across visible '+block+' façade at %s°', yaw => {
      const volumes = REVERANCE_BLOCK_FLOOR_VOLUMES[block];
      const mid = getFloorWorldTransform(volumes[7]);
      const t = yaw*Math.PI/180;
      const camera = cameraAt(mid.transformPoint(new Vec3(Math.cos(t)*4,.1,Math.sin(t)*4)),mid.transformPoint(Vec3.ZERO));
      for (const volume of volumes) {
        for (const across of [-.8,0,.8]) {
          const half=REVERANCE_FLOOR_PICK_HALF_SIZE;
          // Sample the visible surface, not a hidden point inside the tower.
          const local = Math.abs(Math.cos(t)) > Math.abs(Math.sin(t))
            ? new Vec3(Math.sign(Math.cos(t))*half[0],0,across*half[2])
            : new Vec3(across*half[0],0,Math.sign(Math.sin(t))*half[2]);
          const screen=camera.camera.worldToScreen(getFloorWorldTransform(volume).transformPoint(local),new Vec3());
          expect(pickFloorFromScreen(camera,screen.x,screen.y,size,size,volumes)).toBe(volume.number);
        }
      }
    });
  }
  it.each(Object.keys(corners))('selects correct block and floor from outer façade of %s', block => {
    const volumes=REVERANCE_BLOCK_FLOOR_VOLUMES[block];
    const mid=getFloorWorldTransform(volumes[7]);
    const sign=block==='ReveranceA'?1:-1;
    const camera=cameraAt(mid.transformPoint(new Vec3(sign*4,0,0)),mid.transformPoint(Vec3.ZERO));
    for(const volume of volumes) {
      const p=getFloorWorldTransform(volume).transformPoint(new Vec3(sign*REVERANCE_FLOOR_PICK_HALF_SIZE[0],0,0));
      const s=camera.camera.worldToScreen(p,new Vec3());
      expect(pickBlockFloorFromScreen(camera,s.x,s.y,size,size)).toEqual({blockId:block,floor:volume.number});
    }
  });
  it('selects the front tower when the rear one is occluded', () => {
    const a=getFloorWorldTransform(REVERANCE_BLOCK_FLOOR_VOLUMES.ReveranceA[8]).transformPoint(Vec3.ZERO);
    const b=getFloorWorldTransform(REVERANCE_BLOCK_FLOOR_VOLUMES.ReveranceB[8]).transformPoint(Vec3.ZERO);
    const camera=cameraAt(a.clone().add(a.clone().sub(b).normalize().mulScalar(4)),b);
    const p=camera.camera.worldToScreen(b,new Vec3());
    expect(pickBlockFloorFromScreen(camera,p.x,p.y,size,size)).toEqual({blockId:'ReveranceA',floor:10});
  });
  it('rejects the gap between towers, sky, and points beyond the canvas', () => {
    const a=getFloorWorldTransform(REVERANCE_BLOCK_FLOOR_VOLUMES.ReveranceA[8]).transformPoint(Vec3.ZERO);
    const b=getFloorWorldTransform(REVERANCE_BLOCK_FLOOR_VOLUMES.ReveranceB[8]).transformPoint(Vec3.ZERO);
    const gap=a.clone().add(b).mulScalar(.5);
    const camera=cameraAt(gap.clone().add(new Vec3(2,0,4)),gap);
    const p=camera.camera.worldToScreen(gap,new Vec3());
    expect(pickBlockFloorFromScreen(camera,p.x,p.y,size,size)).toBeNull();
    expect(pickBlockFloorFromScreen(camera,500,10,size,size)).toBeNull();
    expect(pickBlockFloorFromScreen(camera,-1,500,size,size)).toBeNull();
    expect(pickBlockFloorFromScreen(camera,NaN,500,size,size)).toBeNull();
  });
});
describe('per-fragment floor clipping', () => {
  it('clips oversized Gaussians at both edges, including centres outside the storey', () => {
    const h=REVERANCE_FLOOR_HIGHLIGHT_HEIGHT/2;
    expect(getFloorFragmentHighlightMask(0,.001)).toBe(1);
    expect(getFloorFragmentHighlightMask(h+.00001,.001)).toBe(0);
    expect(getFloorFragmentHighlightMask(-h-.00001,.001)).toBe(0);
    expect(getFloorFragmentHighlightMask(0,.001,0)).toBe(0);
    const y=getFloorFragmentLocalY(.15,3,[0,-50],[0,.001]);
    expect(getFloorFragmentHighlightMask(y,.001)).toBe(1);
  });
  it.each([0,55,180,235])('reconstructs fragment height at orbit %s°', angle => {
    const floor=REVERANCE_BLOCK_FLOOR_VOLUMES.ReveranceB[9];
    const transform=getFloorWorldTransform(floor);
    const t=angle*Math.PI/180;
    const camera=cameraAt(new Vec3(Math.cos(t)*4,.1,Math.sin(t)*4),transform.transformPoint(Vec3.ZERO));
    const vp=new Mat4().mul2(new Mat4().setPerspective(41,1,.1,50,false),camera.getWorldTransform().clone().invert());
    const inverse=getWorldToFloorTransform(floor);
    const {pixelToLocalY,worldToClipW}=getFloorHighlightProjection(vp,inverse,size,size);
    const p=transform.transformPoint(new Vec3(.1,.01,.2));
    const clip=vp.transformVec4(new Vec4(p.x,p.y,p.z,1));
    const w=worldToClipW[0]*p.x+worldToClipW[1]*p.y+worldToClipW[2]*p.z+worldToClipW[3];
    for(const [dx,dy] of [[17,-11],[-23,19]]) {
      const shifted=vp.clone().invert().transformVec4(new Vec4(clip.x+2*dx*w/size,clip.y+2*dy*w/size,clip.z,w));
      const expected=inverse.transformPoint(new Vec3(shifted.x/shifted.w,shifted.y/shifted.w,shifted.z/shifted.w)).y;
      expect(getFloorFragmentLocalY(.01,w,[dx,dy],pixelToLocalY)).toBeCloseTo(expected,5);
    }
  });
});
