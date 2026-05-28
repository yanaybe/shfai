import os
import uuid
import shutil
from pathlib import Path
from app.config import settings


class LocalStorage:
    def __init__(self):
        self.base = Path(settings.UPLOAD_DIR)
        self.base.mkdir(parents=True, exist_ok=True)

    async def save(self, file_bytes: bytes, original_name: str) -> str:
        ext = Path(original_name).suffix.lower()
        key = f"{uuid.uuid4()}{ext}"
        dest = self.base / key
        dest.write_bytes(file_bytes)
        return str(dest)

    async def get_path(self, url: str) -> str:
        return url


class S3Storage:
    def __init__(self):
        import boto3
        self.client = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION,
        )
        self.bucket = settings.S3_BUCKET

    async def save(self, file_bytes: bytes, original_name: str) -> str:
        ext = Path(original_name).suffix.lower()
        key = f"claims/{uuid.uuid4()}{ext}"
        self.client.put_object(Bucket=self.bucket, Key=key, Body=file_bytes)
        return f"s3://{self.bucket}/{key}"

    async def get_path(self, url: str) -> str:
        key = url.replace(f"s3://{self.bucket}/", "")
        local = Path(f"/tmp/{uuid.uuid4()}{Path(key).suffix}")
        self.client.download_file(self.bucket, key, str(local))
        return str(local)


def get_storage():
    if settings.STORAGE_BACKEND == "s3":
        return S3Storage()
    return LocalStorage()


storage = get_storage()
