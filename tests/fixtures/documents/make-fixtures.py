"""Builds the document fixtures the reader's parser tests run against.

Everything here is written with the standard library: `zipfile` produces real
DEFLATE streams, so the tests exercise the app's own inflate implementation
rather than a hand-made stand-in.
"""

import pathlib
import zipfile
import zlib

OUT = pathlib.Path(__file__).resolve().parent
OUT.mkdir(parents=True, exist_ok=True)

W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
R = 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'

CONTENT_TYPES = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
</Types>"""


def write_zip(path, entries, stored=()):
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, data in entries:
            if isinstance(data, str):
                data = data.encode("utf-8")
            method = zipfile.ZIP_STORED if name in stored else zipfile.ZIP_DEFLATED
            archive.writestr(zipfile.ZipInfo(name, (2026, 1, 2, 9, 30, 0)), data, compress_type=method)


# ---------------------------------------------------------------- docx
document_xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document {W} {R}>
  <w:body>
    <w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:t>Rental agreement</w:t></w:r></w:p>
    <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Parties</w:t></w:r></w:p>
    <w:p>
      <w:r><w:t xml:space="preserve">Between </w:t></w:r>
      <w:r><w:rPr><w:b/></w:rPr><w:t>Amrit Gyawali</w:t></w:r>
      <w:r><w:t xml:space="preserve"> and </w:t></w:r>
      <w:r><w:rPr><w:i/></w:rPr><w:t>Shrestha Properties</w:t></w:r>
      <w:r><w:t>.</w:t></w:r>
    </w:p>
    <w:p>
      <w:hyperlink r:id="rId9"><w:r><w:t>Full terms online</w:t></w:r></w:hyperlink>
    </w:p>
    <w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>Obligations</w:t></w:r></w:p>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>Pay rent by the 5th</w:t></w:r></w:p>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>Keep the meter reading log</w:t></w:r></w:p>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr></w:pPr><w:r><w:t>Bullet one</w:t></w:r></w:p>
    <w:tbl>
      <w:tr><w:tc><w:p><w:r><w:t>Month</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Rent</w:t></w:r></w:p></w:tc></w:tr>
      <w:tr><w:tc><w:p><w:r><w:t>Baisakh</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>25,000</w:t></w:r></w:p></w:tc></w:tr>
    </w:tbl>
    <w:p><w:r><w:t>Signed in Kathmandu.</w:t></w:r></w:p>
  </w:body>
</w:document>"""

numbering_xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering {W}>
  <w:abstractNum w:abstractNumId="10">
    <w:lvl w:ilvl="0"><w:numFmt w:val="decimal"/></w:lvl>
  </w:abstractNum>
  <w:abstractNum w:abstractNumId="20">
    <w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/></w:lvl>
  </w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="10"/></w:num>
  <w:num w:numId="2"><w:abstractNumId w:val="20"/></w:num>
</w:numbering>"""

document_rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId9" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://example.test/terms" TargetMode="External"/>
</Relationships>"""

write_zip(
    OUT / "sample.docx",
    [
        ("[Content_Types].xml", CONTENT_TYPES),
        ("word/document.xml", document_xml),
        ("word/numbering.xml", numbering_xml),
        ("word/_rels/document.xml.rels", document_rels),
    ],
)

# ---------------------------------------------------------------- xlsx
SS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'

workbook_xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook {SS} {R}>
  <sheets>
    <sheet name="January" sheetId="1" r:id="rId1"/>
    <sheet name="Summary" sheetId="2" r:id="rId2"/>
  </sheets>
</workbook>"""

workbook_rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
</Relationships>"""

shared_strings = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst {SS} count="5" uniqueCount="5">
  <si><t>Date</t></si>
  <si><t>Description</t></si>
  <si><t>Amount</t></si>
  <si><r><t>Rent </t></r><r><t>Kathmandu</t></r></si>
  <si><t>Total</t></si>
</sst>"""

styles_xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet {SS}>
  <cellXfs count="2">
    <xf numFmtId="0"/>
    <xf numFmtId="14"/>
  </cellXfs>
</styleSheet>"""

# Row 3 is deliberately missing, to prove rows are placed by their `r` index.
sheet1 = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet {SS}>
  <sheetData>
    <row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c></row>
    <row r="2"><c r="A2" s="1"><v>44927</v></c><c r="B2" t="s"><v>3</v></c><c r="C2"><v>-25000</v></c></row>
    <row r="4"><c r="A4" s="1"><v>44930</v></c><c r="B4" t="inlineStr"><is><t>Salary</t></is></c><c r="C4"><f>SUM(1)</f><v>80000</v></c></row>
  </sheetData>
</worksheet>"""

sheet2 = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet {SS}>
  <sheetData>
    <row r="1"><c r="A1" t="s"><v>4</v></c><c r="B1"><v>55000</v></c></row>
    <row r="2"><c r="B2" t="b"><v>1</v></c></row>
  </sheetData>
</worksheet>"""

write_zip(
    OUT / "sample.xlsx",
    [
        ("[Content_Types].xml", CONTENT_TYPES),
        ("xl/workbook.xml", workbook_xml),
        ("xl/_rels/workbook.xml.rels", workbook_rels),
        ("xl/sharedStrings.xml", shared_strings),
        ("xl/styles.xml", styles_xml),
        ("xl/worksheets/sheet1.xml", sheet1),
        ("xl/worksheets/sheet2.xml", sheet2),
    ],
)

# ---------------------------------------------------------------- pptx
A = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"'
P = 'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"'


