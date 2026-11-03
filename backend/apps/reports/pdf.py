from dataclasses import dataclass, field
from io import BytesIO
from xml.sax.saxutils import escape

from django.http import HttpResponse
from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

INSTITUTION = "UEMP University"
TEXT_WIDTH = A4[0] - 36 * mm
ACCENT = colors.HexColor("#3B3FA8")
BORDER = colors.HexColor("#D9DCE6")
HEADER_FILL = colors.HexColor("#F1F2F7")
MUTED = colors.HexColor("#5B6072")

_styles = getSampleStyleSheet()
TITLE = ParagraphStyle("Title", parent=_styles["Heading1"], fontSize=16, spaceAfter=2)
SMALL = ParagraphStyle("Small", parent=_styles["Normal"], fontSize=8.5, textColor=MUTED)
HEADING = ParagraphStyle("Heading", parent=_styles["Heading3"], fontSize=11, spaceBefore=10)
CELL = ParagraphStyle("Cell", parent=_styles["Normal"], fontSize=9, leading=11)
CELL_RIGHT = ParagraphStyle("CellRight", parent=CELL, alignment=TA_RIGHT)


@dataclass
class Section:
    columns: list[str]
    rows: list[list]
    heading: str | None = None
    # Indexes of columns to right-align, such as scores and units.
    numeric: set[int] = field(default_factory=set)
    # Relative column widths; the table always spans the full text width.
    widths: list[float] | None = None
    note: str = ""


def _details_table(details: list[tuple[str, str]]) -> Table:
    rows = [
        [Paragraph(f"<b>{escape(label)}</b>", CELL), Paragraph(escape(str(value)), CELL)]
        for label, value in details
    ]
    table = Table(rows, colWidths=[38 * mm, None], hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    return table


def _section_flowables(section: Section) -> list:
    flowables = []
    if section.heading:
        flowables.append(Paragraph(escape(section.heading), HEADING))
    if not section.rows:
        flowables.append(Paragraph("No records.", SMALL))
        return flowables

    def style_for(index):
        return CELL_RIGHT if index in section.numeric else CELL

    def cell(value, index):
        return Paragraph("" if value is None else escape(str(value)), style_for(index))

    header = [
        Paragraph(f"<b>{escape(name)}</b>", style_for(i)) for i, name in enumerate(section.columns)
    ]
    body = [[cell(value, i) for i, value in enumerate(row)] for row in section.rows]
    col_widths = None
    if section.widths:
        total = sum(section.widths)
        col_widths = [TEXT_WIDTH * weight / total for weight in section.widths]
    table = Table([header, *body], colWidths=col_widths, repeatRows=1, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), HEADER_FILL),
                ("LINEBELOW", (0, 0), (-1, -1), 0.5, BORDER),
                ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    flowables.append(table)
    if section.note:
        flowables.extend([Spacer(1, 3), Paragraph(escape(section.note), SMALL)])
    return flowables


def render_pdf(title: str, details: list[tuple[str, str]], sections: list[Section]) -> bytes:
    generated = timezone.localtime().strftime("%d %b %Y, %H:%M")

    def draw_page_frame(canvas, document):
        canvas.saveState()
        canvas.setStrokeColor(ACCENT)
        canvas.setLineWidth(2)
        width, height = A4
        canvas.line(
            document.leftMargin, height - 12 * mm, width - document.rightMargin, height - 12 * mm
        )
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(MUTED)
        canvas.drawString(
            document.leftMargin, 10 * mm, f"{INSTITUTION} · {title} · Generated {generated}"
        )
        canvas.drawRightString(width - document.rightMargin, 10 * mm, f"Page {document.page}")
        canvas.restoreState()

    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        title=title,
        author=INSTITUTION,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
    )
    story = [
        Paragraph(INSTITUTION, SMALL),
        Paragraph(escape(title), TITLE),
        Spacer(1, 4),
        _details_table(details),
        Spacer(1, 6),
    ]
    for section in sections:
        story.extend(_section_flowables(section))
    document.build(story, onFirstPage=draw_page_frame, onLaterPages=draw_page_frame)
    return buffer.getvalue()


def pdf_response(filename: str, content: bytes) -> HttpResponse:
    response = HttpResponse(content, content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response
