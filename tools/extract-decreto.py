#!/usr/bin/env python3
"""Extrae las plantillas de curriculo de Primaria desde el PDF del Decreto 66/2022.

Lee sources/Decreto 662022.pdf (Anexo II-A) y escribe una plantilla JSON por
area+ciclo en plantillas/. Formato compatible con el importador de Evalora
(tipo "curriculo-evalcrit").

Uso: python3 tools/extract-decreto.py
Requiere: pypdf (pip install pypdf)
"""
import json
import re
import sys
import unicodedata
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")
try:
    from pypdf import PdfReader
except ImportError:
    sys.exit("Falta pypdf. Instala con: pip install pypdf")

RAIZ = Path(__file__).resolve().parent.parent
PDF = RAIZ / "sources" / "Decreto 662022.pdf"
OUT = RAIZ / "plantillas"
FUENTE = ("Decreto 66/2022, de 7 de julio, por el que se establece el currículo de Educación "
          "Infantil y Primaria en la Comunidad Autónoma de Cantabria (BOC nº 135, 13-07-2022), "
          "Anexo II-A")

AREAS = [
    ("Conocimiento del Medio Natural, Social y Cultural", "CMNSC"),
    ("Educación Artística", "EART"),
    ("Educación Física", "EFIS"),
    ("Educación en Valores Cívicos y Éticos", "EVCE"),
    ("Lengua Castellana y Literatura", "LCL"),
    ("Lengua Extranjera", "LEXT"),
    ("Matemáticas", "MAT"),
]
CICLOS = ["Primer ciclo", "Segundo ciclo", "Tercer ciclo"]
CICLO_COD = {"Primer ciclo": "PC", "Segundo ciclo": "SC", "Tercer ciclo": "TC"}
CICLO_CURSOS = {"Primer ciclo": ["1º", "2º"], "Segundo ciclo": ["3º", "4º"], "Tercer ciclo": ["5º", "6º"]}
# EVC solo se imparte en 5.º (Decreto 66/2022, art. 17.2)
CICLO_CURSOS_ESPECIAL = {"Educación en Valores Cívicos y Éticos": ["5º"]}

RUIDO = re.compile(
    r"(boc\.cantabria\.es|CVE-2022-5545|MI[EÉ]RCOLES|^\s*P[aá]g\.|^\s*\d+/\d+\s*$|ANEXO\s)",
    re.IGNORECASE)
RE_CE = re.compile(r"^\s*(\d{1,2})\.\s+(\S.*)$")
RE_CE_HDR = re.compile(r"^\s*Competencia espec[ií]fica\s+(\d{1,2})\b", re.IGNORECASE)
RE_CRIT = re.compile(r"^\s*(\d{1,2})\.(\d{1,2})\.\s+(\S.*)$")
# El punto final es opcional: en el BOC hay 6 lineas de perfil que no lo llevan
# (Lengua CE10 en los 3 ciclos, Educacion Fisica CE5 en los 3) y sin esto se
# quedaban con perfilSalida vacio.
RE_PERFIL = re.compile(r"descriptores del Perfil de salida:\s*(.+?)\.?\s*$", re.IGNORECASE)
RE_BLOQUE = re.compile(r"^\s*([A-Z])\.\s+(\S.*?)\.\s*$")
RE_SUBITEM = re.compile(r"^\s*(\d{1,2})\.+\.?\s*(\S.*?)\.?\s*$")


