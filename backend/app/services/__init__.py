# Services module
from app.services.pdf_extractor import extract_text_from_pdf
from app.services.rss_parser import parse_feed, matches_keywords
from app.services.prompt_generator import generate_cover_letter_prompt, generate_resume_tailor_prompt
from app.services.job_scraper import scrape_job_url

__all__ = ["extract_text_from_pdf", "parse_feed", "matches_keywords", "generate_cover_letter_prompt", "generate_resume_tailor_prompt", "scrape_job_url"]