def slide(title, bullets):
    items = "".join(
        f'<a:p><a:pPr lvl="0"/><a:r><a:t>{bullet}</a:t></a:r></a:p>' for bullet in bullets
    )
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld {A} {P}><p:cSld><p:spTree>
  <p:sp>
    <p:nvSpPr><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>
    <p:txBody><a:p><a:r><a:t>{title}</a:t></a:r></a:p></p:txBody>
  </p:sp>
  <p:sp>
    <p:nvSpPr><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr>
    <p:txBody>{items}</p:txBody>
  </p:sp>
</p:spTree></p:cSld></p:sld>"""


notes = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:notes {A} {P}><p:cSld><p:spTree><p:sp><p:txBody>
  <a:p><a:r><a:t>Mention the fiscal year change</a:t></a:r></a:p>
</p:txBody></p:sp></p:spTree></p:cSld></p:notes>"""

write_zip(
    OUT / "sample.pptx",
    [
        ("[Content_Types].xml", CONTENT_TYPES),
        ("ppt/presentation.xml", f'<?xml version="1.0"?><p:presentation {P}/>'),
        ("ppt/slides/slide1.xml", slide("Quarter in review", ["Income up 12%", "Two new loans"])),
        ("ppt/slides/slide2.xml", slide("Next steps", ["Close the Nabil import"])),
        ("ppt/notesSlides/notesSlide1.xml", notes),
    ],
)

# ---------------------------------------------------------------- odt / ods
TEXT_NS = (
    'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" '
    'xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" '
    'xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" '
    'xmlns:xlink="http://www.w3.org/1999/xlink"'
)

odt_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<office:document-content {TEXT_NS}>
  <office:body><office:text>
    <text:h text:outline-level="1">Meter readings</text:h>
    <text:p>Recorded on the <text:span>first</text:span> of each month.</text:p>
    <text:list><text:list-item><text:p>Ground floor</text:p></text:list-item>
    <text:list-item><text:p>First floor</text:p></text:list-item></text:list>
    <table:table table:name="Readings">
      <table:table-row><table:table-cell><text:p>Month</text:p></table:table-cell><table:table-cell><text:p>Units</text:p></table:table-cell></table:table-row>
      <table:table-row><table:table-cell><text:p>Poush</text:p></table:table-cell><table:table-cell><text:p>132</text:p></table:table-cell></table:table-row>
    </table:table>
  </office:text></office:body>
</office:document-content>"""

write_zip(
    OUT / "sample.odt",
    [
        ("mimetype", "application/vnd.oasis.opendocument.text"),
        ("content.xml", odt_content),
    ],
    stored=("mimetype",),
)

ods_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<office:document-content {TEXT_NS}>
  <office:body><office:spreadsheet>
    <table:table table:name="Ledger">
      <table:table-row>
        <table:table-cell><text:p>Item</text:p></table:table-cell>
        <table:table-cell><text:p>Cost</text:p></table:table-cell>
      </table:table-row>
      <table:table-row>
        <table:table-cell><text:p>Cement</text:p></table:table-cell>
        <table:table-cell><text:p>1450</text:p></table:table-cell>
        <table:table-cell table:number-columns-repeated="900"/>
      </table:table-row>
    </table:table>
  </office:spreadsheet></office:body>
</office:document-content>"""

write_zip(
    OUT / "sample.ods",
    [
        ("mimetype", "application/vnd.oasis.opendocument.spreadsheet"),
        ("content.xml", ods_content),
    ],
    stored=("mimetype",),
)

# ---------------------------------------------------------------- epub
container = """<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/book.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>"""

opf = """<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Field notes</dc:title></metadata>
  <manifest>
    <item id="c1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
    <item id="c2" href="text/chapter2.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine><itemref idref="c1"/><itemref idref="c2"/></spine>
</package>"""

chapter1 = """<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"><body>
  <h1>Arrival</h1>
  <p>The bus reached <em>Pokhara</em> after dark.</p>
</body></html>"""

chapter2 = """<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"><body>
  <h1>Departure</h1>
  <p>Breakfast at the lakeside, then the long road home.</p>
</body></html>"""

write_zip(
    OUT / "sample.epub",
    [
        ("mimetype", "application/epub+zip"),
        ("META-INF/container.xml", container),
        ("OEBPS/book.opf", opf),
        ("OEBPS/chapter1.xhtml", chapter1),
        ("OEBPS/text/chapter2.xhtml", chapter2),
    ],
    stored=("mimetype",),
)

# ---------------------------------------------------------------- plain zip
write_zip(
    OUT / "sample.zip",
    [
        ("readme.txt", "Kept for the archive listing test.\n"),
        # Highly repetitive so it is genuinely deflated, exercising back-references.
        ("logs/big.log", ("2026-01-01 sync ok\n" * 400)),
        ("stored.bin", bytes(range(256))),
    ],
    stored=("stored.bin",),
)

# ------------------------------------------------------- raw deflate streams
(OUT / "deflate-dynamic.bin").write_bytes(
    zlib.compress(("The quick brown fox jumps over the lazy dog. " * 40).encode(), 9)[2:-4]
)

fixed = zlib.compressobj(9, zlib.DEFLATED, -15, 9, zlib.Z_FIXED)
(OUT / "deflate-fixed.bin").write_bytes(fixed.compress(b"abcabcabcabc") + fixed.flush())

stored = zlib.compressobj(0, zlib.DEFLATED, -15)
(OUT / "deflate-stored.bin").write_bytes(stored.compress(b"stored bytes, not compressed") + stored.flush())

print("\n".join(sorted(f"{p.name} {p.stat().st_size}B" for p in OUT.iterdir())))
