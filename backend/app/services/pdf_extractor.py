import io
from pypdf import PdfReader


def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract text content from a PDF file."""
    try:
        pdf_file = io.BytesIO(file_content)
        reader = PdfReader(pdf_file)

        text_parts = []
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)

        return "\n\n".join(text_parts)
    except Exception as e:
        raise ValueError(f"Failed to extract text from PDF: {str(e)}")
