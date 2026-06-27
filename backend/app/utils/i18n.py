import logging

logger = logging.getLogger("app.utils.i18n")

def localize_disease(disease_dict: dict, lang: str = "en") -> dict:
    """
    Localize a disease document dictionary based on the requested lang code.
    Falls back to English if the translation or specific fields are missing.
    """
    if not lang or lang.lower() == "en":
        return disease_dict

    lang = lang.lower()
    i18n_map = disease_dict.get("i18n", {})
    if not i18n_map or lang not in i18n_map:
        return disease_dict

    translated = i18n_map[lang]
    localized = dict(disease_dict)

    if "name" in translated and translated["name"]:
        localized["name"] = translated["name"]
    if "symptoms" in translated and translated["symptoms"]:
        localized["symptoms"] = translated["symptoms"]
    if "cause" in translated and translated["cause"]:
        localized["cause"] = translated["cause"]
    if "lifecycle" in translated and translated["lifecycle"]:
        localized["lifecycle"] = translated["lifecycle"]

    # Localize treatments if provided
    if "treatments" in translated:
        t_trans = translated["treatments"]
        t_orig = disease_dict.get("treatments", {})
        
        localized_treatments = {}
        for key in ["organic", "chemical", "prevention"]:
            if key in t_trans:
                localized_treatments[key] = t_trans[key]
            else:
                localized_treatments[key] = t_orig.get(key, [] if key == "prevention" else [])
        localized["treatments"] = localized_treatments

    return localized
