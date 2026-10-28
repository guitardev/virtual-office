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

    // Strict ASCII fallback filename (only ASCII characters <= 127) to avoid ByteString header errors
    const asciiSafeNo = rawNo.replace(/[^a-zA-Z0-9_\-]/g, "_");
    const asciiFilename = `Car_Booking_${asciiSafeNo || timestamp}.docx`;

    // RFC 5987 / RFC 6266 percent-encoded filename for full Unicode / Thai character support
    const fullFilename = `Car_Booking_${rawNo}.docx`;
    const encodedFilename = encodeURIComponent(fullFilename);

    return new NextResponse(new Uint8Array(docxBuffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`,
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
