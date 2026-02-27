import os
import uuid
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

USE_LOCAL_STORAGE = os.getenv("USE_LOCAL_STORAGE", "false").lower() == "true"
LOCAL_STORAGE_PATH = Path(os.getenv("LOCAL_STORAGE_PATH", "/app/uploads/resumes"))

if not USE_LOCAL_STORAGE:
    import boto3
    from botocore.config import Config
    from botocore.exceptions import ClientError

    s3_config = {}
    if os.getenv("S3_ENDPOINT_URL"):
        s3_config["endpoint_url"] = os.getenv("S3_ENDPOINT_URL")

    s3 = boto3.client(
        "s3",
        config=Config(signature_version="s3v4"),
        region_name=os.getenv("AWS_REGION", "us-east-1"),
        **s3_config
    )
    BUCKET = os.getenv("S3_RESUME_BUCKET", "huntboard-resumes-dev")


def upload_resume(user_id: str, file_content: bytes, filename: str) -> str:
    key = f"resumes/{user_id}/{uuid.uuid4().hex[:8]}-{filename}"
    if USE_LOCAL_STORAGE:
        path = LOCAL_STORAGE_PATH / key
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(file_content)
        logger.info(f"Saved resume locally: {key} ({len(file_content)} bytes)")
    else:
        s3.put_object(
            Bucket=BUCKET, Key=key, Body=file_content,
            ContentType="application/pdf", ServerSideEncryption="AES256",
        )
        logger.info(f"Uploaded resume to S3: {key} ({len(file_content)} bytes)")
    return key


def get_download_url(key: str, expires_in: int = 3600) -> str:
    if USE_LOCAL_STORAGE:
        # Return a local API path — the router will serve the file
        return f"/api/v1/resumes/file/{key}"
    return s3.generate_presigned_url(
        "get_object", Params={"Bucket": BUCKET, "Key": key}, ExpiresIn=expires_in,
    )


def get_resume_bytes(key: str) -> bytes:
    if USE_LOCAL_STORAGE:
        return (LOCAL_STORAGE_PATH / key).read_bytes()
    response = s3.get_object(Bucket=BUCKET, Key=key)
    return response["Body"].read()


def delete_resume(key: str):
    if USE_LOCAL_STORAGE:
        path = LOCAL_STORAGE_PATH / key
        if path.exists():
            path.unlink()
            logger.info(f"Deleted local resume: {key}")
        return
    try:
        s3.delete_object(Bucket=BUCKET, Key=key)
        logger.info(f"Deleted S3 resume: {key}")
    except ClientError as e:
        logger.error(f"Failed to delete {key}: {e}")
