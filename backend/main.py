"""PACE/CHECK API entry point."""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic_ai.exceptions import ModelAPIError

from agent import AgentConfigurationError, generate_weekly_review
from models import CoachReply, CoachRequest
from social_feed import SocialFeedError, fetch_reddit_feed

app = FastAPI(title="PACE/CHECK API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/social/reddit")
def reddit_social_feed(
    query: str = Query(default="HYROX", min_length=2, max_length=120),
    limit: int = Query(default=15, ge=1, le=25),
) -> dict[str, object]:
    try:
        items = fetch_reddit_feed(query, limit)
    except SocialFeedError as error:
        raise HTTPException(status_code=502, detail=str(error)) from None
    return {"source": "Reddit", "query": query, "items": items}


@app.post("/api/coach/weekly-review", response_model=CoachReply)
async def weekly_review(request: CoachRequest) -> CoachReply:
    try:
        review = await generate_weekly_review(request)
    except AgentConfigurationError as error:
        raise HTTPException(status_code=503, detail=str(error)) from None
    except ModelAPIError:
        raise HTTPException(status_code=503, detail="The weekly coach is temporarily unavailable. Your local training log remains available.") from None
    return CoachReply(review=review)