from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
import tempfile
import os
import traceback
from main import run_pipeline

app = FastAPI()

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/analyze")
async def analyze(image: UploadFile = File(...)):
    print("[API] /analyze called")
    print(f"[API] Received file: {image.filename}")

    suffix = os.path.splitext(image.filename)[-1] or ".jpg"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        contents = await image.read()
        tmp.write(contents)
        tmp_path = tmp.name

    print(f"[API] Temporary file created: {tmp_path}")

    try:
        print("[API] Starting pipeline")
        result = run_pipeline(tmp_path)
        print("[API] Pipeline finished successfully")
        print(f"[API] Result keys: {list(result.keys())}")
        return JSONResponse(content=result)
    except Exception as e:
        print("[API] Pipeline error:", str(e))
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
            print(f"[API] Temporary file deleted: {tmp_path}")
