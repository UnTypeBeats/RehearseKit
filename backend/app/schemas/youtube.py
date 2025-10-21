from pydantic import BaseModel, HttpUrl


class YouTubePreviewRequest(BaseModel):
    url: HttpUrl


class YouTubePreviewResponse(BaseModel):
    preview_id: str
    preview_url: str
    title: str
    duration: float
    thumbnail: str | None = None

