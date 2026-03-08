import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "~/server/auth";
import { moderateVideoMetadata } from "~/lib/content-moderation";

const MAX_FILE_SIZE = 1024 * 1024 * 100; // 100MB
const ALLOWED_FILE_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/webm",
  "video/x-matroska",
  "video/mpeg",
];

/**
 * A Next.js API route for handling video file uploads.
 * It accepts a POST request with `multipart/form-data`.
 * Validates the file for size and type and uploads to Vercel Blob Storage.
 * Includes content moderation and authentication checks.
 * @param {Request} req - The incoming request object.
 * @returns {NextResponse} - A JSON response indicating success or failure.
 */
export async function POST(req: Request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to upload videos." },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Content moderation - check filename
    const moderationResult = moderateVideoMetadata({ filename: file.name });
    if (!moderationResult.allowed) {
      return NextResponse.json(
        {
          error: `Content policy violation: ${moderationResult.reason}. Please review our community guidelines.`,
        },
        { status: 403 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 100MB limit" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Invalid file type. Allowed types: ${ALLOWED_FILE_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileExtension = file.name.split(".").pop() ?? "mp4";
    const fileName = `videos/${session.user.id}-${Date.now()}.${fileExtension}`;

    // Use Blob storage in production, local storage in development
    const isProduction = process.env.NODE_ENV === "production";
    
    if (isProduction) {
      // Check if Blob storage is configured
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return NextResponse.json(
          { 
            error: "Video storage not configured. Please contact the administrator.",
            details: "BLOB_READ_WRITE_TOKEN is missing"
          },
          { status: 503 }
        );
      }

      // Upload to Vercel Blob Storage
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const blob = await put(fileName, file, {
        access: "public",
        addRandomSuffix: false,
      });

      return NextResponse.json({
        success: true,
        filePath: blob.url,
        fileSize: file.size,
        message: "Video uploaded successfully",
      });
    } else {
      // Local development - save to filesystem
      const { writeFile, mkdir } = await import("fs/promises");
      const { join } = await import("path");
      const { existsSync } = await import("fs");
      
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Ensure uploads directory exists
      const uploadsDir = join(process.cwd(), "public", "uploads");
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true });
      }

      const filePath = join(uploadsDir, fileName.replace("videos/", ""));
      await writeFile(filePath, buffer);

      return NextResponse.json({
        success: true,
        filePath: `/uploads/${fileName.replace("videos/", "")}`,
        fileSize: file.size,
        message: "Video uploaded successfully",
      });
    }
  } catch (error) {
    console.error("Upload error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { 
        error: "Error uploading file. Please try again.",
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
