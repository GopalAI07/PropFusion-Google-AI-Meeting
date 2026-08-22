# ==================== AI Prompt Templates ====================

SUMMARY_PROMPT = """
You are an expert meeting summarizer. Analyze the following meeting transcript and provide a comprehensive summary.

Meeting Title: {title}

Transcript:
{transcript}

Please provide a structured summary in JSON format with the following fields:
1. "title": A concise, descriptive title for this meeting
2. "short_summary": A 2-3 sentence executive summary
3. "detailed_summary": A comprehensive paragraph-by-paragraph summary of the entire meeting
4. "key_points": Array of 5-10 key points discussed (as strings)
5. "action_items": Array of objects with "action" (string), "assignee" (string or null), "deadline" (string or null)
6. "decisions": Array of decisions made during the meeting (as strings)
7. "topics": Array of main topics discussed (as strings)
8. "sentiment_analysis": Object with "overall_sentiment" (positive/negative/neutral), "sentiment_score" (0-1), "key_emotions" (array)
9. "next_steps": Array of follow-up actions (as strings)

Return ONLY valid JSON, no other text.
"""

CHUNK_SUMMARY_PROMPT = """
You are analyzing part {chunk_index} of {total_chunks} of a meeting transcript.

Meeting Title: {title}

Transcript Chunk:
{transcript_chunk}

Provide a summary of this section in JSON format:
{{
    "short_summary": "Brief summary of this section",
    "key_points": ["point1", "point2"],
    "action_items": [{{"action": "...", "assignee": null}}],
    "decisions": ["decision1"],
    "topics": ["topic1"],
    "sentiment": "overall sentiment for this section"
}}

Return ONLY valid JSON.
"""

MERGE_SUMMARY_PROMPT = """
You are combining multiple section summaries of a meeting into one comprehensive summary.

Meeting Title: {title}

Section Summaries:
{chunk_summaries}

Create a unified summary in JSON format:
{{
    "title": "Unified meeting title",
    "short_summary": "2-3 sentence executive summary of entire meeting",
    "detailed_summary": "Comprehensive summary of entire meeting",
    "key_points": ["consolidated key points"],
    "action_items": [{{"action": "...", "assignee": null}}],
    "decisions": ["consolidated decisions"],
    "topics": ["all topics discussed"],
    "sentiment_analysis": {{
        "overall_sentiment": "overall sentiment",
        "sentiment_score": 0.0-1.0,
        "key_emotions": ["emotion1"]
    }},
    "next_steps": ["consolidated next steps"]
}}

Return ONLY valid JSON.
"""

SENTIMENT_PROMPT = """
Analyze the sentiment of the following text:

{text}

Provide a sentiment analysis in JSON format:
{{
    "overall_sentiment": "positive/negative/neutral/mixed",
    "sentiment_score": 0.75,
    "key_emotions": ["confident", "collaborative", "frustrated"],
    "tone": "professional/casual/urgent/formal",
    "highlights": ["notable emotional moments"]
}}

Return ONLY valid JSON.
"""

ACTION_ITEMS_PROMPT = """
Extract all action items, tasks, and to-dos from the following meeting text:

{text}

Return the action items in JSON format:
{{
    "action_items": [
        {{
            "action": "Description of the action item",
            "assignee": "Person assigned (null if unclear)",
            "deadline": "Deadline if mentioned (null if not specified)",
            "priority": "high/medium/low",
            "category": "task/decision/follow-up"
        }}
    ]
}}

Return ONLY valid JSON.
"""

KEY_POINTS_PROMPT = """
Extract the most important key points and takeaways from the following text:

{text}

Return in JSON format:
{{
    "key_points": [
        {{
            "point": "Description of key point",
            "importance": "high/medium/low",
            "category": "decision/insight/update/question"
        }}
    ]
}}

Return ONLY valid JSON.
"""

TRANSCRIPT_FORMAT_PROMPT = """
Format the following raw transcript into a well-structured format with speaker labels, timestamps, and proper paragraphs:

{transcript}

Return the formatted version in JSON format:
{{
    "formatted_content": "HTML-formatted transcript with <p>, <strong> for speakers",
    "speakers": ["Speaker 1", "Speaker 2"],
    "word_count": total_word_count,
    "segments": [
        {{
            "speaker": "Speaker 1",
            "text": "What they said",
            "start_time": 0.0,
            "end_time": 5.2
        }}
    ]
}}

Return ONLY valid JSON.
"""

