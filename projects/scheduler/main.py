import json
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates

from models import SchoolData
from solver import generate_schedule

BASE_DIR = Path(__file__).resolve().parent

app = FastAPI(title="School Scheduler")
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))


def load_data() -> SchoolData:
    data_path = BASE_DIR / "data.json"
    with open(data_path, "r", encoding="utf-8") as f:
        raw = json.load(f)
    return SchoolData(**raw)


@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/api/data")
async def get_data():
    data = load_data()
    return JSONResponse(content=data.model_dump())


@app.get("/api/generate")
async def api_generate():
    try:
        data = load_data()
        schedule = generate_schedule(data)

        if schedule is None:
            return JSONResponse(
                status_code=400,
                content={
                    "ok": False,
                    "message": "Не удалось построить расписание с текущими ограничениями."
                }
            )

        return JSONResponse(content={"ok": True, "schedule": schedule})
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"ok": False, "message": str(e)}
        )
