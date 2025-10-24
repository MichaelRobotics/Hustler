import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { whopSdk } from "@/lib/whop-sdk";

export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const headersList = await headers();
    const userToken = await whopSdk.verifyUserToken(headersList);
    if (!userToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the file from the request
    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files are allowed" },
        { status: 400 }
      );
    }

    // Upload to WHOP storage
    const response = await whopSdk.attachments.uploadAttachment({
      file: file,
      record: "experience", // Store as experience-related attachment
    });

    console.log("🔍 Image uploaded successfully:", {
      attachmentId: response.directUploadId,
      url: response.attachment.source.url
    });

    // Return the attachment details
    return NextResponse.json({
      success: true,
      attachmentId: response.directUploadId,
      url: response.attachment.source.url,
      filename: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}
