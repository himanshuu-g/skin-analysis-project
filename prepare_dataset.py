"""Create a cleaned train/val/test split from dataset/train."""
import hashlib
import json
import os
import random
import shutil
from dataclasses import dataclass
from typing import Dict, List, Tuple

import cv2

SOURCE_ROOT = "dataset/train"
OUTPUT_ROOT = "dataset/split"
REPORT_PATH = os.path.join(OUTPUT_ROOT, "cleaning_report.json")

SEED = 42
TRAIN_RATIO = 0.70
VAL_RATIO = 0.15
TEST_RATIO = 0.15

MIN_WIDTH = 80
MIN_HEIGHT = 80
MIN_SHARPNESS = 20.0  # Laplacian variance threshold

VALID_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


@dataclass
class CleanStats:
    scanned: int = 0
    kept: int = 0
    removed_copy_name: int = 0
    removed_unreadable: int = 0
    removed_small: int = 0
    removed_blurry: int = 0
    removed_duplicate_hash: int = 0
    removed_bad_extension: int = 0

    def to_dict(self):
        return {
            "scanned": self.scanned,
            "kept": self.kept,
            "removed_copy_name": self.removed_copy_name,
            "removed_unreadable": self.removed_unreadable,
            "removed_small": self.removed_small,
            "removed_blurry": self.removed_blurry,
            "removed_duplicate_hash": self.removed_duplicate_hash,
            "removed_bad_extension": self.removed_bad_extension,
        }


def _is_copy_name(filename: str) -> bool:
    lower = filename.lower()
    return " - copy" in lower or "(copy)" in lower


def _sha1(path: str) -> str:
    hasher = hashlib.sha1()
    with open(path, "rb") as fp:
        while True:
            chunk = fp.read(1024 * 1024)
            if not chunk:
                break
            hasher.update(chunk)
    return hasher.hexdigest()


def _passes_quality(path: str) -> Tuple[bool, str]:
    img = cv2.imread(path)
    if img is None:
        return False, "unreadable"

    h, w = img.shape[:2]
    if w < MIN_WIDTH or h < MIN_HEIGHT:
        return False, "small"

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    sharpness = cv2.Laplacian(gray, cv2.CV_64F).var()
    if sharpness < MIN_SHARPNESS:
        return False, "blurry"

    return True, "ok"


def _gather_clean_files(class_dir: str, stats: CleanStats, global_hashes: set) -> List[str]:
    clean_paths = []
    for name in os.listdir(class_dir):
        src_path = os.path.join(class_dir, name)
        if not os.path.isfile(src_path):
            continue

        stats.scanned += 1
        ext = os.path.splitext(name)[1].lower()
        if ext not in VALID_EXTENSIONS:
            stats.removed_bad_extension += 1
            continue

        if _is_copy_name(name):
            stats.removed_copy_name += 1
            continue

        ok, reason = _passes_quality(src_path)
        if not ok:
            if reason == "unreadable":
                stats.removed_unreadable += 1
            elif reason == "small":
                stats.removed_small += 1
            elif reason == "blurry":
                stats.removed_blurry += 1
            continue

        digest = _sha1(src_path)
        if digest in global_hashes:
            stats.removed_duplicate_hash += 1
            continue

        global_hashes.add(digest)
        clean_paths.append(src_path)
        stats.kept += 1

    return clean_paths


def _split_class(paths: List[str], rng: random.Random) -> Dict[str, List[str]]:
    paths = list(paths)
    rng.shuffle(paths)
    n = len(paths)
    if n < 3:
        # For tiny classes, keep at least one sample in train and test.
        if n == 0:
            return {"train": [], "val": [], "test": []}
        if n == 1:
            return {"train": paths[:1], "val": [], "test": []}
        return {"train": paths[:1], "val": [], "test": paths[1:]}

    n_train = max(1, int(n * TRAIN_RATIO))
    n_val = max(1, int(n * VAL_RATIO))
    n_test = n - n_train - n_val
    if n_test <= 0:
        n_test = 1
        n_train = max(1, n_train - 1)

    train_paths = paths[:n_train]
    val_paths = paths[n_train:n_train + n_val]
    test_paths = paths[n_train + n_val:]
    return {"train": train_paths, "val": val_paths, "test": test_paths}


def _reset_output_root(root: str):
    if os.path.exists(root):
        shutil.rmtree(root)
    os.makedirs(root, exist_ok=True)


def _copy_split(split_map: Dict[str, Dict[str, List[str]]]):
    for split_name, class_map in split_map.items():
        for class_name, file_paths in class_map.items():
            out_dir = os.path.join(OUTPUT_ROOT, split_name, class_name)
            os.makedirs(out_dir, exist_ok=True)
            for src in file_paths:
                dst = os.path.join(out_dir, os.path.basename(src))
                shutil.copy2(src, dst)


def main():
    if not os.path.isdir(SOURCE_ROOT):
        raise FileNotFoundError(f"Source dataset directory not found: {SOURCE_ROOT}")

    class_names = sorted(
        name for name in os.listdir(SOURCE_ROOT)
        if os.path.isdir(os.path.join(SOURCE_ROOT, name))
    )
    if not class_names:
        raise RuntimeError("No class folders found under dataset/train")

    print("[INFO] Classes:", class_names)
    rng = random.Random(SEED)
    global_hashes = set()
    stats_by_class: Dict[str, CleanStats] = {}
    clean_by_class: Dict[str, List[str]] = {}

    for class_name in class_names:
        class_dir = os.path.join(SOURCE_ROOT, class_name)
        stats = CleanStats()
        clean_paths = _gather_clean_files(class_dir, stats, global_hashes)
        stats_by_class[class_name] = stats
        clean_by_class[class_name] = clean_paths
        print(
            f"[INFO] {class_name}: scanned={stats.scanned}, kept={stats.kept}, "
            f"removed={stats.scanned - stats.kept}"
        )

    split_map = {"train": {}, "val": {}, "test": {}}
    for class_name, paths in clean_by_class.items():
        split = _split_class(paths, rng)
        for split_name in ("train", "val", "test"):
            split_map[split_name][class_name] = split[split_name]

    _reset_output_root(OUTPUT_ROOT)
    _copy_split(split_map)

    report = {
        "source_root": SOURCE_ROOT,
        "output_root": OUTPUT_ROOT,
        "seed": SEED,
        "ratios": {"train": TRAIN_RATIO, "val": VAL_RATIO, "test": TEST_RATIO},
        "quality_thresholds": {
            "min_width": MIN_WIDTH,
            "min_height": MIN_HEIGHT,
            "min_sharpness_laplacian_var": MIN_SHARPNESS,
        },
        "class_stats": {k: v.to_dict() for k, v in stats_by_class.items()},
        "split_counts": {
            split_name: {
                class_name: len(paths)
                for class_name, paths in class_map.items()
            }
            for split_name, class_map in split_map.items()
        },
    }

    with open(REPORT_PATH, "w", encoding="utf-8") as fp:
        json.dump(report, fp, ensure_ascii=True, indent=2)

    print(f"[INFO] Clean split created at: {OUTPUT_ROOT}")
    print(f"[INFO] Report written to: {REPORT_PATH}")


if __name__ == "__main__":
    main()
