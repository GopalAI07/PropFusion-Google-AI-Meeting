import json
import re
from typing import Optional, List, Dict, Any

from fastapi import HTTPException
from google import genai
from google.genai import types

from ..config.settings import settings
from ..utils.utils import chunk_text


class AIService:

    def __init__(self):
        """Initialize Google Gemini client."""

        if not settings.GEMINI_API_KEY:
            raise ValueError(
                "GEMINI_API_KEY is not configured"
            )

        self.client = genai.Client(
            api_key=settings.GEMINI_API_KEY
        )

        self.model_name = settings.GEMINI_MODEL

    # ----------------------------------------------------------
    # Gemini configuration
    # ----------------------------------------------------------

    def _config(self, json_mode: bool = False):

        return types.GenerateContentConfig(
            temperature=settings.GEMINI_TEMPERATURE,
            max_output_tokens=settings.GEMINI_MAX_TOKENS,
            response_mime_type=(
                "application/json"
                if json_mode
                else "text/plain"
            ),
        )

    # ----------------------------------------------------------
    # Generate content
    # ----------------------------------------------------------

    def _generate(
        self,
        prompt: str,
        json_mode: bool = False,
    ):

        return self.client.models.generate_content(
            model=self.model_name,
            contents=prompt,
            config=self._config(json_mode),
        )

    # ----------------------------------------------------------
    # Clean JSON
    # ----------------------------------------------------------

    def _clean_json_response(
        self,
        text: str,
    ) -> str:

        if not text:
            raise ValueError(
                "Gemini returned an empty response"
            )

        text = text.strip()

        text = re.sub(
            r"```json\s*",
            "",
            text,
            flags=re.IGNORECASE,
        )

        text = re.sub(
            r"```\s*",
            "",
            text,
        )

        text = text.strip()

        object_start = text.find("{")
        array_start = text.find("[")

        if object_start == -1 and array_start == -1:
            raise ValueError(
                "No JSON found in Gemini response"
            )

        if object_start == -1:
            start = array_start
            closing = "]"

        elif array_start == -1:
            start = object_start
            closing = "}"

        elif object_start < array_start:
            start = object_start
            closing = "}"

        else:
            start = array_start
            closing = "]"

        end = text.rfind(closing)

        if end == -1:
            raise ValueError(
                "Invalid JSON response"
            )

        return text[start:end + 1]

    # ----------------------------------------------------------
    # Meeting summary
    # ----------------------------------------------------------

    def generate_summary(
        self,
        transcript_text: str,
        title: Optional[str] = None,
    ) -> Dict[str, Any]:

        if not transcript_text.strip():
            raise HTTPException(
                status_code=400,
                detail="Transcript is empty",
            )

        from ..prompts import SUMMARY_PROMPT

        prompt = SUMMARY_PROMPT.format(
            title=title or "Untitled Meeting",
            transcript=transcript_text,
        )

        try:

            response = self._generate(
                prompt,
                json_mode=True,
            )

            cleaned = self._clean_json_response(
                response.text
            )

            return json.loads(cleaned)

        except Exception as e:

            raise HTTPException(
                status_code=500,
                detail=(
                    "AI summary generation failed: "
                    f"{str(e)}"
                ),
            )

    # ----------------------------------------------------------
    # Long transcript summary
    # ----------------------------------------------------------

    def generate_summary_long(
        self,
        transcript_text: str,
        title: Optional[str] = None,
    ) -> Dict[str, Any]:

        chunks = chunk_text(
            transcript_text,
            chunk_size=3000,
            overlap=200,
        )

        chunk_summaries = []

        from ..prompts import CHUNK_SUMMARY_PROMPT

        for index, transcript_chunk in enumerate(chunks):

            prompt = CHUNK_SUMMARY_PROMPT.format(
                title=title or "Untitled Meeting",
                chunk_index=index + 1,
                total_chunks=len(chunks),
                transcript_chunk=transcript_chunk,
            )

            try:

                response = self._generate(
                    prompt,
                    json_mode=True,
                )

                cleaned = self._clean_json_response(
                    response.text
                )

                chunk_summaries.append(
                    json.loads(cleaned)
                )

            except Exception as e:

                chunk_summaries.append(
                    {
                        "chunk": index + 1,
                        "error": str(e),
                        "short_summary": "",
                        "key_points": [],
                    }
                )

        from ..prompts import MERGE_SUMMARY_PROMPT

        merge_prompt = MERGE_SUMMARY_PROMPT.format(
            title=title or "Untitled Meeting",
            chunk_summaries=json.dumps(
                chunk_summaries,
                indent=2,
            ),
        )

        try:

            response = self._generate(
                merge_prompt,
                json_mode=True,
            )

            cleaned = self._clean_json_response(
                response.text
            )

            return json.loads(cleaned)

        except Exception as e:

            raise HTTPException(
                status_code=500,
                detail=(
                    "AI summary merge failed: "
                    f"{str(e)}"
                ),
            )

    # ----------------------------------------------------------
    # Sentiment
    # ----------------------------------------------------------

    def analyze_sentiment(
        self,
        text: str,
    ) -> Dict[str, Any]:

        from ..prompts import SENTIMENT_PROMPT

        prompt = SENTIMENT_PROMPT.format(
            text=text
        )

        try:

            response = self._generate(
                prompt,
                json_mode=True,
            )

            cleaned = self._clean_json_response(
                response.text
            )

            return json.loads(cleaned)

        except Exception as e:

            return {
                "overall_sentiment": "neutral",
                "sentiment_score": 0.5,
                "key_emotions": [],
                "error": str(e),
            }

    # ----------------------------------------------------------
    # Action items
    # ----------------------------------------------------------

    def extract_action_items(
        self,
        text: str,
    ) -> List[Dict[str, Any]]:

        from ..prompts import ACTION_ITEMS_PROMPT

        prompt = ACTION_ITEMS_PROMPT.format(
            text=text
        )

        try:

            response = self._generate(
                prompt,
                json_mode=True,
            )

            cleaned = self._clean_json_response(
                response.text
            )

            result = json.loads(cleaned)

            return result.get(
                "action_items",
                [],
            )

        except Exception as e:

            return [
                {
                    "action": "Error extracting action items",
                    "assignee": "",
                    "error": str(e),
                }
            ]

    # ----------------------------------------------------------
    # Meeting title
    # ----------------------------------------------------------

    def generate_meeting_title(
        self,
        transcript_text: str,
    ) -> str:

        prompt = f"""
Generate a concise meeting title.

Rules:
- Maximum 8 words
- Return only the title
- No explanation
- No quotation marks

Transcript:

{transcript_text[:4000]}

Title:
"""

        try:

            response = self._generate(
                prompt,
                json_mode=False,
            )

            title = response.text.strip()

            return (
                title
                .strip('"')
                .strip("'")
                .strip()
            )[:200]

        except Exception:

            return "Untitled Meeting"

    def _wait_for_file_active(self, file_name: str, max_wait_seconds: int = 60):
        """Poll Gemini File API until file state is ACTIVE."""
        import time
        start_time = time.time()
        while time.time() - start_time < max_wait_seconds:
            audio_file = self.client.files.get(name=file_name)
            state_str = str(audio_file.state).upper()
            state_name = getattr(audio_file.state, "name", "").upper()

            if "ACTIVE" in state_str or state_name == "ACTIVE":
                return audio_file

            if "FAILED" in state_str or state_name == "FAILED":
                err_detail = getattr(audio_file, "error", None) or "Unknown file error"
                raise ValueError(f"Gemini file processing failed for {file_name}: {err_detail}")

            time.sleep(1)

        raise TimeoutError(f"Gemini audio file {file_name} did not become ACTIVE within {max_wait_seconds} seconds")

    # ----------------------------------------------------------
    # Audio-to-Summary generation
    # ----------------------------------------------------------

    def generate_summary_from_audio(
        self,
        audio_file_path: str,
        title: Optional[str] = None,
    ) -> Dict[str, Any]:

        try:
            import os
            ext = os.path.splitext(audio_file_path)[1].lower()
            mime_mapping = {
                ".webm": "audio/webm",
                ".mp3": "audio/mp3",
                ".wav": "audio/wav",
                ".m4a": "audio/m4a",
                ".ogg": "audio/ogg",
                ".flac": "audio/flac",
                ".mp4": "audio/mp4",
                ".mpeg": "audio/mpeg",
            }
            mime_type = mime_mapping.get(ext, "audio/webm")

            uploaded_file = self.client.files.upload(
                file=audio_file_path,
                config={"mime_type": mime_type},
            )
            audio_file = self._wait_for_file_active(uploaded_file.name)

            prompt = """
You are an expert AI meeting assistant. Listen to this meeting audio recording for "{meeting_title}" and generate a comprehensive summary.

Requirements:
1. Provide a concise 2-3 sentence short summary (`short_summary`).
2. Provide a detailed, paragraph-by-paragraph detailed summary (`detailed_summary`).
3. Extract key discussion points as an array of strings (`key_points`).
4. Extract action items as an array of objects (`action_items`) with "action" and "assignee" fields.
5. Extract key decisions made as an array of strings (`decisions`).
6. List main topics discussed (`topics`).
7. Analyze overall sentiment (`sentiment_analysis`) with "overall_sentiment" (positive/neutral/negative) and "sentiment_score" (0.0 to 1.0).
8. List follow-up next steps (`next_steps`).
9. Provide an appropriate concise meeting title (`title`).

Return ONLY valid JSON with this exact structure:
{{
    "title": "Meeting Title",
    "short_summary": "Brief summary here...",
    "detailed_summary": "Detailed breakdown here...",
    "key_points": ["Point 1", "Point 2"],
    "action_items": [{{"action": "Task 1", "assignee": "Name"}}],
    "decisions": ["Decision 1"],
    "topics": ["Topic 1"],
    "sentiment_analysis": {{"overall_sentiment": "positive", "sentiment_score": 0.8}},
    "next_steps": ["Next step 1"]
}}
""".format(meeting_title=title or "Untitled Meeting")

            response = self.client.models.generate_content(
                model=self.model_name,
                contents=[
                    prompt,
                    audio_file,
                ],
                config=self._config(
                    json_mode=True
                ),
            )

            cleaned = self._clean_json_response(
                response.text
            )

            return json.loads(cleaned)

        except Exception as e:

            raise HTTPException(
                status_code=500,
                detail=(
                    "AI audio summary generation failed: "
                    f"{str(e)}"
                ),
            )


try:
    ai_service = AIService()
except Exception:
    ai_service = None


