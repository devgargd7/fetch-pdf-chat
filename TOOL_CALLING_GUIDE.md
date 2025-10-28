# Tool Calling Implementation Guide

## Overview

This document describes the tool calling implementation that allows the LLM to navigate PDF pages and highlight content.

## How It Works

### 1. Backend (API Route)

The chat API route (`/api/chat/route.ts`) includes enhanced instructions in the system prompt that teach the LLM to use special command formats.

### 2. Tool Commands Format

#### Navigation Command

```
NAVIGATE: <page_number>
```

**Examples:**

- `NAVIGATE: 4`
- `NAVIGATE: page4` (also supported)
- `NAVIGATE: page 4` (also supported)

#### Highlight Command

```
HIGHLIGHT: <page_number>,<x0>,<y0>,<x1>,<y1>
```

**Examples:**

- `HIGHLIGHT: 4,100,200,500,250`
- `HIGHLIGHT: 4, 100, 200, 500, 250` (spaces are handled)

### 3. Frontend Parsing

The `ChatInterface` component (`/components/ChatInterface.tsx`) includes a `parseToolCalls` function that:

1. **Runs during streaming**: Parses commands as the AI response streams in
2. **Flexible regex patterns**: Handles various formats with/without spaces
3. **Triggers actions**: Calls the appropriate handlers when commands are detected

#### Regex Patterns Used

**Navigation:**

```javascript
/NAVIGATE:\s*(?:page\s*)?(\d+)/i;
```

- Matches with or without "page" prefix
- Case insensitive
- Extracts the page number

**Highlight:**

```javascript
/HIGHLIGHT:\s*(?:page\s*)?(\d+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i;
```

- Handles spaces before/after commas
- Extracts page number and 4 coordinates (x0, y0, x1, y1)
- Case insensitive

### 4. Component Flow

```
User asks question
    ↓
AI processes with context
    ↓
AI includes tool commands in response
    ↓
Response streams to frontend
    ↓
parseToolCalls() detects commands
    ↓
Triggers onNavigateToPage() or onHighlight()
    ↓
PDFChatInterface updates state
    ↓
PDFViewer renders changes
```

## Debugging

All components include console logging:

1. **ChatInterface**: Logs content being parsed and regex matches
2. **PDFChatInterface**: Logs when navigation handler is called
3. **PDFViewer**: Logs when page updates

Check browser console for detailed flow tracking.

## Best Practices for LLM Responses

### Good Example

```
The information about XYZ is found on page 4 of the document.

NAVIGATE: 4

This section discusses the key concepts you asked about.
```

### Bad Example (Don't do this)

```
HIGHLIGHT: 4, 10, 200, 600This section discusses...
```

❌ Problem: Text on same line as command - harder to parse

### Bad Example (Don't do this)

```
You can find it on NAVIGATE: page 4 in the document.
```

❌ Problem: Command embedded in sentence - won't be detected

## Troubleshooting

### Navigation Not Working?

1. Check console for "Navigate match:" output
2. Verify the format matches one of the supported patterns
3. Ensure command is on its own line

### Highlighting Not Working?

1. Check if coordinates are valid numbers
2. Verify all 5 parameters are present (page, x0, y0, x1, y1)
3. Ensure spaces in the command are handled by regex

### No Commands Detected?

1. Verify the LLM included the commands in its response
2. Check if commands are on separate lines
3. Look for typos in "NAVIGATE" or "HIGHLIGHT"

## Future Enhancements

Potential improvements:

1. Support for multiple highlights in one response
2. Different highlight colors based on importance
3. Smooth scrolling animation to highlighted content
4. Persistent highlights across sessions
5. Use actual chunk bounding boxes instead of placeholders

