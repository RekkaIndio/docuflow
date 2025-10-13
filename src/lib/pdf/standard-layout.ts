import jsPDF from 'jspdf';

type Orientation = 'portrait' | 'landscape';

export interface StandardPdfMetaItem {
  label: string;
  value: string | number | undefined | null;
}

export interface StandardPdfOptions {
  title: string;
  subtitle?: string;
  meta?: StandardPdfMetaItem[];
  orientation?: Orientation;
  margin?: number;
  brandName?: string;
  brandTagline?: string;
  generatedAt?: string;
}

export interface StandardPdfTableColumn<T = Record<string, any>> {
  key: keyof T | string;
  header: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
}

export interface StandardPdfTableOptions<T = Record<string, any>> {
  columns: Array<StandardPdfTableColumn<T>>;
  rows: T[];
  stripe?: boolean;
}

type Rgb = readonly [number, number, number];

const palette = {
  ink: [17, 24, 39] as Rgb,
  muted: [75, 85, 99] as Rgb,
  subtle: [107, 114, 128] as Rgb,
  border: [209, 213, 219] as Rgb,
  divider: [31, 41, 55] as Rgb,
  accent: [59, 130, 246] as Rgb,
  chipGreen: [34, 197, 94] as Rgb,
  chipRed: [239, 68, 68] as Rgb,
  chipAmber: [245, 158, 11] as Rgb,
  headerBg: [31, 41, 55] as Rgb,
  stripe: [249, 250, 251] as Rgb,
} as const;

const setTextColor = (doc: jsPDF, color: Rgb) => {
  doc.setTextColor(color[0], color[1], color[2]);
};

const setFillColor = (doc: jsPDF, color: Rgb) => {
  doc.setFillColor(color[0], color[1], color[2]);
};

const setDrawColor = (doc: jsPDF, color: Rgb) => {
  doc.setDrawColor(color[0], color[1], color[2]);
};

export class StandardPdfBuilder {
  readonly doc: jsPDF;
  readonly options: StandardPdfOptions;
  readonly margin: number;
  readonly contentWidth: number;

  private cursorY: number;
  private readonly pageHeight: number;
  private readonly pageWidth: number;
  private readonly headerHeight: number;

  constructor(options: StandardPdfOptions) {
    this.options = options;
    this.doc = new jsPDF({ orientation: options.orientation ?? 'portrait' });
    this.margin = options.margin ?? 20;
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.contentWidth = this.pageWidth - this.margin * 2;

    this.headerHeight = this.drawHeader(false);
    this.cursorY = this.headerHeight;

    if (options.meta && options.meta.length > 0) {
      this.drawMetaGrid(options.meta);
    }
  }

  addSection(title: string, options?: { marginTop?: number; subtitle?: string }): void {
    const marginTop = options?.marginTop ?? 18;
    this.ensureSpace(marginTop + 12);
    this.cursorY += marginTop;

  this.doc.setFont('helvetica', 'bold');
  this.doc.setFontSize(13);
  setTextColor(this.doc, palette.ink);
    this.doc.text(title, this.margin, this.cursorY);

  setDrawColor(this.doc, palette.accent);
    this.doc.setLineWidth(0.6);
    this.doc.line(this.margin, this.cursorY + 3, this.margin + 42, this.cursorY + 3);

    if (options?.subtitle) {
  this.doc.setFont('helvetica', 'normal');
  this.doc.setFontSize(10);
  setTextColor(this.doc, palette.muted);
      this.cursorY += 8;
      this.doc.text(options.subtitle, this.margin, this.cursorY);
    }

    this.cursorY += 10;
  }

  addParagraph(text: string | null | undefined, options?: { fontSize?: number; spacing?: number }): void {
    const safeText = this.coerce(text);
    if (!safeText) {
      return;
    }

    const fontSize = options?.fontSize ?? 10;
    const spacing = options?.spacing ?? 5;
  this.doc.setFont('helvetica', 'normal');
  this.doc.setFontSize(fontSize);
  setTextColor(this.doc, palette.ink);

  const lines = this.wrapText(safeText, this.contentWidth);
    const blockHeight = lines.length * (fontSize * 0.42);
    this.ensureSpace(blockHeight + spacing);

    lines.forEach((line, index) => {
      this.doc.text(line, this.margin, this.cursorY + index * (fontSize * 0.42));
    });

    this.cursorY += blockHeight + spacing;
  }

