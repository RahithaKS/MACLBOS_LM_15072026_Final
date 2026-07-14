import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import type { Message } from '@shared/schema';

interface ExportOptions {
  chatTitle: string;
  messages: Message[];
  chartImages?: Map<string, string[]>;
}

function cleanTextForExport(text: string): string {
  let cleaned = text.replace(/```chart[\s\S]*?```/g, '__CHART_BLOCK__');
  cleaned = cleaned.replace(/\[(\d+)\]/g, '[$1]');
  return cleaned;
}

interface TextSegment {
  text: string;
  type: 'h1' | 'h2' | 'h3' | 'normal' | 'bullet' | 'numbered' | 'empty' | 'table' | 'table-placeholder' | 'chart-placeholder';
  indent?: number;
  parts?: Array<{ text: string; bold: boolean }>;
  tableData?: { headers: string[]; rows: string[][] };
}

function parseInlineBold(text: string): Array<{ text: string; bold: boolean }> {
  const parts: Array<{ text: string; bold: boolean }> = [];
  const regex = /(\*\*[^*]+\*\*)/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push({ text: text.slice(lastIndex, match.index), bold: false });
    parts.push({ text: match[1].replace(/\*\*/g, ''), bold: true });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push({ text: text.slice(lastIndex), bold: false });
  return parts.length > 0 ? parts : [{ text, bold: false }];
}

function parsePipeLines(pipeLines: string[]): TextSegment | null {
  const filtered = pipeLines.filter(l => l.trim().startsWith('|'));
  if (filtered.length < 2) return null;

  const headers: string[] = [];
  const rows: string[][] = [];
  let headerParsed = false;

  for (const line of filtered) {
    const cells = line
      .split('|')
      .map(c => c.trim().replace(/\[(?:SQL\d*|SQL)\d*\]/gi, '').trim())
      .filter((_, i, arr) => i > 0 && i < arr.length);

    const isSeparator = cells.every(c => /^:?-+:?$/.test(c));
    if (isSeparator) continue;

    if (!headerParsed) {
      headers.push(...cells);
      headerParsed = true;
    } else {
      rows.push(cells);
    }
  }

  if (headers.length === 0) return null;
  return { text: '', type: 'table', tableData: { headers, rows } };
}

