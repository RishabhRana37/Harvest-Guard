# app/services/explain.py
_BAND = {"high": "is confident", "medium": "suspects", "low": "is unsure, but leans toward"}
_SEV = {
    "healthy": "The leaf appears healthy — no disease detected.",
    "mild":    "Caught early — act within about {d} days to stop the spread.",
    "severe":  "Advanced infection — treat within about {d} day(s) to limit loss.",
}

def generate_explanation(result: dict) -> str:
    if result.get("is_leaf") is False:
        return "That doesn't look like a crop leaf. Point the camera at a single leaf and retake."
    pred = result.get("prediction") or {}
    band = result.get("confidence_band") or "low"
    conf = result.get("confidence")
    crop, name = pred.get("crop", "the crop"), pred.get("name", "an issue")
    head = f"The model {_BAND.get(band, 'leans toward')} this is {crop} — {name}"
    head += f" ({round(conf * 100)}% confidence)." if conf is not None else "."

    sev, d = result.get("severity"), result.get("urgency_days")
    sev_txt = ""
    if sev in _SEV:
        t = _SEV[sev]
        sev_txt = " " + (t.format(d=d) if "{d}" in t and d is not None else t)

    cam_txt = " Highlighted areas on the leaf most influenced this result." if result.get("heatmap") else ""
    tail = " For a clearer answer, retake in good light with one leaf filling the frame." if band == "low" else ""
    return (head + sev_txt + cam_txt + tail).strip()
