import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messages, documentId, conversationId } = await req.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: "No messages provided" },
        { status: 400 }
      );
    }

    if (!conversationId) {
      return NextResponse.json(
        { error: "Conversation ID is required" },
        { status: 400 }
      );
    }

    // Verify conversation belongs to user
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId: user.id,
      },
      include: {
        document: true,
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    const lastMessage = messages[messages.length - 1];
    const userQuery = lastMessage.content;

    if (!userQuery) {
      return NextResponse.json({ error: "No query provided" }, { status: 400 });
    }

    // Save user message to database
    await prisma.message.create({
      data: {
        role: "user",
        content: userQuery,
        conversationId,
      },
    });

    // Step 1: Create query embedding
    const embeddingResponse = await fetch(
      "https://api.openai.com/v1/embeddings",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: userQuery,
        }),
      }
    );

    if (!embeddingResponse.ok) {
      throw new Error("Failed to create query embedding");
    }

    const embeddingData = await embeddingResponse.json();
    const queryVector = embeddingData.data[0].embedding;

    // Step 2: Perform vector search to find relevant chunks
    let relevantChunks: Array<{
      id: string;
      textContent: string;
      pageNumber: number;
      bboxList: any;
      distance: number;
    }> = [];

    try {
      relevantChunks = await prisma.$queryRaw<
        Array<{
          id: string;
          textContent: string;
          pageNumber: number;
          bboxList: any;
          distance: number;
        }>
      >`
        SELECT 
          id, 
          "textContent", 
          "pageNumber", 
          "bboxList",
          embedding <=> ${JSON.stringify(queryVector)}::vector as distance
        FROM "Chunk"
        WHERE "documentId" = ${conversation.document.id}
        ORDER BY embedding <=> ${JSON.stringify(queryVector)}::vector
        LIMIT 5
      `;
    } catch (dbError) {
      console.warn("Database query failed, using fallback response:", dbError);
      // If database query fails, provide a fallback response
      return NextResponse.json({
        message:
          "I understand you're asking about a PDF document, but I don't have access to the document content yet. Please make sure the PDF has been processed and the database is set up correctly.",
        highlights: [],
        relevantChunks: [],
        timestamp: new Date().toISOString(),
      });
    }

    // Step 3: Construct the prompt with context
    const contextText = relevantChunks
      .map((chunk, index) => {
        // Extract the first bounding box (since bboxList is an array)
        const bbox =
          chunk.bboxList && chunk.bboxList[0] ? chunk.bboxList[0] : null;
        const bboxStr = bbox
          ? `x0:${bbox.x0}, y0:${bbox.y0}, x1:${bbox.x1}, y1:${bbox.y1}`
          : "no coordinates";

        return `[Context ${index + 1} - Page ${chunk.pageNumber}]:\n${
          chunk.textContent
        }\nCoordinates: ${bboxStr}`;
      })
      .join("\n\n");

    const chatHistory = messages
      .slice(0, -1) // Exclude the last message (current query)
      .map((msg: any) => `${msg.role}: ${msg.content}`)
      .join("\n");

    const systemPrompt = `You are an AI assistant that helps users understand PDF documents. You have access to the document's content through semantic search.

Instructions:
- Answer questions based on the provided context from the PDF
- If the context doesn't contain enough information, say so
- Be specific and cite page numbers when relevant
- Keep responses concise but informative

IMPORTANT - Tool Commands:
Always use below special commands while responding to the user's question to help users navigate and visualize the document:

1. To navigate to a specific page, include on a NEW LINE:
   NAVIGATE: <page_number>
   Example: NAVIGATE: 4

2. To highlight content (use the exact coordinates provided), include on a NEW LINE:
   HIGHLIGHT: <page_number>,<x0>,<y0>,<x1>,<y1>
   Example: HIGHLIGHT: 4,100.5,200.3,500.7,250.1

Rules for tool commands:
- Place tool commands on their OWN LINE
- Do NOT add extra text on the same line as the command
- Use the EXACT format shown (no spaces after commas in coordinates)
- Use the EXACT coordinates provided in the context (they may be decimal numbers)
- You can include your explanation AFTER the command on a new line
- If coordinates are not available, just use NAVIGATE to show the page

Example Response:
"The information about XYZ is found on page 4 of the document.

HIGHLIGHT: 4,100.5,200.3,500.7,250.1

This section discusses the key concepts you asked about."

Context from the PDF:
${contextText}

Previous conversation:
${chatHistory}

User's question: ${userQuery}

Please provide a helpful response based on the PDF content.`;

    // Step 4: Use Vercel AI SDK for proper streaming

    const result = await streamText({
      model: openai("gpt-4o-mini"),
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        ...messages.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
        })),
      ],
      temperature: 0.7,
    });

    // Create a custom stream that matches the frontend's expected format
    const encoder = new TextEncoder();
    let fullResponse = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.textStream) {
            fullResponse += chunk;
            // Send each chunk in the format expected by the frontend: 0:"content"
            const formattedChunk = `0:"${chunk}"\n`;
            controller.enqueue(encoder.encode(formattedChunk));
          }

          // Save assistant message to database
          await prisma.message.create({
            data: {
              role: "assistant",
              content: fullResponse,
              conversationId,
            },
          });

          // Update conversation's updatedAt timestamp
          await prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
          });

          // Send completion signal
          controller.enqueue(encoder.encode(`d:{"finishReason":"stop"}\n`));
          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      {
        error: "Failed to process chat",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
