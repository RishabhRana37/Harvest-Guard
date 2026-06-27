# app/routers/report.py
import io, base64
from datetime import datetime
from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

from app.db import get_db
from app.services.explain import generate_explanation

router = APIRouter()
SEV_COLOR = {"healthy": colors.HexColor("#2EA44F"),
             "mild": colors.HexColor("#E8A23D"),
             "severe": colors.HexColor("#D64545")}

def _wrap(text, width):
    words, lines, cur = text.split(), [], ""
    for w in words:
        if len(cur) + len(w) + 1 <= width:
            cur = (cur + " " + w).strip()
        else:
            lines.append(cur); cur = w
    if cur:
        lines.append(cur)
    return lines

@router.get("/scans/{scan_id}/report")
async def scan_report(scan_id: str, x_device_id: str = Header(..., alias="X-Device-Id")):
    db = get_db()
    scan = await db.scans.find_one({"_id": scan_id})
    if not scan:
        raise HTTPException(status_code=404, detail="NOT_FOUND")
    if scan.get("device_id") != x_device_id:
        raise HTTPException(status_code=403, detail="FORBIDDEN")

    disease = await db.diseases.find_one({"slug": scan.get("predicted_slug")}) or {}
    result = {"is_leaf": scan.get("is_leaf", True),
              "prediction": {"crop": disease.get("crop", ""), "name": disease.get("name", "")},
              "confidence": scan.get("confidence"), "confidence_band": scan.get("confidence_band"),
              "severity": scan.get("severity"), "urgency_days": scan.get("urgency_days"),
              "heatmap": scan.get("heatmap_b64")}
    explanation = generate_explanation(result)

    buf = io.BytesIO(); c = canvas.Canvas(buf, pagesize=A4); W, H = A4; y = H - 25 * mm
    c.setFillColor(colors.HexColor("#2C5F2D")); c.setFont("Helvetica-Bold", 20)
    c.drawString(20 * mm, y, "CropDoc AI — Diagnostic Report"); y -= 9 * mm
    c.setFillColor(colors.grey); c.setFont("Helvetica", 9)
    c.drawString(20 * mm, y, f"Generated {datetime.utcnow():%Y-%m-%d %H:%M UTC}  ·  Scan {scan_id}"); y -= 12 * mm

    c.setFillColor(colors.black); c.setFont("Helvetica-Bold", 14)
    c.drawString(20 * mm, y, f"{disease.get('crop','')} — {disease.get('name','')}")
    if scan.get("severity"):
        c.setFillColor(SEV_COLOR.get(scan["severity"], colors.black)); c.setFont("Helvetica-Bold", 11)
        c.drawRightString(W - 20 * mm, y, scan["severity"].upper())
    y -= 8 * mm
    if scan.get("confidence") is not None:
        c.setFillColor(colors.black); c.setFont("Helvetica", 10)
        c.drawString(20 * mm, y, f"Confidence: {round(scan['confidence']*100)}% ({scan.get('confidence_band','')})"); y -= 4 * mm

    if scan.get("heatmap_b64"):
        try:
            raw = base64.b64decode(scan["heatmap_b64"].split(",")[-1])
            c.drawImage(ImageReader(io.BytesIO(raw)), 20 * mm, y - 62 * mm,
                        width=58 * mm, height=58 * mm, preserveAspectRatio=True)
        except Exception:
            pass

    tx = c.beginText(86 * mm, y - 6 * mm); tx.setFont("Helvetica", 10)
    for ln in _wrap(explanation, 46):
        tx.textLine(ln)
    c.drawText(tx); y -= 70 * mm

    tre = disease.get("treatments", {}) or {}
    c.setFont("Helvetica-Bold", 12); c.drawString(20 * mm, y, "Recommended Treatment"); y -= 7 * mm
    for label in ("organic", "chemical"):
        for it in tre.get(label, []):
            c.setFont("Helvetica-Bold", 9); c.drawString(20 * mm, y, label.title()); 
            c.setFont("Helvetica", 9)
            line = f"  {it.get('action','')} — {it.get('dosage','')}, {it.get('frequency','')}. {it.get('safety','')}"
            for wl in _wrap(line, 92):
                c.drawString(24 * mm, y, wl); y -= 5 * mm
            y -= 1 * mm
    for p in tre.get("prevention", []):
        c.setFont("Helvetica", 9); c.drawString(24 * mm, y, f"• {p}"); y -= 5 * mm

    c.setFillColor(colors.grey); c.setFont("Helvetica-Oblique", 8)
    c.drawString(20 * mm, 14 * mm, "AI-assisted guidance. Follow local pesticide labels/PHI. Consult an agronomist for severe cases.")
    c.showPage(); c.save(); buf.seek(0)
    return StreamingResponse(buf, media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="cropdoc_{scan_id}.pdf"'})
