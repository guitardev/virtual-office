import { NextRequest, NextResponse } from "next/server";
import { generateCarBookingDocx } from "@/lib/carbooking/docxGenerator";

export async function POST(req: NextRequest) {
  try {
    const bookingData = await req.json();

    if (!bookingData) {
      return NextResponse.json(
        { error: "ข้อมูลคำขอไม่ถูกต้อง (Missing booking data)" },
        { status: 400 }
      );
    }

    const docxBuffer = await generateCarBookingDocx(bookingData);

    const timestamp = Date.now();
    const rawNo = bookingData.requestNo || `request_${timestamp}`;
    const safeNo = rawNo.replace(/[^a-zA-Z0-9_\-\u0E00-\u0E7F]/g, "_");
    const filename = `Car_Booking_${safeNo}.docx`;

    // Encode filename for Content-Disposition header (RFC 5987 standard for Thai characters)
    const encodedFilename = encodeURIComponent(filename);

    return new NextResponse(new Uint8Array(docxBuffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodedFilename}`,
      },
    });
  } catch (error: any) {
    console.error("Error generating car booking docx:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการสร้างไฟล์ Word (.docx)", details: error?.message },
      { status: 500 }
    );
  }
}
