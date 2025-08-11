# Fonts Directory

This directory contains fonts used for PDF generation in the ticket system.

## Required Fonts

### Thai Fonts
- **THSarabunNew.ttf** - Main Thai font
- **THSarabunNew-Bold.ttf** - Bold Thai font
- **THSarabunNew-Italic.ttf** - Italic Thai font
- **NotoSansThai-VariableFont.ttf** - Alternative Thai font

### English Fonts (Roboto Family)
- **Roboto-Regular.ttf** - Regular text
- **Roboto-Bold.ttf** - Bold text
- **Roboto-Light.ttf** - Light text
- **Roboto-Medium.ttf** - Medium weight
- **Roboto-Italic.ttf** - Italic text
- **Roboto-BoldItalic.ttf** - Bold italic

## Usage

These fonts are used by the PDF generation service for:
- Ticket generation
- Report generation
- QR code labels
- Multi-language support

## Font Loading

Fonts are loaded in the PDF service using:
```typescript
// Load Thai font
doc.font('fonts/THSarabunNew.ttf')

// Load English font
doc.font('fonts/Roboto-Regular.ttf')
```

## License

Please ensure all fonts used comply with their respective licenses.
