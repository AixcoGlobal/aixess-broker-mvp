"""Real-ESRGAN (RRDBNet) without PyTorch: read the official .pth, build the network in ONNX, run it tiled.

usage: python scripts/esrgan-onnx.py RealESRGAN_x2plus.pth in.png out.png   (needs onnx, onnxruntime, numpy, pillow)
Weights: https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.1/RealESRGAN_x2plus.pth
(sha256 49fafd45f8fd7aa8d31ab2a22d14d91b536c34494a5cfe31eb5d89c2fa266abb). x2plus pixel-unshuffles the input by 2,
so its 23 RRDB blocks run at a quarter of the pixels; x4plus (3 input channels) also works.
"""
import pickle
import sys
import zipfile

import numpy as np
import onnx
import onnxruntime as ort
from onnx import TensorProto, helper, numpy_helper
from PIL import Image

Image.MAX_IMAGE_PIXELS = None


def load_pth(path):
    zf = zipfile.ZipFile(path)
    prefix = zf.namelist()[0].split("/")[0]
    dtypes = {"FloatStorage": np.float32, "HalfStorage": np.float16}

    class Storage:
        def __init__(self, name): self.name = name

    def rebuild(storage, offset, size, stride, *_):
        dtype, key = storage
        raw = np.frombuffer(zf.read(f"{prefix}/data/{key}"), dtype=dtype)
        n = int(np.prod(size)) if size else 1
        return np.lib.stride_tricks.as_strided(raw[offset:], shape=size, strides=[s * raw.itemsize for s in stride]).copy() if size else raw[offset:offset + 1].copy()

    class U(pickle.Unpickler):
        def find_class(self, module, name):
            if name == "_rebuild_tensor_v2": return rebuild
            if name in dtypes: return Storage(name)
            if module == "collections" and name == "OrderedDict":
                import collections
                return collections.OrderedDict
            raise pickle.UnpicklingError(f"refusing {module}.{name}")

        def persistent_load(self, pid):
            _, storage, key, *_ = pid
            return (dtypes[storage.name], key)

    obj = U(zf.open(f"{prefix}/data.pkl")).load()
    return obj.get("params_ema") or obj.get("params") or obj


def build(params, in_ch):
    nodes, inits = [], []
    count = [0]

    def name(p):
        count[0] += 1
        return f"{p}_{count[0]}"

    def conv(x, key):
        w, b = params[f"{key}.weight"], params[f"{key}.bias"]
        if f"{key}.weight" not in added:
            inits.append(numpy_helper.from_array(w.astype(np.float32), f"{key}.weight"))
            inits.append(numpy_helper.from_array(b.astype(np.float32), f"{key}.bias"))
            added.add(f"{key}.weight")
        y = name("conv")
        nodes.append(helper.make_node("Conv", [x, f"{key}.weight", f"{key}.bias"], [y], pads=[1, 1, 1, 1], kernel_shape=[3, 3]))
        return y

    def lrelu(x):
        y = name("lrelu")
        nodes.append(helper.make_node("LeakyRelu", [x], [y], alpha=0.2))
        return y

    def cat(xs):
        y = name("cat")
        nodes.append(helper.make_node("Concat", xs, [y], axis=1))
        return y

    def add(a, b):
        y = name("add")
        nodes.append(helper.make_node("Add", [a, b], [y]))
        return y

    def scale(x):
        y = name("mul")
        nodes.append(helper.make_node("Mul", [x, "c02"], [y]))
        return y

    def up(x):
        y = name("up")
        nodes.append(helper.make_node("Resize", [x, "", "s2"], [y], mode="nearest"))
        return y

    added = set()
    inits.append(numpy_helper.from_array(np.array(0.2, np.float32), "c02"))
    inits.append(numpy_helper.from_array(np.array([1, 1, 2, 2], np.float32), "s2"))

    def rdb(x, key):
        x1 = lrelu(conv(x, f"{key}.conv1"))
        x2 = lrelu(conv(cat([x, x1]), f"{key}.conv2"))
        x3 = lrelu(conv(cat([x, x1, x2]), f"{key}.conv3"))
        x4 = lrelu(conv(cat([x, x1, x2, x3]), f"{key}.conv4"))
        x5 = conv(cat([x, x1, x2, x3, x4]), f"{key}.conv5")
        return add(scale(x5), x)

    feat = conv("input", "conv_first")
    h = feat
    i = 0
    while f"body.{i}.rdb1.conv1.weight" in params:
        o = rdb(rdb(rdb(h, f"body.{i}.rdb1"), f"body.{i}.rdb2"), f"body.{i}.rdb3")
        h = add(scale(o), h)
        i += 1
    feat = add(feat, conv(h, "conv_body"))
    feat = lrelu(conv(up(feat), "conv_up1"))
    feat = lrelu(conv(up(feat), "conv_up2"))
    out = conv(lrelu(conv(feat, "conv_hr")), "conv_last")
    nodes.append(helper.make_node("Identity", [out], ["output"]))
    graph = helper.make_graph(nodes, "rrdbnet",
                              [helper.make_tensor_value_info("input", TensorProto.FLOAT, [1, in_ch, None, None])],
                              [helper.make_tensor_value_info("output", TensorProto.FLOAT, [1, 3, None, None])], inits)
    model = helper.make_model(graph, opset_imports=[helper.make_opsetid("", 17)])
    onnx.checker.check_model(model)
    print("blocks", i)
    return model


