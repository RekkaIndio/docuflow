import jsPDF from 'jspdf';

// jsPDF exports default in some versions
const { jsPDF: JsPDF } = await import('jspdf');
const PDFClass = JsPDF || jsPDF;

// Create a simple test PDF
const doc = new PDFClass();
doc.setFont('helvetica', 'bold');
doc.setFontSize(20);
doc.text('Test PDF', 20, 20);
doc.text('This is a test', 20, 40);

// Try to get output as arraybuffer
console.log('Generating PDF...');
const arrayBuffer = doc.output('arraybuffer');
console.log('ArrayBuffer type:', arrayBuffer.constructor.name);
console.log('ArrayBuffer length:', arrayBuffer.byteLength);

// Convert to Uint8Array
const uint8Array = new Uint8Array(arrayBuffer);
console.log('Uint8Array length:', uint8Array.length);

// Check PDF magic number (should be %PDF)
const magicBytes = Array.from(uint8Array.slice(0, 4));
const magicString = String.fromCharCode(...magicBytes);
console.log('Magic bytes (hex):', magicBytes.map(b => b.toString(16).padStart(2, '0')).join(' '));
console.log('Magic string:', magicString);
console.log('Is valid PDF:', magicString === '%PDF');

// Save to file for testing
import fs from 'fs';
fs.writeFileSync('/tmp/test-pdf.pdf', uint8Array);
console.log('Saved to /tmp/test-pdf.pdf');
