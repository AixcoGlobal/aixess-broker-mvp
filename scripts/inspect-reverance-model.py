"""Read the accepted SOG coordinates for hover calibration (does not edit the model)."""
import io, json, zipfile
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
out = root / 'output' / 'playwright'
out.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(root / 'public/assets/reverance-3d/reverance-official-97.sog') as z:
    meta = json.loads(z.read('meta.json'))
    def pixels(name):
        return np.asarray(Image.open(io.BytesIO(z.read(name))).convert('RGBA')).reshape(-1,4)[:meta['count']]
    lo, hi = [pixels(n)[:,:3].astype(float) for n in meta['means']['files']]
    normalized = (lo + hi * 256) / 65535
    logs = np.array(meta['means']['mins']) + normalized * (np.array(meta['means']['maxs']) - meta['means']['mins'])
    points = np.sign(logs) * np.expm1(abs(logs))
    points *= [-1,-1,1]  # SOG entity's 180-degree Z rotation
    color = pixels('sh0.webp')
    np.save(out / 'sog-world-points.npy', points)
    p = points[(points[:,1]>-.65) & (points[:,1]<.15) & (abs(points[:,0])<2) & (abs(points[:,2])<2)]
    h, _, _ = np.histogram2d(p[:,0],p[:,2],bins=800,range=[[-2,2],[-2,2]])
    intensity = (np.log1p(h) / np.log1p(h.max()) * 255).astype('uint8')
    img = Image.fromarray(intensity.T[::-1]).convert('RGB')
    draw = ImageDraw.Draw(img)
    for v in np.arange(-2,2.1,.25):
        px = int((v+2)*200)
        draw.line([(px,0),(px,800)], fill=(35,35,65))
        draw.line([(0,800-px),(800,800-px)], fill=(35,35,65))
        draw.text((px+2,400),str(v),fill='orange')
        draw.text((400,800-px),str(v),fill='orange')
    img.save(out / 'sog-footprints.png')
    print('Footprint saved; points:',len(p))
    # Horizontal slab profile on the outer broad face of each building.
    yaw = np.deg2rad(27.3)
    u = points[:,0]*np.cos(yaw)-points[:,2]*np.sin(yaw)
    v = points[:,0]*np.sin(yaw)+points[:,2]*np.cos(yaw)
    for block, edge in [('A',.742),('B',-1.022)]:
        face=points[(abs(u-edge)<.016)&(v>-.4)&(v<.49)&(points[:,1]>-1.1)&(points[:,1]<.7)]
        hist,edges=np.histogram(face[:,1],bins=np.arange(-1.1,.7,.003))
        smooth=np.convolve(hist,[1,2,1],mode='same')
        peaks=[i for i in range(2,len(hist)-2) if smooth[i]==max(smooth[i-2:i+3])]
        peaks=sorted(peaks,key=lambda i:smooth[i],reverse=True)
        selected=[]
        for i in peaks:
            y=(edges[i]+edges[i+1])/2
            if all(abs(y-prev)>.04 for prev in selected): selected.append(y)
            if len(selected)==19: break
        print(block,'slab Y peaks:',sorted(selected))
    yaw = np.deg2rad(27.3)
    for block, mask in [('A',points[:,0]>-.15),('B',points[:,0]<-.15)]:
        b = points[mask & (points[:,1]>-.65) & (points[:,1]<.15) & (abs(points[:,0])<1.2) & (abs(points[:,2])<1)]
        for axis, v in [('u',b[:,0]*np.cos(yaw)-b[:,2]*np.sin(yaw)),('v',b[:,0]*np.sin(yaw)+b[:,2]*np.cos(yaw))]:
            h,edges=np.histogram(v,bins=np.arange(-1.5,1.5,.005))
            peaks = sorted(zip(h, (edges[:-1]+edges[1:])/2),reverse=True)[:10]
            print(block,axis,peaks)