  addSubheading(text: string | null | undefined, options?: { marginTop?: number; accent?: boolean }): void {
    const safeText = this.coerce(text);
    if (!safeText) return;

    const marginTop = options?.marginTop ?? 10;
    this.ensureSpace(marginTop + 6);
    this.cursorY += marginTop;

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(11);
    setTextColor(this.doc, options?.accent ? palette.accent : palette.muted);
    this.doc.text(safeText, this.margin, this.cursorY);
    this.cursorY += 6;
  }

  addBulletList(items: Array<string | null | undefined>, options?: { bullet?: string; fontSize?: number; spacing?: number }): void {
    const filtered = items.map((item) => this.coerce(item)).filter(Boolean) as string[];
    if (filtered.length === 0) return;

    const bullet = options?.bullet ?? '•';
    const fontSize = options?.fontSize ?? 10;
    const spacing = options?.spacing ?? 4;

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(fontSize);
    setTextColor(this.doc, palette.ink);

    filtered.forEach((item) => {
      const lines = this.wrapText(item, this.contentWidth - 10);
      const lineHeight = fontSize * 0.42;
      const requiredHeight = lines.length * lineHeight + spacing + 2;
      this.ensureSpace(requiredHeight);

      this.doc.text(bullet, this.margin, this.cursorY + lineHeight);
      lines.forEach((line, idx) => {
        this.doc.text(line, this.margin + 6, this.cursorY + lineHeight + idx * lineHeight);
      });

      this.cursorY += requiredHeight;
    });
  }

  addInfoGrid(items: StandardPdfMetaItem[], options?: { columns?: number }): void {
    const filtered = items.filter((item) => this.coerce(item.value));
    if (filtered.length === 0) return;

    const columns = options?.columns ?? Math.min(filtered.length, this.pageWidth > this.pageHeight ? 4 : 3);
    const gap = 8;
    const colWidth = (this.contentWidth - gap * (columns - 1)) / columns;

    const rowHeight = 24;
    const rows = Math.ceil(filtered.length / columns);
    this.ensureSpace(rows * rowHeight + 8);

    let x = this.margin;
    let y = this.cursorY;

    filtered.forEach((item, index) => {
  setFillColor(this.doc, [243, 244, 246] as Rgb);
      this.doc.roundedRect(x, y, colWidth, rowHeight, 2, 2, 'F');

  this.doc.setFont('helvetica', 'medium');
  this.doc.setFontSize(7);
  setTextColor(this.doc, palette.subtle);
      this.doc.text(item.label.toUpperCase(), x + 6, y + 8);

  this.doc.setFont('helvetica', 'bold');
  this.doc.setFontSize(10);
  setTextColor(this.doc, palette.ink);
  const valueLines = this.wrapText(this.coerce(item.value)!, colWidth - 12);
      valueLines.forEach((line, lineIdx) => {
        this.doc.text(line, x + 6, y + 15 + lineIdx * 4);
      });

      const isLastInRow = (index + 1) % columns === 0;
      if (isLastInRow) {
        x = this.margin;
        y += rowHeight + 6;
      } else {
        x += colWidth + gap;
      }
    });

    this.cursorY = y + rowHeight + 10;
  }

