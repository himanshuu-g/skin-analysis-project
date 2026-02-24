import json
from datetime import datetime

from database.db import get_db


def save_result(
    skin_type,
    confidence,
    image_path,
    gradcam_image_path=None,
    user_id=None,
    model_version=None,
    class_probabilities=None,
    is_low_confidence=False,
    inference_ms=None,
):
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()
        class_probabilities_json = json.dumps(class_probabilities or {}, sort_keys=True)
        created_at = datetime.now().astimezone().isoformat(timespec="seconds")

        cursor.execute(
            """
            INSERT INTO results (
                user_id,
                skin_type,
                confidence,
                image_path,
                gradcam_image_path,
                model_version,
                class_probabilities_json,
                is_low_confidence,
                inference_ms,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                skin_type,
                confidence,
                image_path,
                gradcam_image_path,
                model_version,
                class_probabilities_json,
                1 if is_low_confidence else 0,
                inference_ms,
                created_at,
            ),
        )

        conn.commit()
        print("[INFO] Result saved to DB")
        return cursor.lastrowid

    except Exception as err:
        print(f"[WARN] Result not saved: {err}")
        return None
    finally:
        if conn is not None:
            conn.close()


def get_results_for_user(user_id, limit=20):
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT
                id,
                skin_type,
                confidence,
                image_path,
                gradcam_image_path,
                model_version,
                class_probabilities_json,
                is_low_confidence,
                inference_ms,
                created_at
            FROM results
            WHERE user_id = ?
            ORDER BY id DESC
            LIMIT ?
            """,
            (user_id, int(limit)),
        )
        rows = cursor.fetchall()

        results = []
        for row in rows:
            raw_probs = row["class_probabilities_json"] or "{}"
            try:
                class_probabilities = json.loads(raw_probs)
            except json.JSONDecodeError:
                class_probabilities = {}

            results.append(
                {
                    "id": row["id"],
                    "skin_type": row["skin_type"],
                    "confidence": row["confidence"],
                    "image_path": row["image_path"],
                    "image_url": f'/{row["image_path"]}' if row["image_path"] else None,
                    "gradcam_image_path": row["gradcam_image_path"],
                    "gradcam_image_url": (
                        f'/{row["gradcam_image_path"]}' if row["gradcam_image_path"] else None
                    ),
                    "model_version": row["model_version"],
                    "class_probabilities": class_probabilities,
                    "is_low_confidence": bool(row["is_low_confidence"]),
                    "inference_ms": row["inference_ms"],
                    "created_at": row["created_at"],
                }
            )

        return results
    finally:
        conn.close()


def get_result_for_user(user_id, result_id):
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT
                id,
                user_id,
                skin_type,
                confidence,
                image_path,
                gradcam_image_path,
                model_version,
                class_probabilities_json,
                is_low_confidence,
                inference_ms,
                created_at
            FROM results
            WHERE id = ? AND user_id = ?
            LIMIT 1
            """,
            (int(result_id), int(user_id)),
        )
        row = cursor.fetchone()
        if row is None:
            return None

        raw_probs = row["class_probabilities_json"] or "{}"
        try:
            class_probabilities = json.loads(raw_probs)
        except json.JSONDecodeError:
            class_probabilities = {}

        return {
            "id": row["id"],
            "user_id": row["user_id"],
            "skin_type": row["skin_type"],
            "confidence": row["confidence"],
            "image_path": row["image_path"],
            "image_url": f'/{row["image_path"]}' if row["image_path"] else None,
            "gradcam_image_path": row["gradcam_image_path"],
            "gradcam_image_url": (
                f'/{row["gradcam_image_path"]}' if row["gradcam_image_path"] else None
            ),
            "model_version": row["model_version"],
            "class_probabilities": class_probabilities,
            "is_low_confidence": bool(row["is_low_confidence"]),
            "inference_ms": row["inference_ms"],
            "created_at": row["created_at"],
        }
    finally:
        conn.close()


def delete_result_for_user(user_id, result_id):
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT image_path, gradcam_image_path
            FROM results
            WHERE id = ? AND user_id = ?
            LIMIT 1
            """,
            (int(result_id), int(user_id)),
        )
        row = cursor.fetchone()
        if row is None:
            return None

        deleted_payload = {
            "image_path": row["image_path"],
            "gradcam_image_path": row["gradcam_image_path"],
        }

        cursor.execute(
            """
            DELETE FROM results
            WHERE id = ? AND user_id = ?
            """,
            (int(result_id), int(user_id)),
        )
        conn.commit()
        return deleted_payload
    finally:
        conn.close()
