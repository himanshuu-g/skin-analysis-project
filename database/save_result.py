from datetime import datetime, timezone

from database.db import get_db, to_object_id


def _current_timestamp():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _serialize_result_document(document):
    if not document:
        return None

    user_raw_id = document.get("user_id")
    user_id = str(user_raw_id) if user_raw_id is not None else None
    class_probabilities = document.get("class_probabilities")
    if not isinstance(class_probabilities, dict):
        class_probabilities = {}

    image_path = document.get("image_path")
    gradcam_image_path = document.get("gradcam_image_path")

    return {
        "id": str(document.get("_id")),
        "user_id": user_id,
        "skin_type": document.get("skin_type"),
        "confidence": document.get("confidence"),
        "image_path": image_path,
        "image_url": f"/{image_path}" if image_path else None,
        "gradcam_image_path": gradcam_image_path,
        "gradcam_image_url": f"/{gradcam_image_path}" if gradcam_image_path else None,
        "model_version": document.get("model_version"),
        "class_probabilities": class_probabilities,
        "is_low_confidence": bool(document.get("is_low_confidence", False)),
        "inference_ms": document.get("inference_ms"),
        "created_at": document.get("created_at"),
    }


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
    try:
        user_object_id = to_object_id(user_id) if user_id else None
        result_document = {
            "skin_type": skin_type,
            "confidence": confidence,
            "image_path": image_path,
            "gradcam_image_path": gradcam_image_path,
            "model_version": model_version,
            "class_probabilities": class_probabilities if isinstance(class_probabilities, dict) else {},
            "is_low_confidence": bool(is_low_confidence),
            "inference_ms": inference_ms,
            "created_at": _current_timestamp(),
        }
        if user_object_id is not None:
            result_document["user_id"] = user_object_id
        else:
            result_document["user_id"] = None

        db = get_db()
        insert_result = db["results"].insert_one(result_document)
        print("[INFO] Result saved to DB")
        return str(insert_result.inserted_id)

    except Exception as err:
        print(f"[WARN] Result not saved: {err}")
        return None


def get_results_for_user(user_id, limit=20):
    user_object_id = to_object_id(user_id)
    if user_object_id is None:
        return []

    db = get_db()
    cursor = (
        db["results"]
        .find({"user_id": user_object_id})
        .sort([("_id", -1)])
        .limit(max(1, int(limit)))
    )
    return [_serialize_result_document(document) for document in cursor]


def get_result_for_user(user_id, result_id):
    user_object_id = to_object_id(user_id)
    result_object_id = to_object_id(result_id)
    if user_object_id is None or result_object_id is None:
        return None

    db = get_db()
    document = db["results"].find_one({"_id": result_object_id, "user_id": user_object_id})
    return _serialize_result_document(document)


def delete_result_for_user(user_id, result_id):
    user_object_id = to_object_id(user_id)
    result_object_id = to_object_id(result_id)
    if user_object_id is None or result_object_id is None:
        return None

    db = get_db()
    deleted_document = db["results"].find_one_and_delete(
        {"_id": result_object_id, "user_id": user_object_id},
        projection={"image_path": 1, "gradcam_image_path": 1},
    )
    if deleted_document is None:
        return None

    return {
        "image_path": deleted_document.get("image_path"),
        "gradcam_image_path": deleted_document.get("gradcam_image_path"),
    }