  addField(label: string, value: string | number | null | undefined, options?: { chip?: 'yes' | 'no' | 'info'; emphasis?: boolean }): void {
    const safeValue = this.coerce(value) || 'Not specified';
    const labelUpper = label.toUpperCase();

    const chip = options?.chip;
    const fontSize = 10;
    const lineHeight = fontSize * 0.42;
  const valueLines = this.wrapText(safeValue, this.contentWidth - 18);
    const blockHeight = 18 + valueLines.length * lineHeight;

    this.ensureSpace(blockHeight + 6);

  setFillColor(this.doc, [249, 250, 251] as Rgb);
    this.doc.roundedRect(this.margin, this.cursorY, this.contentWidth, blockHeight, 2, 2, 'F');

  this.doc.setFont('helvetica', 'medium');
  this.doc.setFontSize(8);
  setTextColor(this.doc, palette.subtle);
    this.doc.text(labelUpper, this.margin + 6, this.cursorY + 8);

  this.doc.setFont('helvetica', options?.emphasis ? 'bold' : 'normal');
  this.doc.setFontSize(11);
  setTextColor(this.doc, palette.ink);

    let valueY = this.cursorY + 16;

    if (chip && (chip === 'yes' || chip === 'no' || chip === 'info')) {
      const chipColor = chip === 'yes' ? palette.chipGreen : chip === 'no' ? palette.chipRed : palette.accent;
  setFillColor(this.doc, chipColor);
      this.doc.roundedRect(this.margin + 6, this.cursorY + 11, 26, 10, 4, 4, 'F');

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(8);
      this.doc.setTextColor(255, 255, 255);
      this.doc.text(chip.toUpperCase(), this.margin + 19, this.cursorY + 18, { align: 'center' });

  this.doc.setFont('helvetica', 'normal');
  this.doc.setFontSize(11);
  setTextColor(this.doc, palette.ink);
      valueY = this.cursorY + 26;
    }

    valueLines.forEach((line, idx) => {
      this.doc.text(line, this.margin + 6, valueY + idx * lineHeight);
    });

    this.cursorY += blockHeight + 6;
  }

  addTable<T extends Record<string, any>>(options: StandardPdfTableOptions<T>): void {
    const { columns, rows } = options;
    if (columns.length === 0 || rows.length === 0) {
      return;
    }

    const totalWidth = columns.reduce((acc, col) => acc + (col.width ?? 0), 0);
    const unspecified = columns.filter((col) => !col.width);
    const widthToDistribute = this.contentWidth - totalWidth;
    const defaultWidth = unspecified.length > 0 ? widthToDistribute / unspecified.length : 0;

    const resolvedColumns = columns.map((col) => ({
      ...col,
      width: col.width ?? Math.max(defaultWidth, 40),
    }));

    const headerHeight = 10;
    this.ensureSpace(headerHeight + 4);

    let x = this.margin;
  setFillColor(this.doc, palette.headerBg);
    this.doc.rect(this.margin, this.cursorY, this.contentWidth, headerHeight, 'F');

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9);
    this.doc.setTextColor(255, 255, 255);

    resolvedColumns.forEach((col) => {
      const align = col.align ?? 'left';
      const headerX = align === 'center' ? x + col.width / 2 : align === 'right' ? x + col.width - 4 : x + 4;
      this.doc.text(String(col.header), headerX, this.cursorY + 7, { align });
      x += col.width;
    });