def slug(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()
    return s


def limpiar(lineas):
    out = []
    for ln in lineas:
        if RUIDO.search(ln):
            out.append("")
            continue
        ln = re.sub(r"\s+", " ", ln).strip()
        out.append(ln)
    return out


def unir_lineas(lineas):
    """Reconstruye parrafos: une una linea a la anterior si es una continuacion
    (linea anterior sin puntuacion final y esta empieza en minuscula)."""
    out = []
    for ln in lineas:
        if ln == "":
            continue
        if out and not out[-1].endswith((".", ":", ";", "?", "!")) and ln[:1].islower():
            out[-1] += " " + ln
        else:
            out.append(ln)
    return out


def parse_ce(lineas):
    """Competencias especificas: descripcion (primer parrafo) + descriptores del perfil."""
    ces, actual = [], None
    for ln in lineas:
        m = RE_CE.match(ln)
        if m and (actual is None or int(m.group(1)) != actual["n"]):
            desc = m.group(2)
            actual = {"n": int(m.group(1)), "desc": desc, "perfil": [],
                      "_desc_listo": desc.rstrip().endswith((".", "?", "!"))}
            ces.append(actual)
            continue
        if actual is None:
            continue
        mp = RE_PERFIL.search(ln)
        if mp:
            actual["perfil"] = [d.strip() for d in mp.group(1).split(",") if d.strip()]
            actual["_desc_listo"] = True
            continue
        if not actual["_desc_listo"] and ln.strip():
            actual["desc"] += " " + ln.strip()
            if actual["desc"].rstrip().endswith((".", "?", "!")):
                actual["_desc_listo"] = True
    return ces


def parse_criterios(lineas):
    """Criterios de evaluacion numerados N.M. Ademas, en el BOC hay 8 CE cuyo
    criterio va SIN numerar (Lengua CE2 en los 3 ciclos y CE5 en 1.er/2.o,
    Educacion Fisica CE5 en los 3): es un texto suelto justo bajo su cabecera
    "Competencia especifica N.". Se recupera como N.1; sin esto el criterio se
    perdia y la CE quedaba sin ninguno."""
    crits, actual = [], None
    ce_hdr = None       # ultima cabecera "Competencia especifica N."
    numerado = False    # ya salio un criterio numerado tras esa cabecera
    for ln in lineas:
        m = RE_CRIT.match(ln)
        if m:
            actual = {"ce": int(m.group(1)), "ord": int(m.group(2)), "desc": m.group(3).strip()}
            crits.append(actual)
            numerado = True
            continue
        mh = RE_CE_HDR.match(ln)
        if mh:
            ce_hdr = int(mh.group(1))
            numerado = False
            actual = None
            continue
        if not ln.strip():
            continue
        if actual is not None:
            actual["desc"] += " " + ln.strip()
        elif ce_hdr is not None and not numerado:
            actual = {"ce": ce_hdr, "ord": 1, "desc": ln.strip()}
            crits.append(actual)
    return crits


def parse_saberes(lineas):
    bloques, bloque = [], None
    for ln in lineas:
        mb = RE_BLOQUE.match(ln)
        if mb and len(mb.group(2)) < 60 and not ln.strip().startswith("-"):
            bloque = {"bloque": f"{mb.group(1)}. {mb.group(2)}", "apartados": []}
            bloques.append(bloque)
            continue
        ms = RE_SUBITEM.match(ln)
        if bloque is not None and ms and len(ms.group(2)) < 70 and not ln.strip().startswith("-") and "." not in ms.group(2).rstrip("."):
            bloque["apartados"].append(ms.group(2).strip())
    return bloques


def extraer_texto():
    if not PDF.exists():
        sys.exit(f"No encuentro {PDF}")
    reader = PdfReader(str(PDF))
    partes = [(p.extract_text(extraction_mode="layout") or "") for p in reader.pages]
    return "\n".join(partes)


def recorta_anexo(txt):
    ini = txt.find("ANEXO II- A")
    if ini < 0:
        ini = txt.find("ANEXO II-A")
    fin = txt.find("ANEXO II-B")
    if ini < 0 or fin < 0 or fin <= ini:
        sys.exit("No localizo los limites del Anexo II-A")
    return txt[ini:fin]


def main():
    texto = recorta_anexo(extraer_texto())
    lineas = limpiar(texto.split("\n"))

    # limites de areas por encabezado solitario
    pos = {}
    for i, ln in enumerate(lineas):
        for nombre, _ in AREAS:
            if ln == nombre:
                pos.setdefault(nombre, i)
    faltan = [n for n, _ in AREAS if n not in pos]
    if faltan:
        sys.exit("No encuentro las areas: " + ", ".join(faltan))

    orden = [n for n, _ in AREAS]
    OUT.mkdir(exist_ok=True)
    (OUT / "generado.txt").write_text(
        "Plantillas generadas automaticamente desde sources/Decreto 662022.pdf\n"
        "con tools/extract-decreto.py. No editar a mano.\n", encoding="utf-8")

    total_tpl = 0
    for idx, nombre in enumerate(orden):
        codigo_area = dict(AREAS)[nombre]
        ini = pos[nombre]
        fin = pos[orden[idx + 1]] if idx + 1 < len(orden) else len(lineas)
        cuerpo = unir_lineas(lineas[ini + 1:fin])

        # bloque de competencias especificas
        try:
            c0 = cuerpo.index("Competencias específicas.")
        except ValueError:
            c0 = 0
        ce_ini = c0 + 1
        ce_fin = ce_ini
        while ce_fin < len(cuerpo) and cuerpo[ce_fin] not in CICLOS and cuerpo[ce_fin] != "Criterios de evaluación.":
            ce_fin += 1
        ces = parse_ce(cuerpo[ce_ini:ce_fin])
        ce_por_n = {c["n"]: c for c in ces}

        # regiones por ciclo
        idxs_ciclo = [(i, ln) for i, ln in enumerate(cuerpo) if ln in CICLOS]
        if not idxs_ciclo:
            idxs_ciclo = [(-1, "Tercer ciclo")]  # area de un solo bloque (p. ej. Valores civicos)

        for k, (ci, ciclo) in enumerate(idxs_ciclo):
            bloque = cuerpo[ci + 1: idxs_ciclo[k + 1][0] if k + 1 < len(idxs_ciclo) else len(cuerpo)]
            # partir en criterios / saberes
            try:
                s_i = bloque.index("Saberes básicos.")
                crit_lineas, sab_lineas = bloque[:s_i], bloque[s_i + 1:]
            except ValueError:
                crit_lineas, sab_lineas = bloque, []
            crits = parse_criterios(crit_lineas)
            if not crits and not ces:
                continue

            cod_ciclo = CICLO_COD[ciclo]
            pref = f"{codigo_area}.{cod_ciclo}"
            comps, crits_out = [], []
            for num in sorted(ce_por_n):
                ce = ce_por_n[num]
                comps.append({
                    "codigo": f"{pref}.CE{num}",
                    "descripcion": ce["desc"].strip(),
                    "perfilSalida": ce["perfil"],
                })
            for c in sorted(crits, key=lambda x: (x["ce"], x["ord"])):
                crits_out.append({
                    "codigo": f"{pref}.{c['ce']}.{c['ord']}",
                    "ceCodigo": f"{pref}.CE{c['ce']}",
                    "descripcion": c["desc"].strip(),
                    "peso": None,
                })

            tpl = {
                "version": 1,
                "tipo": "curriculo-evalcrit",
                "fuente": FUENTE,
                "asignatura": {
                    "nombre": nombre,
                    "etapa": "Primaria",
                    "ciclo": ciclo,
                    "cursos": CICLO_CURSOS_ESPECIAL.get(nombre, CICLO_CURSOS[ciclo]),
                },
                "saberesBasicos": parse_saberes(sab_lineas),
                "competenciasEspecificas": comps,
                "criterios": crits_out,
            }
            fichero = OUT / f"{slug(nombre)}-{slug(ciclo)}.json"
            fichero.write_text(json.dumps(tpl, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            total_tpl += 1
            print(f"  {fichero.name}: {len(comps)} CE, {len(crits_out)} criterios, "
                  f"{len(tpl['saberesBasicos'])} bloques de saberes")

    print(f"\nGeneradas {total_tpl} plantillas en {OUT}/")


if __name__ == "__main__":
    main()
