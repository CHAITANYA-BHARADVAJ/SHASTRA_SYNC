# -*- mode: python ; coding: utf-8 -*-
"""
ShastraVision.spec
------------------
PyInstaller build recipe for the Video Perception Node demo app.

Built as a ONEDIR bundle rather than onefile: TensorFlow and MediaPipe are
large, and onefile would re-extract ~1 GB to a temp folder on every launch
(slow, and a common source of failures). Onedir starts far faster and is
much more reliable. The user still just double-clicks ShastraVision.exe.

Build with:
    .venv\Scripts\python.exe -m PyInstaller ShastraVision.spec --noconfirm
"""

from PyInstaller.utils.hooks import collect_all, collect_data_files

NODE = "video_node"

datas = []
binaries = []
hiddenimports = []

# --- our own resources -------------------------------------------------
# The Flask dashboard template, and .env so a fresh copy ships with the app.
datas += [(f"{NODE}/templates", "templates")]
datas += [(f"{NODE}/.env", ".")]

# --- MediaPipe ---------------------------------------------------------
# MediaPipe loads .tflite / .binarypb graph files at runtime from its
# package directory. Without these the pose solution fails to initialise.
mp_datas, mp_bins, mp_hidden = collect_all("mediapipe")
datas += mp_datas
binaries += mp_bins
hiddenimports += mp_hidden

# --- DeepFace ----------------------------------------------------------
# DeepFace resolves model classes dynamically, so its submodules are not
# discoverable by static analysis.
df_datas, df_bins, df_hidden = collect_all("deepface")
datas += df_datas
binaries += df_bins
hiddenimports += df_hidden

# --- Keras / tf-keras --------------------------------------------------
# DeepFace builds its emotion model through tf_keras.
for pkg in ("tf_keras", "keras"):
    p_datas, p_bins, p_hidden = collect_all(pkg)
    datas += p_datas
    binaries += p_bins
    hiddenimports += p_hidden

# Retina-face and mtcnn are optional DeepFace detector backends that get
# imported lazily; include their data so no import blows up at runtime.
for pkg in ("retinaface", "mtcnn"):
    try:
        datas += collect_data_files(pkg)
    except Exception:
        pass

hiddenimports += [
    "tensorflow",
    "scipy.special",
    "scipy._lib.array_api_compat.numpy.fft",
    "pandas",
    "engineio.async_drivers.threading",
]


a = Analysis(
    [f"{NODE}/ShastraVision.py"],
    pathex=[NODE],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    # Trim heavy things the app never uses.
    excludes=[
        # NOTE: matplotlib must NOT be excluded -- mediapipe's
        # drawing_utils imports pyplot at module load. The launcher
        # forces MPLBACKEND=Agg so no GUI toolkit is required.
        "tkinter",
        "PyQt5",
        "PySide2",
        "notebook",
        "jupyter",
        "IPython",
        "pytest",
    ],
    noarchive=False,
    optimize=0,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="ShastraVision",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=True,          # keep the console: shows status and errors
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name="ShastraVision",
)
