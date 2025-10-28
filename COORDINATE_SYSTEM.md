# PDF Coordinate System and Highlighting Guide

## Overview

This document explains how the PDF coordinate system works and how highlights are properly positioned and scaled.

## Coordinate Flow

### 1. PDF Extraction (Python - `process-pdf.py`)

- **Current Implementation**: Uses placeholder bounding boxes `{"x0": 0, "y0": 0, "x1": 100, "y1": 100}`
- **What it should do**: Extract actual text bounding boxes from PDF
- **Coordinate System**: PDF uses a coordinate system where:
  - Origin (0,0) is at the **bottom-left** corner of the page
  - X increases to the right
  - Y increases upward
  - Units are in **points** (1 point = 1/72 inch)

### 2. Storage (Database)

- Coordinates are stored in the `Chunk` table as `bboxList` JSONB field
- Format: `[{"x0": number, "y0": number, "x1": number, "y1": number}]`
- These coordinates represent the bounding box in PDF coordinate space

### 3. AI Response (Chat API)

- AI returns highlight commands like: `HIGHLIGHT: <page>,<x0>,<y0>,<x1>,<y1>`
- These coordinates should come from the stored `bboxList`
- Example: `HIGHLIGHT: 4,100,200,500,250`

### 4. Frontend Rendering (React)

- **Browser/Canvas coordinate system**:
  - Origin (0,0) is at the **top-left** corner
  - X increases to the right
  - Y increases downward
- **react-pdf** handles the coordinate transformation automatically when rendering pages
- However, highlights need manual positioning

## Highlight Coordinate Scaling

### Key Factors:

1. **Scale/Zoom Level**: The `scale` prop affects the rendered page size
2. **PDF Points to Pixels**: react-pdf converts PDF points to screen pixels
3. **Coordinate System Transformation**: PDF (bottom-left origin) to Canvas (top-left origin)

### Current Implementation (PDFViewer.tsx):

```typescript
// Scale the coordinates based on the current zoom level
const scaledX0 = highlight.bbox.x0 * scale;
const scaledY0 = highlight.bbox.y0 * scale;
const scaledX1 = highlight.bbox.x1 * scale;
const scaledY1 = highlight.bbox.y1 * scale;
```

### Why This Works:

1. **react-pdf's Page component** renders at a specific scale
2. If scale = 1.0, 1 PDF point = ~1.33 pixels (96 DPI / 72 DPI)
3. If scale = 1.5, the page is 1.5x larger, so coordinates must be scaled by 1.5x
4. The `scale` prop maintains the proportional relationship

### Important Notes:

- **Placeholder coordinates**: Current system uses `x0: 0, y0: 0, x1: 100, y1: 100` which won't highlight actual text
- **Coordinate origin**: react-pdf handles Y-axis flip internally, so we use coordinates as-is
- **Page dimensions**: Each page may have different dimensions

## Scrollable View Implementation

### Features:

1. **Multi-page rendering**: All pages render in a scrollable container
2. **Page refs**: Each page has a ref stored in `pageRefs` state
3. **Smooth scrolling**: When `currentPage` prop changes, smoothly scrolls to that page
4. **Page badges**: Visual indicators showing page numbers
5. **Zoom controls**: Affect all pages simultaneously

### Scroll Behavior:

```typescript
useEffect(() => {
  if (currentPage && pageRefs[currentPage] && scrollContainerRef.current) {
    const pageElement = pageRefs[currentPage];
    if (pageElement) {
      pageElement.scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "nearest",
      });
    }
  }
}, [currentPage, pageRefs]);
```

## Improving the System

### To Get Real Coordinates:

#### Option 1: Using PyPDF2 with Layout Analysis

```python
from pdfplumber import PDF

def extract_text_with_coords(pdf_path):
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            for char in page.chars:
                # char has: x0, y0, x1, y1, text
                pass
```

#### Option 2: Using pdfminer.six

```python
from pdfminer.layout import LAParams, LTTextBox
from pdfminer.pdfpage import PDFPage
from pdfminer.converter import PDFPageInterpreter
from pdfminer.pdfinterp import PDFResourceManager

# More complex but gives accurate bounding boxes
```

#### Option 3: Using pdf2json or similar tools

- External tools that extract text with positions
- Can be called from Python

### To Enable Highlights in Chat:

1. **Extract real coordinates** in `process-pdf.py`
2. **Store coordinates** in database `bboxList` field
3. **AI retrieves coordinates** from relevant chunks
4. **AI returns HIGHLIGHT command** with actual coordinates
5. **Frontend scales and renders** highlights correctly

## Testing the Highlight System

### Current Limitations:

- ❌ Placeholder coordinates (0,0,100,100) won't highlight actual text
- ✅ Scaling logic is correct for any zoom level
- ✅ Scrollable view works properly
- ✅ Multi-page rendering works
- ✅ Smooth scrolling to pages works

### To Test with Real Coordinates:

1. Manually add a test highlight:

```typescript
const testHighlight = {
  pageNumber: 1,
  bbox: { x0: 100, y0: 100, x1: 400, y1: 130 },
  text: "Test highlight",
};
```

2. Pass to PDFViewer:

```typescript
<PDFViewer file={file} highlights={[testHighlight]} currentPage={1} />
```

3. Adjust coordinates until highlight appears in the right place
4. Use those coordinates to calibrate the system

## Coordinate Transformation Formula

If you need to convert PDF coordinates to screen coordinates manually:

```typescript
// PDF coordinate (bottom-left origin)
const pdfX = bbox.x0;
const pdfY = bbox.y0;

// Get page dimensions from react-pdf
const pageHeight = pageElement.height; // in pixels

// Convert to screen coordinates (top-left origin)
const screenX = pdfX * scale;
const screenY = (pageHeight / scale - pdfY) * scale;

// But react-pdf already handles this, so we just use:
const screenX = pdfX * scale;
const screenY = pdfY * scale;
```

## Summary

### What's Working:

✅ Scrollable multi-page PDF view  
✅ Smooth scrolling to specific pages  
✅ Zoom controls with proper scaling  
✅ Highlight coordinate scaling based on zoom  
✅ Modern, intuitive UI

### What Needs Real Coordinates:

⚠️ PDF text extraction with bounding boxes  
⚠️ Database storage of actual coordinates  
⚠️ AI returning real coordinates in HIGHLIGHT commands

### Next Steps:

1. Implement proper coordinate extraction in Python
2. Test with a sample PDF to verify coordinate accuracy
3. Update AI prompt to use coordinates from bboxList
4. Fine-tune coordinate scaling if needed

