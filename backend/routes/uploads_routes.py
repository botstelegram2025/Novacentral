from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from auth import get_current_admin, get_current_user
from models import uid, now_iso
import os, io
from PIL import Image

router = APIRouter(prefix="/uploads", tags=["uploads"])
UPLOAD_PATH = os.environ.get("UPLOAD_PATH", "/app/backend/uploads")
os.makedirs(UPLOAD_PATH, exist_ok=True)


@router.post("/image")
async def upload_image(file: UploadFile = File(...), user=Depends(get_current_user)):
    if file.content_type not in ("image/jpeg", "image/png", "image/webp", "image/gif"):
        raise HTTPException(400, "Formato inválido")
    data = await file.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(400, "Arquivo muito grande (máx 8MB)")
    try:
        im = Image.open(io.BytesIO(data)).convert("RGB")
    except Exception:
        raise HTTPException(400, "Imagem inválida")
    # Resize if big
    im.thumbnail((1600, 1600))
    name = f"{uid()}.webp"
    path = os.path.join(UPLOAD_PATH, name)
    im.save(path, "WEBP", quality=85, method=6)
    # Thumbnail
    thumb = im.copy()
    thumb.thumbnail((320, 320))
    tname = name.replace(".webp", "_thumb.webp")
    thumb.save(os.path.join(UPLOAD_PATH, tname), "WEBP", quality=80)
    return {"url": f"/api/uploads/file/{name}", "thumb": f"/api/uploads/file/{tname}"}


@router.get("/file/{name}")
async def get_file(name: str):
    from fastapi.responses import FileResponse
    path = os.path.join(UPLOAD_PATH, name)
    if not os.path.exists(path):
        raise HTTPException(404, "Arquivo não encontrado")
    return FileResponse(path)