def unshuffle(x, r):  # torch.pixel_unshuffle on (C, H, W)
    c, h, w = x.shape
    return x.reshape(c, h // r, r, w // r, r).transpose(0, 2, 4, 1, 3).reshape(c * r * r, h // r, w // r)


def main(weights, src, dst, tile=192, pad=12):
    params = load_pth(weights)
    in_ch = params["conv_first.weight"].shape[1]
    r = {3: 1, 12: 2, 48: 4}[in_ch]
    scale = 4 // r
    model = build(params, in_ch)
    opts = ort.SessionOptions()
    opts.intra_op_num_threads = 4
    sess = ort.InferenceSession(model.SerializeToString(), opts, providers=["CPUExecutionProvider"])
    img = np.asarray(Image.open(src).convert("RGB"), dtype=np.float32) / 255.0
    H, W = img.shape[:2]
    ph, pw = (-H) % r, (-W) % r
    img = np.pad(img, ((0, ph), (0, pw), (0, 0)), mode="reflect")
    x = img.transpose(2, 0, 1)
    if r > 1:
        x = unshuffle(x, r)
    _, h, w = x.shape
    out = np.zeros((3, h * 4, w * 4), np.float32)
    tiles = [(ty, tx) for ty in range(0, h, tile) for tx in range(0, w, tile)]
    for n, (ty, tx) in enumerate(tiles):
        y0, y1, x0, x1 = ty, min(ty + tile, h), tx, min(tx + tile, w)
        py0, py1, px0, px1 = max(y0 - pad, 0), min(y1 + pad, h), max(x0 - pad, 0), min(x1 + pad, w)
        res = sess.run(None, {"input": x[None, :, py0:py1, px0:px1]})[0][0]
        out[:, y0 * 4:y1 * 4, x0 * 4:x1 * 4] = res[:, (y0 - py0) * 4:(y0 - py0 + y1 - y0) * 4, (x0 - px0) * 4:(x0 - px0 + x1 - x0) * 4]
        if n % 20 == 0:
            print(f"tile {n + 1}/{len(tiles)}", flush=True)
    out = out[:, :H * scale, :W * scale]
    Image.fromarray((np.clip(out.transpose(1, 2, 0), 0, 1) * 255 + 0.5).astype(np.uint8)).save(dst)
    print("wrote", dst, out.shape)


if __name__ == "__main__":
    main(*sys.argv[1:4])