function parseMarkdownForPDF(text: string): TextSegment[] {
  const cleaned = cleanTextForExport(text);
  const lines = cleaned.split('\n');
  const segments: TextSegment[] = [];
  let pipeBuffer: string[] = [];

  function flushPipeBuffer() {
    if (pipeBuffer.length === 0) return;
    const seg = parsePipeLines(pipeBuffer);
    if (seg) segments.push(seg);
    pipeBuffer = [];
  }

  for (const line of lines) {
    if (line.includes('[Full data table attached')) {
      flushPipeBuffer();
      segments.push({ text: '', type: 'table-placeholder' });
      continue;
    }

    if (line.trim() === '__CHART_BLOCK__') {
      flushPipeBuffer();
      segments.push({ text: '', type: 'chart-placeholder' });
      continue;
    }

    if (line.trim().startsWith('|')) {
      pipeBuffer.push(line);
      continue;
    }

    flushPipeBuffer();

    if (line.trim() === '') {
      segments.push({ text: '', type: 'empty' });
      continue;
    }

    if (line.match(/^# /)) {
      segments.push({ text: line.replace(/^# /, ''), type: 'h1' });
    } else if (line.match(/^## /)) {
      segments.push({ text: line.replace(/^## /, ''), type: 'h2' });
    } else if (line.match(/^### /)) {
      segments.push({ text: line.replace(/^### /, ''), type: 'h3' });
    } else if (line.trim().match(/^[-*+]\s/)) {
      const content = line.replace(/^\s*[-*+]\s/, '');
      segments.push({ text: content, type: 'bullet', indent: (line.length - line.trim().length) / 2, parts: parseInlineBold(content) });
    } else if (line.trim().match(/^\d+\.\s/)) {
      const m = line.match(/^(\s*)(\d+)\.\s(.+)$/);
      if (m) {
        const content = `${m[2]}. ${m[3]}`;
        segments.push({ text: content, type: 'numbered', indent: m[1].length / 2, parts: parseInlineBold(content) });
      }
    } else {
      segments.push({ text: line, type: 'normal', parts: parseInlineBold(line) });
    }
  }

  flushPipeBuffer();
  return segments;
}

export async function exportChatToPDF(_options: ExportOptions): Promise<void> {
  alert('PDF export is not available in this environment. Please use the Word export option instead.');
}

export async function exportChatToWord(options: ExportOptions): Promise<void> {
  const { chatTitle, messages } = options;
  const documentChildren: Paragraph[] = [];

  documentChildren.push(
    new Paragraph({ text: chatTitle, heading: HeadingLevel.HEADING_1, spacing: { after: 200 } })
  );
  documentChildren.push(
    new Paragraph({
      children: [new TextRun({ text: `Exported: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, italics: true, color: '666666', size: 20 })],
      spacing: { after: 400 },
    })
  );

  for (const message of messages) {
    documentChildren.push(
      new Paragraph({
        children: [new TextRun({ text: message.role === 'user' ? 'You' : 'LedgerLM', bold: true, size: 24, color: message.role === 'user' ? '0066CC' : '6B21A8' })],
        spacing: { before: 300, after: 100 },
      })
    );

    const content = cleanTextForExport(message.content);
    const lines = content.split('\n');
    let inList = false;

    for (const line of lines) {
      if (line.trim() === '' || line.trim() === '__CHART_BLOCK__') {
        documentChildren.push(new Paragraph({ text: '' }));
        inList = false;
        continue;
      }
      if (line.startsWith('### ')) {
        documentChildren.push(new Paragraph({ text: line.replace('### ', ''), heading: HeadingLevel.HEADING_3, spacing: { before: 150, after: 100 } }));
        inList = false; continue;
      }
      if (line.startsWith('## ')) {
        documentChildren.push(new Paragraph({ text: line.replace('## ', ''), heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }));
        inList = false; continue;
      }
      if (line.startsWith('# ')) {
        documentChildren.push(new Paragraph({ text: line.replace('# ', ''), heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 100 } }));
        inList = false; continue;
      }
      if (line.trim().match(/^[-*+]\s/)) {
        documentChildren.push(new Paragraph({ text: line.replace(/^\s*[-*+]\s/, ''), bullet: { level: 0 }, spacing: { after: 50 } }));
        inList = true; continue;
      }
      if (line.trim().match(/^\d+\.\s/)) {
        documentChildren.push(new Paragraph({ text: line.replace(/^\s*\d+\.\s/, ''), numbering: { reference: 'default-numbering', level: 0 }, spacing: { after: 50 } }));
        inList = true; continue;
      }
      if (line.trim().startsWith('|')) continue;
      if (line.includes('[Full data table attached')) {
        documentChildren.push(new Paragraph({ children: [new TextRun({ text: '[See full data table in application]', italics: true, color: '666666' })], spacing: { after: 100 } }));
        continue;
      }

      const textRuns: TextRun[] = [];
      const parts = line.split(/(\*\*[^*]+\*\*)/);
      for (const part of parts) {
        if (part.startsWith('**') && part.endsWith('**')) {
          textRuns.push(new TextRun({ text: part.replace(/\*\*/g, ''), bold: true }));
        } else if (part.trim()) {
          textRuns.push(new TextRun({ text: part }));
        }
      }
      if (textRuns.length > 0) {
        documentChildren.push(new Paragraph({ children: textRuns, spacing: { after: inList ? 50 : 100 } }));
      }
      inList = false;
    }

    const metadata = message.metadata as { citations?: string[] } | null;
    if (metadata?.citations && metadata.citations.length > 0) {
      documentChildren.push(new Paragraph({ children: [new TextRun({ text: 'Sources:', italics: true, size: 20, color: '666666' })], spacing: { before: 200, after: 100 } }));
      for (let i = 0; i < metadata.citations.length; i++) {
        documentChildren.push(new Paragraph({ children: [new TextRun({ text: `[${i + 1}] ${metadata.citations[i]}`, size: 18, color: '666666' })], spacing: { after: 50 } }));
      }
    }
    documentChildren.push(new Paragraph({ text: '', spacing: { after: 200 } }));
  }

  const doc = new Document({
    sections: [{ properties: {}, children: documentChildren }],
    numbering: {
      config: [{ reference: 'default-numbering', levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.LEFT }] }],
    },
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${chatTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.docx`);
}
