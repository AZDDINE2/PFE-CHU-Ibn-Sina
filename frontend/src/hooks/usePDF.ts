/**
 * usePDF — Rapport PDF multi-pages utilisant le template officiel CHU Ibn Sina
 * Charge template_chu.pdf, efface la zone contenu, injecte les données.
 * Gère automatiquement la pagination : ajout de nouvelles pages si nécessaire.
 */
import { useState } from 'react';

export type PDFSection =
  | { type: 'title';    text: string }
  | { type: 'subtitle'; text: string }
  | { type: 'kpis';     items: { label: string; value: string | number; color?: string }[] }
  | { type: 'table';    title: string; columns: string[]; rows: (string|number)[][] }
  | { type: 'spacer' }
  | { type: 'text';     text: string }
  | { type: 'info';     label: string; value: string };

/* ─── Tronque le texte pour qu'il tienne dans maxW points (évite le retour à la ligne) ─── */
const fitText = (
  font: { widthOfTextAtSize: (t: string, s: number) => number },
  text: string,
  size: number,
  maxW: number,
): string => {
  if (font.widthOfTextAtSize(text, size) <= maxW) return text;
  let lo = 0, hi = text.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2);
    if (font.widthOfTextAtSize(text.slice(0, mid) + '..', size) <= maxW) lo = mid;
    else hi = mid - 1;
  }
  return text.slice(0, lo) + (lo < text.length ? '..' : '');
};

/* ─── Nettoyage caractères hors WinAnsi (vérification par code) ─── */
const sanitize = (s: string | number): string => {
  const str = String(s);
  let out = '';
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if      (c === 0x202F)              out += ' ';   // narrow no-break space
    else if (c === 0x00A0)              out += ' ';   // non-breaking space
    else if (c === 0x2013 || c === 0x2014) out += '-'; // en-dash / em-dash
    else if (c === 0x2018 || c === 0x2019) out += "'"; // curly single quotes
    else if (c === 0x201C || c === 0x201D) out += '"'; // curly double quotes
    else if (c === 0x2026)              out += '...'; // ellipsis
    else if (c > 0x00FF)               out += ' ';   // tout autre hors Latin-1
    else                               out += str[i];
  }
  return out;
};