    this.cursorY += headerHeight;

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9);

    rows.forEach((row, rowIndex) => {
      const lineHeight = 4.2;
      const columnHeights = resolvedColumns.map((col) => {
        const cellValue = this.coerce(row[col.key as keyof T]);
        const lines = this.wrapText(cellValue ?? '', col.width - 8);
        return Math.max(lines.length * lineHeight + 6, 12);
      });

      const rowHeight = Math.max(...columnHeights);
      this.ensureSpace(rowHeight + 2);

      if (options.stripe && rowIndex % 2 === 0) {
        setFillColor(this.doc, palette.stripe);
        this.doc.rect(this.margin, this.cursorY, this.contentWidth, rowHeight, 'F');
      }

      let cellX = this.margin;
      resolvedColumns.forEach((col, colIdx) => {
        const cellValue = this.coerce(row[col.key as keyof T]);
        if (cellValue) {
          const lines = this.wrapText(cellValue, col.width - 8);
          const align = col.align ?? 'left';
          const baseX = align === 'center' ? cellX + col.width / 2 : align === 'right' ? cellX + col.width - 4 : cellX + 4;
          lines.forEach((line, idx) => {
            this.doc.text(line, baseX, this.cursorY + 6 + idx * lineHeight, { align });
          });
        }

  setDrawColor(this.doc, palette.border);
        this.doc.setLineWidth(0.1);
        this.doc.rect(cellX, this.cursorY, col.width, rowHeight);

        cellX += col.width;
      });

      this.cursorY += rowHeight;
    });

    this.cursorY += 4;
  }

  ensureSpace(height: number): void {
    if (this.cursorY + height <= this.pageHeight - this.margin) {
      return;
    }

    this.addPage();
  }

  addPage(): void {
    this.doc.addPage();
    this.cursorY = this.drawHeader(true);
  }

  addFooter(): void {
    const pageCount = this.doc.internal.getNumberOfPages();
    const generatedAt = this.options.generatedAt ?? new Date().toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    for (let page = 1; page <= pageCount; page += 1) {
      this.doc.setPage(page);
  this.doc.setFont('helvetica', 'normal');
  this.doc.setFontSize(8);
  setTextColor(this.doc, palette.subtle);

      const footerY = this.pageHeight - 10;
      const brand = this.options.brandName ?? 'CG360';
      const tagline = this.options.brandTagline ?? 'cg360.co.uk';

      this.doc.text(`${brand} • ${tagline}`, this.margin, footerY);
      this.doc.text(`Generated ${generatedAt}`, this.pageWidth - this.margin, footerY, { align: 'right' });
      this.doc.text(`Page ${page} of ${pageCount}`, this.pageWidth / 2, footerY, { align: 'center' });
    }
  }

  getCursorY(): number {
    return this.cursorY;
  }

  setCursorY(value: number): void {
    this.cursorY = value;
  }

  private drawHeader(isContinuation: boolean): number {
    const brandName = this.options.brandName ?? 'CG360';
    const brandTagline = this.options.brandTagline ?? 'cg360.co.uk';

    const title = isContinuation ? `${this.options.title} (continued)` : this.options.title;

    this.doc.setFillColor(255, 255, 255);
    this.doc.rect(0, 0, this.pageWidth, 40, 'F');

  this.doc.setFont('helvetica', 'bold');
  this.doc.setFontSize(isContinuation ? 16 : 20);
  setTextColor(this.doc, palette.ink);
    this.doc.text(title, this.margin, 22);

    if (!isContinuation && this.options.subtitle) {
  this.doc.setFont('helvetica', 'normal');
  this.doc.setFontSize(11);
  setTextColor(this.doc, palette.muted);
      this.doc.text(this.options.subtitle, this.margin, 30);
    }

  this.doc.setFont('helvetica', 'bold');
  this.doc.setFontSize(isContinuation ? 12 : 16);
  setTextColor(this.doc, palette.ink);
    this.doc.text(brandName, this.pageWidth - this.margin, 18, { align: 'right' });

  this.doc.setFont('helvetica', 'normal');
  this.doc.setFontSize(9);
  setTextColor(this.doc, palette.subtle);
    this.doc.text(brandTagline, this.pageWidth - this.margin, 24, { align: 'right' });

    const dividerY = this.options.subtitle && !isContinuation ? 34 : 32;
  setDrawColor(this.doc, palette.divider);
    this.doc.setLineWidth(0.6);
    this.doc.line(this.margin, dividerY, this.pageWidth - this.margin, dividerY);

    return dividerY + 6;
  }

  private drawMetaGrid(meta: StandardPdfMetaItem[]): void {
    this.addInfoGrid(meta);
  }

  private wrapText(text: string, maxWidth: number): string[] {
    if (!text) return [];
    const lines = this.doc.splitTextToSize(text, maxWidth);
    return Array.isArray(lines) ? lines.filter(Boolean) : [lines];
  }

  private coerce(value: unknown): string | null {
    if (value === undefined || value === null) return null;
    const str = String(value).trim();
    return str.length > 0 ? str : null;
  }
}