/* ─── Chargement du template PDF ─── */
const loadTemplatePDF = async (): Promise<Uint8Array | null> => {
  try {
    const res = await fetch('/template_chu.pdf');
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch { return null; }
};

/* ═══════════════════════════════════════════════════════════
   GÉNÉRATION PRINCIPALE
═══════════════════════════════════════════════════════════ */
export const generatePDF = async (
  filename: string,
  pageTitle: string,
  sections: PDFSection[],
  meta?: { reference?: string; filtres?: string },
): Promise<string> => {
  const templateBytes = await loadTemplatePDF();
  const bytes = templateBytes
    ? await generateFromTemplate(filename, pageTitle, sections, meta, templateBytes)
    : await generateFallback(filename, pageTitle, sections, meta);
  downloadBytes(bytes, filename);
  return bytesToBase64(bytes);
};

/* ═══════════════════════════════════════════════════════════
   MODE TEMPLATE MULTI-PAGES — pdf-lib
═══════════════════════════════════════════════════════════ */
const generateFromTemplate = async (
  filename: string,
  pageTitle: string,
  sections: PDFSection[],
  meta: { reference?: string; filtres?: string } | undefined,
  templateBytes: Uint8Array,
) => {
  const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');

  /* ── Charger le template source (pour copier ses pages) ── */
  const templateSrc = await PDFDocument.load(templateBytes);
  const pdfDoc      = await PDFDocument.create();

  /* ── Polices Times-Roman (identiques au doc officiel CHU) ── */
  const fontBold   = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const fontNormal = await pdfDoc.embedFont(StandardFonts.TimesRoman);

  /* ── Constantes typographiques ── */
  const FS_BODY      = 10;
  const FS_SMALL     = 8.5;
  const FS_TABLE     = 9.5;
  const FS_HEAD      = 10;
  const FS_TITLE_SEC = 11;
  const FS_TITLE     = 13;
  const LINE_H       = 14;
  const BLACK        = rgb(0, 0, 0);
  const DARK         = rgb(0.15, 0.15, 0.15);
  const GREY         = rgb(0.4, 0.4, 0.4);

  /* ── État de pagination (muté par newPage) ── */
  let page!: ReturnType<typeof pdfDoc.getPages>[0];
  let width          = 0;
  let contentTop     = 0;
  let contentBottom  = 0;
  let curY           = 0;
  let pageCount      = 0;

  /* ── Ajouter une nouvelle page depuis le template ── */
  const newPage = async () => {
    pageCount++;
    const [copied] = await pdfDoc.copyPages(templateSrc, [0]);
    pdfDoc.addPage(copied);
    page          = pdfDoc.getPages()[pdfDoc.getPageCount() - 1];
    const sz      = page.getSize();
    width         = sz.width;
    const h       = sz.height;
    contentTop    = h - 135;
    contentBottom = 52;

    /* Effacer la zone contenu */
    page.drawRectangle({
      x: 0, y: contentBottom,
      width, height: contentTop - contentBottom,
      color: rgb(1, 1, 1),
    });

    curY = contentTop;
  };

  /* ── S'assurer qu'il reste assez de place, sinon nouvelle page ── */
  const ensureSpace = async (needed: number) => {
    if (curY - needed < contentBottom + 10) {
      await newPage();
    }
  };

  /* ════════════════════════════════════
     PAGE 1 — Date, filtres, titre
  ════════════════════════════════════ */
  await newPage();

  /* Date (alignée à droite comme dans le doc officiel) */
  const dateStr = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  page.drawText(sanitize(`Le ${dateStr}`), {
    x: width - 145, y: contentTop - 16,
    size: FS_BODY, font: fontNormal, color: BLACK,
  });

  if (meta?.reference) {
    page.drawText(sanitize(`Ref : ${meta.reference}`), {
      x: width - 155, y: contentTop - 29,
      size: FS_SMALL, font: fontNormal, color: DARK,
    });
  }

  curY = contentTop - (meta?.reference ? 46 : 32);

  /* Filtres actifs */
  if (meta?.filtres) {
    page.drawText('Filtres appliques :', {
      x: 42, y: curY, size: FS_BODY, font: fontBold, color: BLACK,
    });
    page.drawText(sanitize(meta.filtres.slice(0, 85)), {
      x: 148, y: curY, size: FS_BODY, font: fontNormal, color: DARK,
    });
    curY -= LINE_H;
    page.drawLine({
      start: { x: 42, y: curY }, end: { x: width - 42, y: curY },
      thickness: 0.5, color: BLACK,
    });
    curY -= 12;
  }

  /* Titre principal centré, gras, souligné */
  const titleW = fontBold.widthOfTextAtSize(sanitize(pageTitle), FS_TITLE);
  const titleX = (width - titleW) / 2;
  page.drawText(sanitize(pageTitle), {
    x: titleX, y: curY, size: FS_TITLE, font: fontBold, color: BLACK,
  });
  curY -= 24;

  /* ════════════════════════════════════
     RENDU DES SECTIONS
  ════════════════════════════════════ */
  for (const section of sections) {

    /* ── spacer ── */
    if (section.type === 'spacer') {
      await ensureSpace(8);
      curY -= 8;
      continue;
    }

    /* ── title (section) ── */
    if (section.type === 'title') {
      await ensureSpace(24);
      curY -= 4;
      page.drawText(sanitize(section.text), {
        x: 42, y: curY, size: FS_TITLE_SEC, font: fontBold, color: BLACK,
      });
      curY -= 18;
      continue;
    }

    /* ── subtitle ── */
    if (section.type === 'subtitle') {
      await ensureSpace(LINE_H + 6);
      page.drawText(sanitize(section.text), {
        x: 42, y: curY, size: FS_BODY, font: fontBold, color: BLACK,
      });
      curY -= LINE_H;
      continue;
    }

    /* ── text (paragraphe avec retour à la ligne) ── */
    if (section.type === 'text') {
      const words = sanitize(section.text).split(' ');
      let line = '';
      for (const word of words) {
        const test = line + (line ? ' ' : '') + word;
        if (fontNormal.widthOfTextAtSize(test, FS_BODY) > width - 84 && line) {
          await ensureSpace(LINE_H);
          page.drawText(line, { x: 42, y: curY, size: FS_BODY, font: fontNormal, color: DARK });
          curY -= LINE_H;
          line = word;
        } else {
          line = test;
        }
      }
      if (line) {
        await ensureSpace(LINE_H);
        page.drawText(line, { x: 42, y: curY, size: FS_BODY, font: fontNormal, color: DARK });
        curY -= LINE_H;
      }
      curY -= 4;
      continue;
    }

    /* ── info (label : valeur) ── */
    if (section.type === 'info') {
      await ensureSpace(LINE_H);
      page.drawText(sanitize(`${section.label} :`), {
        x: 42, y: curY, size: FS_BODY, font: fontBold, color: BLACK,
      });
      page.drawText(sanitize(section.value), {
        x: 148, y: curY, size: FS_BODY, font: fontNormal, color: DARK,
      });
      curY -= LINE_H;
      continue;
    }

    /* ── kpis (grille de cartes) ── */
    if (section.type === 'kpis') {
      const cols     = Math.min(section.items.length, 3);
      const cw       = (width - 84) / cols;
      const ch       = 30;
      const rowCount = Math.ceil(section.items.length / cols);
      const needed   = rowCount * (ch + 5) + 6;

      /* Si le bloc entier ne rentre pas → nouvelle page */
      await ensureSpace(needed);

      section.items.forEach((item, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const cx  = 42 + col * cw;
        const cy  = curY - ch - row * (ch + 5);

        page.drawRectangle({
          x: cx, y: cy, width: cw - 4, height: ch,
          borderColor: BLACK, borderWidth: 0.4, color: rgb(1, 1, 1),
        });
        page.drawLine({
          start: { x: cx, y: cy }, end: { x: cx, y: cy + ch },
          thickness: 2, color: BLACK,
        });
        page.drawText(sanitize(item.label.toUpperCase()), {
          x: cx + 7, y: cy + ch - 11,
          size: FS_SMALL, font: fontNormal, color: GREY,
        });
        page.drawText(sanitize(String(item.value)), {
          x: cx + 7, y: cy + 6,
          size: 14, font: fontBold, color: BLACK,
        });
      });

      curY -= needed;
      continue;
    }

    /* ── table (avec continuation multi-pages) ── */
    if (section.type === 'table') {
      const cols   = section.columns.length;
      const colW   = (width - 84) / cols;
      const rowH   = 14;
      const tableX = 42;

      /* Titre du tableau — centré, gras, souligné */
      await ensureSpace(rowH * 3 + 14); // au moins titre + header + 1 ligne
      const ttW = fontBold.widthOfTextAtSize(sanitize(section.title), FS_TITLE_SEC);
      const ttX = (width - ttW) / 2;
      page.drawText(sanitize(section.title), {
        x: ttX, y: curY, size: FS_TITLE_SEC, font: fontBold, color: BLACK,
      });
      curY -= 12;

      /* Dessiner l'en-tête du tableau sur la page courante */
      const drawTableHeader = () => {
        page.drawRectangle({
          x: tableX, y: curY - rowH, width: width - 84, height: rowH,
          borderColor: BLACK, borderWidth: 0.5, color: rgb(1, 1, 1),
        });
        section.columns.forEach((col, ci) => {
          const cx  = tableX + ci * colW + colW / 2;
          const fit = fitText(fontBold, sanitize(col), FS_HEAD, colW - 6);
          const cw2 = fontBold.widthOfTextAtSize(fit, FS_HEAD);
          page.drawText(fit, {
            x: cx - cw2 / 2,
            y: curY - rowH + (rowH - FS_HEAD) / 2 + 1,
            size: FS_HEAD, font: fontBold, color: BLACK,
          });
          if (ci > 0) {
            page.drawLine({
              start: { x: tableX + ci * colW, y: curY - rowH },
              end:   { x: tableX + ci * colW, y: curY },
              thickness: 0.4, color: BLACK,
            });
          }
        });
        curY -= rowH;
      };

      drawTableHeader();

      /* Lignes de données — saut de page automatique */
      for (let ri = 0; ri < section.rows.length; ri++) {

        if (curY - rowH < contentBottom + 20) {
          /* Nouvelle page : répéter l'en-tête du tableau */
          await newPage();
          /* Indicateur de continuation */
          page.drawText(sanitize(`(suite) ${section.title}`), {
            x: 42, y: curY - 4,
            size: FS_SMALL, font: fontNormal, color: GREY,
          });
          curY -= 14;
          drawTableHeader();
        }

        /* Fond alternant (lignes paires légèrement grisées) */
        page.drawRectangle({
          x: tableX, y: curY - rowH, width: width - 84, height: rowH,
          borderColor: BLACK, borderWidth: 0.25,
          color: ri % 2 === 1 ? rgb(0.97, 0.97, 0.97) : rgb(1, 1, 1),
        });

        section.rows[ri].forEach((cell, ci) => {
          const fit = fitText(fontNormal, sanitize(cell), FS_TABLE, colW - 6);
          const cx  = tableX + ci * colW + colW / 2;
          const tw2 = fontNormal.widthOfTextAtSize(fit, FS_TABLE);
          page.drawText(fit, {
            x: cx - tw2 / 2,
            y: curY - rowH + (rowH - FS_TABLE) / 2 + 1,
            size: FS_TABLE, font: fontNormal, color: BLACK,
          });
          if (ci > 0) {
            page.drawLine({
              start: { x: tableX + ci * colW, y: curY - rowH },
              end:   { x: tableX + ci * colW, y: curY },
              thickness: 0.25, color: BLACK,
            });
          }
        });

        curY -= rowH;
      }

      curY -= 10;
      continue;
    }
  }

  /* ── Numéros de page dans la zone contenu (haut droit des pages de suite) ── */
  const totalPages = pdfDoc.getPageCount();
  if (totalPages > 1) {
    pdfDoc.getPages().forEach((p, i) => {
      if (i === 0) return;
      const sz = p.getSize();
      const label = `Page ${i + 1} / ${totalPages}`;
      const lw = fontNormal.widthOfTextAtSize(label, FS_SMALL);
      /* Juste sous l'en-tête institutionnel, à droite — hors zone footer */
      p.drawText(label, {
        x: sz.width - 42 - lw,
        y: sz.height - 135 - 12,
        size: FS_SMALL, font: fontNormal, color: GREY,
      });
    });
  }

  return await pdfDoc.save();
};

/* ═══════════════════════════════════════════════════════════
   MODE FALLBACK — jsPDF (si template_chu.pdf absent)
═══════════════════════════════════════════════════════════ */
const generateFallback = async (
  _filename: string,
  pageTitle: string,
  sections: PDFSection[],
  _meta?: { reference?: string; filtres?: string },
) => {
  const jsPDFModule    = await import('jspdf');
  const autoTableModule= await import('jspdf-autotable');
  const jsPDF          = jsPDFModule.default;
  const autoTable      = autoTableModule.default;

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw  = pdf.internal.pageSize.getWidth();

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.setTextColor(0, 0, 0);
  pdf.text('CHU Ibn Sina — Rabat', pw / 2, 18, { align: 'center' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(60, 60, 60);
  pdf.text('Centre Hospitalo-Universitaire — Direction des Urgences', pw / 2, 24, { align: 'center' });
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);
  pdf.line(14, 27, pw - 14, 27);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(0, 0, 0);
  pdf.text(pageTitle, pw / 2, 38, { align: 'center' });
  const tw = pdf.getTextWidth(pageTitle);
  pdf.setLineWidth(0.4);
  pdf.line(pw / 2 - tw / 2, 39.5, pw / 2 + tw / 2, 39.5);

  let y = 48;
  for (const section of sections) {
    if (section.type === 'table') {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.text(section.title, pw / 2, y, { align: 'center' });
      y += 6;
      autoTable(pdf, {
        startY: y,
        head: [section.columns],
        body: section.rows.map(r => r.map(String)),
        margin: { left: 14, right: 14 },
        styles: { fontSize: 8, textColor: [0,0,0], lineColor: [0,0,0], lineWidth: 0.25 },
        headStyles: { fillColor: false as any, textColor: [0,0,0], fontStyle: 'bold', lineWidth: 0.4 },
        alternateRowStyles: { fillColor: false as any },
        didDrawPage: () => {
          /* répéter en-tête minimal sur nouvelles pages */
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(8);
          pdf.setTextColor(100, 100, 100);
          pdf.text('CHU Ibn Sina — suite', pw / 2, 10, { align: 'center' });
        },
      });
      y = (pdf as any).lastAutoTable.finalY + 8;
    }
  }

  return new Uint8Array(pdf.output('arraybuffer') as ArrayBuffer);
};

/* ─── Bytes → base64 ─── */
const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

/* ─── Téléchargement des bytes ─── */
const downloadBytes = (bytes: Uint8Array, filename: string) => {
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

/* ═══════════════════════════════════════════════════════════
   Hook React
═══════════════════════════════════════════════════════════ */
export const usePDF = (_filename = 'rapport_CHU_Ibn_Sina.pdf') => {
  const [exporting,  setExporting]  = useState(false);
  const [pdfBase64,  setPdfBase64]  = useState<string | undefined>(undefined);
  const [pdfFilename,setPdfFilename]= useState<string>('rapport_CHU.pdf');

  const exportPDF = async (_elementId: string) => {
    console.warn('Déprécié. Utilisez exportReport.');
  };

  const exportReport = async (
    filename: string,
    pageTitle: string,
    sections: PDFSection[],
    meta?: { reference?: string; filtres?: string },
  ) => {
    setExporting(true);
    try {
      const b64 = await generatePDF(filename, pageTitle, sections, meta);
      setPdfBase64(b64);
      setPdfFilename(filename);
    } finally {
      setExporting(false);
    }
  };

  return { exportPDF, exportReport, exporting, pdfBase64, pdfFilename };
};
